/**
 * Personalized Heat Recommendations Engine
 *
 * Generates tailored recommendations based on athlete profile and heat analysis
 */

import { supabase } from '../supabase';
import { getAthleteHeatAcclimationIndex } from './heatAcclimation';

export interface AthleteProfile {
  userId: string;
  bodyWeightKg?: number;
  age?: number;
  fitnessLevel?: string;
  heatAcclimationIndex: number;
}

export interface PersonalizedRecommendations {
  hydration: string[];
  pacing: string[];
  cooling: string[];
  clothing: string[];
  acclimation: string[];
  personalizationFactors: string[];
}

/**
 * Fetches athlete profile for personalization
 */
export async function fetchAthleteProfile(userId: string): Promise<AthleteProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, body_weight_kg, age, heat_acclimation_index')
    .eq('user_id', userId)
    .maybeSingle();

  const heatAcclimationIndex = await getAthleteHeatAcclimationIndex(userId);

  if (error || !data) {
    return {
      userId,
      heatAcclimationIndex
    };
  }

  return {
    userId,
    bodyWeightKg: data.body_weight_kg,
    age: data.age,
    heatAcclimationIndex: data.heat_acclimation_index || heatAcclimationIndex
  };
}

/**
 * Generates personalized recommendations based on heat analysis and athlete profile
 */
export async function generatePersonalizedRecommendations(
  userId: string,
  heatMetrics: any,
  physiologicalStress: any
): Promise<PersonalizedRecommendations> {
  const profile = await fetchAthleteProfile(userId);
  const personalizationFactors: string[] = [];

  const recommendations: PersonalizedRecommendations = {
    hydration: [],
    pacing: [],
    cooling: [],
    clothing: [],
    acclimation: [],
    personalizationFactors
  };

  // HYDRATION RECOMMENDATIONS
  recommendations.hydration = generateHydrationRecommendations(
    profile,
    heatMetrics,
    personalizationFactors
  );

  // PACING RECOMMENDATIONS
  recommendations.pacing = generatePacingRecommendations(
    profile,
    heatMetrics,
    physiologicalStress,
    personalizationFactors
  );

  // COOLING STRATEGY
  recommendations.cooling = generateCoolingRecommendations(
    heatMetrics,
    personalizationFactors
  );

  // CLOTHING RECOMMENDATIONS
  recommendations.clothing = generateClothingRecommendations(
    heatMetrics,
    personalizationFactors
  );

  // HEAT ACCLIMATION
  recommendations.acclimation = generateAcclimationRecommendations(
    profile,
    personalizationFactors
  );

  return recommendations;
}

/**
 * Generate hydration recommendations
 */
function generateHydrationRecommendations(
  profile: AthleteProfile,
  heatMetrics: any,
  factors: string[]
): string[] {
  const recommendations: string[] = [];
  const severity = heatMetrics.overall_severity;
  const avgHumidity = heatMetrics.avg_humidity_percent || 50;

  // Base hydration rate
  let baseHydrationMl = 500; // ml per hour baseline

  // Adjust for body weight if available
  if (profile.bodyWeightKg) {
    // 7-10 ml per kg per hour in heat
    baseHydrationMl = profile.bodyWeightKg * 8;
    factors.push(`body_weight:${profile.bodyWeightKg}kg`);
    recommendations.push(
      `Based on your weight (${profile.bodyWeightKg}kg), aim for ${baseHydrationMl}-${baseHydrationMl + 100}ml per hour`
    );
  } else {
    // Generic recommendation
    recommendations.push(`Maintain hydration at 500-700ml per hour in these conditions`);
  }

  // Electrolyte recommendations
  if (avgHumidity > 70 || severity === 'HIGH' || severity === 'EXTREME') {
    const sodiumMg = profile.bodyWeightKg ? Math.round(profile.bodyWeightKg * 8) : 400;
    recommendations.push(
      `Increase sodium intake to ${sodiumMg}-${sodiumMg + 200}mg per hour in high humidity`
    );
    factors.push(`high_humidity:${avgHumidity.toFixed(0)}%`);
  }

  // Pre-hydration
  if (severity === 'HIGH' || severity === 'EXTREME') {
    recommendations.push(
      `Pre-hydrate with 500-750ml 2 hours before activity, plus 250ml 15 minutes before start`
    );
  }

  return recommendations;
}

/**
 * Generate pacing recommendations
 */
function generatePacingRecommendations(
  profile: AthleteProfile,
  heatMetrics: any,
  physiologicalStress: any,
  factors: string[]
): string[] {
  const recommendations: string[] = [];
  const severity = heatMetrics.overall_severity;
  const paceDegradation = physiologicalStress.pace_degradation.degradation_percent || 0;

  // Adjust pacing based on heat acclimation
  if (profile.heatAcclimationIndex < 60) {
    const paceReduction = severity === 'EXTREME' ? 20 : severity === 'HIGH' ? 15 : 10;
    recommendations.push(
      `Your heat acclimation is ${profile.heatAcclimationIndex}/100. Reduce pace by ${paceReduction}% to compensate`
    );
    factors.push(`heat_acclimation:${profile.heatAcclimationIndex}`);
  } else if (profile.heatAcclimationIndex > 75) {
    recommendations.push(
      `Your high heat acclimation (${profile.heatAcclimationIndex}/100) allows for more aggressive pacing`
    );
    factors.push(`heat_acclimation:${profile.heatAcclimationIndex}`);
  }

  // Observed pace degradation feedback
  if (paceDegradation > 0) {
    recommendations.push(
      `You slowed ${paceDegradation.toFixed(0)}% during this activity - typical for these conditions`
    );
  }

  // Starting strategy
  if (severity === 'HIGH' || severity === 'EXTREME') {
    recommendations.push(
      `Start conservatively - first 25% at 85-90% target pace to preserve glycogen and reduce early heat stress`
    );
  }

  return recommendations;
}

/**
 * Generate cooling strategy recommendations
 */
function generateCoolingRecommendations(
  heatMetrics: any,
  factors: string[]
): string[] {
  const recommendations: string[] = [];
  const severity = heatMetrics.overall_severity;
  const maxHeatIndex = heatMetrics.max_heat_index_c || 25;

  if (maxHeatIndex > 35) {
    recommendations.push(
      `Ice vest or cooling towel highly recommended when heat index exceeds 35°C`
    );
  }

  if (severity === 'HIGH' || severity === 'EXTREME') {
    recommendations.push(
      `Seek shade every 30-45 minutes for 2-3 minute cooling breaks`
    );
    recommendations.push(
      `Pour water over head, neck, and forearms at aid stations for evaporative cooling`
    );
  }

  if (heatMetrics.avg_humidity_percent > 80) {
    recommendations.push(
      `High humidity (${heatMetrics.avg_humidity_percent.toFixed(0)}%) reduces sweat evaporation - active cooling more important`
    );
    factors.push(`high_humidity:${heatMetrics.avg_humidity_percent.toFixed(0)}%`);
  }

  return recommendations;
}

/**
 * Generate clothing recommendations
 */
function generateClothingRecommendations(
  heatMetrics: any,
  factors: string[]
): string[] {
  const recommendations: string[] = [];
  const severity = heatMetrics.overall_severity;

  if (severity === 'HIGH' || severity === 'EXTREME') {
    recommendations.push(
      `Wear light-colored, loose-fitting, moisture-wicking fabrics`
    );
    recommendations.push(
      `Consider a breathable cap or visor for sun protection without trapping heat`
    );
  }

  if (heatMetrics.max_temperature_c > 30) {
    recommendations.push(
      `Apply sunscreen SPF 30+ to reduce skin temperature from direct radiation`
    );
  }

  return recommendations;
}

/**
 * Generate heat acclimation recommendations
 */
function generateAcclimationRecommendations(
  profile: AthleteProfile,
  factors: string[]
): string[] {
  const recommendations: string[] = [];

  if (profile.heatAcclimationIndex < 60) {
    recommendations.push(
      `Your heat acclimation is below optimal (${profile.heatAcclimationIndex}/100)`
    );
    recommendations.push(
      `Build tolerance with 7-10 days of controlled heat exposure (sauna, warm treadmill, hot yoga)`
    );
    recommendations.push(
      `Start with 20 minutes per session and gradually increase to 45-60 minutes`
    );
    factors.push(`needs_acclimation:true`);
  } else if (profile.heatAcclimationIndex > 75) {
    recommendations.push(
      `Excellent heat adaptation (${profile.heatAcclimationIndex}/100) - maintain with 1-2 heat sessions per week`
    );
    factors.push(`well_acclimated:true`);
  }

  return recommendations;
}
