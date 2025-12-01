import type { BaselineMetrics, MetricDelta } from '@/utils/baselineComparison';
import {
  calculateTimeDelta,
  calculateHydrationDelta,
  calculatePercentageDelta,
  calculatePerformancePenaltyDelta,
  formatTimeDelta,
  formatPercentageDelta,
} from '@/utils/baselineComparison';
import ComparisonBadge from './ComparisonBadge';
import type { PhysiologicalSimulation } from '@/types/physiology';
import type { RaceSimulation } from '@/hooks/useRaceSimulation';

type ResultsSidebarProps = {
  simulation: RaceSimulation;
  adjustedSimulation: {
    predictedTimeMin: number;
    factors: {
      terrain: number;
      elevation: number;
      climate: number;
      fatigue: number;
    };
  } | null;
  baseline: BaselineMetrics;
  physiologicalSim: PhysiologicalSimulation | null;
  hasOverrides: boolean;
};

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m`;
}

function getHydrationStatus(hydrationPct: number): { label: string; color: string } {
  if (hydrationPct >= 95) return { label: 'Optimal', color: 'var(--good)' };
  if (hydrationPct >= 85) return { label: 'Good', color: 'var(--good)' };
  if (hydrationPct >= 75) return { label: 'Acceptable', color: 'var(--warning)' };
  return { label: 'Dehydrated', color: 'var(--bad)' };
}

function getGiRiskStatus(riskPct: number): { label: string; color: string } {
  if (riskPct < 20) return { label: 'Low', color: 'var(--good)' };
  if (riskPct < 40) return { label: 'Moderate', color: 'var(--warning)' };
  if (riskPct < 60) return { label: 'High', color: '#fb923c' };
  return { label: 'Very High', color: 'var(--bad)' };
}

function getPenaltyStatus(penaltyPct: number): { label: string; color: string } {
  if (penaltyPct < 2) return { label: 'Minimal', color: 'var(--good)' };
  if (penaltyPct < 5) return { label: 'Moderate', color: 'var(--warning)' };
  if (penaltyPct < 10) return { label: 'Significant', color: '#fb923c' };
  return { label: 'Severe', color: 'var(--bad)' };
}

export default function ResultsSidebar({
  simulation,
  adjustedSimulation,
  baseline,
  physiologicalSim,
  hasOverrides,
}: ResultsSidebarProps) {
  const predictedTimeMin = adjustedSimulation?.predictedTimeMin ?? simulation.predictedTimeMin;
  const currentHydration = physiologicalSim?.hydration.hydrationPct ?? baseline.hydrationPct;
  const currentGiRisk = physiologicalSim?.giRisk.riskPct ?? baseline.giRiskPct;
  const currentPenalty = physiologicalSim?.performanceImpact.totalPenaltyPct ?? baseline.performancePenaltyPct;

  const timeDelta = calculateTimeDelta(predictedTimeMin, baseline.predictedTimeMin);
  const hydrationDelta = calculateHydrationDelta(currentHydration, baseline.hydrationPct);
  const giDelta = calculatePercentageDelta(currentGiRisk, baseline.giRiskPct);
  const penaltyDelta = calculatePerformancePenaltyDelta(currentPenalty, baseline.performancePenaltyPct);

  const hydrationStatus = getHydrationStatus(currentHydration);
  const giStatus = getGiRiskStatus(currentGiRisk);
  const penaltyStatus = getPenaltyStatus(currentPenalty);

  const topInsight = physiologicalSim?.insights[0]?.message ?? simulation.message;

  return (
    <div
      className="results-sidebar"
      style={{
        position: 'sticky',
        top: 20,
        width: '100%',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        className="card"
        style={{
          background: hasOverrides ? 'var(--brand-bg)' : 'var(--bg)',
          border: hasOverrides ? '2px solid var(--brand)' : '1px solid var(--line)',
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
            {hasOverrides ? 'Adjusted Prediction' : 'Baseline Prediction'}
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              transition: 'all 0.3s ease',
            }}
          >
            <span className="predicted-time">🏁 {formatTime(predictedTimeMin)}</span>
            <ComparisonBadge delta={timeDelta} formatValue={formatTimeDelta} label="Time" />
          </div>
          {!hasOverrides && (
            <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              Baseline conditions
            </div>
          )}
        </div>
      </div>

      {physiologicalSim && (
        <div
          className="card"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            padding: 12,
          }}
        >
          <div className="small" style={{ fontWeight: 600, marginBottom: 12, color: 'var(--brand)' }}>
            💬 Coach Insight
          </div>
          <p className="small" style={{ margin: 0, lineHeight: 1.5, color: 'var(--text)' }}>
            {topInsight}
          </p>
        </div>
      )}

      <div
        className="card"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.3rem' }}>💧</span>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Hydration</h4>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              transition: 'all 0.3s ease',
            }}
          >
            {Math.round(currentHydration)}%
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <ComparisonBadge delta={hydrationDelta} formatValue={formatPercentageDelta} label="Hydration" />
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            background: 'var(--bg-secondary)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, currentHydration)}%`,
              height: '100%',
              background: hydrationStatus.color,
              borderRadius: 4,
              transition: 'width 0.4s ease, background 0.3s ease',
            }}
          />
        </div>
      </div>

      <div
        className="card"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.3rem' }}>🩺</span>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>GI Distress Risk</h4>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              transition: 'all 0.3s ease',
            }}
          >
            {Math.round(currentGiRisk)}%
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="small"
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: giStatus.color,
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {giStatus.label}
            </span>
            <ComparisonBadge delta={giDelta} formatValue={formatPercentageDelta} label="GI Risk" />
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            background: 'var(--bg-secondary)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, currentGiRisk)}%`,
              height: '100%',
              background: giStatus.color,
              borderRadius: 4,
              transition: 'width 0.4s ease, background 0.3s ease',
            }}
          />
        </div>
      </div>

      <div
        className="card"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.3rem' }}>⚡</span>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Performance Penalty</h4>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              transition: 'all 0.3s ease',
            }}
          >
            +{currentPenalty.toFixed(1)}%
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="small"
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: penaltyStatus.color,
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {penaltyStatus.label}
            </span>
            <ComparisonBadge delta={penaltyDelta} formatValue={formatPercentageDelta} label="Penalty" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes badgeFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .predicted-time {
          animation: valueChange 0.3s ease;
        }

        @keyframes valueChange {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        .results-sidebar::-webkit-scrollbar {
          width: 6px;
        }

        .results-sidebar::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 3px;
        }

        .results-sidebar::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 3px;
        }

        .results-sidebar::-webkit-scrollbar-thumb:hover {
          background: var(--muted);
        }
      `}</style>
    </div>
  );
}
