/**
 * Activity Best Efforts Component
 * Displays Strava best efforts (1K, 1 mile, 10K, etc.) with PR indicators
 */

import type { ActivityBestEffort } from '@/types';

interface ActivityBestEffortsProps {
  efforts: ActivityBestEffort[];
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(distance: number, time: number): string {
  if (distance === 0) return '--';
  const paceSecsPerKm = time / distance;
  const mins = Math.floor(paceSecsPerKm / 60);
  const secs = Math.round(paceSecsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export function ActivityBestEfforts({ efforts }: ActivityBestEffortsProps) {
  if (efforts.length === 0) return null;

  // Sort by distance
  const sortedEfforts = [...efforts].sort((a, b) => a.distance - b.distance);

  return (
    <div className="activity-best-efforts" style={{ marginBottom: '24px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--bolt-text)'
        }}
      >
        Best Efforts
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {sortedEfforts.map((effort, index) => (
          <div
            key={effort.id || index}
            className="effort-card"
            style={{
              background: effort.isPR
                ? 'linear-gradient(135deg, rgba(var(--bolt-orange-rgb), 0.15), var(--bolt-surface))'
                : 'var(--bolt-surface)',
              borderRadius: '12px',
              padding: '16px',
              border: effort.isPR
                ? '2px solid var(--bolt-orange)'
                : '1px solid var(--bolt-border)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = effort.isPR
                ? '0 4px 16px rgba(var(--bolt-orange-rgb), 0.3)'
                : '0 4px 16px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {effort.isPR && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'var(--bolt-orange)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🔥</span>
                <span>PR</span>
              </div>
            )}

            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--bolt-text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {effort.effortName}
            </div>

            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--bolt-text)',
                marginBottom: '4px'
              }}
            >
              {formatTime(effort.movingTime)}
            </div>

            <div
              style={{
                fontSize: '14px',
                color: 'var(--bolt-text-muted)'
              }}
            >
              {formatPace(effort.distance, effort.movingTime)} pace
            </div>

            {effort.prRank && effort.prRank > 1 && effort.prRank <= 10 && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: 'var(--bolt-text-muted)',
                  fontWeight: 600
                }}
              >
                #{effort.prRank} All-Time
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
