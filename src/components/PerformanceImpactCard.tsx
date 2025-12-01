import type { PerformanceImpact } from '@/types/physiology';

type PerformanceImpactCardProps = {
  performanceImpact: PerformanceImpact;
};

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m`;
}

function getStatusColor(status: PerformanceImpact['status']): string {
  switch (status) {
    case 'optimal': return 'var(--good)';
    case 'acceptable': return '#84cc16';
    case 'warning': return 'var(--warning)';
    case 'danger': return 'var(--bad)';
  }
}

function getStatusLabel(status: PerformanceImpact['status']): string {
  switch (status) {
    case 'optimal': return '✅ Conditions Near-Optimal';
    case 'acceptable': return '✅ Acceptable Conditions';
    case 'warning': return '⚠️ Challenging Conditions';
    case 'danger': return '🚨 Difficult Conditions';
  }
}

export default function PerformanceImpactCard({ performanceImpact }: PerformanceImpactCardProps) {
  const statusColor = getStatusColor(performanceImpact.status);
  const statusLabel = getStatusLabel(performanceImpact.status);

  return (
    <div className="card" style={{
      background: 'var(--bg)',
      border: '1px solid var(--line)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>🏃‍♀️</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          Performance Impact
        </h3>
      </div>

      <div className="row" style={{
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
            Performance Penalty
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: statusColor }}>
            +{performanceImpact.totalPenaltyPct}%
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
            Predicted Finish
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {formatTime(performanceImpact.adjustedTimeMin)}
          </div>
          <div className="small" style={{ color: 'var(--muted)', marginTop: 2 }}>
            vs baseline {formatTime(performanceImpact.baseTimeMin)}
          </div>
        </div>
      </div>

      <div style={{
        padding: 12,
        background: 'var(--bg-secondary)',
        borderRadius: 6,
        borderLeft: `4px solid ${statusColor}`,
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: statusColor }}>
          {statusLabel}
        </div>
        <div className="small" style={{ lineHeight: 1.5 }}>
          {performanceImpact.status === 'optimal' &&
            'Excellent conditions for peak performance. Minor environmental impact only.'
          }
          {performanceImpact.status === 'acceptable' &&
            'Good conditions overall. Some minor adjustments may help optimize performance.'
          }
          {performanceImpact.status === 'warning' &&
            'Challenging conditions expected. Focus on hydration, fueling, and pacing strategy.'
          }
          {performanceImpact.status === 'danger' &&
            'Difficult conditions. Consider adjusting race goals and prioritizing health/safety.'
          }
        </div>
      </div>

      <div>
        <div className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
          Contributing Factors
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {performanceImpact.factors.heat > 0 && (
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="small">🌡️ Heat Impact</span>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                +{performanceImpact.factors.heat}%
              </span>
            </div>
          )}
          {performanceImpact.factors.hydration > 0 && (
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="small">💧 Hydration Loss</span>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                +{performanceImpact.factors.hydration}%
              </span>
            </div>
          )}
          {performanceImpact.factors.fueling > 0 && (
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="small">🍌 Fueling Deficit</span>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                +{performanceImpact.factors.fueling}%
              </span>
            </div>
          )}
          {performanceImpact.factors.fatigue > 0 && (
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="small">😰 Fatigue Penalty</span>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                +{performanceImpact.factors.fatigue}%
              </span>
            </div>
          )}
          {performanceImpact.totalPenaltyPct === 0 && (
            <div className="small" style={{ color: 'var(--muted)', textAlign: 'center', padding: 12 }}>
              No significant performance penalties detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
