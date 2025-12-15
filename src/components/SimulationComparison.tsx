import type { SimulationComparison as ComparisonData, StartStrategy } from '@/types/whatif';
import { getStrategyEmoji, getStrategyLabel } from '@/utils/startingStrategy';

type SimulationComparisonProps = {
  comparison: ComparisonData;
  distanceKm: number;
  startStrategy?: StartStrategy;
};

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hrs > 0) {
    return hrs + 'h ' + String(mins).padStart(2, '0') + 'm';
  }
  return mins + 'm ' + String(secs).padStart(2, '0') + 's';
}

function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm % 1) * 60);
  return mins + ':' + String(secs).padStart(2, '0');
}

function formatDelta(delta: number, isTime: boolean = false): {
  text: string;
  color: string;
  arrow: string;
} {
  const absDelta = Math.abs(delta);
  const isFaster = delta < 0;

  let text: string;
  if (isTime) {
    const mins = Math.floor(absDelta);
    const secs = Math.floor((absDelta % 1) * 60);
    text = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  } else {
    text = absDelta.toFixed(2);
  }

  return {
    text,
    color: isFaster ? '#46E7B1' : '#FF5C7A',
    arrow: isFaster ? '↓' : '↑',
  };
}

export default function SimulationComparison({ comparison, distanceKm, startStrategy }: SimulationComparisonProps) {
  const timeDelta = formatDelta(comparison.delta.timeMin, true);
  const paceDelta = formatDelta(comparison.delta.pace);
  const pctChange = comparison.delta.timePct;

  const factorChanged = (baseline: number, adjusted: number) => {
    return Math.abs(adjusted - baseline) > 0.001;
  };

  return (
    <div>
      <div style={{
        padding: 20,
        background: 'linear-gradient(135deg, rgba(255, 92, 122, 0.1) 0%, rgba(30, 41, 59, 0.5) 100%)',
        border: '1px solid rgba(255, 92, 122, 0.2)',
        borderRadius: 12,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Time Difference
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: timeDelta.color, display: 'flex', alignItems: 'center', gap: 8 }}>
            {timeDelta.arrow} {timeDelta.text}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            {pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}% change
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Pace Difference
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: paceDelta.color }}>
            {paceDelta.arrow} {paceDelta.text} sec/km
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Baseline Prediction
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              {formatTime(comparison.baseline.predictedTimeMin)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
              {formatPace(comparison.baseline.avgPace)}/km avg
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 10, color: 'rgba(255,255,255,0.6)' }}>Factors:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Terrain</span>
                <b style={{ color: '#fff' }}>{comparison.baseline.factors.terrain.toFixed(3)}x</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Elevation</span>
                <b style={{ color: '#fff' }}>{comparison.baseline.factors.elevation.toFixed(3)}x</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Climate</span>
                <b style={{ color: '#fff' }}>{comparison.baseline.factors.climate.toFixed(3)}x</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fatigue</span>
                <b style={{ color: '#fff' }}>{comparison.baseline.factors.fatigue.toFixed(3)}x</b>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 92, 122, 0.08)',
          border: '2px solid rgba(255, 92, 122, 0.3)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 0 20px rgba(255, 92, 122, 0.1)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', color: '#FF5C7A', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              What-If Prediction
            </div>
            {startStrategy && (
              <div style={{ fontSize: '0.9rem', marginBottom: 10, fontWeight: 600, color: '#fff' }}>
                {getStrategyEmoji(startStrategy)} {getStrategyLabel(startStrategy)}
              </div>
            )}
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              {formatTime(comparison.adjusted.predictedTimeMin)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
              {formatPace(comparison.adjusted.avgPace)}/km avg
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 92, 122, 0.2)', paddingTop: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 10, color: '#FF5C7A' }}>
              Adjusted Factors:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Terrain</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.terrain, comparison.adjusted.factors.terrain)
                    ? '#FF5C7A'
                    : '#fff'
                }}>
                  {comparison.adjusted.factors.terrain.toFixed(3)}x
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Elevation</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.elevation, comparison.adjusted.factors.elevation)
                    ? '#FF5C7A'
                    : '#fff'
                }}>
                  {comparison.adjusted.factors.elevation.toFixed(3)}x
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Climate</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.climate, comparison.adjusted.factors.climate)
                    ? '#FF5C7A'
                    : '#fff'
                }}>
                  {comparison.adjusted.factors.climate.toFixed(3)}x
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fatigue</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.fatigue, comparison.adjusted.factors.fatigue)
                    ? '#FF5C7A'
                    : '#fff'
                }}>
                  {comparison.adjusted.factors.fatigue.toFixed(3)}x
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
