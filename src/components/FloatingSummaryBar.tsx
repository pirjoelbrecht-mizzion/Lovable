import { useState } from 'react';
import type { BaselineMetrics, MetricDelta } from '@/utils/baselineComparison';
import {
  calculateTimeDelta,
  calculateHydrationDelta,
  calculatePercentageDelta,
  calculatePerformancePenaltyDelta,
  formatTimeDelta,
  formatPercentageDelta,
} from '@/utils/baselineComparison';
import type { PhysiologicalSimulation } from '@/types/physiology';

type FloatingSummaryBarProps = {
  predictedTimeMin: number;
  baseline: BaselineMetrics;
  physiologicalSim: PhysiologicalSimulation | null;
  isVisible: boolean;
  onExpand: () => void;
};

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m`;
}

export default function FloatingSummaryBar({
  predictedTimeMin,
  baseline,
  physiologicalSim,
  isVisible,
  onExpand,
}: FloatingSummaryBarProps) {
  const timeDelta = calculateTimeDelta(predictedTimeMin, baseline.predictedTimeMin);
  const hydrationDelta = calculateHydrationDelta(
    physiologicalSim?.hydration.hydrationPct ?? baseline.hydrationPct,
    baseline.hydrationPct
  );
  const giDelta = calculatePercentageDelta(
    physiologicalSim?.giRisk.riskPct ?? baseline.giRiskPct,
    baseline.giRiskPct
  );
  const penaltyDelta = calculatePerformancePenaltyDelta(
    physiologicalSim?.performanceImpact.totalPenaltyPct ?? baseline.performancePenaltyPct,
    baseline.performancePenaltyPct
  );

  const currentHydration = physiologicalSim?.hydration.hydrationPct ?? baseline.hydrationPct;
  const currentGiRisk = physiologicalSim?.giRisk.riskPct ?? baseline.giRiskPct;
  const currentPenalty = physiologicalSim?.performanceImpact.totalPenaltyPct ?? baseline.performancePenaltyPct;

  return (
    <div
      className="floating-summary-bar"
      onClick={onExpand}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--line)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
        zIndex: 1000,
        cursor: 'pointer',
        opacity: isVisible ? 1 : 0.5,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.2rem' }}>🏁</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', transition: 'color 0.3s ease' }}>
            {formatTime(predictedTimeMin)}
          </span>
        </div>
        {timeDelta.showComparison && (
          <div
            style={{
              fontSize: '0.7rem',
              color: timeDelta.isImprovement ? 'var(--good)' : 'var(--warning)',
              fontWeight: 600,
            }}
          >
            {formatTimeDelta(timeDelta)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.2rem' }}>💧</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', transition: 'color 0.3s ease' }}>
            {Math.round(currentHydration)}%
          </span>
        </div>
        {hydrationDelta.showComparison && (
          <div
            style={{
              fontSize: '0.7rem',
              color: hydrationDelta.isImprovement ? 'var(--good)' : 'var(--warning)',
              fontWeight: 600,
            }}
          >
            {formatPercentageDelta(hydrationDelta)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.2rem' }}>🩺</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', transition: 'color 0.3s ease' }}>
            {Math.round(currentGiRisk)}%
          </span>
        </div>
        {giDelta.showComparison && (
          <div
            style={{
              fontSize: '0.7rem',
              color: giDelta.isImprovement ? 'var(--good)' : 'var(--warning)',
              fontWeight: 600,
            }}
          >
            {formatPercentageDelta(giDelta)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', transition: 'color 0.3s ease' }}>
            +{currentPenalty.toFixed(1)}%
          </span>
        </div>
        {penaltyDelta.showComparison && (
          <div
            style={{
              fontSize: '0.7rem',
              color: penaltyDelta.isImprovement ? 'var(--good)' : 'var(--warning)',
              fontWeight: 600,
            }}
          >
            {formatPercentageDelta(penaltyDelta)}
          </div>
        )}
      </div>
    </div>
  );
}
