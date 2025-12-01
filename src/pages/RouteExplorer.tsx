import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StravaHeatmapView from '@/components/RouteMap/StravaHeatmapView';
import { getSavedRoutes, deleteSavedRoute, saveSavedRoute, type DbSavedRoute } from '@/lib/database';
import { getSavedLocation, detectLocation } from '@/utils/location';
import { toast } from '@/components/ToastHost';
import { suggestRoutesForTraining, type RouteRecommendation } from '@/ai/brain';
import { getWeekPlan, todayDayIndex, setWeekPlan } from '@/lib/plan';
import { supabase } from '@/lib/supabase';
import type { StravaSegment } from '@/services/stravaRoutes';
import { stravaSegmentToRoute } from '@/services/stravaRoutes';

export default function RouteExplorer() {
  const navigate = useNavigate();
  const [savedRoutes, setSavedRoutes] = useState<DbSavedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<DbSavedRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [stravaConnectionStatus, setStravaConnectionStatus] = useState<'checking' | 'connected' | 'expired' | 'disconnected'>('checking');
  const [filters, setFilters] = useState({
    minDistance: 0,
    maxDistance: 50,
    surfaceType: 'all' as 'all' | 'road' | 'trail' | 'mixed',
    showAISuggestions: true,
  });
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [displayedSegments, setDisplayedSegments] = useState<StravaSegment[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchTrigger, setSearchTrigger] = useState<{ lat: number; lon: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);

  useEffect(() => {
    loadUserLocation();
    checkStravaConnection();
  }, []);

  useEffect(() => {
    if (userLocation && !autoLoaded) {
      loadRoutes();
      setAutoLoaded(true);
    }
  }, [userLocation]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (userLocation && document.visibilityState === 'visible') {
        loadRoutes();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [userLocation]);

  const checkStravaConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStravaConnectionStatus('disconnected');
        return;
      }

      const { data: connection } = await supabase
        .from('wearable_connections')
        .select('connection_status, token_expires_at')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .maybeSingle();

      if (!connection) {
        setStravaConnectionStatus('disconnected');
        return;
      }

      if (connection.connection_status === 'token_expired') {
        setStravaConnectionStatus('expired');
        return;
      }

      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
      if (expiresAt && expiresAt < new Date()) {
        setStravaConnectionStatus('expired');
        return;
      }

      setStravaConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to check Strava connection:', error);
      setStravaConnectionStatus('disconnected');
    }
  };

  const loadRoutes = async (silent = false) => {
    setLoading(true);
    try {
      const locationFilter = userLocation ? {
        lat: userLocation[1],
        lon: userLocation[0],
        radiusKm: 50,
      } : undefined;

      const routes = await getSavedRoutes(100, locationFilter);
      setSavedRoutes(routes);

      if (routes.length === 0 && userLocation && !silent) {
        toast(`No routes found within 50km of current location`, 'info');
      }
    } catch (error) {
      console.error('Failed to load routes:', error);
      toast('Failed to load saved routes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLocation = async () => {
    const saved = getSavedLocation();
    if (saved) {
      setUserLocation([saved.lon, saved.lat]);
      return;
    }

    try {
      const detected = await detectLocation();
      setUserLocation([detected.lon, detected.lat]);
    } catch (error) {
      console.warn('Could not detect location:', error);
      setUserLocation([-74.006, 40.7128]);
    }
  };

  const geocodeLocation = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleSearchLocation = async () => {
    if (!locationSearch.trim()) {
      if (userLocation) {
        setSearchTrigger({ lat: userLocation[1], lon: userLocation[0] });
      }
      return;
    }

    setLoading(true);
    const result = await geocodeLocation(locationSearch);

    if (result) {
      setSearchTrigger(result);
      toast(`Searching routes near ${locationSearch}`, 'info');
    } else {
      toast('Location not found. Try a different search term.', 'error');
    }
    setLoading(false);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    const success = await deleteSavedRoute(routeId);
    if (success) {
      toast('Route deleted', 'success');
      await loadRoutes();
    } else {
      toast('Failed to delete route', 'error');
    }
  };

  const handleSaveSegment = async (segment: StravaSegment) => {
    try {
      const route = stravaSegmentToRoute(segment);
      const success = await saveSavedRoute(route);

      if (success) {
        toast(`Route "${segment.name}" saved successfully!`, 'success');
        await loadRoutes(true);
      } else {
        toast('Failed to save route', 'error');
      }
    } catch (error) {
      console.error('Error saving segment:', error);
      toast('Failed to save route', 'error');
    }
  };

  const todayTarget = useMemo(() => {
    const weekPlan = getWeekPlan();
    const today = todayDayIndex();
    const todaySession = weekPlan[today];
    const mainSession = todaySession?.sessions[0];

    if (!mainSession || !mainSession.km || mainSession.km === 0) {
      return null;
    }

    return {
      distance_km: mainSession.km,
      elevation_gain_m: mainSession.notes?.match(/(\d+)m/)?.[1] ? parseInt(mainSession.notes.match(/(\d+)m/)![1]) : undefined,
      terrain: (mainSession.notes?.toLowerCase().includes('trail') ? 'trail' :
                mainSession.notes?.toLowerCase().includes('road') ? 'road' :
                undefined) as 'road' | 'trail' | 'mixed' | undefined,
      weatherAware: true,
      userLat: userLocation?.[1],
      userLon: userLocation?.[0],
    };
  }, [userLocation]);

  const [aiRecommendations, setAiRecommendations] = useState<Map<string, RouteRecommendation>>(new Map());

  useEffect(() => {
    if (filters.showAISuggestions && todayTarget && savedRoutes.length > 0) {
      suggestRoutesForTraining(savedRoutes, todayTarget).then((recommendations) => {
        const map = new Map<string, RouteRecommendation>();
        recommendations.forEach((rec) => {
          if (rec.route.id) {
            map.set(rec.route.id, rec);
          }
        });
        setAiRecommendations(map);
      });
    } else {
      setAiRecommendations(new Map());
    }
  }, [filters.showAISuggestions, todayTarget, savedRoutes]);

  const filteredRoutes = useMemo(() => {
    let routes = savedRoutes.filter(route => {
      if (route.distance_km < filters.minDistance) return false;
      if (route.distance_km > filters.maxDistance) return false;
      if (filters.surfaceType !== 'all' && route.surface_type !== filters.surfaceType) return false;
      return true;
    });

    if (filters.showAISuggestions && aiRecommendations.size > 0) {
      routes = [...routes].sort((a, b) => {
        const scoreA = aiRecommendations.get(a.id || '')?.score || 0;
        const scoreB = aiRecommendations.get(b.id || '')?.score || 0;
        return scoreB - scoreA;
      });
    }

    return routes;
  }, [savedRoutes, filters, aiRecommendations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0b0d' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/quest"
              style={{
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: 24,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ←
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>
              Discover Routes
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {userLocation && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchLocation();
                      }
                    }}
                    style={{
                      background: '#1e293b',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 13,
                      outline: 'none',
                      width: '180px',
                    }}
                  />
                  <button
                    onClick={handleSearchLocation}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {loading ? '⏳' : '🔍'} {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 11,
                    color: '#64748b',
                    fontWeight: 600,
                  }}>📍 Radius:</span>
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    style={{
                      background: '#1e293b',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <option value={5}>5km</option>
                    <option value={10}>10km</option>
                    <option value={15}>15km</option>
                    <option value={25}>25km</option>
                    <option value={50}>50km</option>
                  </select>
                </div>
              </>
            )}
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {displayedSegments.length > 0 ? displayedSegments.length : filteredRoutes.length} routes
            </div>
          </div>
        </div>

        {(stravaConnectionStatus === 'expired' || stravaConnectionStatus === 'disconnected') && (
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid rgba(220, 38, 38, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>
                  {stravaConnectionStatus === 'expired' ? 'Strava Connection Expired' : 'Strava Not Connected'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
                  {stravaConnectionStatus === 'expired'
                    ? 'Your Strava connection has expired. Reconnect to discover routes.'
                    : 'Connect your Strava account to discover popular running routes.'}
                </div>
              </div>
            </div>
            <Link
              to="/settings"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#991b1b',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {stravaConnectionStatus === 'expired' ? 'RECONNECT' : 'CONNECT'}
            </Link>
          </div>
        )}

        {todayTarget ? (
          <div style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  TODAY'S TRAINING TARGET
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                  {todayTarget.distance_km}km run
                  {todayTarget.elevation_gain_m && ` • ${todayTarget.elevation_gain_m}m elevation`}
                  {todayTarget.terrain && ` • ${todayTarget.terrain}`}
                </div>
              </div>
              {filters.showAISuggestions && (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                }}>AI MATCHING ON</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(100, 116, 139, 0.1)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid rgba(100, 116, 139, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💤</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                  No training session today • Enable AI Suggestions to match routes to your workouts
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Distance:</label>
            <input
              type="range"
              min="0"
              max="50"
              value={filters.minDistance}
              onChange={(e) => setFilters({ ...filters, minDistance: Number(e.target.value) })}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 12, color: '#cbd5e1', minWidth: 50 }}>
              {filters.minDistance}-{filters.maxDistance} km
            </span>
            <input
              type="range"
              min="0"
              max="50"
              value={filters.maxDistance}
              onChange={(e) => setFilters({ ...filters, maxDistance: Number(e.target.value) })}
              style={{ width: 80 }}
            />
          </div>

          <select
            value={filters.surfaceType}
            onChange={(e) => setFilters({ ...filters, surfaceType: e.target.value as any })}
            style={{
              background: '#1e293b',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
            }}
          >
            <option value="all">All Surfaces</option>
            <option value="road">Road</option>
            <option value="trail">Trail</option>
            <option value="mixed">Mixed</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.showAISuggestions}
              onChange={(e) => setFilters({ ...filters, showAISuggestions: e.target.checked })}
            />
            AI Suggestions {filters.showAISuggestions && <span style={{ fontSize: 10, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🌤️</span>}
          </label>
        </div>

        {filters.showAISuggestions && !todayTarget && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 8,
            fontSize: 12,
            color: '#fbbf24',
          }}>
            💡 Add a running session to today's plan to see AI-powered route recommendations
          </div>
        )}

        {filters.showAISuggestions && todayTarget && aiRecommendations.size > 0 && (
          <div style={{
            marginTop: 12,
            padding: 14,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: 10,
            fontSize: 13,
            color: '#4ade80',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <div style={{ flex: 1 }}>
              AI matched {aiRecommendations.size} routes for today's {todayTarget.distance_km}km run • Weather-adjusted • Sorted by best match
            </div>
            <span style={{
              background: 'rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}>🌤️ WEATHER-AWARE</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: '350px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            overflowY: 'auto',
            background: '#0f1115',
          }}
        >
          <div style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {displayedSegments.length > 0 ? 'Discovered Routes' : 'Saved Routes'}
            </h3>

            {loading ? (
              <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 20 }}>
                Loading routes...
              </div>
            ) : displayedSegments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayedSegments.map((segment) => (
                  <div
                    key={segment.id}
                    onClick={() => setSelectedSegmentId(segment.id)}
                    style={{
                      background: selectedSegmentId === segment.id ? '#1e293b' : '#0a0b0d',
                      border: selectedSegmentId === segment.id ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedSegmentId !== segment.id) {
                        e.currentTarget.style.background = '#161820';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedSegmentId !== segment.id) {
                        e.currentTarget.style.background = '#0a0b0d';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'white', flex: 1 }}>
                        {segment.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveSegment(segment);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        + Save
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      <span>{(segment.distance / 1000).toFixed(2)} km</span>
                      <span>⭐ {segment.star_count || 0}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 6,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}>
                      <span style={{ fontSize: 16 }}>⛰️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>ELEVATION</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                          {Math.round(segment.total_elevation_gain || 0)}m gain
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {segment.average_grade ? `${segment.average_grade.toFixed(1)}% avg` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 20 }}>
                No routes found. Click on the map to discover popular routes nearby.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredRoutes.map((route, index) => {
                  const aiScore = aiRecommendations.get(route.id || '');
                  const showAIBadge = filters.showAISuggestions && aiScore && aiScore.score > 0.5;

                  return (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      style={{
                        background: selectedRoute?.id === route.id ? '#1e293b' : '#0a0b0d',
                        border: showAIBadge
                          ? `1px solid ${aiScore.score >= 0.8 ? '#22c55e' : aiScore.score >= 0.6 ? '#3b82f6' : '#f59e0b'}`
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRoute?.id !== route.id) {
                          e.currentTarget.style.background = '#161820';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRoute?.id !== route.id) {
                          e.currentTarget.style.background = '#0a0b0d';
                        }
                      }}
                    >
                      {showAIBadge && index === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: -8,
                          left: 8,
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          letterSpacing: 0.5,
                        }}>
                          BEST MATCH
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                            {route.name}
                          </div>
                          {showAIBadge && (
                            <div style={{
                              background: aiScore.score >= 0.8
                                ? 'rgba(34, 197, 94, 0.2)'
                                : aiScore.score >= 0.6
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'rgba(251, 191, 36, 0.2)',
                              color: aiScore.score >= 0.8
                                ? '#4ade80'
                                : aiScore.score >= 0.6
                                  ? '#60a5fa'
                                  : '#fbbf24',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {Math.round(aiScore.score * 100)}%
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (route.id) handleDeleteRoute(route.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                        <span>{route.distance_km.toFixed(1)} km</span>
                      {route.elevation_gain_m && route.elevation_gain_m > 0 && (
                        <>
                          <span>•</span>
                          <span>↑ {route.elevation_gain_m}m</span>
                        </>
                      )}
                      {route.surface_type && (
                        <>
                          <span>•</span>
                          <span>{route.surface_type}</span>
                        </>
                      )}
                    </div>
                    {route.tags && route.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {route.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              background: '#1e293b',
                              color: '#94a3b8',
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {userLocation ? (
            <StravaHeatmapView
              initialCenter={userLocation}
              initialZoom={12}
              onRouteSelected={(routeId) => {
                loadRoutes();
              }}
              onSegmentsLoaded={(segments) => {
                setDisplayedSegments(segments);
              }}
              searchLocation={searchTrigger}
              searchRadius={searchRadius}
              selectedSegmentId={selectedSegmentId}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              Loading map...
            </div>
          )}
        </div>
      </div>

      {selectedRoute && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedRoute(null)}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>
                {selectedRoute.name}
              </h2>
              <button
                onClick={() => setSelectedRoute(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 24,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Distance</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
                  {selectedRoute.distance_km.toFixed(1)} km
                </div>
              </div>
              {selectedRoute.elevation_gain_m && (
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Elevation Gain</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
                    {selectedRoute.elevation_gain_m}m
                  </div>
                </div>
              )}
              {selectedRoute.surface_type && (
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Surface</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'white', textTransform: 'capitalize' }}>
                    {selectedRoute.surface_type}
                  </div>
                </div>
              )}
              {selectedRoute.scenic_score && (
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Scenic Score</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
                    {selectedRoute.scenic_score}/10
                  </div>
                </div>
              )}
            </div>

            {selectedRoute.tags && selectedRoute.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Tags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedRoute.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: '#0f1115',
                        color: '#94a3b8',
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (!selectedRoute) return;

                  const weekPlan = getWeekPlan();
                  const today = todayDayIndex();
                  const todayDay = weekPlan[today];

                  const existingSession = todayDay.sessions[0];
                  const updatedSession = {
                    ...existingSession,
                    title: existingSession?.title || 'Easy Run',
                    km: selectedRoute.distance_km,
                    notes: `${existingSession?.notes || ''} • Route: ${selectedRoute.name}${selectedRoute.elevation_gain_m ? ` (${selectedRoute.elevation_gain_m}m elevation)` : ''} • ${selectedRoute.surface_type || 'mixed'} surface`.trim(),
                  };

                  weekPlan[today].sessions[0] = updatedSession;
                  setWeekPlan(weekPlan);

                  toast(`Route "${selectedRoute.name}" added to today's training!`, 'success');
                  setSelectedRoute(null);

                  setTimeout(() => {
                    navigate('/quest');
                  }, 1000);
                }}
              >
                Add to Planner
              </button>
              <button
                style={{
                  background: '#0f1115',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedRoute(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
