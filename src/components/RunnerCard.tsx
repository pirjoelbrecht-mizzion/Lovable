import { useState } from 'react';
import type { CompanionMatch } from '@/types/community';
import { TERRAIN_OPTIONS, DAY_OPTIONS } from '@/types/community';
import { sendConnectionRequest } from '@/lib/community';
import { toast } from './ToastHost';

interface RunnerCardProps {
  match: CompanionMatch;
  onInvite?: (match: CompanionMatch) => void;
  onConnect?: () => void;
}

export default function RunnerCard({ match, onInvite, onConnect }: RunnerCardProps) {
  const [connecting, setConnecting] = useState(false);

  const terrainOption = TERRAIN_OPTIONS.find(t => t.key === match.preferred_terrain);
  const isLocal = match.match_type === 'local';

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const success = await sendConnectionRequest(match.user_id, match.match_type);
      if (success) {
        toast('Connection request sent!', 'success');
        onConnect?.();
      } else {
        toast('Failed to send request', 'error');
      }
    } catch (error) {
      toast('Error sending request', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const formatPaceRange = () => {
    if (!match.pace_min || !match.pace_max) return 'Pace not set';
    const minMins = Math.floor(match.pace_min);
    const minSecs = Math.round((match.pace_min - minMins) * 60);
    const maxMins = Math.floor(match.pace_max);
    const maxSecs = Math.round((match.pace_max - maxMins) * 60);
    return `${minMins}:${minSecs.toString().padStart(2, '0')} - ${maxMins}:${maxSecs.toString().padStart(2, '0')} /km`;
  };

  const getMatchScoreColor = () => {
    if (match.match_score >= 80) return '#22c55e';
    if (match.match_score >= 60) return '#06b6d4';
    if (match.match_score >= 40) return '#f59e0b';
    return '#f97316';
  };

  const getAvailabilityBadges = () => {
    return match.availability_days.map(day => {
      const dayOption = DAY_OPTIONS.find(d => d.key === day.toLowerCase());
      return dayOption?.label || day.slice(0, 3);
    }).join(', ');
  };

  return (
    <article
      className="card"
      style={{
        background: isLocal
          ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(34, 197, 94, 0.05))'
          : 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05))',
        border: `2px solid ${isLocal ? '#06b6d4' : '#8b5cf6'}`,
        borderRadius: 16,
        padding: 20,
        transition: 'all 0.2s ease',
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 className="h2" style={{ marginBottom: 4 }}>
            {match.display_name}
          </h3>
          <div className="small" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: isLocal ? '#06b6d4' : '#8b5cf6',
                color: 'white',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {isLocal ? '📍 Local' : '🌍 Virtual'}
            </span>
            {isLocal && match.distance_km && (
              <span style={{ color: 'var(--muted)' }}>
                {match.distance_km.toFixed(1)} km away
              </span>
            )}
            {match.location_context && match.location_context !== 'current' && (
              <span
                style={{
                  background: match.location_context === 'upcoming' ? '#f59e0b' : '#6b7280',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {match.location_context === 'upcoming' ? '✈️ Upcoming' : '📅 Past'}
              </span>
            )}
            {match.location_label && (
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                in {match.location_label}
              </span>
            )}
          </div>
          {match.available_dates && (
            <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              📅 {match.available_dates}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              background: getMatchScoreColor(),
              color: 'white',
              padding: '6px 12px',
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {match.match_score}% Match
          </div>
          <div className="small" style={{ marginTop: 4, color: 'var(--muted)' }}>
            Last active: {new Date(match.last_active_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {match.bio && (
        <p className="small" style={{ marginBottom: 12, fontStyle: 'italic', color: 'var(--muted)' }}>
          "{match.bio}"
        </p>
      )}

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div className="small">
            <span style={{ fontWeight: 600 }}>Pace:</span> {formatPaceRange()}
          </div>
          <div className="small">
            <span style={{ fontWeight: 600 }}>Terrain:</span>{' '}
            {terrainOption?.emoji} {terrainOption?.label || match.preferred_terrain}
          </div>
        </div>
        {match.availability_days.length > 0 && (
          <div className="small">
            <span style={{ fontWeight: 600 }}>Runs:</span> {getAvailabilityBadges()}
          </div>
        )}
        {match.preferred_run_time.length > 0 && (
          <div className="small">
            <span style={{ fontWeight: 600 }}>Times:</span>{' '}
            {match.preferred_run_time.map(t => t.replace('_', ' ')).join(', ')}
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn primary"
          onClick={handleConnect}
          disabled={connecting}
          style={{ flex: 1 }}
        >
          {connecting ? 'Connecting...' : '🤝 Connect'}
        </button>
        {onInvite && (
          <button
            className="btn"
            onClick={() => onInvite(match)}
            style={{ flex: 1 }}
          >
            📅 Invite to Run
          </button>
        )}
      </div>
    </article>
  );
}
