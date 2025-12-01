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
    color: isFaster ? 'var(--good)' : 'var(--warning)',
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
    <div className="simulation-comparison">
      <div style={{
        padding: 16,
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        borderLeft: '4px solid var(--brand)',
        marginBottom: 16,
      }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>Time Difference</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: timeDelta.color }}>
              {timeDelta.arrow} {timeDelta.text}
            </div>
            <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}% change
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>Pace Difference</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: paceDelta.color }}>
              {paceDelta.arrow} {paceDelta.text} sec/km
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="small" style={{ color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
              Baseline Prediction
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>
              {formatTime(comparison.baseline.predictedTimeMin)}
            </div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              {formatPace(comparison.baseline.avgPace)}/km avg
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>Factors:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Terrain</span>
                <b>{comparison.baseline.factors.terrain.toFixed(3)}×</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Elevation</span>
                <b>{comparison.baseline.factors.elevation.toFixed(3)}×</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Climate</span>
                <b>{comparison.baseline.factors.climate.toFixed(3)}×</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Fatigue</span>
                <b>{comparison.baseline.factors.fatigue.toFixed(3)}×</b>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--brand-bg)', border: '2px solid var(--brand)' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="small" style={{ color: 'var(--brand)', marginBottom: 8, fontWeight: 600 }}>
              What-If Prediction
            </div>
            {startStrategy && (
              <div className="small" style={{ marginBottom: 8, fontWeight: 600 }}>
                {getStrategyEmoji(startStrategy)} {getStrategyLabel(startStrategy)}
              </div>
            )}
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>
              {formatTime(comparison.adjusted.predictedTimeMin)}
            </div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              {formatPace(comparison.adjusted.avgPace)}/km avg
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--brand)', paddingTop: 12 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 8, color: 'var(--brand)' }}>
              Adjusted Factors:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Terrain</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.terrain, comparison.adjusted.factors.terrain)
                    ? 'var(--brand)'
                    : 'inherit'
                }}>
                  {comparison.adjusted.factors.terrain.toFixed(3)}×
                </b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Elevation</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.elevation, comparison.adjusted.factors.elevation)
                    ? 'var(--brand)'
                    : 'inherit'
                }}>
                  {comparison.adjusted.factors.elevation.toFixed(3)}×
                </b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Climate</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.climate, comparison.adjusted.factors.climate)
                    ? 'var(--brand)'
                    : 'inherit'
                }}>
                  {comparison.adjusted.factors.climate.toFixed(3)}×
                </b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>Fatigue</span>
                <b style={{
                  color: factorChanged(comparison.baseline.factors.fatigue, comparison.adjusted.factors.fatigue)
                    ? 'var(--brand)'
                    : 'inherit'
                }}>
                  {comparison.adjusted.factors.fatigue.toFixed(3)}×
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
