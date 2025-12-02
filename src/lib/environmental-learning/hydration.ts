/**
 * ======================================================================
 *  HYDRATION & FUELING ENGINE
 *  Environmental Learning Module
 * ======================================================================
 *
 * Personalized hydration and electrolyte recommendations based on:
 * - Environmental conditions (temp, humidity, altitude)
 * - Exercise duration and intensity
 * - Individual sweat rate
 * - Route characteristics (shade, elevation gain)
 *
 * Scientific basis:
 * - Sawka et al. (2007) - ACSM Position Stand on Fluid Replacement
 * - Baker et al. (2016) - Normative data for sweat sodium concentration
 */

export interface HydrationParams {
  temp: number;                 // Temperature in °C
  humidity: number;             // Humidity percentage (0-100)
  duration: number;             // Duration in minutes
  elevationGain: number;        // Elevation gain in meters
  shadeFactor: number;          // 0-1 (0 = full sun, 1 = full shade)
  sweatRate?: number;           // L/hr (if known, otherwise estimated)
  intensity?: number;           // 0-1 scale (0.5 = moderate, 1.0 = max)
  bodyMass?: number;            // kg (for refinement)
}

export interface HydrationNeeds {
  liters: number;               // Total hydration needed
  litersPerHour: number;        // Hydration rate
  sodiumMg: number;             // Total sodium replacement
  sodiumPerHour: number;        // Sodium per hour
  recommendations: string[];    // Practical advice
  carryAmount: string;          // What to carry (e.g., "500ml bottle")
  refillStrategy?: string;      // When/where to refill
}

/**
 * Estimate sweat rate if not provided
 * Based on temperature, humidity, and intensity
 *
 * Baseline: 0.6 L/hr for trained female athlete
 * Adjustments:
 * - +0.02 L/hr per °C above 15°C
 * - +0.005 L/hr per 1% humidity above 40%
 * - +0.3 L/hr per intensity unit
 */
export function estimateSweatRate(
  temp: number,
  humidity: number,
  intensity: number = 0.7
): number {
  const base = 0.6; // L/hr baseline
  const tempAdjustment = Math.max(0, temp - 15) * 0.02;
  const humidityAdjustment = Math.max(0, humidity - 40) * 0.005;
  const intensityAdjustment = intensity * 0.3;

  return base + tempAdjustment + humidityAdjustment + intensityAdjustment;
}

/**
 * Calculate comprehensive hydration needs
 */
export function calculateHydrationNeeds(params: HydrationParams): HydrationNeeds {
  const {
    temp,
    humidity,
    duration,
    elevationGain,
    shadeFactor,
    intensity = 0.7,
    bodyMass = 60
  } = params;

  // Determine sweat rate
  const sweatRate = params.sweatRate || estimateSweatRate(temp, humidity, intensity);

  // Environmental multipliers
  const heatFactor = 1 + Math.max(temp - 18, 0) * 0.04;
  const humidityFactor = 1 + Math.max(humidity - 40, 0) * 0.01;
  const elevationFactor = 1 + elevationGain * 0.0003;
  const shadeBonus = 1 - shadeFactor * 0.3; // Shade reduces sweat rate

  // Total fluid loss
  const hours = duration / 60;
  const totalSweat =
    hours * sweatRate * heatFactor * humidityFactor * elevationFactor * shadeBonus;

  // Sodium calculations (avg 700mg Na per liter of sweat)
  const sodiumLossPerLiter = 700; // mg
  const totalSodium = totalSweat * sodiumLossPerLiter;

  // Generate recommendations
  const recommendations = generateHydrationRecommendations(
    totalSweat,
    hours,
    temp,
    humidity
  );

  // Determine carry strategy
  const carryAmount = determineCarryAmount(totalSweat, duration);

  return {
    liters: Math.round(totalSweat * 100) / 100,
    litersPerHour: Math.round((totalSweat / hours) * 100) / 100,
    sodiumMg: Math.round(totalSodium),
    sodiumPerHour: Math.round(totalSodium / hours),
    recommendations,
    carryAmount,
    refillStrategy: duration > 90 ? 'Plan refill every 60-90 minutes' : undefined
  };
}

function generateHydrationRecommendations(
  totalLiters: number,
  hours: number,
  temp: number,
  humidity: number
): string[] {
  const recs: string[] = [];

  // Pre-hydration
  if (totalLiters > 1.5) {
    recs.push('Pre-hydrate with 300-500ml 30 minutes before starting');
  } else {
    recs.push('Pre-hydrate with 200-300ml 30 minutes before starting');
  }

  // During exercise
  const mlPerHour = (totalLiters / hours) * 1000;
  if (mlPerHour > 800) {
    recs.push(`Drink ${Math.round(mlPerHour / 15)} ml every 15 minutes`);
  } else if (mlPerHour > 500) {
    recs.push(`Drink ${Math.round(mlPerHour / 20)} ml every 20 minutes`);
  } else {
    recs.push('Drink small sips regularly (150-200ml every 20-30 min)');
  }

  // Temperature warnings
  if (temp > 28) {
    recs.push('⚠️ High heat - increase hydration by 20% and monitor for heat stress');
  } else if (temp > 24) {
    recs.push('Moderate heat - stay ahead of thirst and monitor urine color');
  }

  // Electrolytes
  if (hours > 1.5) {
    recs.push('Use electrolyte drink or salt tablets (not just water)');
  }

  if (humidity > 70 && temp > 22) {
    recs.push('High humidity reduces cooling - increase electrolyte intake');
  }

  return recs;
}

function determineCarryAmount(totalLiters: number, durationMinutes: number): string {
  if (durationMinutes < 30) {
    return 'No hydration needed';
  }

  if (totalLiters < 0.3) {
    return '250ml handheld or small flask';
  }

  if (totalLiters < 0.6) {
    return '500ml bottle or handheld';
  }

  if (totalLiters < 1.0) {
    return '750ml bottle or hydration vest with 500ml flask';
  }

  if (totalLiters < 1.5) {
    return 'Hydration vest with 1L capacity';
  }

  if (totalLiters < 2.5) {
    return 'Hydration vest with 1.5-2L capacity + plan refills';
  }

  return 'Hydration pack 2-3L + mandatory refill points';
}

/**
 * Calculate fueling needs (carbohydrates)
 * Based on duration, intensity, heat, and gut training
 */
export interface FuelingParams {
  duration: number;             // minutes
  intensity: number;            // 0-1 scale
  heatIndex: number;            // 0-1 normalized heat stress
  athleteGutTraining: number;   // 0-1 scale (0=untrained, 1=elite)
  bodyMass: number;             // kg
}

export interface FuelingNeeds {
  carbsPerHour: number;         // grams per hour
  totalCarbs: number;           // total grams needed
  recommendations: string[];
}

export function calculateFuelingNeeds(params: FuelingParams): FuelingNeeds {
  const { duration, intensity, heatIndex, athleteGutTraining, bodyMass } = params;

  // Base carbs by intensity (30-70g/hr)
  let carbsPerHour = 30 + intensity * 40;

  // Heat increases carb turnover
  carbsPerHour *= 1 + heatIndex * 0.2;

  // Long events need more
  if (duration > 120) {
    carbsPerHour *= 1.10;
  }

  // Gut training allows higher intake (up to 110g/hr)
  carbsPerHour = Math.min(carbsPerHour + athleteGutTraining * 40, 110);

  // Minimum threshold
  carbsPerHour = Math.max(carbsPerHour, 30);

  const hours = duration / 60;
  const totalCarbs = carbsPerHour * hours;

  const recommendations = generateFuelingRecommendations(
    carbsPerHour,
    duration,
    intensity
  );

  return {
    carbsPerHour: Math.round(carbsPerHour),
    totalCarbs: Math.round(totalCarbs),
    recommendations
  };
}

function generateFuelingRecommendations(
  carbsPerHour: number,
  durationMinutes: number,
  intensity: number
): string[] {
  const recs: string[] = [];

  if (durationMinutes < 60) {
    recs.push('No fueling needed for this duration');
    return recs;
  }

  if (durationMinutes < 90) {
    recs.push('Optional: 1 gel or 20-30g carbs if intensity is high');
    return recs;
  }

  // 90+ minutes
  const gelsNeeded = Math.ceil((carbsPerHour * durationMinutes) / 60 / 25);
  recs.push(`Carry ${gelsNeeded} gels (25g carbs each) or equivalent`);

  if (carbsPerHour > 60) {
    recs.push('Use multiple carb sources (gels + chews + drink) for better absorption');
  }

  if (intensity > 0.8) {
    recs.push('High intensity - prefer liquid/gel carbs over solid food');
  } else {
    recs.push('Moderate pace - can use mix of gels, chews, and real food');
  }

  recs.push(`Start fueling at 20-30 minutes, then every 20-30 minutes`);

  return recs;
}

/**
 * Combined hydration and fueling plan
 */
export function generateCompleteNutritionPlan(
  hydrationParams: HydrationParams,
  fuelingParams: FuelingParams
): {
  hydration: HydrationNeeds;
  fueling: FuelingNeeds;
  summary: string;
  timeline: Array<{ time: number; action: string }>;
} {
  const hydration = calculateHydrationNeeds(hydrationParams);
  const fueling = calculateFuelingNeeds(fuelingParams);

  // Generate timeline
  const timeline: Array<{ time: number; action: string }> = [];

  // Pre-start
  timeline.push({ time: -30, action: 'Pre-hydrate: 300-500ml water/electrolyte' });

  // During
  const duration = hydrationParams.duration;
  for (let t = 15; t < duration; t += 20) {
    const actions: string[] = [];

    if (t % 20 === 15) {
      actions.push(`Drink ${Math.round(hydration.litersPerHour * 333)}ml`);
    }

    if (duration > 60 && t >= 30 && (t - 30) % 30 === 0) {
      actions.push(`Fuel: 1 gel or ${Math.round(fueling.carbsPerHour / 2)}g carbs`);
    }

    if (actions.length > 0) {
      timeline.push({ time: t, action: actions.join(' + ') });
    }
  }

  const summary = `${duration} min effort requires ~${hydration.liters}L hydration (${hydration.litersPerHour}L/hr) and ${fueling.totalCarbs}g carbs (${fueling.carbsPerHour}g/hr)`;

  return { hydration, fueling, summary, timeline };
}
