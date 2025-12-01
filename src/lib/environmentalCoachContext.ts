import { getCurrentUserId } from './supabase';
import { getHeatToleranceProfile } from './environmental-learning/heatTolerance';
import { getAltitudeProfile } from './environmental-learning/altitudeResponse';
import { getOptimalTimeProfile } from './environmental-learning/optimalTime';

export async function getEnvironmentalCoachContext(): Promise<string> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return '';

    const [heatProfile, altitudeProfile, timeProfile] = await Promise.all([
      getHeatToleranceProfile(userId),
      getAltitudeProfile(userId),
      getOptimalTimeProfile(userId),
    ]);

    const contextParts: string[] = [];

    if (heatProfile && heatProfile.confidenceScore >= 50) {
      contextParts.push(
        `HEAT TOLERANCE: User performs best at ${heatProfile.optimalTempC}°C. ` +
        `Performance degrades above ${heatProfile.heatThresholdC}°C. ` +
        `Acclimatization takes ${heatProfile.acclimatizationRate} days. ` +
        `(${heatProfile.confidenceScore}% confidence)`
      );
    }

    if (altitudeProfile && altitudeProfile.confidenceScore >= 50) {
      contextParts.push(
        `ALTITUDE RESPONSE: Sea level baseline pace is ${altitudeProfile.seaLevelBasePace.toFixed(2)} min/km. ` +
        `Max trained altitude: ${altitudeProfile.maxTrainingAltitude}m. ` +
        `Requires ${altitudeProfile.acclimatizationDays} days to acclimatize. ` +
        `(${altitudeProfile.confidenceScore}% confidence)`
      );
    }

    if (timeProfile && timeProfile.confidenceScore >= 50) {
      contextParts.push(
        `OPTIMAL TIMING: User performs best during ${timeProfile.bestTimeOfDay.replace('_', ' ')}. ` +
        `${timeProfile.isEarlyBird ? 'Morning runner' : 'Evening runner'}. ` +
        `(${timeProfile.confidenceScore}% confidence)`
      );
    }

    if (contextParts.length === 0) {
      return '';
    }

    return `\n\n=== ENVIRONMENTAL INSIGHTS (Use for personalized advice) ===\n${contextParts.join('\n\n')}\n` +
      `NOTE: These are learned from user's actual training data. Use them to provide specific, personalized recommendations.\n`;

  } catch (err) {
    console.error('Error getting environmental coach context:', err);
    return '';
  }
}

export async function getWorkoutTimeRecommendation(
  workoutType: string,
  temperature?: number
): Promise<string> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return '';

    const [timeProfile, heatProfile] = await Promise.all([
      getOptimalTimeProfile(userId),
      getHeatToleranceProfile(userId),
    ]);

    const recommendations: string[] = [];

    if (timeProfile && timeProfile.confidenceScore >= 60) {
      const bestHours = timeProfile.performanceByHour
        .filter(p => p.efficiencyScore > 0)
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 3);

      if (bestHours.length > 0) {
        recommendations.push(
          `Based on your training history, you perform best between ${bestHours[0].hour}:00-${bestHours[2].hour + 1}:00.`
        );
      }
    }

    if (temperature && heatProfile && heatProfile.confidenceScore >= 60) {
      if (temperature > heatProfile.heatThresholdC) {
        recommendations.push(
          `The temperature (${temperature}°C) is above your heat threshold. ` +
          `Consider running early morning or evening to avoid the heat.`
        );
      } else if (Math.abs(temperature - heatProfile.optimalTempC) <= 3) {
        recommendations.push(
          `Perfect conditions! Temperature is in your optimal range (${heatProfile.optimalTempC}°C).`
        );
      }
    }

    return recommendations.length > 0 ? recommendations.join(' ') : '';

  } catch (err) {
    console.error('Error getting workout time recommendation:', err);
    return '';
  }
}
