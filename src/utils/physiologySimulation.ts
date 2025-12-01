import type {
  PhysiologicalInputs,
  EnergyState,
  HydrationState,
  GIRiskFactors,
  GIRiskAssessment,
  EnergyDynamics,
  PerformanceImpact,
  PhysiologicalSimulation,
} from '@/types/physiology';
import type { StartStrategy } from '@/types/whatif';
import {
  getStartPaceFactor,
  getStrategyFatigueFactor,
  getStrategyEnergyBurnRate,
} from './startingStrategy';

export function calculateEnergyDynamics(
  distanceKm: number,
  durationMin: number,
  inputs: PhysiologicalInputs,
  temperature: number,
  humidity: number,
  readiness: number,
  selectedStrategy?: StartStrategy
): EnergyDynamics {
  const segmentCount = Math.ceil(distanceKm);
  const paceMinPerKm = durationMin / distanceKm;

  // Hydration & sweat calculations
  const heatIndex = temperature + (humidity / 100) * 5;
  const baseSweatRate = 600;
  const sweatRateMlPerHr = baseSweatRate * Math.max(1, 1 + (heatIndex - 20) / 30);

  const baseGlycogenStore = 100;

  const results: Record<StartStrategy, EnergyState[]> = {
    conservative: [],
    target: [],
    aggressive: [],
  };

  const timeToExhaustion: Record<StartStrategy, number> = {
    conservative: 0,
    target: 0,
    aggressive: 0,
  };

  (['conservative', 'target', 'aggressive'] as StartStrategy[]).forEach((strategy) => {
    let glycogen = baseGlycogenStore;
    let fatigue = 0;

    for (let km = 0; km <= segmentCount; km++) {
      const progress = km / distanceKm;
      const kmHours = (km / distanceKm) * (durationMin / 60);

      // Dynamic strategy modifiers from existing functions
      const paceFactor = getStartPaceFactor(strategy, progress);
      const fatigueFactor = getStrategyFatigueFactor(strategy, progress);
      const energyBurnRate = getStrategyEnergyBurnRate(strategy, progress);

      // Environmental modifiers
      const heatMultiplier = 1 + Math.max(0, (temperature - 20) / 10) * 0.03;
      const humidityBonus = humidity > 70 ? 0.02 : 0;
      const readinessMultiplier = 1 + Math.max(0, (70 - readiness) / 500);

      // Running hydration state at this km
      const sweatLoss = sweatRateMlPerHr * kmHours;
      const fluidIntake = inputs.fluidIntake * kmHours;
      const currentHydrationPct = Math.max(0, Math.min(100, 100 + ((fluidIntake - sweatLoss) / 2000) * 100));
      const hydrationMod = Math.pow(currentHydrationPct / 100, 1.2);

      // Running sodium balance at this km
      const sodiumLoss = sweatLoss * 0.9; // mg
      const sodiumIn = inputs.sodiumIntake * kmHours;
      const sodiumBalance = sodiumIn - sodiumLoss;
      const sodiumMod = 1 - Math.min(Math.abs(sodiumBalance) / 5000, 0.15);

      // Energy dynamics with all factors
      const baseEnergyBurn = 2.5; // base glycogen burn per km
      const glycogenBurn =
        baseEnergyBurn *
        energyBurnRate *
        paceFactor *
        heatMultiplier *
        readinessMultiplier;

      // Fueling replenishment per km (convert g/hr to glycogen % per km)
      const fuelingPerKm = (inputs.fuelingRate / 60) * paceMinPerKm / 4;
      glycogen = Math.max(0, glycogen - glycogenBurn + fuelingPerKm);

      // Non-linear fatigue accumulation
      if (km > 0) {
        const baseFatigueRate = 1.2; // base fatigue per km
        const kmFatigueIncrement =
          baseFatigueRate *
          paceFactor *
          fatigueFactor *
          heatMultiplier *
          (1 + humidityBonus) *
          readinessMultiplier *
          (1 / hydrationMod) *
          (1 / sodiumMod);

        fatigue += kmFatigueIncrement;

        // Exponential bonk penalty when glycogen drops below 25%
        if (glycogen < 25) {
          const bonkPenalty = Math.pow((25 - glycogen) / 25, 2) * 5;
          fatigue += bonkPenalty;
        }

        fatigue = Math.min(100, fatigue);
      }

      results[strategy].push({
        glycogenPct: Math.round(glycogen * 10) / 10,
        fatiguePct: Math.round(fatigue * 10) / 10,
        distanceKm: km,
      });

      // Time-to-exhaustion detection
      if (timeToExhaustion[strategy] === 0 && (fatigue >= 95 || glycogen <= 5)) {
        timeToExhaustion[strategy] = km;
      }
    }

    // If never exhausted, TTE equals race distance
    if (timeToExhaustion[strategy] === 0) {
      timeToExhaustion[strategy] = distanceKm;
    }
  });

  return {
    conservative: results.conservative,
    target: results.target,
    aggressive: results.aggressive,
    timeToExhaustion,
    selectedStrategy,
  };
}

export function calculateHydrationState(
  distanceKm: number,
  durationMin: number,
  fluidIntake: number,
  sodiumIntake: number,
  temperature: number,
  humidity: number
): HydrationState {
  const heatIndex = temperature + (humidity / 100) * 5;
  const baseSweatRate = 600;
  const heatMultiplier = Math.max(1, 1 + (heatIndex - 20) / 30);
  const sweatRateMlPerHr = baseSweatRate * heatMultiplier;

  const durationHr = durationMin / 60;
  const totalSweatLoss = sweatRateMlPerHr * durationHr;
  const totalFluidIntake = fluidIntake * durationHr;

  const fluidBalance = totalFluidIntake - totalSweatLoss;
  const hydrationPct = Math.max(0, Math.min(100, 100 + (fluidBalance / 2000) * 100));

  const sodiumSweatLoss = sweatRateMlPerHr * durationHr * 0.9;
  const totalSodiumIntake = sodiumIntake * durationHr;
  const sodiumBalanceMg = totalSodiumIntake - sodiumSweatLoss;

  return {
    hydrationPct: Math.round(hydrationPct * 10) / 10,
    sodiumBalanceMg: Math.round(sodiumBalanceMg),
    sweatRateMlPerHr: Math.round(sweatRateMlPerHr),
  };
}

export function calculateGIRisk(factors: GIRiskFactors): GIRiskAssessment {
  let riskScore = 0;

  if (factors.fuelingRate > 90) {
    riskScore += 30;
  } else if (factors.fuelingRate > 70) {
    riskScore += 15;
  }

  if (factors.heatIndex > 30) {
    riskScore += 25;
  } else if (factors.heatIndex > 25) {
    riskScore += 10;
  }

  if (factors.intensityPct > 85) {
    riskScore += 20;
  } else if (factors.intensityPct > 75) {
    riskScore += 10;
  }

  if (factors.fluidIntake > 1000) {
    riskScore += 15;
  } else if (factors.fluidIntake > 800) {
    riskScore += 5;
  }

  const riskPct = Math.min(100, riskScore);

  let level: GIRiskAssessment['level'];
  let message: string;

  if (riskPct < 20) {
    level = 'low';
    message = 'Low GI distress risk. Current nutrition strategy looks solid.';
  } else if (riskPct < 40) {
    level = 'moderate';
    message = 'Moderate GI risk. Monitor fueling and adjust if discomfort occurs.';
  } else if (riskPct < 70) {
    level = 'high';
    message = 'High GI risk. Consider reducing fueling rate or testing in training.';
  } else {
    level = 'very-high';
    message = 'Very high GI risk. Strong recommendation to reduce fueling/fluid intake.';
  }

  return {
    riskPct: Math.round(riskPct),
    level,
    message,
  };
}

export function calculatePerformanceImpact(
  baseTimeMin: number,
  temperature: number,
  hydrationPct: number,
  fuelingRate: number,
  fatiguePct: number,
  humidity?: number
): PerformanceImpact {
  let heatPenalty = 0;
  if (temperature > 20) {
    heatPenalty = ((temperature - 20) / 10) * 0.03;
    if (humidity && humidity > 70) {
      heatPenalty += 0.02;
    }
  }

  let hydrationPenalty = 0;
  if (hydrationPct < 90) {
    const hydrationDeficit = 90 - hydrationPct;
    hydrationPenalty = (hydrationDeficit / 5) * 0.02;
  }

  let fuelingPenalty = 0;
  if (fuelingRate < 40) {
    fuelingPenalty = ((40 - fuelingRate) / 40) * 0.06;
  }

  let fatiguePenalty = 0;
  if (fatiguePct > 80) {
    fatiguePenalty = ((fatiguePct - 80) / 20) * 0.05;
  }

  const totalPenaltyPct = Math.round((heatPenalty + hydrationPenalty + fuelingPenalty + fatiguePenalty) * 100);
  const adjustedTimeMin = baseTimeMin * (1 + (totalPenaltyPct / 100));
  const timeDeltaMin = adjustedTimeMin - baseTimeMin;

  let status: PerformanceImpact['status'];
  if (totalPenaltyPct <= 2) {
    status = 'optimal';
  } else if (totalPenaltyPct <= 5) {
    status = 'acceptable';
  } else if (totalPenaltyPct <= 10) {
    status = 'warning';
  } else {
    status = 'danger';
  }

  return {
    totalPenaltyPct,
    baseTimeMin,
    adjustedTimeMin: Math.round(adjustedTimeMin * 10) / 10,
    timeDeltaMin: Math.round(timeDeltaMin * 10) / 10,
    factors: {
      heat: Math.round(heatPenalty * 100),
      hydration: Math.round(hydrationPenalty * 100),
      fueling: Math.round(fuelingPenalty * 100),
      fatigue: Math.round(fatiguePenalty * 100),
    },
    status,
  };
}

export function generateCoachInsights(
  energyDynamics: EnergyDynamics,
  hydration: HydrationState,
  giRisk: GIRiskAssessment,
  performanceImpact: PerformanceImpact,
  inputs: PhysiologicalInputs
): string[] {
  const insights: string[] = [];
  const selectedStrategy = energyDynamics.selectedStrategy;

  const tteDiff = energyDynamics.timeToExhaustion.conservative - energyDynamics.timeToExhaustion.aggressive;
  if (tteDiff > 5) {
    insights.push(`Conservative start extends time-to-exhaustion by +${Math.round(tteDiff)} km compared to aggressive.`);
  }

  if (selectedStrategy) {
    const selectedTTE = energyDynamics.timeToExhaustion[selectedStrategy];
    const targetTTE = energyDynamics.timeToExhaustion.target;
    const tteDelta = selectedTTE - targetTTE;

    if (selectedStrategy === 'aggressive' && tteDelta < -5) {
      insights.push(`Aggressive start shortens TTE by ${Math.abs(Math.round(tteDelta))} km. High risk of bonking - ensure adequate fueling.`);
    } else if (selectedStrategy === 'conservative' && tteDelta > 5) {
      insights.push(`Conservative pacing extends endurance by +${Math.round(tteDelta)} km. Ideal for hot conditions or ultras.`);
    }
  }

  const strategyKey = selectedStrategy || 'target';
  const finalGlycogen = energyDynamics[strategyKey][energyDynamics[strategyKey].length - 1]?.glycogenPct || 0;
  if (finalGlycogen > 20) {
    insights.push(`Current fueling (${inputs.fuelingRate} g/h) maintains ${Math.round(finalGlycogen)}% glycogen at finish.`);
  } else if (finalGlycogen < 10) {
    insights.push(`Warning: Glycogen stores critically low at finish. Increase fueling to ${inputs.fuelingRate + 15}-${inputs.fuelingRate + 25} g/h.`);
  }

  if (hydration.hydrationPct > 90) {
    insights.push(`Hydration ${Math.round(hydration.hydrationPct)}% prevents cardiac drift; GI risk remains ${giRisk.level}.`);
  } else if (hydration.hydrationPct < 85) {
    const recommendedIntake = Math.round(inputs.fluidIntake + (90 - hydration.hydrationPct) * 10);
    insights.push(`Hydration ${Math.round(hydration.hydrationPct)}% may cause performance decline. Increase to ${recommendedIntake} ml/hr.`);
  }

  if (performanceImpact.totalPenaltyPct <= 3) {
    insights.push(`Overall conditions add +${performanceImpact.totalPenaltyPct}% time penalty (~${Math.round(performanceImpact.timeDeltaMin)} min).`);
  } else {
    insights.push(`Challenging conditions add +${performanceImpact.totalPenaltyPct}% penalty. Focus on heat and hydration management.`);
  }

  if (performanceImpact.factors.heat > 4) {
    insights.push(`Heat penalty is ${performanceImpact.factors.heat}%. Pour water on head/neck and reduce intensity in exposed sections.`);
  }

  if (giRisk.level === 'high' || giRisk.level === 'very-high') {
    insights.push(`${giRisk.message}`);
  }

  if (hydration.sodiumBalanceMg < -500) {
    insights.push(`Sodium deficit of ${Math.abs(Math.round(hydration.sodiumBalanceMg))} mg may cause cramping. Increase electrolyte intake.`);
  }

  return insights;
}

export function runPhysiologicalSimulation(
  distanceKm: number,
  baseTimeMin: number,
  inputs: PhysiologicalInputs,
  temperature: number,
  humidity: number,
  readiness: number,
  selectedStrategy?: StartStrategy
): PhysiologicalSimulation {
  const energyDynamics = calculateEnergyDynamics(
    distanceKm,
    baseTimeMin,
    inputs,
    temperature,
    humidity,
    readiness,
    selectedStrategy
  );

  const hydration = calculateHydrationState(
    distanceKm,
    baseTimeMin,
    inputs.fluidIntake,
    inputs.sodiumIntake,
    temperature,
    humidity
  );

  const heatIndex = temperature + (humidity / 100) * 5;
  const avgFatigue = energyDynamics.target.reduce((sum, s) => sum + s.fatiguePct, 0) / energyDynamics.target.length;
  const intensityPct = 70;

  const giRisk = calculateGIRisk({
    fuelingRate: inputs.fuelingRate,
    heatIndex,
    intensityPct,
    fluidIntake: inputs.fluidIntake,
  });

  const performanceImpact = calculatePerformanceImpact(
    baseTimeMin,
    temperature,
    hydration.hydrationPct,
    inputs.fuelingRate,
    avgFatigue,
    humidity
  );

  const insights = generateCoachInsights(
    energyDynamics,
    hydration,
    giRisk,
    performanceImpact,
    inputs
  );

  return {
    inputs,
    energyDynamics,
    hydration,
    giRisk,
    performanceImpact,
    insights,
  };
}

import type { PacingSegment } from '@/types/pacing';

export function calculatePaceIntensityAtDistance(
  distanceKm: number,
  segments: PacingSegment[],
  avgPace: number
): number {
  if (segments.length === 0) {
    return 1.0;
  }

  const segment = segments.find((s, idx) => {
    const prevDistance = idx === 0 ? 0 : segments[idx - 1].distanceKm;
    return distanceKm >= prevDistance && distanceKm <= s.distanceKm;
  });

  if (!segment) {
    return 1.0;
  }

  const paceRatio = segment.targetPace / avgPace;
  return paceRatio;
}

export function calculateEnergyDynamicsWithPacing(
  distanceKm: number,
  durationMin: number,
  inputs: PhysiologicalInputs,
  temperature: number,
  humidity: number,
  readiness: number,
  pacingSegments: PacingSegment[]
): EnergyDynamics {
  const segmentCount = Math.ceil(distanceKm);
  const avgPace = durationMin / distanceKm;

  const heatIndex = temperature + (humidity / 100) * 5;
  const baseSweatRate = 600;
  const sweatRateMlPerHr = baseSweatRate * Math.max(1, 1 + (heatIndex - 20) / 30);

  const baseGlycogenStore = 100;

  const results: EnergyState[] = [];
  let glycogen = baseGlycogenStore;
  let fatigue = 0;
  let timeToExhaustion = 0;

  for (let km = 0; km <= segmentCount; km++) {
    const kmHours = (km / distanceKm) * (durationMin / 60);

    const paceIntensity = calculatePaceIntensityAtDistance(km, pacingSegments, avgPace);

    const heatMultiplier = 1 + Math.max(0, (temperature - 20) / 10) * 0.03;
    const humidityBonus = humidity > 70 ? 0.02 : 0;
    const readinessMultiplier = 1 + Math.max(0, (70 - readiness) / 500);

    const sweatLoss = sweatRateMlPerHr * kmHours;
    const fluidIntake = inputs.fluidIntake * kmHours;
    const currentHydrationPct = Math.max(0, Math.min(100, 100 + ((fluidIntake - sweatLoss) / 2000) * 100));
    const hydrationMod = Math.pow(currentHydrationPct / 100, 1.2);

    const sodiumLoss = sweatLoss * 0.9;
    const sodiumIn = inputs.sodiumIntake * kmHours;
    const sodiumBalance = sodiumIn - sodiumLoss;
    const sodiumMod = 1 - Math.min(Math.abs(sodiumBalance) / 5000, 0.15);

    const baseEnergyBurn = 2.5;
    const glycogenBurn =
      baseEnergyBurn *
      paceIntensity *
      heatMultiplier *
      readinessMultiplier;

    const paceMinPerKm = (durationMin / distanceKm) * paceIntensity;
    const fuelingPerKm = (inputs.fuelingRate / 60) * paceMinPerKm / 4;
    glycogen = Math.max(0, glycogen - glycogenBurn + fuelingPerKm);

    if (km > 0) {
      const baseFatigueRate = 1.2;
      const kmFatigueIncrement =
        baseFatigueRate *
        paceIntensity *
        heatMultiplier *
        (1 + humidityBonus) *
        readinessMultiplier *
        (1 / hydrationMod) *
        (1 / sodiumMod);

      fatigue += kmFatigueIncrement;

      if (glycogen < 25) {
        const bonkPenalty = Math.pow((25 - glycogen) / 25, 2) * 5;
        fatigue += bonkPenalty;
      }

      fatigue = Math.min(100, fatigue);
    }

    results.push({
      glycogenPct: Math.round(glycogen * 10) / 10,
      fatiguePct: Math.round(fatigue * 10) / 10,
      distanceKm: km,
    });

    if (timeToExhaustion === 0 && (fatigue >= 95 || glycogen <= 5)) {
      timeToExhaustion = km;
    }
  }

  if (timeToExhaustion === 0) {
    timeToExhaustion = distanceKm;
  }

  return {
    conservative: results,
    target: results,
    aggressive: results,
    timeToExhaustion: {
      conservative: timeToExhaustion,
      target: timeToExhaustion,
      aggressive: timeToExhaustion,
    },
    selectedStrategy: 'target',
  };
}

export function runPhysiologicalSimulationWithPacing(
  distanceKm: number,
  baseTimeMin: number,
  inputs: PhysiologicalInputs,
  temperature: number,
  humidity: number,
  readiness: number,
  pacingSegments: PacingSegment[]
): PhysiologicalSimulation {
  const energyDynamics = pacingSegments.length > 0
    ? calculateEnergyDynamicsWithPacing(
        distanceKm,
        baseTimeMin,
        inputs,
        temperature,
        humidity,
        readiness,
        pacingSegments
      )
    : calculateEnergyDynamics(
        distanceKm,
        baseTimeMin,
        inputs,
        temperature,
        humidity,
        readiness,
        'target'
      );

  const hydration = calculateHydrationState(
    distanceKm,
    baseTimeMin,
    inputs.fluidIntake,
    inputs.sodiumIntake,
    temperature,
    humidity
  );

  const heatIndex = temperature + (humidity / 100) * 5;
  const avgFatigue = energyDynamics.target.reduce((sum, s) => sum + s.fatiguePct, 0) / energyDynamics.target.length;
  const intensityPct = 70;

  const giRisk = calculateGIRisk({
    fuelingRate: inputs.fuelingRate,
    heatIndex,
    intensityPct,
    fluidIntake: inputs.fluidIntake,
  });

  const performanceImpact = calculatePerformanceImpact(
    baseTimeMin,
    temperature,
    hydration.hydrationPct,
    inputs.fuelingRate,
    avgFatigue,
    humidity
  );

  const insights = generateCoachInsights(
    energyDynamics,
    hydration,
    giRisk,
    performanceImpact,
    inputs
  );

  return {
    inputs,
    energyDynamics,
    hydration,
    giRisk,
    performanceImpact,
    insights,
  };
}
