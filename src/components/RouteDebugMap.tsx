import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { suggestRoutesForTraining, type TrainingTarget, type RouteRecommendation } from '@/ai/brain';
import { mockRoutes } from '@/tests/mockRoutes';
import { getWeatherForLocation, type CurrentWeather } from '@/utils/weather';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

/**
 * RouteDebugMap
 * ------------------------------------------------------------
 * Development component that visually displays top AI route
 * recommendations on a Mapbox map for debugging and tuning.
 *
 * - Uses mock route dataset
 * - Displays top 3 routes with color-coded markers
 * - Shows popup info with AI scores
 * - Optional weather-aware mode
 */

type Props = {
  targetDistance: number;
  targetElevation?: number;
  targetTerrain?: 'road' | 'trail' | 'mixed';
  weatherAware?: boolean;
};

export default function RouteDebugMap({
  targetDistance = 10,
  targetElevation = 400,
  targetTerrain = 'trail',
  weatherAware = false,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [recommendations, setRecommendations] = useState<RouteRecommendation[]>([]);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-74.006, 40.7128],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  useEffect(() => {
    loadData();
  }, [targetDistance, targetElevation, targetTerrain, weatherAware]);

  const loadData = async () => {
    setLoading(true);

    try {
      const target: TrainingTarget = {
        distance_km: targetDistance,
        elevation_gain_m: targetElevation,
        terrain: targetTerrain,
        weatherAware,
        userLat: 40.7128,
        userLon: -74.006,
      };

      if (weatherAware) {
        const currentWeather = await getWeatherForLocation(40.7128, -74.006);
        setWeather(currentWeather);
      }

      const results = await suggestRoutesForTraining(mockRoutes, target);
      setRecommendations(results);

      if (map.current && results.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();

        results.forEach((rec) => {
          if (rec.route.start_lat && rec.route.start_lon) {
            bounds.extend([rec.route.start_lon, rec.route.start_lat]);
          }
        });

        map.current.fitBounds(bounds, { padding: 50, maxZoom: 13 });
      }
    } catch (error) {
      console.error('Failed to load route debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!map.current || recommendations.length === 0) return;

    recommendations.forEach((rec, index) => {
      const { route, score } = rec;
      if (!route.start_lat || !route.start_lon) return;

      const colors = ['#f97316', '#3b82f6', '#10b981'];
      const color = colors[index % colors.length];

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([route.start_lon, route.start_lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; min-width: 200px;">
              <strong style="font-size: 14px;">${route.name}</strong><br/>
              <div style="margin-top: 6px; font-size: 12px; color: #64748b;">
                ${route.distance_km} km • ${route.elevation_gain_m || 0} m<br/>
                ${route.surface_type || 'unknown'} • Score: <b>${(score * 100).toFixed(0)}%</b>
              </div>
            </div>
          `)
        )
        .addTo(map.current!);
    });

    return () => {
      if (map.current) {
        const markers = document.querySelectorAll('.mapboxgl-marker');
        markers.forEach(marker => marker.remove());
      }
    };
  }, [recommendations]);

  return (
    <div style={{ padding: 24, background: '#0a0b0d', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>
          🧠 Route Recommendation Debug Map
        </h2>
        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
          Visualizes top 3 AI-recommended routes from the mock dataset. Colors correspond to rank.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 8,
            padding: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Target Distance</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
              {targetDistance} km
            </div>
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 8,
            padding: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Target Elevation</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
              {targetElevation} m
            </div>
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 8,
            padding: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Terrain Type</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'white', textTransform: 'capitalize' }}>
              {targetTerrain}
            </div>
          </div>

          {weatherAware && weather && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: 8,
              padding: 16,
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 4 }}>Current Weather</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
                {weather.temp}°C • {weather.conditions}
              </div>
            </div>
          )}
        </div>

        <div ref={mapContainer} style={{
          width: '100%',
          height: 500,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          marginBottom: 24,
        }} />

        {loading ? (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            Loading route recommendations...
          </div>
        ) : recommendations.length > 0 ? (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 12,
            padding: 24,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 16 }}>
              AI Route Rankings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommendations.map((rec, index) => {
                const colors = ['#f97316', '#3b82f6', '#10b981'];
                const color = colors[index % colors.length];

                return (
                  <div
                    key={rec.route.id || index}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: 8,
                      padding: 16,
                      border: `2px solid ${color}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 4 }}>
                          {index + 1}. {rec.route.name}
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                          {rec.route.distance_km} km • {rec.route.elevation_gain_m || 0} m • {rec.route.surface_type}
                        </div>
                      </div>
                      <div style={{
                        background: color,
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: 6,
                      }}>
                        {Math.round(rec.score * 100)}%
                      </div>
                    </div>

                    {rec.breakdown && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 12,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Distance</div>
                          <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                            {Math.round(rec.breakdown.distanceScore * 100)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Elevation</div>
                          <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                            {Math.round(rec.breakdown.elevationScore * 100)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Surface</div>
                          <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                            {Math.round(rec.breakdown.surfaceScore * 100)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            No route recommendations found for the given criteria.
          </div>
        )}
      </div>
    </div>
  );
}
