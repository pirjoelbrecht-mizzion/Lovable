import type { StartStrategy } from '@/types/whatif';
import { getStrategyEmoji, getStrategyDescription } from '@/utils/startingStrategy';

interface StrategyRecommendationProps {
  strategy: StartStrategy;
  conditions: {
    temperature?: number;
    humidity?: number;
    elevation?: number;
    readiness?: number;
    distanceKm?: number;
  };
}

function getRecommendation(
  strategy: StartStrategy,
  conditions: StrategyRecommendationProps['conditions']
): { message: string; warning?: string; advantage?: string } {
  const { temperature = 20, humidity = 50, elevation = 0, readiness = 75, distanceKm = 42 } = conditions;

  const isHot = temperature > 28;
  const isHumid = humidity > 70;
  const isHilly = elevation > 1000;
  const isLongDistance = distanceKm > 50;
  const isFatigued = readiness < 70;

  if (strategy === 'conservative') {
    let advantage = 'Preserves energy for strong negative split finish.';
    let warning = undefined;

    if (isHot || isHumid) {
      advantage = 'Excellent choice for hot/humid conditions. Minimizes heat stress and dehydration risk.';
    } else if (isHilly || isLongDistance) {
      advantage = 'Smart pacing for challenging terrain or ultra distances. Delays fatigue accumulation.';
    } else if (isFatigued) {
      advantage = 'Best approach when not fully recovered. Protects against early burnout.';
    } else if (!isHot && !isHumid && readiness > 85 && distanceKm < 43) {
      warning = 'May sacrifice 3-5 minutes on ideal day. Consider target pacing if conditions stay perfect.';
    }

    return {
      message: 'Conservative start: Begin 3-5% slower than target pace for first 20-30% of race.',
      warning,
      advantage,
    };
  }

  if (strategy === 'aggressive') {
    let advantage = 'Maximizes time gained in early miles when fresh.';
    let warning = 'High risk strategy. Monitor heart rate closely - back off if zones climb too quickly.';

    if (isHot || isHumid) {
      warning = 'Dangerous in heat. Fast start significantly increases core temperature and dehydration risk. Expect major slowdown after 50% distance.';
    } else if (isHilly || isLongDistance) {
      warning = 'Very risky for mountain/ultra events. Energy depletion and GI distress likely. Consider conservative start.';
    } else if (isFatigued) {
      warning = 'Not recommended when fatigued. High probability of DNF or severe performance decline. Switch to conservative.';
    } else if (readiness > 90 && !isHot && !isHumid && distanceKm < 43) {
      advantage = 'Good conditions for PR attempt. Ideal weather and peak form support aggressive pacing.';
      warning = 'Still risky - requires excellent execution and fueling. Prepare for suffering in final 25%.';
    }

    return {
      message: 'Aggressive start: Begin 5-7% faster than target pace. Hold as long as possible.',
      warning,
      advantage,
    };
  }

  let advantage = 'Balanced effort distribution. Proven approach for most road races.';
  let warning = undefined;

  if (isHot && isHumid) {
    warning = 'Consider conservative start in severe heat. Even pacing still carries heat stress risk.';
  } else if (isLongDistance && readiness > 85) {
    advantage = 'Solid choice for ultras with good preparation. Maintains steady energy expenditure.';
  }

  return {
    message: 'Target pacing: Maintain consistent pace and heart rate throughout race.',
    warning,
    advantage,
  };
}

export default function StrategyRecommendation({ strategy, conditions }: StrategyRecommendationProps) {
  const rec = getRecommendation(strategy, conditions);

  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-secondary)',
      borderRadius: 8,
      borderLeft: `4px solid ${strategy === 'aggressive' ? 'var(--bad)' : strategy === 'conservative' ? 'var(--good)' : 'var(--brand)'}`,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
          {getStrategyEmoji(strategy)} {strategy.charAt(0).toUpperCase() + strategy.slice(1)} Start Strategy
        </div>
        <div className="small" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          {getStrategyDescription(strategy)}
        </div>
      </div>

      <div style={{ marginBottom: rec.warning || rec.advantage ? 12 : 0 }}>
        <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
          Race Execution:
        </div>
        <div className="small" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          {rec.message}
        </div>
      </div>

      {rec.advantage && (
        <div style={{
          marginBottom: rec.warning ? 12 : 0,
          padding: 10,
          background: 'var(--good-bg)',
          borderRadius: 6,
          borderLeft: '3px solid var(--good)',
        }}>
          <div className="small" style={{ fontWeight: 600, color: 'var(--good)', marginBottom: 4 }}>
            Advantage
          </div>
          <div className="small" style={{ lineHeight: 1.5 }}>
            {rec.advantage}
          </div>
        </div>
      )}

      {rec.warning && (
        <div style={{
          padding: 10,
          background: strategy === 'aggressive' ? 'var(--bad-bg)' : 'var(--warning-bg)',
          borderRadius: 6,
          borderLeft: `3px solid ${strategy === 'aggressive' ? 'var(--bad)' : 'var(--warning)'}`,
        }}>
          <div className="small" style={{ fontWeight: 600, color: strategy === 'aggressive' ? 'var(--bad)' : 'var(--warning)', marginBottom: 4 }}>
            {strategy === 'aggressive' ? 'Risk Warning' : 'Consideration'}
          </div>
          <div className="small" style={{ lineHeight: 1.5 }}>
            {rec.warning}
          </div>
        </div>
      )}
    </div>
  );
}
