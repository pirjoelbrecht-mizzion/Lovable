import { getCurrentUserId } from '@/lib/supabase';
import { getOptimalTimeProfile, suggestWorkoutTime } from '@/lib/environmental-learning/optimalTime';
import { getHeatToleranceProfile } from '@/lib/environmental-learning/heatTolerance';
import { getCurrentWeather } from '@/utils/weather';

export interface WorkoutRecommendation {
  type: 'optimal_window' | 'weather_alert' | 'recovery_day' | 'heat_warning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  suggestedTime?: string;
  weatherContext?: {
    temperature: number;
    conditions: string;
    isOptimal: boolean;
  };
}

export async function generateProactiveRecommendations(): Promise<WorkoutRecommendation[]> {
  const recommendations: WorkoutRecommendation[] = [];

  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const [timeProfile, heatProfile] = await Promise.all([
      getOptimalTimeProfile(userId),
      getHeatToleranceProfile(userId),
    ]);

    const currentWeather = await getCurrentWeather();

    if (timeProfile && timeProfile.confidenceScore >= 60) {
      const now = new Date();
      const currentHour = now.getHours();
      const bestHours = timeProfile.performanceByHour
        .filter(p => p.efficiencyScore > 0)
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 3)
        .map(p => p.hour);

      if (bestHours.includes(currentHour)) {
        recommendations.push({
          type: 'optimal_window',
          priority: 'high',
          title: 'Perfect Time to Run!',
          message: `You're in your optimal performance window. Studies show you run ${
            timeProfile.performanceByHour.find(p => p.hour === currentHour)?.efficiencyScore.toFixed(0)
          }% better at this time.`,
        });
      } else {
        const nextBestHour = bestHours.find(h => h > currentHour) || bestHours[0];
        recommendations.push({
          type: 'optimal_window',
          priority: 'medium',
          title: 'Better Window Coming Up',
          message: `Your optimal performance time is ${nextBestHour}:00. Consider scheduling your workout then.`,
          suggestedTime: `${nextBestHour}:00`,
        });
      }
    }

    if (heatProfile && heatProfile.confidenceScore >= 60 && currentWeather) {
      const temp = currentWeather.temperature || 20;

      if (temp > heatProfile.heatThresholdC) {
        const paceImpact = ((temp - heatProfile.optimalTempC) / (heatProfile.heatThresholdC - heatProfile.optimalTempC)) * 5;

        recommendations.push({
          type: 'heat_warning',
          priority: 'high',
          title: 'Heat Alert',
          message: `Current temperature (${temp.toFixed(0)}°C) is above your heat threshold. Expect ~${paceImpact.toFixed(0)}% slower pace. Consider early morning or evening run.`,
          weatherContext: {
            temperature: temp,
            conditions: currentWeather.conditions || 'Hot',
            isOptimal: false,
          },
        });
      } else if (Math.abs(temp - heatProfile.optimalTempC) <= 3) {
        recommendations.push({
          type: 'weather_alert',
          priority: 'medium',
          title: 'Perfect Running Weather!',
          message: `Temperature is ${temp.toFixed(0)}°C - right in your sweet spot (${heatProfile.optimalTempC}°C). Great day for a quality workout!`,
          weatherContext: {
            temperature: temp,
            conditions: currentWeather.conditions || 'Ideal',
            isOptimal: true,
          },
        });
      }
    }

  } catch (err) {
    console.error('Error generating recommendations:', err);
  }

  return recommendations;
}

export async function shouldSendWorkoutReminder(
  plannedWorkoutType: string,
  plannedTime: Date
): Promise<{ send: boolean; reason: string; suggestedAlternative?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { send: true, reason: 'No user profile' };

    const [timeProfile, heatProfile] = await Promise.all([
      getOptimalTimeProfile(userId),
      getHeatToleranceProfile(userId),
    ]);

    const hour = plannedTime.getHours();
    const weather = await getCurrentWeather();

    if (timeProfile && timeProfile.confidenceScore >= 60) {
      const hourPerformance = timeProfile.performanceByHour.find(p => p.hour === hour);

      if (hourPerformance && hourPerformance.efficiencyScore < -10) {
        const bestHour = timeProfile.performanceByHour
          .sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];

        return {
          send: true,
          reason: `This time is ${Math.abs(hourPerformance.efficiencyScore).toFixed(0)}% below your optimal performance.`,
          suggestedAlternative: `${bestHour.hour}:00 (${bestHour.efficiencyScore > 0 ? '+' : ''}${bestHour.efficiencyScore.toFixed(0)}% efficiency)`,
        };
      }
    }

    if (heatProfile && heatProfile.confidenceScore >= 60 && weather) {
      const temp = weather.temperature || 20;

      if (temp > heatProfile.heatThresholdC + 5) {
        return {
          send: true,
          reason: `Extreme heat warning: ${temp.toFixed(0)}°C. Consider rescheduling.`,
          suggestedAlternative: 'Early morning (6-8am) or evening (after 7pm)',
        };
      }
    }

    return { send: true, reason: 'Conditions are acceptable' };

  } catch (err) {
    console.error('Error checking workout reminder:', err);
    return { send: true, reason: 'Error checking conditions' };
  }
}
