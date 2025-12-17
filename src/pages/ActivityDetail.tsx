import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { LogEntry, ActivityPhoto } from '@/types';
import RouteMap from '@/components/RouteMap';
import { stravaRichDataService } from '@/services/stravaRichDataService';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { analyzeTerrainFromStreams } from '@/engine/trailAnalysis';
import { ArrowLeft, Mountain, ChevronDown, Camera, Thermometer, Droplets, Wind, Heart, TrendingUp, TrendingDown } from 'lucide-react';
import './ActivityDetail.css';

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<LogEntry | null>(null);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [terrainExpanded, setTerrainExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadActivityData();
  }, [id]);

  async function loadActivityData() {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching activity:', error);
        navigate('/log');
        return;
      }

      const logEntry: LogEntry = {
        id: data.id,
        title: data.title,
        dateISO: data.date,
        km: data.km,
        durationMin: data.duration_min,
        hrAvg: data.hr_avg,
        source: data.source,
        externalId: data.external_id,
        mapPolyline: data.map_polyline,
        mapSummaryPolyline: data.map_summary_polyline,
        elevationGain: data.elevation_gain,
        elevationLoss: data.elevation_loss,
        elevationLow: data.elevation_low,
        elevationStream: data.elevation_stream,
        distanceStream: data.distance_stream,
        temperature: data.temperature,
        weather: data.weather_conditions,
        location: data.location_name,
        humidity: data.humidity,
        sportType: data.sport_type,
        description: data.description,
        deviceName: data.device_name,
        gearId: data.gear_id,
        hasPhotos: data.has_photos,
        hasSegments: data.has_segments
      };

      setActivity(logEntry);

      const photosData = await stravaRichDataService.getActivityPhotos(id);
      setPhotos(photosData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateISO: string): string {
    const date = new Date(dateISO);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  function calculatePace(km: number, minutes: number): string {
    if (km === 0) return '--';
    const paceMin = minutes / km;
    const mins = Math.floor(paceMin);
    const secs = Math.round((paceMin - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const terrainAnalysis = useMemo(() => {
    if (!activity || !activity.distanceStream || !activity.elevationStream) {
      return null;
    }

    const distanceStream = Array.isArray(activity.distanceStream)
      ? activity.distanceStream
      : JSON.parse(activity.distanceStream as any);
    const elevationStream = Array.isArray(activity.elevationStream)
      ? activity.elevationStream
      : JSON.parse(activity.elevationStream as any);

    return analyzeTerrainFromStreams(
      distanceStream,
      elevationStream,
      activity.durationMin,
      activity.elevationGain
    );
  }, [activity]);

  const hasWeatherData = activity && (activity.temperature !== undefined || activity.humidity !== undefined);
  const hasMapData = activity && (activity.mapPolyline || activity.mapSummaryPolyline);
  const hasElevationData = activity && activity.elevationStream && activity.distanceStream;

  if (loading) {
    return (
      <div className="activity-page">
        <div className="activity-container">
          <div className="activity-loading">
            <div className="activity-loading-spinner" />
            <span className="activity-loading-text">Loading activity...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="activity-page">
        <div className="activity-container">
          <div className="activity-empty">
            <p className="activity-empty-text">Activity not found</p>
            <button className="activity-empty-btn" onClick={() => navigate('/log')}>
              Back to Log
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-page">
      <div className="activity-container">
        <header className="activity-header">
          <button className="activity-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="activity-header-info">
            <h1 className="activity-title">{activity.title}</h1>
            <p className="activity-date">{formatDate(activity.dateISO)}</p>
          </div>
        </header>

        <div className="activity-stats-row">
          <div className="activity-stat-pill">
            <span className="activity-stat-label">Distance</span>
            <span className="activity-stat-value">{activity.km.toFixed(1)} km</span>
          </div>
          {activity.durationMin && (
            <div className="activity-stat-pill">
              <span className="activity-stat-label">Time</span>
              <span className="activity-stat-value">{formatDuration(activity.durationMin)}</span>
            </div>
          )}
          {activity.durationMin && activity.km > 0 && (
            <div className="activity-stat-pill">
              <span className="activity-stat-label">Pace</span>
              <span className="activity-stat-value highlight">{calculatePace(activity.km, activity.durationMin)}/km</span>
            </div>
          )}
          {activity.hrAvg && (
            <div className="activity-stat-pill">
              <span className="activity-stat-label">Avg HR</span>
              <span className="activity-stat-value">{activity.hrAvg}</span>
            </div>
          )}
          {activity.elevationGain && (
            <div className="activity-stat-pill">
              <span className="activity-stat-label">Gain</span>
              <span className="activity-stat-value">{Math.round(activity.elevationGain)}m</span>
            </div>
          )}
        </div>

        <div className="activity-main-grid">
          <div className="activity-main-content">
            {hasMapData && (
              <div className="activity-map-card">
                <div className="activity-map-wrapper">
                  <RouteMap
                    polyline={activity.mapSummaryPolyline || activity.mapPolyline}
                    width={800}
                    height={400}
                    durationMin={activity.durationMin}
                    elevationStream={activity.elevationStream}
                    distanceStream={activity.distanceStream}
                    showElevation={false}
                  />
                </div>
              </div>
            )}

            {hasElevationData && (
              <div className="activity-elevation-card">
                <div className="activity-elevation-header">
                  <Mountain className="activity-elevation-icon" size={16} />
                  <span className="activity-elevation-title">Elevation</span>
                  <div className="activity-elevation-stats">
                    {activity.elevationGain && (
                      <div className="activity-elevation-stat">
                        <div className="activity-elevation-stat-label">Gain</div>
                        <div className="activity-elevation-stat-value gain">+{Math.round(activity.elevationGain)}m</div>
                      </div>
                    )}
                    {activity.elevationLoss && (
                      <div className="activity-elevation-stat">
                        <div className="activity-elevation-stat-label">Loss</div>
                        <div className="activity-elevation-stat-value loss">-{Math.round(activity.elevationLoss)}m</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="activity-elevation-chart">
                  <RouteMap
                    polyline={activity.mapSummaryPolyline || activity.mapPolyline}
                    width={800}
                    height={80}
                    durationMin={activity.durationMin}
                    elevationStream={activity.elevationStream}
                    distanceStream={activity.distanceStream}
                    showElevation={true}
                    showMap={false}
                  />
                </div>
              </div>
            )}

            {terrainAnalysis && terrainAnalysis.breakdown && terrainAnalysis.breakdown.length > 0 && (
              <div className="activity-terrain-card">
                <div
                  className="activity-terrain-header"
                  onClick={() => setTerrainExpanded(!terrainExpanded)}
                >
                  <div className="activity-terrain-title-row">
                    <span className="activity-terrain-icon">terrain</span>
                    <span className="activity-terrain-title">Terrain Breakdown</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`activity-terrain-toggle ${terrainExpanded ? 'expanded' : ''}`}
                  />
                </div>

                {terrainExpanded && (
                  <div className="activity-terrain-content">
                    <div className="activity-terrain-bar">
                      {terrainAnalysis.breakdown.map((terrain: any, idx: number) => (
                        <div
                          key={idx}
                          className={`activity-terrain-segment ${terrain.type}`}
                          style={{ width: `${terrain.percentage}%` }}
                        >
                          {terrain.percentage > 12 && (
                            <span className="activity-terrain-segment-label">{terrain.percentage.toFixed(0)}%</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="activity-terrain-legend">
                      {terrainAnalysis.breakdown.map((terrain: any, idx: number) => (
                        <div key={idx} className="activity-terrain-legend-item">
                          <div className={`activity-terrain-legend-dot ${terrain.type}`} />
                          <span className="activity-terrain-legend-text">{terrain.type}</span>
                          <span className="activity-terrain-legend-value">{terrain.distance.toFixed(1)}km</span>
                        </div>
                      ))}
                    </div>

                    {terrainAnalysis.vamStats && (
                      <div className="activity-vam-grid">
                        {terrainAnalysis.vamStats.peakVAM && (
                          <div className="activity-vam-item">
                            <div className="activity-vam-value">{terrainAnalysis.vamStats.peakVAM.toFixed(0)}</div>
                            <div className="activity-vam-label">Peak VAM (m/hr)</div>
                          </div>
                        )}
                        {terrainAnalysis.vamStats.averageVAM && (
                          <div className="activity-vam-item">
                            <div className="activity-vam-value">{terrainAnalysis.vamStats.averageVAM.toFixed(0)}</div>
                            <div className="activity-vam-label">Avg VAM (m/hr)</div>
                          </div>
                        )}
                        {terrainAnalysis.vamStats.climbTime && (
                          <div className="activity-vam-item">
                            <div className="activity-vam-value">{formatDuration(terrainAnalysis.vamStats.climbTime)}</div>
                            <div className="activity-vam-label">Climb Time</div>
                          </div>
                        )}
                        {terrainAnalysis.vamStats.climbDistance && (
                          <div className="activity-vam-item">
                            <div className="activity-vam-value">{terrainAnalysis.vamStats.climbDistance.toFixed(1)}</div>
                            <div className="activity-vam-label">Climb Dist (km)</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {photos.length > 0 && (
              <div className="activity-photos-card">
                <div className="activity-photos-header">
                  <Camera className="activity-photos-icon" size={16} />
                  <span className="activity-photos-title">Photos</span>
                  <span className="activity-photos-count">{photos.length} photos</span>
                </div>
                <div className="activity-photos-grid">
                  {photos.slice(0, 6).map((photo, idx) => (
                    <div key={idx} className="activity-photo-item">
                      <img
                        src={photo.urls?.['600'] || photo.urls?.['2048']}
                        alt={`Activity photo ${idx + 1}`}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="activity-sidebar">
            {hasWeatherData && (
              <div className="activity-conditions-card">
                <div className="activity-conditions-header">
                  <span className="activity-conditions-icon">weather</span>
                  <span className="activity-conditions-title">Conditions</span>
                </div>
                <div className="activity-conditions-grid">
                  {activity.temperature !== undefined && (
                    <div className="activity-condition-item">
                      <div className="activity-condition-value">{Math.round(activity.temperature)}C</div>
                      <div className="activity-condition-label">Temp</div>
                    </div>
                  )}
                  {activity.humidity !== undefined && (
                    <div className="activity-condition-item">
                      <div className="activity-condition-value">{activity.humidity}%</div>
                      <div className="activity-condition-label">Humidity</div>
                    </div>
                  )}
                  {activity.weather && (
                    <div className="activity-condition-item">
                      <div className="activity-condition-value" style={{ fontSize: '14px' }}>{activity.weather}</div>
                      <div className="activity-condition-label">Weather</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activity.temperature !== undefined && activity.temperature > 25 && (
              <div className="activity-heat-card">
                <div className="activity-heat-header">
                  <div className="activity-heat-title-row">
                    <span className="activity-heat-icon">fire</span>
                    <span className="activity-heat-title">Heat Impact</span>
                  </div>
                  <div className="activity-heat-level">
                    <span className="activity-heat-level-text">Level</span>
                    <span className="activity-heat-level-value">
                      {activity.temperature >= 35 ? 4 : activity.temperature >= 30 ? 3 : 2}
                    </span>
                  </div>
                </div>

                <div className="activity-heat-metrics">
                  <div className="activity-heat-metric">
                    <div className="activity-heat-metric-value">{Math.round(activity.temperature)}C</div>
                    <div className="activity-heat-metric-label">Temp</div>
                  </div>
                  {activity.humidity !== undefined && (
                    <div className="activity-heat-metric">
                      <div className="activity-heat-metric-value">{activity.humidity}%</div>
                      <div className="activity-heat-metric-label">Humidity</div>
                    </div>
                  )}
                </div>

                <div className="activity-heat-impacts">
                  <div className="activity-heat-impact">
                    <Heart className="activity-heat-impact-icon" size={14} style={{ color: '#ef4444' }} />
                    <span className="activity-heat-impact-text">HR elevated</span>
                    <span className="activity-heat-impact-value">+5-10 bpm</span>
                  </div>
                  <div className="activity-heat-impact">
                    <TrendingDown className="activity-heat-impact-icon" size={14} style={{ color: '#f97316' }} />
                    <span className="activity-heat-impact-text">Pace impact</span>
                    <span className="activity-heat-impact-value">-5-10%</span>
                  </div>
                </div>
              </div>
            )}

            {activity.location && (
              <div className="activity-conditions-card">
                <div className="activity-conditions-header">
                  <span className="activity-conditions-icon">location</span>
                  <span className="activity-conditions-title">Location</span>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{activity.location}</p>
              </div>
            )}

            {activity.description && (
              <div className="activity-conditions-card">
                <div className="activity-conditions-header">
                  <span className="activity-conditions-icon">description</span>
                  <span className="activity-conditions-title">Notes</span>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{activity.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
