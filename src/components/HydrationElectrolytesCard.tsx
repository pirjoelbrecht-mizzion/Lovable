import type { HydrationState } from '@/types/physiology';

type HydrationElectrolytesCardProps = {
  hydration: HydrationState;
};

function getHydrationStatus(hydrationPct: number): { label: string; color: string } {
  if (hydrationPct >= 95) {
    return { label: 'Optimal', color: 'var(--good)' };
  } else if (hydrationPct >= 85) {
    return { label: 'Good', color: 'var(--good)' };
  } else if (hydrationPct >= 75) {
    return { label: 'Acceptable', color: 'var(--warning)' };
  } else {
    return { label: 'Dehydrated', color: 'var(--bad)' };
  }
}

function getSodiumStatus(balanceMg: number): { label: string; color: string } {
  if (balanceMg >= -100 && balanceMg <= 100) {
    return { label: 'Balanced', color: 'var(--good)' };
  } else if (balanceMg > 100) {
    return { label: 'Surplus', color: 'var(--good)' };
  } else if (balanceMg >= -300) {
    return { label: 'Low', color: 'var(--warning)' };
  } else {
    return { label: 'Depleted', color: 'var(--bad)' };
  }
}

function getHydrationBarColor(hydrationPct: number): string {
  if (hydrationPct >= 90) return '#22c55e';
  if (hydrationPct >= 85) return '#84cc16';
  if (hydrationPct >= 75) return '#f59e0b';
  return '#ef4444';
}

export default function HydrationElectrolytesCard({ hydration }: HydrationElectrolytesCardProps) {
  const hydrationStatus = getHydrationStatus(hydration.hydrationPct);
  const sodiumStatus = getSodiumStatus(hydration.sodiumBalanceMg);
  const barColor = getHydrationBarColor(hydration.hydrationPct);

  return (
    <div className="card" style={{
      background: 'var(--bg)',
      border: '1px solid var(--line)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>💧</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          Hydration & Electrolytes
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="small" style={{ fontWeight: 500 }}>Hydration Level</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                {Math.round(hydration.hydrationPct)}%
              </span>
              <span
                className="small"
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: hydrationStatus.color,
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {hydrationStatus.label}
              </span>
            </div>
          </div>

          <div style={{
            width: '100%',
            height: 12,
            background: 'var(--bg-secondary)',
            borderRadius: 6,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${Math.min(100, hydration.hydrationPct)}%`,
              height: '100%',
              background: barColor,
              borderRadius: 6,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />

            {hydration.hydrationPct < 85 && (
              <div style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: hydration.hydrationPct < 75 ? '#fff' : 'var(--muted)',
              }}>
                ⚠️
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="small" style={{ fontWeight: 500 }}>Sodium Balance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: sodiumStatus.color }}>
                {hydration.sodiumBalanceMg > 0 ? '+' : ''}{hydration.sodiumBalanceMg} mg
              </span>
              <span
                className="small"
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: sodiumStatus.color,
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {sodiumStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div style={{
          padding: 12,
          background: 'var(--bg-secondary)',
          borderRadius: 6,
          borderLeft: hydration.hydrationPct < 85 ? '3px solid var(--warning)' : '3px solid var(--good)',
        }}>
          <div className="small" style={{ lineHeight: 1.5 }}>
            <strong>Sweat Rate:</strong> {hydration.sweatRateMlPerHr} ml/hr
          </div>
          {hydration.hydrationPct < 85 && (
            <div className="small" style={{ color: 'var(--warning)', marginTop: 8, lineHeight: 1.5 }}>
              ⚠️ Hydration below optimal. Increase fluid intake to prevent performance decline.
            </div>
          )}
          {hydration.sodiumBalanceMg < -200 && (
            <div className="small" style={{ color: 'var(--warning)', marginTop: 8, lineHeight: 1.5 }}>
              ⚠️ Sodium depletion risk. Consider electrolyte supplements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
