import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ToastHost';
import type { DbSavedRoute } from '@/lib/database';

type CommunityRoutesProps = {
  userLocation?: { lat: number; lon: number };
  radiusKm?: number;
  onRouteSelect?: (route: DbSavedRoute) => void;
};

export default function CommunityRoutes({
  userLocation,
  radiusKm = 50,
  onRouteSelect,
}: CommunityRoutesProps) {
  const [routes, setRoutes] = useState<DbSavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'featured' | 'recent'>('all');

  useEffect(() => {
    loadCommunityRoutes();
  }, [filter, userLocation]);

  const loadCommunityRoutes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('saved_routes')
        .select('*')
        .eq('is_public', true)
        .eq('reported', false);

      if (filter === 'featured') {
        query = query.gte('star_count', 5).order('star_count', { ascending: false });
      } else if (filter === 'recent') {
        query = query.order('shared_at', { ascending: false });
      } else {
        query = query.order('popularity_score', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Failed to load community routes:', error);
        toast('Failed to load community routes', 'error');
        return;
      }

      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading community routes:', error);
      toast('Error loading routes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRoute = async (route: DbSavedRoute) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('Please sign in to save routes', 'warn');
      return;
    }

    try {
      const { error } = await supabase.from('saved_routes').insert({
        user_id: user.id,
        name: `${route.name} (Community)`,
        distance_km: route.distance_km,
        elevation_gain_m: route.elevation_gain_m,
        surface_type: route.surface_type,
        start_lat: route.start_lat,
        start_lon: route.start_lon,
        end_lat: route.end_lat,
        end_lon: route.end_lon,
        polyline: route.polyline,
        summary_polyline: route.summary_polyline,
        scenic_score: route.scenic_score,
        popularity_score: route.popularity_score,
        tags: [...(route.tags || []), 'community'],
        source: 'community',
      });

      if (error) {
        console.error('Failed to copy route:', error);
        toast('Failed to save route', 'error');
        return;
      }

      toast(`Route "${route.name}" saved to your collection!`, 'success');
    } catch (error) {
      console.error('Error copying route:', error);
      toast('Error saving route', 'error');
    }
  };

  const handleStarRoute = async (routeId: string, currentStarCount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('Please sign in to star routes', 'warn');
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_routes')
        .update({ star_count: currentStarCount + 1 })
        .eq('id', routeId);

      if (error) {
        console.error('Failed to star route:', error);
        toast('Failed to star route', 'error');
        return;
      }

      setRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, star_count: currentStarCount + 1 } : r))
      );

      toast('Route starred!', 'success');
    } catch (error) {
      console.error('Error starring route:', error);
      toast('Error starring route', 'error');
    }
  };

  const handleReportRoute = async (routeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('Please sign in to report routes', 'warn');
      return;
    }

    const reason = window.prompt(
      'Please provide a reason for reporting this route (optional):'
    );

    if (reason === null) return;

    try {
      const { error } = await supabase
        .from('route_reports')
        .insert({
          route_id: routeId,
          reporter_user_id: user.id,
          reason: reason || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast('You have already reported this route', 'warn');
        } else {
          console.error('Failed to report route:', error);
          toast('Failed to report route', 'error');
        }
        return;
      }

      const { data: routeData } = await supabase
        .from('saved_routes')
        .select('report_count, reported')
        .eq('id', routeId)
        .single();

      if (routeData && routeData.reported) {
        setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      }

      toast('Route reported. Thank you for helping keep the community safe.', 'success');
    } catch (error) {
      console.error('Error reporting route:', error);
      toast('Error reporting route', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#0f1115',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 12, margin: 0 }}>
          Community Routes
        </h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              background: filter === 'all' ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All Routes
          </button>
          <button
            onClick={() => setFilter('featured')}
            style={{
              background: filter === 'featured' ? '#f59e0b' : 'rgba(245, 158, 11, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Featured
          </button>
          <button
            onClick={() => setFilter('recent')}
            style={{
              background: filter === 'recent' ? '#22c55e' : 'rgba(34, 197, 94, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recent
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
            Loading community routes...
          </div>
        ) : routes.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
            No community routes found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {routes.map((route) => (
              <div
                key={route.id}
                style={{
                  background: '#0a0b0d',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  padding: 14,
                  cursor: onRouteSelect ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
                onClick={() => onRouteSelect && onRouteSelect(route)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#161820';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0a0b0d';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
                    {route.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (route.id) handleStarRoute(route.id, route.star_count || 0);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fbbf24',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: 0,
                      }}
                      title="Star this route"
                    >
                      ⭐
                    </button>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                      {route.star_count || 0}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: 12,
                    color: '#64748b',
                    marginBottom: 8,
                  }}
                >
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

                {route.tags && route.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {route.tags.slice(0, 4).map((tag) => (
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

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyRoute(route);
                    }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Copy to My Routes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (route.id) handleReportRoute(route.id);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Report inappropriate route"
                  >
                    Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
