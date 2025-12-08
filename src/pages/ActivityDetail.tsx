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

      {/* Stats Grid */}
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
          <div className="stat-card" style={statCardStyle}>
            <div style={statLabelStyle}>Elevation</div>
            <div style={statValueStyle}>{activity.elevationGain.toFixed(0)} m</div>
          </div>
        )}

        {activity.hrAvg && (
          <div className="stat-card" style={statCardStyle}>
            <div style={statLabelStyle}>Avg HR</div>
            <div style={statValueStyle}>{activity.hrAvg} bpm</div>
          </div>
        )}

        {activity.temperature !== undefined && (
          <div className="stat-card" style={statCardStyle}>
            <div style={statLabelStyle}>Temperature</div>
            <div style={statValueStyle}>{Math.round(activity.temperature)}°C</div>
          </div>
        )}
      </div>

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
