/**
 * Race Day Weather Planning
 *
 * Analyzes expected race day weather and provides:
 * - Performance impact predictions
 * - Pacing strategy adjustments
 * - Gear and nutrition recommendations
 * - Acclimation protocol if needed
 */

import { supabase, getCurrentUserId } from '@/lib/supabase';
import { generateHeatAcclimationProtocol, getHeatTrainingRecommendation } from '@/lib/environmental-learning/heatAcclimation';

export interface RaceWeatherPlan {
  raceDate: string;
  raceName: string;
  location: string;
  expectedConditions: ExpectedConditions;
  performanceImpact: PerformanceImpact;
  pacingAdjustments: PacingAdjustment[];
  gearRecommendations: string[];
  nutritionAdjustments: string[];
  acclimationNeeded: boolean;
  acclimationProtocol?: any;
  raceWeekTips: string[];
}

export interface ExpectedConditions {
  startTemp: number;
  finishTemp: number;
  humidity: number;
  startHeatIndex: number;
  finishHeatIndex: number;
  severity: 'comfortable' | 'moderate' | 'challenging' | 'extreme';
}

export interface PerformanceImpact {
  estimatedSlowdownPercent: number;
  timeAddedMinutes: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface PacingAdjustment {
  segment: string;
  adjustment: string;
  reasoning: string;
}

/**
 * Generate comprehensive race day weather plan
 */
export async function generateRaceWeatherPlan(
  raceDate: string,
  raceName: string,
  location: string,
  estimatedDurationHours: number,
  startTime: string, // "07:00"
  distance_km: number
): Promise<RaceWeatherPlan> {
  // Get historical weather for race location and date
  const expectedConditions = await predictRaceConditions(
    location,
    raceDate,
    startTime,
    estimatedDurationHours
  );

  // Estimate performance impact
  const performanceImpact = await estimatePerformanceImpact(
    expectedConditions,
    distance_km,
    estimatedDurationHours
  );

  // Generate pacing adjustments
  const pacingAdjustments = generatePacingAdjustments(
    expectedConditions,
    estimatedDurationHours,
    distance_km
  );

  // Gear recommendations
  const gearRecommendations = generateGearRecommendations(expectedConditions);

  // Nutrition adjustments
  const nutritionAdjustments = generateNutritionAdjustments(
    expectedConditions,
    estimatedDurationHours
  );

  // Check if acclimation needed
  const userId = await getCurrentUserId();
  let acclimationNeeded = false;
  let acclimationProtocol;

  if (userId && expectedConditions.startHeatIndex > 70) {
    try {
      const protocol = await generateHeatAcclimationProtocol(
        raceDate,
        expectedConditions.finishHeatIndex,
        location
      );
      acclimationNeeded = protocol.phase !== 'none' && protocol.phase !== 'maintenance';
      acclimationProtocol = protocol;
    } catch (err) {
      console.error('Error generating acclimation protocol:', err);
    }
  }

  // Race week tips
  const raceWeekTips = generateRaceWeekTips(expectedConditions, acclimationNeeded);

  return {
    raceDate,
    raceName,
    location,
    expectedConditions,
    performanceImpact,
    pacingAdjustments,
    gearRecommendations,
    nutritionAdjustments,
    acclimationNeeded,
    acclimationProtocol,
    raceWeekTips
  };
}

/**
 * Predict race day conditions based on historical data
 */
async function predictRaceConditions(
  location: string,
  raceDate: string,
  startTime: string,
  durationHours: number
): Promise<ExpectedConditions> {
  // This would ideally call a weather API for historical averages
  // For now, return reasonable estimates based on date/location

  const raceMonth = new Date(raceDate).getMonth();
  const [startHour] = startTime.split(':').map(Number);

  // Rough temperature estimates by month (Northern Hemisphere)
  const tempByMonth = [5, 7, 12, 16, 21, 26, 28, 27, 23, 17, 11, 6];
  const baseTemp = tempByMonth[raceMonth];

  // Temperature rise during race
  const startTemp = baseTemp + (startHour >= 10 ? 5 : startHour >= 7 ? 2 : -2);
  const finishTemp = startTemp + Math.min(durationHours * 3, 10);

  // Humidity estimate (higher in summer mornings)
  const humidity = raceMonth >= 5 && raceMonth <= 8 ? 75 : 60;

  // Calculate heat index (simplified NOAA formula)
  const startHeatIndex = calculateHeatIndex(startTemp, humidity);
  const finishHeatIndex = calculateHeatIndex(finishTemp, humidity);

  let severity: 'comfortable' | 'moderate' | 'challenging' | 'extreme';
  if (finishHeatIndex < 27) severity = 'comfortable';
  else if (finishHeatIndex < 32) severity = 'moderate';
  else if (finishHeatIndex < 41) severity = 'challenging';
  else severity = 'extreme';

  return {
    startTemp,
    finishTemp,
    humidity,
    startHeatIndex,
    finishHeatIndex,
    severity
  };
}

function calculateHeatIndex(temp: number, humidity: number): number {
  if (temp < 27) return temp;

  const T = temp;
  const RH = humidity;

  // Rothfusz regression (NOAA heat index)
  let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

  if (HI >= 80) {
    HI = -42.379 + 2.04901523 * T + 10.14333127 * RH
       - 0.22475541 * T * RH - 0.00683783 * T * T
       - 0.05481717 * RH * RH + 0.00122874 * T * T * RH
       + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;
  }

  return Math.round(HI);
}

/**
 * Estimate performance impact from conditions
 */
async function estimatePerformanceImpact(
  conditions: ExpectedConditions,
  distance_km: number,
  durationHours: number
): Promise<PerformanceImpact> {
  const avgHeatIndex = (conditions.startHeatIndex + conditions.finishHeatIndex) / 2;

  // Research-based slowdown estimates
  // Source: Effects of heat on marathon performance (El Helou et al., 2012)
  let slowdownPercent = 0;

  if (avgHeatIndex < 15) {
    slowdownPercent = 0; // Ideal conditions
  } else if (avgHeatIndex < 20) {
    slowdownPercent = 1; // Cool but comfortable
  } else if (avgHeatIndex < 25) {
    slowdownPercent = 2; // Comfortable
  } else if (avgHeatIndex < 30) {
    slowdownPercent = 3.5; // Getting warm
  } else if (avgHeatIndex < 35) {
    slowdownPercent = 6; // Hot
  } else if (avgHeatIndex < 40) {
    slowdownPercent = 10; // Very hot
  } else {
    slowdownPercent = 15; // Extreme heat
  }

  // Additional impact from rising temperature during race
  const tempRise = conditions.finishTemp - conditions.startTemp;
  if (tempRise > 5) {
    slowdownPercent += 2; // Difficulty adapting to changing conditions
  }

  const timeAddedMinutes = (durationHours * 60 * slowdownPercent) / 100;

  let reasoning = '';
  if (slowdownPercent === 0) {
    reasoning = 'Ideal racing conditions. No significant weather impact expected.';
  } else if (slowdownPercent <= 3) {
    reasoning = 'Comfortable conditions with minimal impact. Stay hydrated and pace conservatively early.';
  } else if (slowdownPercent <= 6) {
    reasoning = 'Moderate heat stress expected. Start conservatively, manage effort carefully, aggressive hydration critical.';
  } else if (slowdownPercent <= 10) {
    reasoning = 'Significant heat impact likely. Major pacing adjustments needed. Consider slower early pace and frequent cooling.';
  } else {
    reasoning = 'Extreme conditions with severe performance impact. Survival > performance. Expect 15-20%+ slower times. Reconsider race goals.';
  }

  return {
    estimatedSlowdownPercent: Math.round(slowdownPercent * 10) / 10,
    timeAddedMinutes: Math.round(timeAddedMinutes),
    confidenceLevel: 'medium',
    reasoning
  };
}

/**
 * Generate segment-specific pacing adjustments
 */
function generatePacingAdjustments(
  conditions: ExpectedConditions,
  durationHours: number,
  distance_km: number
): PacingAdjustment[] {
  const adjustments: PacingAdjustment[] = [];

  if (conditions.severity === 'comfortable') {
    adjustments.push({
      segment: 'Overall',
      adjustment: 'Race as planned',
      reasoning: 'Conditions are favorable for normal pacing strategy'
    });
    return adjustments;
  }

  // Early race (first 25%)
  if (conditions.startHeatIndex < 30) {
    adjustments.push({
      segment: `First ${Math.round(distance_km * 0.25)}km`,
      adjustment: '3-5% slower than goal pace',
      reasoning: 'Build heat gradually; temperature will rise during race'
    });
  } else {
    adjustments.push({
      segment: `First ${Math.round(distance_km * 0.25)}km`,
      adjustment: '5-8% slower than goal pace',
      reasoning: 'Already hot at start; aggressive early conservation essential'
    });
  }

  // Middle race (25-75%)
  if (conditions.severity === 'moderate') {
    adjustments.push({
      segment: `${Math.round(distance_km * 0.25)}-${Math.round(distance_km * 0.75)}km`,
      adjustment: 'Settle into sustainable effort, 3-5% slower',
      reasoning: 'Find rhythm that feels manageable given heat'
    });
  } else {
    adjustments.push({
      segment: `${Math.round(distance_km * 0.25)}-${Math.round(distance_km * 0.75)}km`,
      adjustment: 'Survival pace, 8-12% slower than goal',
      reasoning: 'Manage core temperature; walk aid stations if needed'
    });
  }

  // Final segment
  if (conditions.severity === 'challenging' || conditions.severity === 'extreme') {
    adjustments.push({
      segment: `Final ${Math.round(distance_km * 0.25)}km`,
      adjustment: 'By feel only - HR/pace unreliable',
      reasoning: 'Accumulated heat stress makes metrics unreliable. Listen to body signals.'
    });
  } else {
    adjustments.push({
      segment: `Final ${Math.round(distance_km * 0.25)}km`,
      adjustment: 'Push if feeling strong, maintain if struggling',
      reasoning: 'Moderate conditions allow for some late-race effort if adapted'
    });
  }

  return adjustments;
}

function generateGearRecommendations(conditions: ExpectedConditions): string[] {
  const recommendations: string[] = [];

  if (conditions.startTemp < 15) {
    recommendations.push('Throwaway layer for start (will warm up quickly)');
  }

  if (conditions.finishTemp > 25) {
    recommendations.push('Lightest, most breathable clothing possible');
    recommendations.push('White/light colors to reflect heat');
    recommendations.push('Consider visor instead of hat (better heat dissipation)');
  }

  if (conditions.humidity > 70) {
    recommendations.push('Technical fabric essential (cotton will stay wet)');
    recommendations.push('Body glide/anti-chafe critical (high sweat volume)');
  }

  if (conditions.finishHeatIndex > 32) {
    recommendations.push('Ice vest or cooling sleeves if allowed');
    recommendations.push('Sunglasses with good ventilation');
    recommendations.push('Handheld water bottle to pour over head/body');
  }

  recommendations.push('GPS watch for pacing (HR will be elevated)');

  return recommendations;
}

function generateNutritionAdjustments(
  conditions: ExpectedConditions,
  durationHours: number
): string[] {
  const adjustments: string[] = [];

  // Base hydration
  let fluidPerHour = 500; // ml/hour baseline

  if (conditions.finishHeatIndex > 25) fluidPerHour = 600;
  if (conditions.finishHeatIndex > 30) fluidPerHour = 750;
  if (conditions.finishHeatIndex > 35) fluidPerHour = 900;

  adjustments.push(`Target ${fluidPerHour}ml fluid per hour (${Math.round(fluidPerHour / 250)} aid stations)`);

  // Electrolytes
  let sodiumPerHour = 500; // mg/hour baseline
  if (conditions.finishHeatIndex > 28) sodiumPerHour = 700;
  if (conditions.finishHeatIndex > 33) sodiumPerHour = 1000;

  adjustments.push(`Increase sodium: ${sodiumPerHour}mg/hour (salt tabs or sports drink)`);

  // Pre-race
  if (conditions.severity !== 'comfortable') {
    adjustments.push('Pre-load: 500ml 2 hours before, 250ml at start');
    adjustments.push('Pre-race sodium loading: extra salt at dinner before');
  }

  // During race
  if (conditions.severity === 'challenging' || conditions.severity === 'extreme') {
    adjustments.push('Use ALL aid stations - walk if needed to drink properly');
    adjustments.push('Ice/water on body at every opportunity');
    adjustments.push('Reduce carb intake if stomach issues (heat reduces gut tolerance)');
  }

  // Post-race
  adjustments.push('Immediate cooling post-finish: ice, shade, fluids');

  return adjustments;
}

function generateRaceWeekTips(
  conditions: ExpectedConditions,
  acclimationNeeded: boolean
): string[] {
  const tips: string[] = [];

  if (acclimationNeeded) {
    tips.push('Follow heat acclimation protocol starting NOW (see detailed plan below)');
    tips.push('Minimum 5 days of heat exposure needed for basic adaptation');
  }

  if (conditions.severity !== 'comfortable') {
    tips.push('Stay hydrated all week: urine should be pale yellow');
    tips.push('Increase daily sodium intake: 500mg extra per day');
    tips.push('Avoid alcohol 48 hours before race (impairs heat regulation)');
  }

  if (conditions.severity === 'challenging' || conditions.severity === 'extreme') {
    tips.push('Seriously consider race goal adjustment - PR attempts unwise in these conditions');
    tips.push('Have a Plan B: time goal if conditions moderate, finish goal if extreme');
    tips.push('Know the drop-out locations and warning signs: confusion, nausea, chills');
  }

  tips.push('Check race morning forecast - conditions can change');
  tips.push('Arrive early to avoid pre-race heat stress in corrals');

  return tips;
}
