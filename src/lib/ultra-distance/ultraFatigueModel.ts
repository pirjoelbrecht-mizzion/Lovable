import type { PhysiologicalInputs } from '@/types/physiology';

export interface UltraFatigueParams {
  distanceKm: number;
  elapsedTimeHours: number;
  elevationGainM: number;
  temperatureC: number;
  humidity: number;
  readinessScore: number;
  athleteLongestUltraKm?: number;
  athleteUltraCount?: number;
  isNightSection?: boolean;
}

export interface UltraFatigueResult {
  fatigueFactor: number;
  paceDecayPercent: number;
  glycogenDepletionPercent: number;
  muscularFatiguePercent: number;
  mentalFatiguePercent: number;
  nightPenaltyPercent: number;
  heatAccumulationFactor: number;
  confidenceScore: number;
  breakdownByFactor: {
    distance: number;
    time: number;
    elevation: number;
    heat: number;
    night: number;
    inexperience: number;
  };
}

export interface SegmentFatigueAdjustment {
  segmentIndex: number;
  distanceFromStartKm: number;
  cumulativeFatigueFactor: number;
  adjustedPaceMultiplier: number;
  estimatedGlycogen: number;
  warningLevel: 'none' | 'caution' | 'warning' | 'critical';
  recommendation?: string;
}

const FATIGUE_CONSTANTS = {
  MARATHON_THRESHOLD_KM: 42.195,
  ULTRA_THRESHOLD_KM: 50,
  EXTREME_ULTRA_KM: 100,
  MULTI_DAY_KM: 160,

  BASE_FATIGUE_RATE: 0.008,
  ULTRA_FATIGUE_EXPONENT: 1.35,
  EXTREME_ULTRA_EXPONENT: 1.5,

  TIME_FATIGUE_THRESHOLD_HOURS: 6,
  TIME_FATIGUE_RATE: 0.02,

  ELEVATION_FATIGUE_PER_1000M: 0.08,
  TECHNICAL_DESCENT_MULTIPLIER: 1.3,

  HEAT_THRESHOLD_C: 20,
  HEAT_FATIGUE_RATE: 0.015,
  HUMIDITY_THRESHOLD: 60,
  HUMIDITY_FATIGUE_RATE: 0.008,

  NIGHT_PACE_PENALTY: 0.12,
  NIGHT_TECHNICAL_PENALTY: 0.18,

  GLYCOGEN_DEPLETION_RATE: 0.012,
  GLYCOGEN_BONK_THRESHOLD: 20,

  INEXPERIENCE_PENALTY_BASE: 0.15,
  INEXPERIENCE_DECAY_FACTOR: 0.7,
};

export function calculateUltraFatigue(params: UltraFatigueParams): UltraFatigueResult {
  const {
    distanceKm,
    elapsedTimeHours,
    elevationGainM,
    temperatureC,
    humidity,
    readinessScore,
    athleteLongestUltraKm = 42.195,
    athleteUltraCount = 0,
    isNightSection = false,
  } = params;

  const distanceFatigue = calculateDistanceFatigue(distanceKm);
  const timeFatigue = calculateTimeFatigue(elapsedTimeHours);
  const elevationFatigue = calculateElevationFatigue(elevationGainM, distanceKm);
  const heatFatigue = calculateHeatFatigue(temperatureC, humidity, elapsedTimeHours);
  const nightPenalty = isNightSection ? calculateNightPenalty(distanceKm) : 0;
  const inexperiencePenalty = calculateInexperiencePenalty(distanceKm, athleteLongestUltraKm);

  const readinessMultiplier = 1 + Math.max(0, (75 - readinessScore) / 200);

  // Calculate experience discount for proven ultra runners
  // Athletes who have completed similar or longer distances get reduced fatigue
  const experienceDiscount = calculateExperienceDiscount(distanceKm, athleteLongestUltraKm, athleteUltraCount);

  const baseFatigue = (
    distanceFatigue * 0.30 +
    timeFatigue * 0.25 +
    elevationFatigue * 0.20 +
    heatFatigue * 0.15 +
    nightPenalty * 0.05 +
    inexperiencePenalty * 0.05
  ) * readinessMultiplier;

  // Apply experience discount - experienced athletes have adapted to ultra fatigue
  const combinedFatigue = baseFatigue * experienceDiscount;

  const fatigueFactor = 1 + Math.min(combinedFatigue, 0.60);
  const paceDecayPercent = (fatigueFactor - 1) * 100;

  const glycogenDepletion = Math.min(100,
    distanceKm * FATIGUE_CONSTANTS.GLYCOGEN_DEPLETION_RATE * 100 *
    (1 + heatFatigue * 0.5)
  );

  const muscularFatigue = Math.min(100,
    (distanceFatigue + elevationFatigue * 1.5) * 100
  );

  const mentalFatigue = Math.min(100,
    (timeFatigue * 0.6 + nightPenalty * 0.4) * 100
  );

  const heatAccumulation = 1 + heatFatigue;

  const confidenceScore = calculateConfidenceScore(
    distanceKm,
    athleteLongestUltraKm,
    readinessScore
  );

  return {
    fatigueFactor,
    paceDecayPercent,
    glycogenDepletionPercent: glycogenDepletion,
    muscularFatiguePercent: muscularFatigue,
    mentalFatiguePercent: mentalFatigue,
    nightPenaltyPercent: nightPenalty * 100,
    heatAccumulationFactor: heatAccumulation,
    confidenceScore,
    breakdownByFactor: {
      distance: distanceFatigue * 100,
      time: timeFatigue * 100,
      elevation: elevationFatigue * 100,
      heat: heatFatigue * 100,
      night: nightPenalty * 100,
      inexperience: inexperiencePenalty * 100,
    },
  };
}

function calculateDistanceFatigue(distanceKm: number): number {
  if (distanceKm <= FATIGUE_CONSTANTS.MARATHON_THRESHOLD_KM) {
    return distanceKm * FATIGUE_CONSTANTS.BASE_FATIGUE_RATE * 0.5;
  }

  const marathonFatigue = FATIGUE_CONSTANTS.MARATHON_THRESHOLD_KM *
    FATIGUE_CONSTANTS.BASE_FATIGUE_RATE * 0.5;

  if (distanceKm <= FATIGUE_CONSTANTS.ULTRA_THRESHOLD_KM) {
    const ultraPortion = distanceKm - FATIGUE_CONSTANTS.MARATHON_THRESHOLD_KM;
    return marathonFatigue + ultraPortion * FATIGUE_CONSTANTS.BASE_FATIGUE_RATE;
  }

  const ultraFatigue = (FATIGUE_CONSTANTS.ULTRA_THRESHOLD_KM - FATIGUE_CONSTANTS.MARATHON_THRESHOLD_KM) *
    FATIGUE_CONSTANTS.BASE_FATIGUE_RATE;

  if (distanceKm <= FATIGUE_CONSTANTS.EXTREME_ULTRA_KM) {
    const extremePortion = distanceKm - FATIGUE_CONSTANTS.ULTRA_THRESHOLD_KM;
    const exponent = FATIGUE_CONSTANTS.ULTRA_FATIGUE_EXPONENT;
    return marathonFatigue + ultraFatigue +
      Math.pow(extremePortion / 50, exponent) * 0.15;
  }

  const extreme100kFatigue = Math.pow(
    (FATIGUE_CONSTANTS.EXTREME_ULTRA_KM - FATIGUE_CONSTANTS.ULTRA_THRESHOLD_KM) / 50,
    FATIGUE_CONSTANTS.ULTRA_FATIGUE_EXPONENT
  ) * 0.15;

  const beyond100k = distanceKm - FATIGUE_CONSTANTS.EXTREME_ULTRA_KM;
  const extremeExponent = FATIGUE_CONSTANTS.EXTREME_ULTRA_EXPONENT;

  return marathonFatigue + ultraFatigue + extreme100kFatigue +
    Math.pow(beyond100k / 60, extremeExponent) * 0.20;
}

function calculateTimeFatigue(elapsedTimeHours: number): number {
  if (elapsedTimeHours <= FATIGUE_CONSTANTS.TIME_FATIGUE_THRESHOLD_HOURS) {
    return elapsedTimeHours * FATIGUE_CONSTANTS.TIME_FATIGUE_RATE * 0.3;
  }

  const baseFatigue = FATIGUE_CONSTANTS.TIME_FATIGUE_THRESHOLD_HOURS *
    FATIGUE_CONSTANTS.TIME_FATIGUE_RATE * 0.3;

  const extraHours = elapsedTimeHours - FATIGUE_CONSTANTS.TIME_FATIGUE_THRESHOLD_HOURS;

  return baseFatigue + Math.pow(extraHours / 10, 1.3) * 0.12;
}

function calculateElevationFatigue(elevationGainM: number, distanceKm: number): number {
  const elevationPer1000m = (elevationGainM / 1000);
  const baseFatigue = elevationPer1000m * FATIGUE_CONSTANTS.ELEVATION_FATIGUE_PER_1000M;

  const steepnessRatio = elevationGainM / (distanceKm * 1000);
  const steepnessMultiplier = steepnessRatio > 0.05 ? 1.2 : 1.0;

  return baseFatigue * steepnessMultiplier;
}

function calculateHeatFatigue(temperatureC: number, humidity: number, hours: number): number {
  let heatFatigue = 0;

  if (temperatureC > FATIGUE_CONSTANTS.HEAT_THRESHOLD_C) {
    const heatExcess = temperatureC - FATIGUE_CONSTANTS.HEAT_THRESHOLD_C;
    heatFatigue += heatExcess * FATIGUE_CONSTANTS.HEAT_FATIGUE_RATE;
  }

  if (humidity > FATIGUE_CONSTANTS.HUMIDITY_THRESHOLD) {
    const humidityExcess = humidity - FATIGUE_CONSTANTS.HUMIDITY_THRESHOLD;
    heatFatigue += humidityExcess * FATIGUE_CONSTANTS.HUMIDITY_FATIGUE_RATE * 0.01;
  }

  const heatAccumulation = Math.min(2.0, 1 + hours * 0.03);

  return heatFatigue * heatAccumulation;
}

function calculateNightPenalty(distanceKm: number): number {
  if (distanceKm < 50) {
    return FATIGUE_CONSTANTS.NIGHT_PACE_PENALTY * 0.5;
  }

  return FATIGUE_CONSTANTS.NIGHT_PACE_PENALTY +
    (distanceKm > 80 ? FATIGUE_CONSTANTS.NIGHT_TECHNICAL_PENALTY * 0.3 : 0);
}

function calculateInexperiencePenalty(raceDistanceKm: number, longestUltraKm: number): number {
  if (longestUltraKm >= raceDistanceKm) {
    return 0;
  }

  const distanceGap = raceDistanceKm - longestUltraKm;
  const gapRatio = distanceGap / raceDistanceKm;

  return FATIGUE_CONSTANTS.INEXPERIENCE_PENALTY_BASE *
    Math.pow(gapRatio, FATIGUE_CONSTANTS.INEXPERIENCE_DECAY_FACTOR);
}

function calculateExperienceDiscount(
  raceDistanceKm: number,
  longestUltraKm: number,
  ultraCount: number
): number {
  // Experienced ultra runners have adapted to fatigue - their base pace already
  // reflects their pacing strategy, so we reduce the additional fatigue penalty

  // No discount for first-time ultra runners
  if (longestUltraKm <= 42.195) {
    return 1.0;
  }

  // Calculate discount based on experience ratio
  // If athlete has done 123km and race is 106km, ratio = 1.16
  const experienceRatio = longestUltraKm / raceDistanceKm;

  let discount = 1.0;

  if (experienceRatio >= 1.2) {
    // Done significantly longer race - 50% discount
    discount = 0.50;
  } else if (experienceRatio >= 1.0) {
    // Done similar or longer race - 40% discount
    discount = 0.60;
  } else if (experienceRatio >= 0.8) {
    // Done 80%+ of this distance - 25% discount
    discount = 0.75;
  } else if (experienceRatio >= 0.6) {
    // Done 60%+ of this distance - 15% discount
    discount = 0.85;
  } else if (longestUltraKm > 50) {
    // Has done at least a 50K ultra - 10% discount
    discount = 0.90;
  }

  // Additional discount for athletes with multiple ultras (max 15% additional)
  if (ultraCount >= 10) {
    discount *= 0.85;
  } else if (ultraCount >= 5) {
    discount *= 0.90;
  } else if (ultraCount >= 3) {
    discount *= 0.95;
  }

  // Never go below 35% of base fatigue
  return Math.max(0.35, discount);
}

function calculateConfidenceScore(
  distanceKm: number,
  longestUltraKm: number,
  readinessScore: number
): number {
  let confidence = 80;

  const distanceRatio = longestUltraKm / distanceKm;
  if (distanceRatio >= 1.0) {
    confidence += 15;
  } else if (distanceRatio >= 0.7) {
    confidence += 5;
  } else if (distanceRatio >= 0.5) {
    confidence -= 10;
  } else {
    confidence -= 25;
  }

  if (distanceKm > 100) {
    confidence -= 10;
  }
  if (distanceKm > 160) {
    confidence -= 15;
  }

  if (readinessScore < 60) {
    confidence -= 10;
  }

  return Math.max(20, Math.min(95, confidence));
}

export function calculateSegmentFatigueProgression(
  totalDistanceKm: number,
  totalElevationGainM: number,
  segmentDistances: number[],
  params: Omit<UltraFatigueParams, 'distanceKm' | 'elapsedTimeHours'>
): SegmentFatigueAdjustment[] {
  const results: SegmentFatigueAdjustment[] = [];
  let cumulativeDistance = 0;

  const estimatedBasePaceMinKm = 7.0;
  const avgElevationPerKm = totalElevationGainM / totalDistanceKm;

  for (let i = 0; i < segmentDistances.length; i++) {
    const segmentLength = segmentDistances[i];
    cumulativeDistance += segmentLength;

    const estimatedHours = (cumulativeDistance * estimatedBasePaceMinKm) / 60;
    const segmentElevation = avgElevationPerKm * cumulativeDistance;

    const isNightSection = estimatedHours > 12 ||
      (estimatedHours > 6 && params.isNightSection);

    const fatigueResult = calculateUltraFatigue({
      ...params,
      distanceKm: cumulativeDistance,
      elapsedTimeHours: estimatedHours,
      elevationGainM: segmentElevation,
      isNightSection,
    });

    let warningLevel: 'none' | 'caution' | 'warning' | 'critical' = 'none';
    let recommendation: string | undefined;

    if (fatigueResult.glycogenDepletionPercent > 80) {
      warningLevel = 'critical';
      recommendation = 'Critical glycogen depletion - increase fueling immediately';
    } else if (fatigueResult.paceDecayPercent > 40) {
      warningLevel = 'warning';
      recommendation = 'Significant pace decay expected - consider walking breaks';
    } else if (fatigueResult.paceDecayPercent > 25) {
      warningLevel = 'caution';
      recommendation = 'Moderate fatigue accumulating - maintain conservative effort';
    }

    results.push({
      segmentIndex: i,
      distanceFromStartKm: cumulativeDistance,
      cumulativeFatigueFactor: fatigueResult.fatigueFactor,
      adjustedPaceMultiplier: fatigueResult.fatigueFactor,
      estimatedGlycogen: 100 - fatigueResult.glycogenDepletionPercent,
      warningLevel,
      recommendation,
    });
  }

  return results;
}

export function estimateUltraFinishTime(
  baseTimeMinutes: number,
  distanceKm: number,
  elevationGainM: number,
  params: {
    temperatureC: number;
    humidity: number;
    readinessScore: number;
    athleteLongestUltraKm?: number;
    hasNightSection: boolean;
    aidStationCount: number;
    aidStationAvgMinutes?: number;
  }
): {
  adjustedTimeMinutes: number;
  fatiguePenaltyMinutes: number;
  aidStationMinutes: number;
  nightPenaltyMinutes: number;
  totalAdjustmentPercent: number;
  breakdown: {
    baseTime: number;
    fatiguePenalty: number;
    aidStations: number;
    nightPenalty: number;
    weatherPenalty: number;
    total: number;
  };
} {
  const estimatedHours = baseTimeMinutes / 60;

  const fatigueResult = calculateUltraFatigue({
    distanceKm,
    elapsedTimeHours: estimatedHours,
    elevationGainM,
    temperatureC: params.temperatureC,
    humidity: params.humidity,
    readinessScore: params.readinessScore,
    athleteLongestUltraKm: params.athleteLongestUltraKm,
    isNightSection: params.hasNightSection,
  });

  const fatiguePenaltyMinutes = baseTimeMinutes * (fatigueResult.fatigueFactor - 1);

  const aidStationAvgMin = params.aidStationAvgMinutes ||
    (distanceKm > 100 ? 5 : distanceKm > 50 ? 4 : 3);
  const aidStationMinutes = params.aidStationCount * aidStationAvgMin;

  const nightPenaltyMinutes = params.hasNightSection ?
    baseTimeMinutes * (fatigueResult.nightPenaltyPercent / 100) : 0;

  const weatherPenaltyMinutes = baseTimeMinutes *
    (fatigueResult.heatAccumulationFactor - 1) * 0.5;

  const adjustedTimeMinutes = baseTimeMinutes +
    fatiguePenaltyMinutes +
    aidStationMinutes +
    nightPenaltyMinutes +
    weatherPenaltyMinutes;

  const totalAdjustmentPercent = ((adjustedTimeMinutes - baseTimeMinutes) / baseTimeMinutes) * 100;

  return {
    adjustedTimeMinutes,
    fatiguePenaltyMinutes,
    aidStationMinutes,
    nightPenaltyMinutes,
    totalAdjustmentPercent,
    breakdown: {
      baseTime: baseTimeMinutes,
      fatiguePenalty: fatiguePenaltyMinutes,
      aidStations: aidStationMinutes,
      nightPenalty: nightPenaltyMinutes,
      weatherPenalty: weatherPenaltyMinutes,
      total: adjustedTimeMinutes,
    },
  };
}

export function getUltraDistanceCategory(distanceKm: number): {
  category: 'marathon' | '50k' | '50m' | '100k' | '100m' | 'multi-day';
  label: string;
  typicalFinishTimeRange: { min: number; max: number };
  fatigueMultiplierRange: { min: number; max: number };
} {
  if (distanceKm <= 42.195) {
    return {
      category: 'marathon',
      label: 'Marathon',
      typicalFinishTimeRange: { min: 180, max: 420 },
      fatigueMultiplierRange: { min: 1.0, max: 1.15 },
    };
  }
  if (distanceKm <= 55) {
    return {
      category: '50k',
      label: '50K Ultra',
      typicalFinishTimeRange: { min: 240, max: 600 },
      fatigueMultiplierRange: { min: 1.05, max: 1.25 },
    };
  }
  if (distanceKm <= 85) {
    return {
      category: '50m',
      label: '50 Mile Ultra',
      typicalFinishTimeRange: { min: 420, max: 900 },
      fatigueMultiplierRange: { min: 1.10, max: 1.35 },
    };
  }
  if (distanceKm <= 110) {
    return {
      category: '100k',
      label: '100K Ultra',
      typicalFinishTimeRange: { min: 540, max: 1080 },
      fatigueMultiplierRange: { min: 1.15, max: 1.45 },
    };
  }
  if (distanceKm <= 170) {
    return {
      category: '100m',
      label: '100 Mile Ultra',
      typicalFinishTimeRange: { min: 900, max: 1800 },
      fatigueMultiplierRange: { min: 1.25, max: 1.60 },
    };
  }
  return {
    category: 'multi-day',
    label: 'Multi-Day Ultra',
    typicalFinishTimeRange: { min: 1440, max: 4320 },
    fatigueMultiplierRange: { min: 1.35, max: 1.80 },
  };
}
