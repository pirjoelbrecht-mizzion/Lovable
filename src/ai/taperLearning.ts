import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import type { Race, RacePriority } from '@/utils/races';

export interface RaceFeedbackData {
  raceId: string;
  raceName: string;
  raceDate: string;
  raceDistanceKm: number;
  racePriority: RacePriority;
  taperDurationDays: number;
  taperFeeling: 'too_fresh' | 'just_right' | 'too_tired' | 'unsure';
  taperQualityScore: number;
  predictedTimeMin?: number;
  actualTimeMin?: number;
  perceivedEffort?: number;
  performanceRating: 'exceeded' | 'met' | 'below' | 'far_below';
  whatWentWell?: string;
  whatToImprove?: string;
  nutritionNotes?: string;
  pacingNotes?: string;
  avgHr?: number;
  maxHr?: number;
  hrv7dayAvg?: number;
  readinessRaceDay?: number;
  sleepQualityAvg?: number;
  weatherConditions?: Record<string, any>;
  courseDifficulty?: string;
  usedAiRecommendations?: boolean;
  metadata?: Record<string, any>;
}

export interface TaperLearningInsights {
  optimalTaperDays: number;
  confidenceScore: number;
  successfulTapers: number;
  totalTapers: number;
  averagePerformanceRating: number;
  recommendations: string[];
  dataQuality: 'excellent' | 'good' | 'limited' | 'insufficient';
}

export interface TaperAdjustmentSuggestion {
  originalTaperDays: number;
  suggestedTaperDays: number;
  adjustmentDays: number;
  reason: string;
  confidence: number;
  basedOnRaces: number;
}

export async function saveRaceFeedback(feedback: RaceFeedbackData): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[taperLearning] Supabase not available');
    return false;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[taperLearning] No user ID');
    return false;
  }

  const timeDelta =
    feedback.predictedTimeMin && feedback.actualTimeMin
      ? feedback.actualTimeMin - feedback.predictedTimeMin
      : null;

  const dbFeedback = {
    user_id: userId,
    race_id: feedback.raceId,
    race_name: feedback.raceName,
    race_date: feedback.raceDate,
    race_distance_km: feedback.raceDistanceKm,
    race_priority: feedback.racePriority,
    taper_duration_days: feedback.taperDurationDays,
    taper_feeling: feedback.taperFeeling,
    taper_quality_score: feedback.taperQualityScore,
    predicted_time_min: feedback.predictedTimeMin,
    actual_time_min: feedback.actualTimeMin,
    time_delta_min: timeDelta,
    perceived_effort: feedback.perceivedEffort,
    performance_rating: feedback.performanceRating,
    what_went_well: feedback.whatWentWell,
    what_to_improve: feedback.whatToImprove,
    nutrition_notes: feedback.nutritionNotes,
    pacing_notes: feedback.pacingNotes,
    avg_hr: feedback.avgHr,
    max_hr: feedback.maxHr,
    hrv_7day_avg: feedback.hrv7dayAvg,
    readiness_race_day: feedback.readinessRaceDay,
    sleep_quality_avg: feedback.sleepQualityAvg,
    weather_conditions: feedback.weatherConditions,
    course_difficulty: feedback.courseDifficulty,
    used_ai_recommendations: feedback.usedAiRecommendations,
    metadata: feedback.metadata,
  };

  const { error } = await supabase.from('race_feedback').upsert([dbFeedback], {
    onConflict: 'user_id,race_id',
  });

  if (error) {
    console.error('[taperLearning] Error saving race feedback:', error);
    return false;
  }

  console.log('[taperLearning] Race feedback saved successfully');
  return true;
}

export async function getRaceFeedbackHistory(limit = 20): Promise<RaceFeedbackData[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('race_feedback')
    .select('*')
    .eq('user_id', userId)
    .order('race_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[taperLearning] Error fetching feedback history:', error);
    return [];
  }

  return (data || []).map(dbFeedbackToFeedback);
}

export async function analyzeTaperHistory(
  racePriority: RacePriority,
  distanceKm: number
): Promise<TaperLearningInsights | null> {
  const history = await getRaceFeedbackHistory(50);

  const relevantFeedback = history.filter(
    f =>
      f.racePriority === racePriority &&
      Math.abs(f.raceDistanceKm - distanceKm) <= distanceKm * 0.2
  );

  if (relevantFeedback.length < 3) {
    return {
      optimalTaperDays: 0,
      confidenceScore: 0,
      successfulTapers: 0,
      totalTapers: relevantFeedback.length,
      averagePerformanceRating: 0,
      recommendations: ['Insufficient data - need at least 3 similar races for meaningful analysis'],
      dataQuality: 'insufficient',
    };
  }

  const successfulTapers = relevantFeedback.filter(
    f => f.taperFeeling === 'just_right' && (f.performanceRating === 'exceeded' || f.performanceRating === 'met')
  );

  const avgTaperDays =
    successfulTapers.reduce((sum, f) => sum + f.taperDurationDays, 0) / successfulTapers.length || 0;

  const performanceScores = relevantFeedback.map(f => {
    switch (f.performanceRating) {
      case 'exceeded':
        return 100;
      case 'met':
        return 75;
      case 'below':
        return 50;
      case 'far_below':
        return 25;
      default:
        return 50;
    }
  });

  const avgPerformance = performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length;

  const confidenceScore = Math.min(1, relevantFeedback.length / 10);

  const recommendations: string[] = [];

  const tooFreshCount = relevantFeedback.filter(f => f.taperFeeling === 'too_fresh').length;
  const tooTiredCount = relevantFeedback.filter(f => f.taperFeeling === 'too_tired').length;

  if (tooFreshCount > tooTiredCount && tooFreshCount / relevantFeedback.length > 0.3) {
    recommendations.push('You tend to feel too fresh on race day. Consider shortening your taper by 1-2 days.');
  } else if (tooTiredCount > tooFreshCount && tooTiredCount / relevantFeedback.length > 0.3) {
    recommendations.push('You tend to feel fatigued on race day. Consider extending your taper by 1-2 days.');
  } else {
    recommendations.push('Your taper duration appears well-calibrated for your physiology.');
  }

  const highPerformanceRaces = relevantFeedback.filter(f =>
    ['exceeded', 'met'].includes(f.performanceRating)
  );

  if (highPerformanceRaces.length > 0) {
    const commonFactors: string[] = [];

    const goodReadiness = highPerformanceRaces.filter(
      f => f.readinessRaceDay && f.readinessRaceDay >= 80
    ).length;

    if (goodReadiness / highPerformanceRaces.length > 0.7) {
      commonFactors.push('high readiness score (≥80)');
    }

    const goodSleep = highPerformanceRaces.filter(
      f => f.sleepQualityAvg && f.sleepQualityAvg >= 7
    ).length;

    if (goodSleep / highPerformanceRaces.length > 0.7) {
      commonFactors.push('quality sleep during taper (≥7/10)');
    }

    if (commonFactors.length > 0) {
      recommendations.push(
        `Your best performances correlate with: ${commonFactors.join(', ')}`
      );
    }
  }

  const dataQuality: 'excellent' | 'good' | 'limited' | 'insufficient' =
    relevantFeedback.length >= 10
      ? 'excellent'
      : relevantFeedback.length >= 5
      ? 'good'
      : relevantFeedback.length >= 3
      ? 'limited'
      : 'insufficient';

  return {
    optimalTaperDays: Math.round(avgTaperDays),
    confidenceScore,
    successfulTapers: successfulTapers.length,
    totalTapers: relevantFeedback.length,
    averagePerformanceRating: avgPerformance,
    recommendations,
    dataQuality,
  };
}

export async function suggestTaperAdjustment(
  race: Race,
  defaultTaperDays: number
): Promise<TaperAdjustmentSuggestion | null> {
  const distanceKm = race.distanceKm || 0;
  const priority = race.priority || 'B';

  const insights = await analyzeTaperHistory(priority, distanceKm);

  if (!insights || insights.dataQuality === 'insufficient') {
    return null;
  }

  if (insights.confidenceScore < 0.3 || insights.totalTapers < 3) {
    return null;
  }

  const optimalDays = insights.optimalTaperDays;
  const adjustmentDays = optimalDays - defaultTaperDays;

  if (Math.abs(adjustmentDays) < 2) {
    return null;
  }

  const reason = buildAdjustmentReason(insights, adjustmentDays, defaultTaperDays, optimalDays);

  return {
    originalTaperDays: defaultTaperDays,
    suggestedTaperDays: optimalDays,
    adjustmentDays,
    reason,
    confidence: insights.confidenceScore,
    basedOnRaces: insights.totalTapers,
  };
}

function buildAdjustmentReason(
  insights: TaperLearningInsights,
  adjustmentDays: number,
  defaultDays: number,
  optimalDays: number
): string {
  const direction = adjustmentDays > 0 ? 'extend' : 'shorten';
  const absAdjust = Math.abs(adjustmentDays);

  let reason = `Based on ${insights.totalTapers} similar races, recommend ${direction}ing taper from ${defaultDays} to ${optimalDays} days (${absAdjust === 1 ? '1 day' : `${absAdjust} days`} ${direction === 'extend' ? 'longer' : 'shorter'}). `;

  if (insights.successfulTapers >= 3) {
    reason += `${insights.successfulTapers} of your successful races used tapers around ${optimalDays} days. `;
  }

  return reason;
}

export async function logTaperAdjustment(
  raceId: string,
  raceName: string,
  raceDate: string,
  racePriority: RacePriority,
  originalTaperDays: number,
  adjustedTaperDays: number,
  reason: string,
  adjustmentType: 'ai_learning' | 'readiness_based' | 'manual' | 'proximity_conflict',
  readinessScore?: number,
  fatigueScore?: number,
  confidenceScore?: number
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbLog = {
    user_id: userId,
    race_id: raceId,
    race_name: raceName,
    race_date: raceDate,
    race_priority: racePriority,
    original_taper_days: originalTaperDays,
    adjusted_taper_days: adjustedTaperDays,
    adjustment_reason: reason,
    adjustment_type: adjustmentType,
    readiness_score: readinessScore,
    fatigue_score: fatigueScore,
    confidence_score: confidenceScore,
  };

  const { error } = await supabase.from('taper_adjustments_log').insert([dbLog]);

  if (error) {
    console.error('[taperLearning] Error logging taper adjustment:', error);
    return false;
  }

  console.log('[taperLearning] Taper adjustment logged:', {
    race: raceName,
    original: originalTaperDays,
    adjusted: adjustedTaperDays,
    type: adjustmentType,
  });

  return true;
}

export async function getTaperAdjustmentHistory(limit = 20) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('taper_adjustments_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[taperLearning] Error fetching adjustment history:', error);
    return [];
  }

  return data || [];
}

function dbFeedbackToFeedback(db: any): RaceFeedbackData {
  return {
    raceId: db.race_id,
    raceName: db.race_name,
    raceDate: db.race_date,
    raceDistanceKm: db.race_distance_km,
    racePriority: db.race_priority,
    taperDurationDays: db.taper_duration_days,
    taperFeeling: db.taper_feeling,
    taperQualityScore: db.taper_quality_score,
    predictedTimeMin: db.predicted_time_min,
    actualTimeMin: db.actual_time_min,
    perceivedEffort: db.perceived_effort,
    performanceRating: db.performance_rating,
    whatWentWell: db.what_went_well,
    whatToImprove: db.what_to_improve,
    nutritionNotes: db.nutrition_notes,
    pacingNotes: db.pacing_notes,
    avgHr: db.avg_hr,
    maxHr: db.max_hr,
    hrv7dayAvg: db.hrv_7day_avg,
    readinessRaceDay: db.readiness_race_day,
    sleepQualityAvg: db.sleep_quality_avg,
    weatherConditions: db.weather_conditions,
    courseDifficulty: db.course_difficulty,
    usedAiRecommendations: db.used_ai_recommendations,
    metadata: db.metadata,
  };
}
