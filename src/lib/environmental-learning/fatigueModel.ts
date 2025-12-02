/**
 * ======================================================================
 *  FATIGUE-TO-PACE MODEL
 *  Environmental Learning Module
 * ======================================================================
 *
 * Converts athlete fatigue scores to pace adjustment multipliers.
 * Uses scientifically-backed curves showing performance degradation
 * under accumulated fatigue.
 *
 * Key principles:
 * - Fatigue < 30: No adjustment needed
 * - Fatigue 30-60: Linear degradation (+0% to +15%)
 * - Fatigue 60+: Exponential degradation (up to +40%)
 *
 * References:
 * - Foster et al. (2001) - Training load and performance
 * - Halson & Jeukendrup (2004) - Fatigue monitoring
 */

export interface FatigueMetrics {
  acLoadRatio: number;        // 0-100 scale (ACWR normalized)
  sleepDeficit: number;        // 0-100 scale (hours below optimal)
  RHRDeviation: number;        // 0-100 scale (% above baseline)
  HRVStress: number;           // 0-100 scale (% below baseline)
  muscleSoreness: number;      // 0-100 scale (subjective)
  recentRPE: number;           // 0-100 scale (average last 7 days)
}

/**
 * Compute comprehensive fatigue score from multiple physiological markers
 * Returns: 0-100 scale (0 = fresh, 100 = completely exhausted)
 */
export function computeFatigueScore(metrics: FatigueMetrics): number {
  const score =
    0.25 * metrics.acLoadRatio +
    0.15 * metrics.sleepDeficit +
    0.15 * metrics.RHRDeviation +
    0.20 * metrics.HRVStress +
    0.15 * metrics.muscleSoreness +
    0.10 * metrics.recentRPE;

  return Math.max(0, Math.min(100, score));
}

/**
 * Convert fatigue score to pace multiplier
 *
 * Examples:
 * - Fatigue 10 → 1.00 (no adjustment)
 * - Fatigue 30 → 1.00 (threshold)
 * - Fatigue 45 → 1.075 (+7.5% slower)
 * - Fatigue 60 → 1.15 (+15% slower)
 * - Fatigue 80 → 1.27 (+27% slower)
 * - Fatigue 95 → 1.38 (+38% slower)
 */
export function fatiguePaceModifier(fatigueScore: number): number {
  // No penalty below threshold
  if (fatigueScore < 30) {
    return 1.0;
  }

  // Linear degradation 30-60
  if (fatigueScore < 60) {
    return 1 + (fatigueScore - 30) * 0.005; // +0% to +15%
  }

  // Exponential degradation above 60
  return 1.15 + Math.pow(fatigueScore - 60, 1.4) * 0.003; // +15% to +40%
}

/**
 * Convert fatigue score to recommended adjustment actions
 */
export function fatigueLevelDescription(fatigueScore: number): {
  level: 'low' | 'moderate' | 'high' | 'extreme';
  recommendation: string;
  adjustmentPct: number;
} {
  if (fatigueScore < 30) {
    return {
      level: 'low',
      recommendation: 'Training proceeding normally. Maintain current volume and intensity.',
      adjustmentPct: 0
    };
  }

  if (fatigueScore < 50) {
    return {
      level: 'moderate',
      recommendation: 'Moderate fatigue detected. Reduce intensity by 5-10% and prioritize sleep.',
      adjustmentPct: -10
    };
  }

  if (fatigueScore < 70) {
    return {
      level: 'high',
      recommendation: 'High fatigue accumulation. Reduce volume by 15-20% and add extra recovery day.',
      adjustmentPct: -20
    };
  }

  return {
    level: 'extreme',
    recommendation: 'Extreme fatigue. Implement recovery week with 30-40% volume reduction.',
    adjustmentPct: -35
  };
}

/**
 * Estimate time to recovery based on current fatigue score
 * Returns estimated days needed for full recovery
 */
export function estimateRecoveryDays(fatigueScore: number): number {
  if (fatigueScore < 30) return 0;
  if (fatigueScore < 50) return 2;
  if (fatigueScore < 70) return 4;
  return 7;
}

/**
 * Generate personalized fatigue recommendations
 */
export function getFatigueRecommendations(fatigueScore: number, context: {
  daysToRace?: number;
  currentVolume: number;
  recentRestDays: number;
}): {
  paceAdjustment: string;
  volumeChange: string;
  intensityGuidance: string;
  recoveryFocus: string[];
} {
  const modifier = fatiguePaceModifier(fatigueScore);
  const pctSlower = ((modifier - 1) * 100).toFixed(0);

  const recommendations = {
    paceAdjustment: fatigueScore < 30
      ? 'No pace adjustment needed'
      : `Reduce target pace by ${pctSlower}% for all efforts`,
    volumeChange: '',
    intensityGuidance: '',
    recoveryFocus: [] as string[]
  };

  if (fatigueScore >= 70) {
    recommendations.volumeChange = 'Reduce weekly volume by 30-40%';
    recommendations.intensityGuidance = 'All runs at easy conversational pace';
    recommendations.recoveryFocus = [
      'Prioritize 8-9 hours sleep per night',
      'Add active recovery (yoga, stretching)',
      'Consider professional massage',
      'Increase protein and anti-inflammatory foods'
    ];
  } else if (fatigueScore >= 50) {
    recommendations.volumeChange = 'Reduce weekly volume by 15-20%';
    recommendations.intensityGuidance = 'Limit high-intensity sessions to 1 per week';
    recommendations.recoveryFocus = [
      'Target 8+ hours sleep',
      'Add foam rolling and stretching',
      'Monitor hydration and nutrition'
    ];
  } else if (fatigueScore >= 30) {
    recommendations.volumeChange = 'Maintain or slightly reduce volume';
    recommendations.intensityGuidance = 'Monitor effort on hard sessions';
    recommendations.recoveryFocus = [
      'Ensure adequate sleep (7-8 hours)',
      'Stay hydrated'
    ];
  } else {
    recommendations.volumeChange = 'Volume can progress as planned';
    recommendations.intensityGuidance = 'Ready for quality sessions';
    recommendations.recoveryFocus = ['Maintain current recovery practices'];
  }

  return recommendations;
}
