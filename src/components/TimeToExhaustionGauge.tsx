import type { EnergyDynamics } from '@/types/physiology';

type TimeToExhaustionGaugeProps = {
  energyDynamics: EnergyDynamics;
  totalDistance: number;
};

export default function TimeToExhaustionGauge({
  energyDynamics,
  totalDistance,
}: TimeToExhaustionGaugeProps) {
  const { timeToExhaustion } = energyDynamics;
  const selectedStrategy = energyDynamics.selectedStrategy || 'target';

  const strategies = [
    {
      name: 'aggressive',
      label: 'Aggressive',
      emoji: '🔥',
      color: '#ef4444',
      distance: timeToExhaustion.aggressive,
    },
    {
      name: 'target',
      label: 'Target',
      emoji: '⚖️',
      color: '#3b82f6',
      distance: timeToExhaustion.target,
    },
    {
      name: 'conservative',
      label: 'Conservative',
      emoji: '🐢',
      color: '#22c55e',
      distance: timeToExhaustion.conservative,
    },
  ];

  const maxDistance = Math.max(...strategies.map(s => s.distance), totalDistance);

  return (
    <div style={{
      padding: 20,
      background: 'var(--bg-secondary)',
      borderRadius: 12,
      border: '1px solid var(--line)',
    }}>
      <div style={{
        fontWeight: 600,
        fontSize: '1.1rem',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>⚡</span>
        <span>Time-to-Exhaustion</span>
      </div>

      <div style={{
        position: 'relative',
        height: 80,
        background: 'var(--bg)',
        borderRadius: 8,
        border: '1px solid var(--line)',
        overflow: 'hidden',
      }}>
        {strategies.map((strategy, index) => {
          const percentage = (strategy.distance / maxDistance) * 100;
          const isSelected = selectedStrategy === strategy.name;

          return (
            <div
              key={strategy.name}
              style={{
                position: 'absolute',
                left: 0,
                top: index * 26 + 2,
                width: `${percentage}%`,
                height: 22,
                background: `linear-gradient(90deg, ${strategy.color}, ${strategy.color}dd)`,
                borderRadius: '0 4px 4px 0',
                transition: 'all 0.3s ease',
                opacity: isSelected ? 1 : 0.4,
                transform: isSelected ? 'scaleY(1.1)' : 'scaleY(1)',
                boxShadow: isSelected ? `0 0 12px ${strategy.color}66` : 'none',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'var(--brand)',
            zIndex: 10,
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid var(--line)',
      }}>
        {strategies.map((strategy) => {
          const isSelected = selectedStrategy === strategy.name;
          const diff = strategy.distance - timeToExhaustion.target;

          return (
            <div
              key={strategy.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                opacity: isSelected ? 1 : 0.6,
                transition: 'opacity 0.3s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: isSelected ? 700 : 500,
                fontSize: isSelected ? '1rem' : '0.9rem',
              }}>
                <span style={{ fontSize: '1.2rem' }}>{strategy.emoji}</span>
                <span style={{ color: strategy.color }}>{strategy.label}</span>
              </div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: strategy.color,
              }}>
                {strategy.distance} km
              </div>
              {diff !== 0 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                }}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(0)} km
                </div>
              )}
            </div>
          );
        })}
      </div>

      {energyDynamics.selectedStrategy && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg)',
          borderRadius: 8,
          borderLeft: '4px solid var(--brand)',
        }}>
          <div className="small" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            <strong>💬 Tip:</strong>{' '}
            {selectedStrategy === 'conservative' && `Conservative pacing extends endurance reserve by +${(timeToExhaustion.conservative - timeToExhaustion.aggressive).toFixed(0)} km.`}
            {selectedStrategy === 'target' && 'Balanced pacing strategy optimizes energy management across the distance.'}
            {selectedStrategy === 'aggressive' && `Aggressive start reduces reserve by ${(timeToExhaustion.conservative - timeToExhaustion.aggressive).toFixed(0)} km but may achieve faster early splits.`}
          </div>
        </div>
      )}
    </div>
  );
}
