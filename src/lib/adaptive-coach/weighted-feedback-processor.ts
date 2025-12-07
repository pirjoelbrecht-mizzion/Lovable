import type {
  RaceFeedback,
  DNFEvent,
  ExtendedDailyFeedback,
  FeedbackType,
  WeightedFeedbackInsight,
  RaceLimiterDistribution,
  DNFCauseDistribution,
} from '../../types/feedback';
import type { DailyFeedback, AthleteProfile } from './types';
import { FeedbackInsight } from './feedback-processor';

const FEEDBACK_WEIGHTS: Record<FeedbackType, number> = {
  training_normal: 1.0,
  training_key_workout: 1.5,
  race_simulation: 3.0,
  race: 5.0,
  dnf: 8.0,
};

export function processWeightedDailyFeedback(
  feedback: ExtendedDailyFeedback,
  feedbackType: FeedbackType,
  athlete: AthleteProfile
): WeightedFeedbackInsight[] {
  const insights: WeightedFeedbackInsight[] = [];
  const weight = FEEDBACK_WEIGHTS[feedbackType];

  if (feedback.fatigue && feedback.fatigue > 7) {
    insights.push({
      sourceType: feedbackType,
      confidence: 0.7 * weight,
      weight,
      insight: `High fatigue reported (${feedback.fatigue}/10) during ${feedbackType.replace('_', ' ')}`,
      date: feedback.date,
      affectedModels: ['recovery', 'readiness', 'volume_adjustment'],
    });
  }

  if (feedback.sleep_quality && feedback.sleep_quality < 5) {
    insights.push({
      sourceType: feedbackType,
      confidence: 0.6 * weight,
      weight,
      insight: `Poor sleep quality (${feedback.sleep_quality}/10) affecting recovery`,
      date: feedback.date,
      affectedModels: ['recovery', 'readiness'],
    });
  }

  if (feedback.pain_location && feedback.pain_location !== 'None') {
    insights.push({
      sourceType: feedbackType,
      confidence: 0.9 * weight,
      weight,
      insight: `Pain reported in ${feedback.pain_location}`,
      date: feedback.date,
      affectedModels: ['injury_risk', 'recovery', 'volume_adjustment'],
    });
  }

  if (feedback.effort && feedback.feel) {
    const effortToFeelRatio = feedback.effort / feedback.feel;
    if (effortToFeelRatio > 1.5) {
      insights.push({
        sourceType: feedbackType,
        confidence: 0.75 * weight,
        weight,
        insight: 'Effort higher than feel - possible overtraining or inadequate recovery',
        date: feedback.date,
        affectedModels: ['recovery', 'readiness', 'training_stress'],
      });
    }
  }

  return insights;
}

export function processRaceFeedback(
  raceFeedback: RaceFeedback,
  athlete: AthleteProfile
): WeightedFeedbackInsight[] {
  const insights: WeightedFeedbackInsight[] = [];
  const weight = raceFeedback.event_type === 'simulation'
    ? FEEDBACK_WEIGHTS.race_simulation
    : FEEDBACK_WEIGHTS.race;

  if (raceFeedback.biggest_limiter === 'heat' && (raceFeedback.heat_perception || 0) >= 4) {
    insights.push({
      sourceType: raceFeedback.event_type === 'simulation' ? 'race_simulation' : 'race',
      confidence: 0.9 * weight,
      weight,
      insight: 'Heat was a major limiter - heat adaptation training needed',
      date: raceFeedback.event_date,
      affectedModels: ['heat_adaptation', 'pacing', 'training_emphasis'],
    });
  }

  if (raceFeedback.biggest_limiter === 'legs' && (raceFeedback.downhill_difficulty || 0) >= 4) {
    insights.push({
      sourceType: raceFeedback.event_type === 'simulation' ? 'race_simulation' : 'race',
      confidence: 0.85 * weight,
      weight,
      insight: 'Leg fatigue on technical downhills - eccentric strength training recommended',
      date: raceFeedback.event_date,
      affectedModels: ['downhill_durability', 'strength_training', 'training_emphasis'],
    });
  }

  if (raceFeedback.biggest_limiter === 'stomach') {
    insights.push({
      sourceType: raceFeedback.event_type === 'simulation' ? 'race_simulation' : 'race',
      confidence: 0.95 * weight,
      weight,
      insight: 'GI issues limited performance - nutrition strategy needs adjustment',
      date: raceFeedback.event_date,
      affectedModels: ['nutrition_reliability', 'fueling_protocol', 'race_readiness'],
    });
  }

  if (raceFeedback.biggest_limiter === 'pacing' && raceFeedback.issues_start_km) {
    insights.push({
      sourceType: raceFeedback.event_type === 'simulation' ? 'race_simulation' : 'race',
      confidence: 0.9 * weight,
      weight,
      insight: `Pacing error led to issues at ${raceFeedback.issues_start_km}km - adjust race strategy`,
      date: raceFeedback.event_date,
      affectedModels: ['pacing_accuracy', 'race_strategy', 'terrain_confidence'],
    });
  }

  if ((raceFeedback.climbing_difficulty || 0) >= 4) {
    insights.push({
      sourceType: raceFeedback.event_type === 'simulation' ? 'race_simulation' : 'race',
      confidence: 0.8 * weight,
      weight,
      insight: 'Challenging climbs - increase vertical gain in training',
      date: raceFeedback.event_date,
      affectedModels: ['terrain_confidence', 'climbing_strength', 'training_emphasis'],
    });
  }

  return insights;
}

export function processDNFFeedback(
  dnfEvent: DNFEvent,
  athlete: AthleteProfile
): WeightedFeedbackInsight[] {
  const insights: WeightedFeedbackInsight[] = [];
  const weight = FEEDBACK_WEIGHTS.dnf;

  insights.push({
    sourceType: 'dnf',
    confidence: 1.0 * weight,
    weight,
    insight: `DNF due to ${dnfEvent.dnf_cause} at ${dnfEvent.km_stopped}km - recovery protocol activated`,
    date: dnfEvent.event_date,
    affectedModels: ['recovery', 'readiness', 'training_stress', 'injury_risk'],
  });

  if (dnfEvent.dnf_cause === 'injury') {
    insights.push({
      sourceType: 'dnf',
      confidence: 1.0 * weight,
      weight,
      insight: 'Injury-related DNF - 14-day recovery protocol with reduced volume',
      date: dnfEvent.event_date,
      affectedModels: ['injury_risk', 'recovery', 'volume_adjustment', 'training_plan'],
    });
  }

  if (dnfEvent.dnf_cause === 'heat') {
    insights.push({
      sourceType: 'dnf',
      confidence: 0.95 * weight,
      weight,
      insight: 'Heat exhaustion DNF - prioritize heat adaptation and hydration protocols',
      date: dnfEvent.event_date,
      affectedModels: ['heat_adaptation', 'hydration_strategy', 'training_conditions'],
    });
  }

  if (dnfEvent.dnf_cause === 'stomach') {
    insights.push({
      sourceType: 'dnf',
      confidence: 0.95 * weight,
      weight,
      insight: 'GI distress DNF - comprehensive nutrition strategy review required',
      date: dnfEvent.event_date,
      affectedModels: ['nutrition_reliability', 'fueling_protocol', 'gut_training'],
    });
  }

  if (dnfEvent.dnf_cause === 'pacing') {
    insights.push({
      sourceType: 'dnf',
      confidence: 0.9 * weight,
      weight,
      insight: 'Pacing error DNF - conservative race strategy and better pacing tools needed',
      date: dnfEvent.event_date,
      affectedModels: ['pacing_accuracy', 'race_strategy', 'effort_management'],
    });
  }

  if (dnfEvent.had_warning_signs) {
    insights.push({
      sourceType: 'dnf',
      confidence: 0.85 * weight,
      weight,
      insight: 'Warning signs present before DNF - improve pre-race readiness assessment',
      date: dnfEvent.event_date,
      affectedModels: ['readiness', 'risk_assessment', 'pre_race_protocol'],
    });
  }

  return insights;
}

export function calculateOverallScoreWeighted(
  recentFeedback: Array<{
    type: FeedbackType;
    confidence: number;
    date: string;
  }>
): number {
  if (recentFeedback.length === 0) return 50;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const feedback of recentFeedback) {
    const weight = FEEDBACK_WEIGHTS[feedback.type];
    const baseScore = feedback.confidence * 100;

    const daysAgo = Math.floor(
      (Date.now() - new Date(feedback.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyFactor = Math.exp(-daysAgo / 30);

    totalWeightedScore += baseScore * weight * recencyFactor;
    totalWeight += weight * recencyFactor;
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
}

export function analyzePainPatternsWeighted(
  feedbackHistory: ExtendedDailyFeedback[],
  raceFeedback: RaceFeedback[]
): Map<string, {
  trainingOccurrences: number;
  raceOccurrences: number;
  severity: 'low' | 'medium' | 'high';
}> {
  const painMap = new Map<string, {
    trainingOccurrences: number;
    raceOccurrences: number;
    severity: 'low' | 'medium' | 'high';
  }>();

  for (const feedback of feedbackHistory) {
    if (feedback.pain_location && feedback.pain_location !== 'None') {
      const existing = painMap.get(feedback.pain_location) || {
        trainingOccurrences: 0,
        raceOccurrences: 0,
        severity: 'low' as const,
      };
      existing.trainingOccurrences += 1;
      painMap.set(feedback.pain_location, existing);
    }
  }

  for (const race of raceFeedback) {
    if (race.biggest_limiter === 'legs' && race.limiter_notes) {
      const existing = painMap.get('race_legs') || {
        trainingOccurrences: 0,
        raceOccurrences: 0,
        severity: 'medium' as const,
      };
      existing.raceOccurrences += 1;
      existing.severity = 'high';
      painMap.set('race_legs', existing);
    }
  }

  return painMap;
}

export function analyzeRaceLimiters(
  raceFeedback: RaceFeedback[]
): RaceLimiterDistribution {
  const distribution: RaceLimiterDistribution = {
    legs: 0,
    stomach: 0,
    heat: 0,
    pacing: 0,
    mindset: 0,
    equipment: 0,
    other: 0,
  };

  for (const race of raceFeedback) {
    if (race.biggest_limiter) {
      distribution[race.biggest_limiter] += 1;
    }
  }

  return distribution;
}

export function analyzeDNFPatterns(
  dnfEvents: DNFEvent[]
): DNFCauseDistribution & {
  totalDNFs: number;
  mostCommonCause: string;
  preventiveRecommendations: string[];
} {
  const distribution: DNFCauseDistribution = {
    injury: 0,
    heat: 0,
    stomach: 0,
    pacing: 0,
    mental: 0,
    equipment: 0,
    other: 0,
  };

  let maxCount = 0;
  let mostCommon = 'injury';

  for (const dnf of dnfEvents) {
    distribution[dnf.dnf_cause] += 1;
    if (distribution[dnf.dnf_cause] > maxCount) {
      maxCount = distribution[dnf.dnf_cause];
      mostCommon = dnf.dnf_cause;
    }
  }

  const recommendations: string[] = [];
  if (distribution.heat > 1) {
    recommendations.push('Increase heat adaptation training sessions');
  }
  if (distribution.stomach > 1) {
    recommendations.push('Review and test nutrition strategy systematically');
  }
  if (distribution.pacing > 1) {
    recommendations.push('Implement more conservative pacing strategy with better monitoring');
  }
  if (distribution.injury > 1) {
    recommendations.push('Prioritize injury prevention and strength training');
  }

  return {
    ...distribution,
    totalDNFs: dnfEvents.length,
    mostCommonCause: mostCommon,
    preventiveRecommendations: recommendations,
  };
}

export function updateModelConfidence(
  modelName: string,
  feedbackType: FeedbackType,
  feedbackQuality: number
): number {
  const weight = FEEDBACK_WEIGHTS[feedbackType];
  const baseConfidence = feedbackQuality * weight;

  if (feedbackType === 'dnf') {
    return Math.min(baseConfidence * 1.2, 10);
  }

  if (feedbackType === 'race') {
    return Math.min(baseConfidence * 1.1, 10);
  }

  return baseConfidence;
}
