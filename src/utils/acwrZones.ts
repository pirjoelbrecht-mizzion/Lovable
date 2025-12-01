export type ACWRZone = 'underload' | 'sweet-spot' | 'caution' | 'high-risk' | 'extreme-risk';

export interface ACWRCalculationOptions {
  personalizedLower?: number;
  personalizedUpper?: number;
  useTrailLoad?: boolean;
  verticalGainM?: number;
  verticalToKmRatio?: number;
}

export function getACWRZoneStatus(
  acwr: number,
  personalizedLower?: number,
  personalizedUpper?: number
): ACWRZone {
  const lowerBound = personalizedLower ?? 0.8;
  const upperBound = personalizedUpper ?? 1.3;

  if (acwr < lowerBound) return 'underload';

  if (acwr >= lowerBound && acwr <= upperBound) {
    return 'sweet-spot';
  }

  if (acwr > upperBound && acwr <= 1.5) {
    return 'caution';
  }

  if (acwr > 1.5 && acwr <= 1.8) {
    return 'high-risk';
  }

  return 'extreme-risk';
}

export function generateACWRZoneFeedback(
  acwr: number,
  zone: ACWRZone,
  weeklyKm: number
): string {
  switch (zone) {
    case 'underload':
      return `Your ACWR is ${acwr.toFixed(2)}, indicating a recovery or deload week (${weeklyKm.toFixed(1)} km). This is good for regeneration, but extended periods below 0.8 may lead to detraining. Consider gradually increasing volume if this wasn't planned.`;

    case 'sweet-spot':
      return `Your ACWR is ${acwr.toFixed(2)} — within the optimal zone! Your current load (${weeklyKm.toFixed(1)} km) promotes adaptation while minimizing injury risk. Continue your progressive training approach.`;

    case 'caution':
      return `Your ACWR is ${acwr.toFixed(2)}, slightly elevated at ${weeklyKm.toFixed(1)} km this week. Monitor fatigue levels closely and ensure you're prioritizing recovery (sleep, nutrition, easy runs). Occasional spikes are okay, but avoid sustaining this level for multiple consecutive weeks.`;

    case 'high-risk':
      return `⚠️ Your ACWR is ${acwr.toFixed(2)} — this represents a significant load spike (${weeklyKm.toFixed(1)} km). Research shows this zone substantially increases injury risk. Consider reducing your planned volume by 15-20% or adding an extra rest day this week. Focus on easy-pace runs and active recovery.`;

    case 'extreme-risk':
      return `🚨 Your ACWR is ${acwr.toFixed(2)} — an extreme load increase (${weeklyKm.toFixed(1)} km) that rarely occurs in well-managed training. This level poses very high injury and illness risk. Strongly recommend cutting volume immediately, taking extra rest days, and consulting with a coach or sports medicine professional if experiencing any pain or excessive fatigue.`;

    default:
      return `Your ACWR is ${acwr.toFixed(2)}.`;
  }
}

export function getACWRTrendDirection(acwrValues: number[]): 'rising' | 'stable' | 'falling' {
  if (acwrValues.length < 4) return 'stable';

  const recent4 = acwrValues.slice(-4);
  const firstHalf = (recent4[0] + recent4[1]) / 2;
  const secondHalf = (recent4[2] + recent4[3]) / 2;

  const difference = secondHalf - firstHalf;

  if (difference > 0.15) return 'rising';
  if (difference < -0.15) return 'falling';
  return 'stable';
}

export function getACWRRecommendation(zone: ACWRZone, trend: 'rising' | 'stable' | 'falling'): string {
  if (zone === 'underload') {
    return trend === 'falling'
      ? 'Consider adding 1-2 additional runs or extending existing runs by 10-15% to maintain fitness.'
      : 'Gradual volume increases of 5-10% per week are safe for progression.';
  }

  if (zone === 'sweet-spot') {
    return trend === 'rising'
      ? 'Your progression is well-managed. Maintain this approach while monitoring recovery.'
      : 'Continue current training load. Consider adding a quality session if feeling strong.';
  }

  if (zone === 'caution') {
    return trend === 'rising'
      ? 'Load is increasing too quickly. Cap this week at current volume and add extra recovery time.'
      : 'Hold current volume steady for 1-2 weeks before further increases. Focus on recovery quality.';
  }

  if (zone === 'high-risk' || zone === 'extreme-risk') {
    return 'Immediate action required: reduce planned volume by 20-30%, add rest days, and prioritize sleep and nutrition. Resume progression only after 1-2 weeks of lower, stable load.';
  }

  return 'Monitor your training load and recovery signals.';
}

export function isACWRSustainablePattern(recentACWRs: number[]): {
  isSustainable: boolean;
  reason: string;
} {
  if (recentACWRs.length < 3) {
    return { isSustainable: true, reason: 'Insufficient data to assess pattern.' };
  }

  const recent3 = recentACWRs.slice(-3);
  const highRiskWeeks = recent3.filter(v => v > 1.5).length;

  if (highRiskWeeks >= 2) {
    return {
      isSustainable: false,
      reason: 'You have sustained high ACWR (>1.5) for multiple weeks. This pattern significantly increases injury risk and may lead to overtraining.',
    };
  }

  const volatility = calculateVolatility(recent3);
  if (volatility > 0.35) {
    return {
      isSustainable: false,
      reason: 'Your training load is fluctuating significantly week-to-week. More consistent progression reduces injury risk.',
    };
  }

  return { isSustainable: true, reason: 'Your load progression pattern appears sustainable.' };
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(variance);
}

export function calculateACWRWithTrailLoad(
  acuteLoadKm: number,
  chronicLoadKm: number,
  acuteVerticalM: number = 0,
  chronicVerticalM: number = 0,
  verticalToKmRatio: number = 100
): number {
  const acuteCombined = acuteLoadKm + (acuteVerticalM / verticalToKmRatio);
  const chronicCombined = chronicLoadKm + (chronicVerticalM / verticalToKmRatio);

  if (chronicCombined === 0) return 0;
  return acuteCombined / chronicCombined;
}
