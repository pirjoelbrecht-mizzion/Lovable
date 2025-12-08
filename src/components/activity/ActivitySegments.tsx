/**
 * Activity Segments Component
 * Displays Strava segment efforts with PR badges and achievement types
 */

import type { ActivitySegment } from '@/types';

interface ActivitySegmentsProps {
  segments: ActivitySegment[];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(distance: number, time: number): string {
  if (distance === 0) return '--';
  const paceSecsPerKm = time / distance;
  const mins = Math.floor(paceSecsPerKm / 60);
  const secs = Math.round(paceSecsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function getAchievementBadge(segment: ActivitySegment) {
  if (segment.achievementType === 'pr') {
    return {
      icon: '🔥',
      text: 'PR',
      color: 'var(--bolt-orange)',
      bgColor: 'rgba(var(--bolt-orange-rgb), 0.15)'
    };
  } else if (segment.achievementType === '2nd') {
    return {
      icon: '⚡',
      text: '2nd Best',
      color: 'var(--bolt-teal)',
      bgColor: 'rgba(var(--bolt-teal-rgb), 0.15)'
    };
  } else if (segment.achievementType === '3rd') {
    return {
      icon: '✨',
      text: '3rd Best',
      color: 'var(--bolt-green)',
      bgColor: 'rgba(var(--bolt-green-rgb), 0.15)'
    };
  } else if (segment.achievementType === 'top10') {
    return {
      icon: '⭐',
      text: 'Top 10',
      color: 'var(--bolt-text-muted)',
      bgColor: 'rgba(128, 128, 128, 0.15)'
    };
  }
  return null;
}

export function ActivitySegments({ segments }: ActivitySegmentsProps) {
  if (segments.length === 0) return null;

  return (
    <div className="activity-segments" style={{ marginBottom: '24px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--bolt-text)'
        }}
      >
        Segments ({segments.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {segments.map((segment) => {
          const badge = getAchievementBadge(segment);

          return (
            <div
              key={segment.id || segment.segmentId}
              className="segment-card"
              style={{
                background: 'var(--bolt-surface)',
                borderRadius: '12px',
                padding: '16px',
                border: badge ? `2px solid ${badge.color}` : '1px solid var(--bolt-border)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = badge
                  ? `0 4px 16px ${badge.color}40`
                  : '0 4px 16px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: 'var(--bolt-text)'
                    }}
                  >
                    {segment.segmentName}
                  </h4>

                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '14px',
                      color: 'var(--bolt-text-muted)',
                      marginBottom: '8px'
                    }}
                  >
                    <span>{(segment.distance).toFixed(2)} km</span>
                    {segment.avgGrade && (
                      <span>{segment.avgGrade > 0 ? '+' : ''}{segment.avgGrade.toFixed(1)}%</span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '14px',
                      color: 'var(--bolt-text)'
                    }}
                  >
                    <div>
                      <strong>{formatTime(segment.movingTime)}</strong>
                      <span style={{ color: 'var(--bolt-text-muted)', marginLeft: '4px' }}>time</span>
                    </div>
                    <div>
                      <strong>{formatPace(segment.distance, segment.movingTime)}</strong>
                      <span style={{ color: 'var(--bolt-text-muted)', marginLeft: '4px' }}>GAP</span>
                    </div>
                  </div>
                </div>

                {badge && (
                  <div
                    style={{
                      background: badge.bgColor,
                      color: badge.color,
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      animation: segment.isPR ? 'pulse 2s ease-in-out infinite' : 'none'
                    }}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </div>
                )}
              </div>

              {segment.prRank && segment.prRank <= 10 && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--bolt-text-muted)'
                  }}
                >
                  #{segment.prRank} Personal Record
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
