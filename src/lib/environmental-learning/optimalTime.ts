import { getSupabase, getCurrentUserId } from '@/lib/supabase';

export interface OptimalTimeProfile {
  bestTimeOfDay: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
  performanceByHour: { hour: number; efficiencyScore: number }[];
  completionRateByHour: { hour: number; completionPct: number }[];
  isEarlyBird: boolean;
  confidenceScore: number;
}

const TIME_OF_DAY_HOURS: { [key: string]: number[] } = {
  early_morning: [5, 6, 7],
  morning: [8, 9, 10, 11],
  afternoon: [12, 13, 14, 15, 16],
  evening: [17, 18, 19, 20],
  night: [21, 22, 23, 0, 1, 2, 3, 4],
};

export async function learnOptimalTrainingTime(userId: string): Promise<OptimalTimeProfile> {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { data, error } = await supabase
    .from('environmental_training_data')
    .select('time_of_day, performance_metrics, log_entries(date)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data || data.length < 20) {
    return {
      bestTimeOfDay: 'morning',
      performanceByHour: [],
      completionRateByHour: [],
      isEarlyBird: true,
      confidenceScore: 0,
    };
  }

  const performanceByTime: { [key: string]: { paces: number[]; completions: number[] } } = {
    early_morning: { paces: [], completions: [] },
    morning: { paces: [], completions: [] },
    afternoon: { paces: [], completions: [] },
    evening: { paces: [], completions: [] },
    night: { paces: [], completions: [] },
  };

  data.forEach(d => {
    if (!d.time_of_day || !d.performance_metrics?.pace_min_km) return;

    const timeSlot = d.time_of_day;
    if (performanceByTime[timeSlot]) {
      performanceByTime[timeSlot].paces.push(d.performance_metrics.pace_min_km);
      performanceByTime[timeSlot].completions.push(d.performance_metrics.completion_rate);
    }
  });

  const avgPaceOverall = data
    .filter(d => d.performance_metrics?.pace_min_km)
    .reduce((sum, d, _, arr) => sum + d.performance_metrics.pace_min_km / arr.length, 0);

  const timeSlotScores: { timeOfDay: string; score: number; count: number }[] = [];

  Object.keys(performanceByTime).forEach(timeSlot => {
    const { paces, completions } = performanceByTime[timeSlot];

    if (paces.length < 3) return;

    const avgPace = paces.reduce((sum, p) => sum + p, 0) / paces.length;
    const avgCompletion = completions.reduce((sum, c) => sum + c, 0) / completions.length;

    const paceScore = ((avgPaceOverall - avgPace) / avgPaceOverall) * 100;
    const completionScore = avgCompletion * 100;

    const combinedScore = paceScore * 0.6 + completionScore * 0.4;

    timeSlotScores.push({
      timeOfDay: timeSlot,
      score: combinedScore,
      count: paces.length,
    });
  });

  timeSlotScores.sort((a, b) => b.score - a.score);

  const bestTimeOfDay = (timeSlotScores[0]?.timeOfDay || 'morning') as OptimalTimeProfile['bestTimeOfDay'];

  const isEarlyBird = ['early_morning', 'morning'].includes(bestTimeOfDay);

  const hourlyPerformance: { [hour: number]: { paces: number[]; completions: number[] } } = {};

  for (let h = 0; h < 24; h++) {
    hourlyPerformance[h] = { paces: [], completions: [] };
  }

  Object.keys(performanceByTime).forEach(timeSlot => {
    const hours = TIME_OF_DAY_HOURS[timeSlot] || [];
    const { paces, completions } = performanceByTime[timeSlot];

    if (paces.length === 0) return;

    const avgPace = paces.reduce((sum, p) => sum + p, 0) / paces.length;
    const avgCompletion = completions.reduce((sum, c) => sum + c, 0) / completions.length;

    hours.forEach(hour => {
      hourlyPerformance[hour].paces.push(avgPace);
      hourlyPerformance[hour].completions.push(avgCompletion);
    });
  });

  const performanceByHour = Object.keys(hourlyPerformance)
    .map(Number)
    .filter(hour => hourlyPerformance[hour].paces.length > 0)
    .map(hour => {
      const paces = hourlyPerformance[hour].paces;
      const avgPace = paces.reduce((sum, p) => sum + p, 0) / paces.length;
      const efficiencyScore = ((avgPaceOverall - avgPace) / avgPaceOverall) * 100;

      return {
        hour,
        efficiencyScore: parseFloat(efficiencyScore.toFixed(2)),
      };
    });

  const completionRateByHour = Object.keys(hourlyPerformance)
    .map(Number)
    .filter(hour => hourlyPerformance[hour].completions.length > 0)
    .map(hour => {
      const completions = hourlyPerformance[hour].completions;
      const avgCompletion = completions.reduce((sum, c) => sum + c, 0) / completions.length;

      return {
        hour,
        completionPct: parseFloat((avgCompletion * 100).toFixed(1)),
      };
    });

  const confidenceScore = Math.min(
    100,
    (data.length / 50) * 60 + (timeSlotScores.length / 5) * 40
  );

  const profile: OptimalTimeProfile = {
    bestTimeOfDay,
    performanceByHour,
    completionRateByHour,
    isEarlyBird,
    confidenceScore: Math.round(confidenceScore),
  };

  await saveOptimalTimeProfile(userId, profile);

  return profile;
}

export async function saveOptimalTimeProfile(
  userId: string,
  profile: OptimalTimeProfile
): Promise<void> {
  const supabase = getSupabase();

  if (!supabase) return;

  const { error } = await supabase
    .from('environmental_adaptations')
    .upsert({
      user_id: userId,
      adaptation_type: 'optimal_time',
      learned_coefficients: {
        bestTimeOfDay: profile.bestTimeOfDay,
        performanceByHour: profile.performanceByHour,
        completionRateByHour: profile.completionRateByHour,
        isEarlyBird: profile.isEarlyBird,
      },
      confidence_score: profile.confidenceScore,
      data_points_count: profile.performanceByHour.length,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id,adaptation_type',
    });

  if (error) {
    console.error('Error saving optimal time profile:', error);
  }
}

export function suggestWorkoutTime(
  workoutType: string,
  weather: { temperature?: number; conditions?: string },
  profile: OptimalTimeProfile
): { hour: number; reason: string } {
  const { performanceByHour, bestTimeOfDay } = profile;

  if (performanceByHour.length === 0) {
    return {
      hour: 7,
      reason: 'Default morning time suggested (no data available yet)',
    };
  }

  let candidateHours = performanceByHour
    .filter(p => p.efficiencyScore > -5)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    .slice(0, 5)
    .map(p => p.hour);

  if (weather.temperature && weather.temperature > 25) {
    candidateHours = candidateHours.filter(h => h < 9 || h > 18);

    if (candidateHours.length === 0) {
      return {
        hour: 6,
        reason: 'Early morning recommended due to high temperatures',
      };
    }
  }

  if (workoutType.toLowerCase().includes('long') || workoutType.toLowerCase().includes('easy')) {
    const preferredHours = TIME_OF_DAY_HOURS[bestTimeOfDay];
    const intersection = candidateHours.filter(h => preferredHours.includes(h));

    if (intersection.length > 0) {
      return {
        hour: intersection[0],
        reason: `Your best time (${bestTimeOfDay}) for easy/long runs`,
      };
    }
  }

  return {
    hour: candidateHours[0] || 7,
    reason: `Optimized for your peak performance time`,
  };
}

export async function getOptimalTimeProfile(userId: string): Promise<OptimalTimeProfile | null> {
  const supabase = getSupabase();

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('environmental_adaptations')
    .select('*')
    .eq('user_id', userId)
    .eq('adaptation_type', 'optimal_time')
    .single();

  if (error || !data) {
    return null;
  }

  const coefficients = data.learned_coefficients as any;

  return {
    bestTimeOfDay: coefficients.bestTimeOfDay,
    performanceByHour: coefficients.performanceByHour || [],
    completionRateByHour: coefficients.completionRateByHour || [],
    isEarlyBird: coefficients.isEarlyBird,
    confidenceScore: data.confidence_score,
  };
}
