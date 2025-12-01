import type { RaceSimulation } from '@/hooks/useRaceSimulation';
import type { PhysiologicalSimulation } from '@/types/physiology';

export type BaselineMetrics = {
  predictedTimeMin: number;
  hydrationPct: number;
  giRiskPct: number;
  performancePenaltyPct: number;
};

export type MetricDelta = {
  value: number;
  percentage: number;
  isImprovement: boolean;
  showComparison: boolean;
};

export type MetricThresholds = {
  timeMinutes: number;
  percentage: number;
  performancePenalty: number;
};

const DEFAULT_THRESHOLDS: MetricThresholds = {
  timeMinutes: 5,
  percentage: 5,
  performancePenalty: 2,
};

export function extractBaselineMetrics(
  simulation: RaceSimulation,
  physiologicalSim: PhysiologicalSimulation | null
): BaselineMetrics {
  return {
    predictedTimeMin: simulation.predictedTimeMin,
    hydrationPct: physiologicalSim?.hydration.hydrationPct ?? 90,
    giRiskPct: physiologicalSim?.giRisk.riskPct ?? 25,
    performancePenaltyPct: physiologicalSim?.performanceImpact.totalPenaltyPct ?? 0,
  };
}

export function calculateTimeDelta(
  current: number,
  baseline: number,
  thresholds: MetricThresholds = DEFAULT_THRESHOLDS
): MetricDelta {
  const value = current - baseline;
  const percentage = baseline > 0 ? (value / baseline) * 100 : 0;
  const isImprovement = value < 0;
  const showComparison = Math.abs(value) > thresholds.timeMinutes;

  return { value, percentage, isImprovement, showComparison };
}

export function calculatePercentageDelta(
  current: number,
  baseline: number,
  thresholds: MetricThresholds = DEFAULT_THRESHOLDS
): MetricDelta {
  const value = current - baseline;
  const percentage = value;
  const isImprovement = value < 0;
  const showComparison = Math.abs(value) > thresholds.percentage;

  return { value, percentage, isImprovement, showComparison };
}

export function calculateHydrationDelta(
  current: number,
  baseline: number,
  thresholds: MetricThresholds = DEFAULT_THRESHOLDS
): MetricDelta {
  const value = current - baseline;
  const percentage = value;
  const isImprovement = value > 0;
  const showComparison = Math.abs(value) > thresholds.percentage;

  return { value, percentage, isImprovement, showComparison };
}

export function calculatePerformancePenaltyDelta(
  current: number,
  baseline: number,
  thresholds: MetricThresholds = DEFAULT_THRESHOLDS
): MetricDelta {
  const value = current - baseline;
  const percentage = value;
  const isImprovement = value < 0;
  const showComparison = Math.abs(value) > thresholds.performancePenalty;

  return { value, percentage, isImprovement, showComparison };
}

export function formatTimeDelta(delta: MetricDelta): string {
  const absValue = Math.abs(delta.value);
  const mins = Math.floor(absValue);
  const secs = Math.floor((absValue % 1) * 60);

  const sign = delta.value >= 0 ? '+' : '-';

  if (mins > 0) {
    return `${sign}${mins}m ${secs}s`;
  }
  return `${sign}${secs}s`;
}

export function formatPercentageDelta(delta: MetricDelta): string {
  const sign = delta.value >= 0 ? '+' : '';
  return `${sign}${delta.value.toFixed(1)}%`;
}

export function getDeltaColor(delta: MetricDelta): string {
  if (!delta.showComparison) {
    return 'var(--muted)';
  }
  return delta.isImprovement ? 'var(--good)' : 'var(--warning)';
}

export function getDeltaArrow(delta: MetricDelta): string {
  if (!delta.showComparison) {
    return '';
  }
  return delta.isImprovement ? '↓' : '↑';
}
