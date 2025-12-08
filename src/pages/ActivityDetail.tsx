/**
 * Activity Detail Page
 * Comprehensive Strava-style activity view with all rich data
 * Single scrollable page with photos, segments, achievements, gear, and more
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { LogEntry, ActivityPhoto, ActivitySegment, ActivityBestEffort, AthleteGear } from '@/types';
import { ActivityPhotoGallery } from '@/components/activity/ActivityPhotoGallery';
import { ActivitySegments } from '@/components/activity/ActivitySegments';
import { ActivityBestEfforts } from '@/components/activity/ActivityBestEfforts';
import { ActivityGear } from '@/components/activity/ActivityGear';
import RouteMap from '@/components/RouteMap';
import { stravaRichDataService } from '@/services/stravaRichDataService';
import { supabase } from '@/lib/supabase';

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<LogEntry | null>(null);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [segments, setSegments] = useState<ActivitySegment[]>([]);
  const [bestEfforts, setBestEfforts] = useState<ActivityBestEffort[]>([]);
  const [gear, setGear] = useState<AthleteGear | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    loadActivityData();
  }, [id]);

  async function loadActivityData() {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch activity from database
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

      // Map database fields to LogEntry type
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

      // Load rich data in parallel
      const [photosData, segmentsData, effortsData, gearData] = await Promise.all([
        stravaRichDataService.getActivityPhotos(id),
        stravaRichDataService.getActivitySegments(id),
        stravaRichDataService.getActivityBestEfforts(id),
        logEntry.gearId ? stravaRichDataService.getGear(logEntry.gearId) : Promise.resolve(null)
      ]);

      setPhotos(photosData);
      setSegments(segmentsData);
      setBestEfforts(effortsData);
      setGear(gearData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateISO: string): string {
    const date = new Date(dateISO);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatTime(dateISO: string): string {
    const date = new Date(dateISO);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function calculatePace(km: number, minutes: number): string {
    if (km === 0) return '--';
    const paceMin = minutes / km;
    const mins = Math.floor(paceMin);
    const secs = Math.round((paceMin - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', color: 'var(--bolt-text-muted)' }}>
          Loading activity...
        </p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--bolt-text-muted)' }}>Activity not found</p>
        <button onClick={() => navigate('/log')} className="btn primary" style={{ marginTop: '16px' }}>
          Back to Log
        </button>
      </div>
    );
  }

  return (
    <div className="activity-detail-page" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/log')}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--bolt-text-muted)',
          cursor: 'pointer',
          fontSize: '14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        ← Back to Log
      </button>

      {/* Header Section */}
      <div className="activity-header" style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--bolt-text)',
            textShadow: '0 0 20px rgba(var(--bolt-teal-rgb), 0.3)'
          }}
        >
          {activity.title}
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            color: 'var(--bolt-text-muted)',
            flexWrap: 'wrap'
          }}
        >
          {activity.sportType && (
            <span
              style={{
                background: 'rgba(var(--bolt-teal-rgb), 0.15)',
                color: 'var(--bolt-teal)',
                padding: '4px 12px',
                borderRadius: '12px',
                fontWeight: 600
              }}
            >
              {activity.sportType}
            </span>
          )}
          <span>{formatDate(activity.dateISO)}</span>
          {activity.location && (
            <>
              <span>•</span>
              <span>{activity.location}</span>
            </>
          )}
        </div>

        {activity.description && (
          <p
            style={{
              marginTop: '12px',
              fontSize: '16px',
              color: 'var(--bolt-text)',
              lineHeight: '1.6'
            }}
          >
            {activity.description}
          </p>
        )}
      </div>

      {/* Stats Grid - Trail Runner Enhanced */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        <div className="stat-card" style={statCardStyle}>
          <div style={statLabelStyle}>Distance</div>
          <div style={statValueStyle}>{activity.km.toFixed(2)} km</div>
        </div>

        {activity.durationMin && (
          <div className="stat-card" style={statCardStyle}>
            <div style={statLabelStyle}>Time</div>
            <div style={statValueStyle}>{formatDuration(activity.durationMin)}</div>
          </div>
        )}

        {activity.durationMin && (
          <div className="stat-card" style={statCardStyle}>
            <div style={statLabelStyle}>Pace</div>
            <div style={statValueStyle}>{calculatePace(activity.km, activity.durationMin)}</div>
          </div>
        )}

        {activity.elevationGain && (
          <div className="stat-card" style={{...statCardStyle, border: '2px solid var(--bolt-teal)'}}>
            <div style={statLabelStyle}>Elevation Gain</div>
            <div style={{...statValueStyle, color: 'var(--bolt-teal)'}}>
              ↑ {activity.elevationGain.toFixed(0)} m
            </div>
          </div>
        )}

        {activity.elevationLoss && (
          <div className="stat-card" style={{...statCardStyle, border: '2px solid #ff6b6b'}}>
            <div style={statLabelStyle}>Elevation Loss</div>
            <div style={{...statValueStyle, color: '#ff6b6b'}}>
              ↓ {Math.abs(activity.elevationLoss).toFixed(0)} m
            </div>
          </div>
        )}

        {activity.hrAvg && (
          <div className="stat-card" style={statCardStyle}>
            <div style={statLabelStyle}>Avg HR</div>
            <div style={statValueStyle}>{activity.hrAvg} bpm</div>
          </div>
        )}
      </div>

      {/* Weather Conditions - Trail Specific */}
      {(activity.temperature !== undefined || activity.weather || activity.humidity) && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(var(--bolt-teal-rgb), 0.1), rgba(var(--bolt-blue-rgb), 0.1))',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            border: '1px solid var(--bolt-border)'
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '12px',
              color: 'var(--bolt-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🌤️</span>
            Trail Conditions
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              fontSize: '14px'
            }}
          >
            {activity.temperature !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>🌡️</span>
                <span style={{ color: 'var(--bolt-text)' }}>
                  <strong>{Math.round(activity.temperature)}°C</strong>
                </span>
              </div>
            )}
            {activity.humidity !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>💧</span>
                <span style={{ color: 'var(--bolt-text)' }}>
                  <strong>{activity.humidity}%</strong> humidity
                </span>
              </div>
            )}
            {activity.weather && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--bolt-text-muted)' }}>
                  {activity.weather}
                </span>
              </div>
            )}
            {formatTime(activity.dateISO) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>⏰</span>
                <span style={{ color: 'var(--bolt-text)' }}>
                  Started at <strong>{formatTime(activity.dateISO)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Elevation Profile - Enhanced for Trail */}
      {activity.elevationGain && activity.elevationLoss && (
        <div
          style={{
            background: 'var(--bolt-surface)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            border: '1px solid var(--bolt-border)'
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--bolt-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>⛰️</span>
            Elevation Summary
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                Total Vertical Gain
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--bolt-teal)' }}>
                ↑ {activity.elevationGain.toFixed(0)} m
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                Total Vertical Loss
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ff6b6b' }}>
                ↓ {Math.abs(activity.elevationLoss).toFixed(0)} m
              </div>
            </div>
            {activity.elevationLow !== undefined && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                  Min Elevation
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--bolt-text)' }}>
                  {activity.elevationLow.toFixed(0)} m
                </div>
              </div>
            )}
            {activity.elevationLow !== undefined && activity.elevationGain && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                  Max Elevation
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--bolt-text)' }}>
                  {(activity.elevationLow + activity.elevationGain).toFixed(0)} m
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      {(activity.mapPolyline || activity.mapSummaryPolyline) && (
        <div style={{ marginBottom: '32px', borderRadius: '12px', overflow: 'hidden' }}>
          <RouteMap
            polyline={activity.mapSummaryPolyline || activity.mapPolyline}
            width={900}
            height={400}
            durationMin={activity.durationMin}
            elevationStream={activity.elevationStream}
            distanceStream={activity.distanceStream}
            showElevation={true}
          />
        </div>
      )}

      {/* Photos */}
      <ActivityPhotoGallery photos={photos} />

      {/* Segments */}
      <ActivitySegments segments={segments} />

      {/* Best Efforts */}
      <ActivityBestEfforts efforts={bestEfforts} />

      {/* Gear */}
      <ActivityGear gear={gear} />

      {/* Device Info */}
      {activity.deviceName && (
        <div style={{ marginBottom: '24px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '12px',
              color: 'var(--bolt-text)'
            }}
          >
            Device
          </h3>
          <div
            style={{
              background: 'var(--bolt-surface)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              color: 'var(--bolt-text-muted)'
            }}
          >
            {activity.deviceName}
          </div>
        </div>
      )}
    </div>
  );
}

// Shared styles
const statCardStyle: React.CSSProperties = {
  background: 'var(--bolt-surface)',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid var(--bolt-border)',
  textAlign: 'center'
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--bolt-text-muted)',
  marginBottom: '4px'
};

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: 'var(--bolt-text)'
};
