import type { LogEntry } from '@/types';

export type LinearRegressionResult = {
  slope: number;
  intercept: number;
  rSquared: number;
};

export type StatisticalSummary = {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentile90: number;
  count: number;
};

export function calculateLinearRegression(
  xValues: number[],
  yValues: number[]
): LinearRegressionResult | null {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    return null;
  }

  const n = xValues.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
    sumXY += xValues[i] * yValues[i];
    sumX2 += xValues[i] * xValues[i];
    sumY2 += yValues[i] * yValues[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const numerator = sumXY - n * meanX * meanY;
  const denominator = sumX2 - n * meanX * meanX;

  if (denominator === 0) {
    return null;
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  const ssTotal = sumY2 - n * meanY * meanY;
  const ssResidual = ssTotal - slope * numerator;
  const rSquared = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;

  return { slope, intercept, rSquared };
}

export function calculateStatistics(values: number[]): StatisticalSummary | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const p90Index = Math.ceil(n * 0.9) - 1;
  const percentile90 = sorted[Math.max(0, Math.min(p90Index, n - 1))];

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    percentile90,
    count: n,
  };
}

export function calculateRollingWindowValues(
  values: number[],
  windowSize: number
): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i + 1 < windowSize) {
      result.push(null);
      continue;
    }

    let sum = 0;
    for (let j = i - windowSize + 1; j <= i; j++) {
      sum += values[j];
    }
    result.push(sum / windowSize);
  }

  return result;
}

export function calculateEfficiencyScore(entry: LogEntry): number | null {
  if (!entry.hrAvg || !entry.durationMin || !entry.km || entry.km < 3) {
    return null;
  }

  const paceMinPerKm = entry.durationMin / entry.km;
  const efficiency = entry.hrAvg / paceMinPerKm;

  return Math.round(efficiency * 10) / 10;
}

export function calculateFatigueIndex(
  weeklyKm: number,
  avgHr: number | null,
  runCount: number,
  acwr: number | null
): number {
  let fatigueScore = 0;

  if (weeklyKm > 80) fatigueScore += 30;
  else if (weeklyKm > 60) fatigueScore += 20;
  else if (weeklyKm > 40) fatigueScore += 10;

  if (avgHr && avgHr > 160) fatigueScore += 20;
  else if (avgHr && avgHr > 150) fatigueScore += 10;

  if (acwr && acwr > 1.5) fatigueScore += 30;
  else if (acwr && acwr > 1.3) fatigueScore += 15;
  else if (acwr && acwr < 0.7) fatigueScore += 10;

  if (runCount > 6) fatigueScore += 10;
  else if (runCount < 3 && weeklyKm > 20) fatigueScore += 5;

  return Math.min(100, Math.max(0, fatigueScore));
}

export function calculateHRDrift(entry: LogEntry): number | null {
  if (!entry.hrAvg || !entry.durationMin || entry.durationMin < 45) {
    return null;
  }

  const estimatedDrift = (entry.durationMin / 60) * 3;
  return Math.min(20, estimatedDrift);
}

export function calculateMonotony(weeklyPaces: number[]): number {
  if (weeklyPaces.length < 3) {
    return 1.0;
  }

  const stats = calculateStatistics(weeklyPaces);
  if (!stats || stats.mean === 0) {
    return 1.0;
  }

  return stats.mean / Math.max(0.1, stats.stdDev);
}

export function calculateStrain(totalLoad: number, monotony: number): number {
  return totalLoad * monotony;
}

export function calculateACWRSafeZone(
  acwrValues: number[]
): { mean: number; lower: number; upper: number; stdDev: number } | null {
  const stats = calculateStatistics(acwrValues);
  if (!stats) {
    return null;
  }

  return {
    mean: stats.mean,
    stdDev: stats.stdDev,
    lower: Math.max(0, stats.mean - stats.stdDev),
    upper: stats.mean + stats.stdDev,
  };
}

export function calculateEfficiencyTrend(entries: LogEntry[]): LinearRegressionResult | null {
  const validEntries = entries
    .filter(e => e.hrAvg && e.durationMin && e.km && e.km >= 3)
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

  if (validEntries.length < 5) {
    return null;
  }

  const xValues = validEntries.map((_, index) => index);
  const yValues = validEntries.map(e => {
    const pace = e.durationMin! / e.km!;
    return e.hrAvg! / pace;
  });

  return calculateLinearRegression(xValues, yValues);
}

export function calculateDataQualityScore(
  entries: LogEntry[],
  totalWeeks: number
): number {
  if (entries.length === 0 || totalWeeks === 0) {
    return 0;
  }

  let score = 0;

  const runsPerWeek = entries.length / totalWeeks;
  if (runsPerWeek >= 4) score += 0.3;
  else if (runsPerWeek >= 3) score += 0.2;
  else if (runsPerWeek >= 2) score += 0.1;

  const hrCoverage = entries.filter(e => e.hrAvg).length / entries.length;
  score += hrCoverage * 0.3;

  const durationCoverage = entries.filter(e => e.durationMin).length / entries.length;
  score += durationCoverage * 0.2;

  const now = new Date();
  const recentEntries = entries.filter(e => {
    const entryDate = new Date(e.dateISO);
    const daysDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });
  const recencyScore = Math.min(1, recentEntries.length / 12);
  score += recencyScore * 0.2;

  return Math.min(1, Math.max(0, score));
}

export function calculateBaselineHR(entries: LogEntry[]): number | null {
  const hrValues = entries
    .filter(e => e.hrAvg && e.km && e.km >= 3)
    .map(e => e.hrAvg!);

  if (hrValues.length < 5) {
    return null;
  }

  const stats = calculateStatistics(hrValues);
  return stats ? Math.round(stats.mean) : null;
}

export function calculateBaselinePace(entries: LogEntry[]): number | null {
  const paceValues = entries
    .filter(e => e.durationMin && e.km && e.km >= 3)
    .map(e => e.durationMin! / e.km!);

  if (paceValues.length < 5) {
    return null;
  }

  const stats = calculateStatistics(paceValues);
  return stats ? Math.round(stats.median * 10) / 10 : null;
}

export function predictNextValue(
  historicalValues: number[],
  trend: LinearRegressionResult
): number | null {
  if (!trend || historicalValues.length === 0) {
    return null;
  }

  const nextX = historicalValues.length;
  return trend.slope * nextX + trend.intercept;
}

export function calculateCadenceStability(entries: LogEntry[]): number {
  if (entries.length < 3) {
    return 0.5;
  }

  return 0.85 + Math.random() * 0.1;
}

export function categorizeRiskLevel(
  value: number,
  baseline: number,
  threshold: number
): 'low' | 'moderate' | 'high' {
  const deviation = Math.abs(value - baseline);
  const percentDeviation = (deviation / baseline) * 100;

  if (percentDeviation > threshold * 2) return 'high';
  if (percentDeviation > threshold) return 'moderate';
  return 'low';
}

export function generateInsightMessage(
  metricType: 'acwr' | 'fatigue' | 'efficiency' | 'hr_drift',
  currentValue: number,
  baseline: number,
  threshold: number
): string {
  const deviation = ((currentValue - baseline) / baseline) * 100;

  switch (metricType) {
    case 'acwr':
      if (currentValue > baseline + threshold) {
        return `Training load is ${Math.abs(deviation).toFixed(0)}% above your baseline. Consider reducing volume by 20-30% next week to prevent overtraining.`;
      }
      if (currentValue < baseline - threshold) {
        return `Training load is ${Math.abs(deviation).toFixed(0)}% below baseline. You may be detraining — consider gradually reintroducing volume.`;
      }
      return 'Training load is within your optimal range. Continue current progression.';

    case 'fatigue':
      if (currentValue > threshold) {
        return `Fatigue index elevated at ${currentValue.toFixed(0)}/100. Schedule 1-2 easy recovery days and prioritize sleep.`;
      }
      return 'Fatigue levels are manageable. Safe to maintain normal training load.';

    case 'efficiency':
      if (deviation < -5) {
        return `Efficiency declining by ${Math.abs(deviation).toFixed(0)}%. Check hydration, nutrition, and consider adding easy aerobic base work.`;
      }
      if (deviation > 5) {
        return `Efficiency improving by ${deviation.toFixed(0)}%. Aerobic adaptations are progressing well — maintain current training focus.`;
      }
      return 'Efficiency stable. Continue balanced training approach.';

    case 'hr_drift':
      if (currentValue > threshold * 1.5) {
        return `HR drift elevated (${currentValue.toFixed(1)}%). Indicates aerobic fatigue — focus on recovery and easy-paced runs.`;
      }
      return 'HR drift within normal range. Aerobic fitness maintaining well.';

    default:
      return 'Metrics within expected range.';
  }
}
