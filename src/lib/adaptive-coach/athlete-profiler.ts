/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — ATHLETE PROFILER
 *  Module 2 — Cat1 vs Cat2 Classification
 * ======================================================================
 *
 * This module implements the athlete classification system that determines
 * whether an athlete is Category 1 (beginner/low-volume) or Category 2
 * (experienced/high-volume) and sets appropriate training parameters.
 *
 * Classification factors:
 * - Years of consistent training
 * - Recent race history and completions
 * - Average weekly mileage
 * - Age and recovery considerations
 * - Aerobic threshold vs lactate threshold gap
 */

import type {
  AthleteProfile,
  AthleteCategory,
  RecoveryRatio
} from './types';

//
// ─────────────────────────────────────────────────────────────
//   CLASSIFICATION RULES & THRESHOLDS
// ─────────────────────────────────────────────────────────────
//

const CLASSIFICATION_THRESHOLDS = {
  // Training history thresholds
  BEGINNER_MAX_YEARS: 2,
  INTERMEDIATE_MIN_YEARS: 2,
  EXPERIENCED_MIN_YEARS: 5,

  // Weekly mileage thresholds (km)
  CAT1_MAX_WEEKLY_KM: 50,
  CAT2_MIN_WEEKLY_KM: 50,

  // Race completion thresholds (km)
  ULTRA_THRESHOLD_KM: 50,
  LONG_ULTRA_THRESHOLD_KM: 100,

  // Age considerations
  MASTERS_AGE: 40,
  VETERAN_AGE: 50,

  // Consistency threshold (%)
  MIN_CONSISTENCY: 70,

  // AeT/LT gap (%)
  AEROBIC_DEFICIENCY_THRESHOLD: 10,
};

const VOLUME_SETTINGS = {
  Cat1: {
    START_KM_LOW: 20,
    START_KM_HIGH: 40,
    CEILING_KM: 80,
    DEFAULT_RECOVERY_RATIO: "2:1" as RecoveryRatio,
  },
  Cat2: {
    START_KM_LOW: 40,
    START_KM_HIGH: 70,
    CEILING_KM: 140,
    DEFAULT_RECOVERY_RATIO: "3:1" as RecoveryRatio,
  },
};

//
// ─────────────────────────────────────────────────────────────
//   CLASSIFICATION RESULT
// ─────────────────────────────────────────────────────────────
//

export interface ClassificationResult {
  category: AthleteCategory;
  startMileage: number;        // Weekly starting mileage in km
  volumeCeiling: number;        // Maximum safe weekly km
  recoveryRatio: RecoveryRatio;
  confidence: number;           // 0-100 (how certain the classification is)
  reasoning: string[];          // Factors that influenced classification
  warnings?: string[];          // Any cautions for this athlete
}

//
// ─────────────────────────────────────────────────────────────
//   MAIN CLASSIFICATION FUNCTION
// ─────────────────────────────────────────────────────────────
//

/**
 * Classify athlete into Cat1 or Cat2 based on comprehensive profile analysis
 */
export function classifyAthlete(profile: Partial<AthleteProfile>): ClassificationResult {
  const factors: string[] = [];
  const warnings: string[] = [];
  let cat1Score = 0;
  let cat2Score = 0;

  // Factor 1: Years of training
  if (profile.yearsTraining !== undefined) {
    if (profile.yearsTraining < CLASSIFICATION_THRESHOLDS.BEGINNER_MAX_YEARS) {
      cat1Score += 3;
      factors.push(`Limited training history (${profile.yearsTraining} years)`);
    } else if (profile.yearsTraining >= CLASSIFICATION_THRESHOLDS.EXPERIENCED_MIN_YEARS) {
      cat2Score += 3;
      factors.push(`Extensive training experience (${profile.yearsTraining} years)`);
    } else {
      cat1Score += 1;
      cat2Score += 1;
      factors.push(`Moderate training history (${profile.yearsTraining} years)`);
    }
  }

  // Factor 2: Recent race history
  if (profile.recentRaces && profile.recentRaces.length > 0) {
    const ultraRaces = profile.recentRaces.filter(
      r => r.distanceKm >= CLASSIFICATION_THRESHOLDS.ULTRA_THRESHOLD_KM
    );
    const longUltras = profile.recentRaces.filter(
      r => r.distanceKm >= CLASSIFICATION_THRESHOLDS.LONG_ULTRA_THRESHOLD_KM
    );

    if (longUltras.length > 0) {
      cat2Score += 4;
      factors.push(`Completed ${longUltras.length} ultra(s) ≥100km`);
    } else if (ultraRaces.length > 0) {
      cat2Score += 2;
      factors.push(`Completed ${ultraRaces.length} ultra(s) ≥50km`);
    } else if (profile.recentRaces.length >= 3) {
      cat1Score += 1;
      cat2Score += 1;
      factors.push(`Multiple race completions (${profile.recentRaces.length})`);
    } else {
      cat1Score += 1;
      factors.push(`Limited race history (${profile.recentRaces.length} race(s))`);
    }
  } else {
    cat1Score += 2;
    factors.push("No documented race history");
  }

  // Factor 3: Weekly mileage capacity
  if (profile.averageMileage !== undefined) {
    if (profile.averageMileage >= CLASSIFICATION_THRESHOLDS.CAT2_MIN_WEEKLY_KM) {
      cat2Score += 3;
      factors.push(`High weekly volume (${profile.averageMileage.toFixed(0)} km/week)`);
    } else if (profile.averageMileage < CLASSIFICATION_THRESHOLDS.CAT1_MAX_WEEKLY_KM) {
      cat1Score += 2;
      factors.push(`Moderate weekly volume (${profile.averageMileage.toFixed(0)} km/week)`);
    } else {
      cat1Score += 1;
      cat2Score += 1;
    }
  }

  // Factor 4: Training consistency
  if (profile.trainingConsistency !== undefined) {
    if (profile.trainingConsistency >= CLASSIFICATION_THRESHOLDS.MIN_CONSISTENCY) {
      cat2Score += 1;
      factors.push(`High training consistency (${profile.trainingConsistency}%)`);
    } else {
      cat1Score += 1;
      warnings.push("Inconsistent training history - conservative approach recommended");
    }
  }

  // Factor 5: Age considerations
  if (profile.age !== undefined) {
    if (profile.age >= CLASSIFICATION_THRESHOLDS.VETERAN_AGE) {
      cat1Score += 2;
      warnings.push("Veteran athlete - prioritizing recovery and injury prevention");
      factors.push(`Veteran age (${profile.age}) - recovery-focused approach`);
    } else if (profile.age >= CLASSIFICATION_THRESHOLDS.MASTERS_AGE) {
      cat1Score += 1;
      factors.push(`Masters age (${profile.age}) - balanced recovery needed`);
    }
  }

  // Factor 6: Aerobic deficiency (AeT/LT gap)
  if (profile.aerobicThreshold && profile.lactateThreshold) {
    const gap = ((profile.lactateThreshold - profile.aerobicThreshold) / profile.lactateThreshold) * 100;
    if (gap > CLASSIFICATION_THRESHOLDS.AEROBIC_DEFICIENCY_THRESHOLD) {
      cat1Score += 2;
      warnings.push(`Aerobic deficiency detected (${gap.toFixed(1)}% gap) - extended base phase needed`);
      factors.push("Significant AeT/LT gap indicates need for base building");
    } else {
      cat2Score += 1;
      factors.push("Good aerobic base (AeT/LT gap optimal)");
    }
  }

  // Factor 7: Injury history
  if (profile.injuryHistory && profile.injuryHistory.length > 0) {
    cat1Score += 1;
    warnings.push(`Injury history noted (${profile.injuryHistory.length} issue(s)) - cautious progression`);
  }

  // Determine category
  const totalScore = cat1Score + cat2Score;
  const category: AthleteCategory = cat2Score > cat1Score ? "Cat2" : "Cat1";
  const confidence = totalScore > 0
    ? Math.round((Math.max(cat1Score, cat2Score) / totalScore) * 100)
    : 50;

  // Calculate starting mileage and ceiling
  const { startMileage, volumeCeiling } = calculateVolumeParameters(
    category,
    profile.averageMileage || 0,
    profile.age
  );

  // Determine recovery ratio
  const recoveryRatio = determineRecoveryRatio(
    category,
    profile.age,
    profile.injuryHistory
  );

  return {
    category,
    startMileage,
    volumeCeiling,
    recoveryRatio,
    confidence,
    reasoning: factors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

//
// ─────────────────────────────────────────────────────────────
//   VOLUME CALCULATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Calculate starting mileage and volume ceiling based on category and history
 */
function calculateVolumeParameters(
  category: AthleteCategory,
  currentMileage: number,
  age?: number
): { startMileage: number; volumeCeiling: number } {
  const settings = VOLUME_SETTINGS[category];

  // If athlete has consistent mileage, start close to their current level
  let startMileage: number;
  if (currentMileage > 0) {
    // Start at 80% of current mileage (conservative restart)
    startMileage = Math.round(currentMileage * 0.8);
    // Clamp to reasonable range for category
    startMileage = Math.max(
      settings.START_KM_LOW,
      Math.min(settings.START_KM_HIGH, startMileage)
    );
  } else {
    // No history - start at low end
    startMileage = settings.START_KM_LOW;
  }

  // Adjust ceiling for age
  let volumeCeiling = settings.CEILING_KM;
  if (age && age >= CLASSIFICATION_THRESHOLDS.VETERAN_AGE) {
    volumeCeiling = Math.round(volumeCeiling * 0.8); // Reduce by 20% for veterans
  } else if (age && age >= CLASSIFICATION_THRESHOLDS.MASTERS_AGE) {
    volumeCeiling = Math.round(volumeCeiling * 0.9); // Reduce by 10% for masters
  }

  return { startMileage, volumeCeiling };
}

//
// ─────────────────────────────────────────────────────────────
//   RECOVERY RATIO DETERMINATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Determine optimal recovery cycle ratio (2:1 or 3:1)
 */
function determineRecoveryRatio(
  category: AthleteCategory,
  age?: number,
  injuryHistory?: string[]
): RecoveryRatio {
  // Start with category default
  let ratio = VOLUME_SETTINGS[category].DEFAULT_RECOVERY_RATIO;

  // Age adjustments
  if (age && age >= CLASSIFICATION_THRESHOLDS.VETERAN_AGE) {
    return "2:1"; // Veterans always use 2:1 for more frequent recovery
  } else if (age && age >= CLASSIFICATION_THRESHOLDS.MASTERS_AGE && ratio === "3:1") {
    return "2:1"; // Masters drop from 3:1 to 2:1
  }

  // Injury history adjustments
  if (injuryHistory && injuryHistory.length >= 2) {
    return "2:1"; // Multiple injuries = conservative approach
  }

  return ratio;
}

//
// ─────────────────────────────────────────────────────────────
//   AEROBIC DEFICIENCY ASSESSMENT
// ─────────────────────────────────────────────────────────────
//

export interface AerobicAssessment {
  hasDeficiency: boolean;
  gapPercentage: number | null;
  recommendation: string;
  extendBasePhaseWeeks: number;
}

/**
 * Assess if athlete has aerobic deficiency requiring extended base training
 * Based on the "10% rule" from Uphill Athlete
 */
export function assessAerobicDeficiency(
  aerobicThreshold?: number,
  lactateThreshold?: number
): AerobicAssessment {
  if (!aerobicThreshold || !lactateThreshold) {
    return {
      hasDeficiency: false,
      gapPercentage: null,
      recommendation: "Unable to assess - HR threshold data not available. Consider field testing.",
      extendBasePhaseWeeks: 0,
    };
  }

  const gap = ((lactateThreshold - aerobicThreshold) / lactateThreshold) * 100;

  if (gap <= CLASSIFICATION_THRESHOLDS.AEROBIC_DEFICIENCY_THRESHOLD) {
    return {
      hasDeficiency: false,
      gapPercentage: gap,
      recommendation: "Aerobic base is solid. Ready for intensity training when appropriate.",
      extendBasePhaseWeeks: 0,
    };
  }

  // Calculate how many extra weeks of base training needed
  // Rule of thumb: for every 5% over threshold, add 2 weeks
  const excessGap = gap - CLASSIFICATION_THRESHOLDS.AEROBIC_DEFICIENCY_THRESHOLD;
  const extraWeeks = Math.ceil(excessGap / 5) * 2;

  return {
    hasDeficiency: true,
    gapPercentage: gap,
    recommendation: `Aerobic deficiency detected (${gap.toFixed(1)}% gap). Focus on Zone 1-2 training to close gap before adding intensity.`,
    extendBasePhaseWeeks: Math.min(extraWeeks, 8), // Cap at 8 extra weeks
  };
}

//
// ─────────────────────────────────────────────────────────────
//   HELPER: UPDATE ATHLETE PROFILE WITH CLASSIFICATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Apply classification results to an athlete profile
 */
export function applyClassification(
  profile: Partial<AthleteProfile>,
  classification: ClassificationResult
): AthleteProfile {
  return {
    ...profile,
    category: classification.category,
    startMileage: classification.startMileage,
    volumeCeiling: classification.volumeCeiling,
    recoveryRatio: classification.recoveryRatio,
  } as AthleteProfile;
}

//
// ─────────────────────────────────────────────────────────────
//   READINESS SCORING (FOR PHASE TRANSITIONS)
// ─────────────────────────────────────────────────────────────
//

export interface ReadinessScore {
  overallScore: number;          // 0-100
  canProgressToIntensity: boolean;
  factors: {
    aerobicBase: number;        // 0-100
    consistency: number;        // 0-100
    recentLoad: number;         // 0-100
    recovery: number;           // 0-100
  };
  blockers: string[];
}

/**
 * Calculate athlete readiness for progressing to next training phase
 */
export function calculateReadiness(
  profile: AthleteProfile,
  recentWeeklyKm: number[],
  recentFatigueScores: number[]
): ReadinessScore {
  const factors = {
    aerobicBase: 0,
    consistency: 0,
    recentLoad: 0,
    recovery: 0,
  };
  const blockers: string[] = [];

  // Factor 1: Aerobic base (AeT/LT gap)
  if (profile.aerobicThreshold && profile.lactateThreshold) {
    const assessment = assessAerobicDeficiency(
      profile.aerobicThreshold,
      profile.lactateThreshold
    );
    factors.aerobicBase = assessment.hasDeficiency ? 50 : 100;
    if (assessment.hasDeficiency) {
      blockers.push(`Aerobic deficiency: ${assessment.gapPercentage?.toFixed(1)}% AeT/LT gap`);
    }
  } else {
    factors.aerobicBase = 70; // Assume reasonable if no data
  }

  // Factor 2: Consistency
  factors.consistency = profile.trainingConsistency || 50;
  if (factors.consistency < 70) {
    blockers.push(`Low training consistency: ${factors.consistency}%`);
  }

  // Factor 3: Recent load progression
  if (recentWeeklyKm.length >= 3) {
    const lastThree = recentWeeklyKm.slice(-3);
    const avgLoad = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;
    const targetLoad = profile.startMileage || 40;

    if (avgLoad >= targetLoad * 0.8) {
      factors.recentLoad = 100;
    } else if (avgLoad >= targetLoad * 0.6) {
      factors.recentLoad = 70;
    } else {
      factors.recentLoad = 40;
      blockers.push(`Weekly volume still building (${avgLoad.toFixed(0)}/${targetLoad} km)`);
    }
  } else {
    factors.recentLoad = 50;
    blockers.push("Insufficient training history");
  }

  // Factor 4: Recovery status
  if (recentFatigueScores.length > 0) {
    const avgFatigue = recentFatigueScores.reduce((a, b) => a + b, 0) / recentFatigueScores.length;
    // Lower fatigue = better recovery (inverted scale)
    factors.recovery = Math.max(0, 100 - (avgFatigue * 10));
    if (avgFatigue > 7) {
      blockers.push(`High fatigue levels: ${avgFatigue.toFixed(1)}/10`);
    }
  } else {
    factors.recovery = 70; // Assume reasonable
  }

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    factors.aerobicBase * 0.35 +
    factors.consistency * 0.25 +
    factors.recentLoad * 0.25 +
    factors.recovery * 0.15
  );

  const canProgressToIntensity = overallScore >= 70 && blockers.length === 0;

  return {
    overallScore,
    canProgressToIntensity,
    factors,
    blockers,
  };
}
