import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSavedRoutes, type DbSavedRoute } from '@/lib/database';
import { suggestRoutesForTraining, type TrainingTarget, type RouteRecommendation } from '@/ai/brain';
import { getSavedLocation, detectLocation } from '@/utils/location';
import { toast } from '@/components/ToastHost';

type Props = {
  targetDistance: number;
  targetElevation?: number;
  targetTerrain?: 'road' | 'trail' | 'mixed';
  onRouteSelected?: (route: DbSavedRoute) => void;
};

export default function RouteSuggestions({
  targetDistance,
  targetElevation,
  targetTerrain,
  onRouteSelected,
}: Props) {
  const [suggestions, setSuggestions] = useState<RouteRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  console.log('[RouteSuggestions] Render:', { targetDistance, suggestionsCount: suggestions.length, loading, expanded });

  useEffect(() => {
    loadUserLocation();
  }, []);

  useEffect(() => {
    if (targetDistance > 0) {
      loadSuggestions();
    }
  }, [targetDistance, targetElevation, targetTerrain, userLocation]);

  const loadUserLocation = async () => {
    const saved = getSavedLocation();
    if (saved) {
      console.log('RouteSuggestions: Using saved location:', saved);
      setUserLocation({ lat: saved.lat, lon: saved.lon });
      return;
    }

    console.log('RouteSuggestions: No saved location, trying to detect...');
    try {
      const detected = await detectLocation();
      console.log('RouteSuggestions: Detected location:', detected);
      setUserLocation({ lat: detected.lat, lon: detected.lon });
    } catch (error) {
      console.warn('Could not detect location for route suggestions:', error);
      console.log('RouteSuggestions: Using default NYC location');
      setUserLocation({ lat: 40.7128, lon: -74.006 });
    }
  };

  const loadSuggestions = async () => {
    if (!userLocation) {
      console.log('RouteSuggestions: Waiting for location to load...');
      return;
    }

    setLoading(true);
    try {
      const locationFilter = {
        lat: userLocation.lat,
        lon: userLocation.lon,
        radiusKm: 50,
      };

      console.log('RouteSuggestions: Loading routes near', locationFilter);

      const routes = await getSavedRoutes(100, locationFilter);

      console.log(`RouteSuggestions: Found ${routes.length} routes within 50km`);

      if (routes.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const target: TrainingTarget = {
        distance_km: targetDistance,
        elevation_gain_m: targetElevation,
        terrain: targetTerrain,
        weatherAware: true,
        userLat: userLocation?.lat,
        userLon: userLocation?.lon,
      };

      const recommendations = await suggestRoutesForTraining(routes, target);
      setSuggestions(recommendations);
    } catch (error) {
      console.error('Failed to load route suggestions:', error);
      toast('Failed to load route suggestions', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading route suggestions...</div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: expanded ? 12 : 0,
            cursor: 'pointer',
            userSelect: 'none',
            padding: '4px',
            margin: '-4px',
            borderRadius: '8px',
            transition: 'background 0.2s',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('RouteSuggestions (empty) header clicked, expanding:', !expanded);
            setExpanded(!expanded);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', margin: 0 }}>
              Route Suggestions
            </h3>
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              pointerEvents: 'none',
            }}
          >
            ▼
          </button>
        </div>
        {expanded && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 12px 0' }}>
              No saved routes match your training target.
            </p>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 8,
              padding: 12,
            }}>
              <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                💡 How to get route suggestions:
              </div>
              <ol style={{ color: '#94a3b8', fontSize: 13, margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Go to Route Explorer</li>
                <li>Discover routes near you</li>
                <li>Save routes you like</li>
                <li>Come back here for AI-powered recommendations</li>
              </ol>
            </div>
            <Link
              to="/routes"
              style={{
                display: 'block',
                marginTop: 12,
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 8,
                padding: '10px 16px',
                color: '#60a5fa',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              }}
            >
              🗺️ Explore Routes
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          🎯
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600, marginBottom: 2 }}>
            TODAY'S TRAINING TARGET
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
            {targetDistance}km run
          </div>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: expanded ? 12 : 0,
            cursor: 'pointer',
            userSelect: 'none',
            padding: '4px',
            margin: '-4px',
            borderRadius: '8px',
            transition: 'background 0.2s',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('RouteSuggestions header clicked, expanding:', !expanded);
            setExpanded(!expanded);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', margin: 0 }}>
              Route Suggestions
            </h3>
            <span style={{
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 12,
            }}>
              {suggestions.length}
            </span>
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </button>
        </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {suggestions.map(({ route, score, breakdown }, index) => (
            <div
              key={route.id || index}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                padding: 12,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => onRouteSelected?.(route as DbSavedRoute)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                      {route.name}
                    </span>
                    {index === 0 && (
                      <span style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        BEST MATCH
                      </span>
                    )}
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
                        <span style={{ textTransform: 'capitalize' }}>{route.surface_type}</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{
                  background: score >= 0.8
                    ? 'rgba(34, 197, 94, 0.2)'
                    : score >= 0.6
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(251, 191, 36, 0.2)',
                  color: score >= 0.8
                    ? '#4ade80'
                    : score >= 0.6
                      ? '#60a5fa'
                      : '#fbbf24',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: 6,
                  minWidth: 45,
                  textAlign: 'center',
                }}>
                  {Math.round(score * 100)}%
                </div>
              </div>

              {breakdown && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Distance</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      {Math.round(breakdown.distanceScore * 100)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Elevation</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      {Math.round(breakdown.elevationScore * 100)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Surface</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      {Math.round(breakdown.surfaceScore * 100)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={(e) => {
              e.stopPropagation();
              loadSuggestions();
            }}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#60a5fa',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            }}
          >
            🔄 Refresh Suggestions
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
