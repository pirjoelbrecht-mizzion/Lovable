import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { StravaSegment } from '@/services/stravaRoutes';
import { fetchNearbySegments, fetchSegmentDetails, decodePolyline, stravaSegmentToRoute } from '@/services/stravaRoutes';
import { saveSavedRoute } from '@/lib/database';
import { toast } from '@/components/ToastHost';

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

type StravaHeatmapViewProps = {
  initialCenter?: [number, number];
  initialZoom?: number;
  onRouteSelected?: (routeId: string) => void;
  onSegmentsLoaded?: (segments: StravaSegment[]) => void;
  searchLocation?: { lat: number; lon: number } | null;
  searchRadius?: number;
  selectedSegmentId?: number | null;
};

export default function StravaHeatmapView({
  initialCenter = [-74.006, 40.7128],
  initialZoom = 11,
  onRouteSelected,
  onSegmentsLoaded,
  searchLocation,
  searchRadius = 10,
  selectedSegmentId,
}: StravaHeatmapViewProps) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [segments, setSegments] = useState<StravaSegment[]>([]);
  const [filteredSegments, setFilteredSegments] = useState<StravaSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'mapbox' | 'strava' | null>(null);
  const [minDistance, setMinDistance] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50);
  const [minElevation, setMinElevation] = useState(0);
  const [maxElevation, setMaxElevation] = useState(1000);
  const [showFilters, setShowFilters] = useState(false);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const isClickingMarker = useRef(false);

  useEffect(() => {
    if (selectedSegmentId && map.current) {
      const selectedSegment = segments.find(s => s.id === selectedSegmentId);
      if (selectedSegment) {
        map.current.flyTo({
          center: [selectedSegment.start_latlng[1], selectedSegment.start_latlng[0]],
          zoom: 14,
          duration: 1000
        });

        if (map.current.getLayer('route-lines')) {
          map.current.setPaintProperty('route-lines', 'line-color', [
            'case',
            ['==', ['get', 'id'], selectedSegmentId],
            '#ef4444',
            '#f97316'
          ]);
          map.current.setPaintProperty('route-lines', 'line-width', [
            'case',
            ['==', ['get', 'id'], selectedSegmentId],
            5,
            3
          ]);
        }
      }
    }
  }, [selectedSegmentId]);

  useEffect(() => {
    if (searchLocation && map.current) {
      loadSegmentsNearPoint(searchLocation.lon, searchLocation.lat);
      map.current.flyTo({
        center: [searchLocation.lon, searchLocation.lat],
        zoom: 12,
        duration: 1500
      });
    }
  }, [searchLocation, searchRadius]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    if (!mapboxToken || mapboxToken === 'YOUR_MAPBOX_TOKEN_HERE') {
      setMapError('Mapbox token not configured. Please add VITE_MAPBOX_TOKEN to your .env file.');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initialCenter,
      zoom: initialZoom,
      pitch: 0,
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        if (map.current) {
          map.current.setCenter([pos.coords.longitude, pos.coords.latitude]);
        }
      });
    }

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          loadSegmentsNearPoint(pos.coords.longitude, pos.coords.latitude);
        }, () => {
          loadSegmentsNearPoint(initialCenter[0], initialCenter[1]);
        });
      } else {
        loadSegmentsNearPoint(initialCenter[0], initialCenter[1]);
      }
    });

    map.current.on('click', async (e) => {
      if (isClickingMarker.current) {
        isClickingMarker.current = false;
        return;
      }
      const { lng, lat } = e.lngLat;
      await loadSegmentsNearPoint(lng, lat);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialCenter, initialZoom]);

  const loadSegmentsNearPoint = async (lon: number, lat: number) => {
    setLoading(true);
    try {
      const result = await fetchNearbySegments(lat, lon, searchRadius, 'running');

      if ('error' in result) {
        if (result.needsReconnect) {
          setMapError(result.error);
          setErrorType('strava');
        } else {
          toast(result.error, 'error');
        }
        setLoading(false);
        return;
      }

      if (result.length === 0) {
        toast('No routes found in this area. Try another location.', 'info');
        setLoading(false);
        return;
      }

      const enrichedSegments = await Promise.all(
        result.map(async (segment) => {
          if (!segment.total_elevation_gain && !segment.map?.polyline) {
            const details = await fetchSegmentDetails(segment.id);
            if (details) {
              return {
                ...segment,
                total_elevation_gain: details.total_elevation_gain,
                average_grade: details.average_grade,
                map: details.map,
                star_count: details.star_count,
              };
            }
          }
          return segment;
        })
      );

      setSegments(enrichedSegments);
      setFilteredSegments(enrichedSegments);

      if (onSegmentsLoaded) {
        onSegmentsLoaded(enrichedSegments);
      }

      renderMarkers(enrichedSegments);
    } catch (error) {
      console.error('Failed to load segments:', error);
      toast('Failed to load nearby routes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkers = async (segmentsToRender: StravaSegment[]) => {
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    if (map.current?.getLayer('route-lines')) {
      map.current.removeLayer('route-lines');
    }
    if (map.current?.getSource('routes')) {
      map.current.removeSource('routes');
    }

    const features = await Promise.all(
      segmentsToRender.map(async (segment) => {
        let coordinates: number[][] = [
          [segment.start_latlng[1], segment.start_latlng[0]],
          [segment.end_latlng[1], segment.end_latlng[0]],
        ];

        if (segment.map?.polyline) {
          const polylineCoords = decodePolyline(segment.map.polyline);
          coordinates = polylineCoords.map(([lat, lng]) => [lng, lat]);
        } else {
          const details = await fetchSegmentDetails(segment.id);
          if (details?.map?.polyline) {
            const polylineCoords = decodePolyline(details.map.polyline);
            coordinates = polylineCoords.map(([lat, lng]) => [lng, lat]);
            segment.map = details.map;
          }
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: segment.id,
            name: segment.name,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        };
      })
    );

    if (map.current && features.length > 0) {
      map.current.addSource('routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      map.current.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-opacity': 0.7,
        },
      });
    }

    segmentsToRender.forEach(segment => {
        if (!map.current) return;
        if (!segment.start_latlng || segment.start_latlng.length !== 2) return;

        const el = document.createElement('div');
        el.className = 'route-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#f97316';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        el.style.cursor = 'pointer';
        el.style.transition = 'width 0.15s, height 0.15s, margin 0.15s';
        el.addEventListener('mouseenter', () => {
          el.style.width = '26px';
          el.style.height = '26px';
          el.style.marginLeft = '-3px';
          el.style.marginTop = '-3px';
        });
        el.addEventListener('mouseleave', () => {
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.marginLeft = '0';
          el.style.marginTop = '0';
        });

        const distance = segment.distance ? (segment.distance / 1000).toFixed(1) : '0.0';
        const grade = segment.average_grade !== undefined ? segment.average_grade.toFixed(1) : '0.0';

        const popupHTML = `
          <div style="padding: 8px; min-width: 200px;">
            <strong style="display: block; margin-bottom: 4px; font-size: 14px;">${segment.name || 'Unnamed Route'}</strong>
            <div style="font-size: 12px; color: #666; margin-bottom: 6px;">
              ${distance} km •
              ${grade}% grade
            </div>
            <button
              id="add-route-${segment.id}"
              style="
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
              "
            >
              Add to My Routes
            </button>
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeOnClick: false,
          closeButton: true,
          maxWidth: '280px',
        }).setHTML(popupHTML);

        el.addEventListener('click', () => {
          isClickingMarker.current = true;
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([segment.start_latlng[1], segment.start_latlng[0]])
          .setPopup(popup)
          .addTo(map.current);

        popup.on('open', () => {
          setTimeout(() => {
            const btn = document.getElementById(`add-route-${segment.id}`);
            if (btn) {
              btn.onclick = (btnEvent) => {
                btnEvent.preventDefault();
                btnEvent.stopPropagation();
                handleAddRoute(segment);
                popup.remove();
              };
            }
          }, 50);
        });

      markers.current.push(marker);
    });
  };

  const applyFilters = () => {
    const filtered = segments.filter(segment => {
      const distanceKm = (segment.distance || 0) / 1000;
      const elevationGain = segment.total_elevation_gain || 0;

      return distanceKm >= minDistance &&
             distanceKm <= maxDistance &&
             elevationGain >= minElevation &&
             elevationGain <= maxElevation;
    });

    setFilteredSegments(filtered);
    renderMarkers(filtered);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setMinDistance(0);
    setMaxDistance(50);
    setMinElevation(0);
    setMaxElevation(1000);
    setFilteredSegments(segments);
    renderMarkers(segments);
    setShowFilters(false);
  };

  const handleAddRoute = async (segment: StravaSegment) => {
    try {
      const route = stravaSegmentToRoute(segment);
      const result = await saveSavedRoute(route);

      if (result.success) {
        toast(`Added ${segment.name} to your routes`, 'success');
        if (onRouteSelected && result.id) {
          onRouteSelected(result.id);
        }
      } else {
        toast('Failed to save route', 'error');
      }
    } catch (error) {
      console.error('Failed to save route:', error);
      toast('Failed to save route', 'error');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {mapError ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: '#0a0b0d',
            color: '#94a3b8',
            padding: 40,
            textAlign: 'center',
            borderRadius: '12px',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 8 }}>
            Configuration Required
          </div>
          <div style={{ fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>
            {mapError}
          </div>
          {errorType !== 'strava' && (
            <div
              style={{
                marginTop: 20,
                padding: '12px 20px',
                background: '#1e293b',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#cbd5e1',
                textAlign: 'left',
              }}
            >
              {mapError.includes('Mapbox') ? (
                'VITE_MAPBOX_TOKEN=your_token_here'
              ) : (
                <>
                  VITE_MAPBOX_TOKEN=your_mapbox_token
                  <br />
                  VITE_STRAVA_API_TOKEN=your_strava_token
                </>
              )}
            </div>
          )}
          <div style={{ fontSize: 12, marginTop: 16, color: '#64748b', lineHeight: 1.6 }}>
            {errorType === 'strava' ? (
              <>
                Go to{' '}
                <a
                  href="/settings"
                  style={{ color: '#3b82f6', textDecoration: 'underline' }}
                >
                  Settings → Connections
                </a>
                {' '}to reconnect your Strava account
              </>
            ) : mapError.includes('Mapbox') ? (
              <>
                Get a free Mapbox token at{' '}
                <a
                  href="https://account.mapbox.com/access-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'underline' }}
                >
                  mapbox.com
                </a>
              </>
            ) : (
              <>
                Get tokens at{' '}
                <a
                  href="https://account.mapbox.com/access-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'underline' }}
                >
                  mapbox.com
                </a>
                {' '}and{' '}
                <a
                  href="https://www.strava.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'underline' }}
                >
                  strava.com/settings/api
                </a>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                zIndex: 10,
              }}
            >
              Loading nearby routes...
            </div>
          )}
          {!loading && segments.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                zIndex: 10,
                maxWidth: '220px',
              }}
            >
              Click anywhere on the map to discover popular running routes nearby
            </div>
          )}
          {segments.length > 0 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  right: 12,
                  display: 'flex',
                  gap: 8,
                  zIndex: 10,
                  flexWrap: 'wrap',
                  pointerEvents: 'none',
                }}
              >
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    background: 'white',
                    color: '#1e293b',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: showFilters ? '2px solid #f97316' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    pointerEvents: 'auto',
                  }}
                >
                  {minDistance > 0 || maxDistance < 50
                    ? `${minDistance}-${maxDistance} km`
                    : 'Distance'
                  }
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    background: 'white',
                    color: '#1e293b',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: showFilters ? '2px solid #f97316' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    pointerEvents: 'auto',
                  }}
                >
                  {minElevation > 0 || maxElevation < 1000
                    ? `${minElevation}-${maxElevation} m`
                    : 'Elevation'
                  }
                </button>
              </div>

              {showFilters && (
                <div
                  style={{
                    position: 'absolute',
                    top: 60,
                    right: 12,
                    background: 'white',
                    color: '#1e293b',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    zIndex: 10,
                    minWidth: '260px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Filter Routes
                    </div>
                    <button
                      onClick={() => setShowFilters(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: 18,
                        cursor: 'pointer',
                        padding: 0,
                        width: 24,
                        height: 24,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    Distance (km): {minDistance} - {maxDistance}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={minDistance}
                      onChange={(e) => setMinDistance(Number(e.target.value))}
                      style={{
                        width: '70px',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#1e293b',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      min={0}
                      max={maxDistance}
                    />
                    <input
                      type="number"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      style={{
                        width: '70px',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#1e293b',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      min={minDistance}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    Elevation Gain (m): {minElevation} - {maxElevation}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={minElevation}
                      onChange={(e) => setMinElevation(Number(e.target.value))}
                      style={{
                        width: '70px',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#1e293b',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      min={0}
                      max={maxElevation}
                      step={50}
                    />
                    <input
                      type="number"
                      value={maxElevation}
                      onChange={(e) => setMaxElevation(Number(e.target.value))}
                      style={{
                        width: '70px',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#1e293b',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      min={minElevation}
                      step={50}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={applyFilters}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={resetFilters}
                    style={{
                      padding: '8px 12px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  background: 'rgba(0, 0, 0, 0.85)',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '20px',
                  fontSize: 15,
                  fontWeight: 700,
                  zIndex: 10,
                }}
              >
                {filteredSegments.length} {filteredSegments.length === 1 ? 'Route' : 'Routes'}
              </div>
            </>
          )}
          <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
        </>
      )}
    </div>
  );
}
