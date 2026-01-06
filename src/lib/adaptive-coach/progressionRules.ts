/**
 * ======================================================================
 *  PROGRESSION RULES — CONSTRAINT-BASED VOLUME MANAGEMENT
 * ======================================================================
 *
 * NO HARD CEILINGS. Maximum volume emerges from:
 * - Safe progression rates (≤10% per week)
 * - Modulation cycles (3:1 or 2:1)
 * - Multi-dimensional constraints (distance, vertical, time)
 * - ACWR safety boundaries
 *
 * Key Principles:
 * - Keep increases at ≤10% per week for distance, vertical, and time
 * - Do not increase for more than 3 weeks in a row
 * - Do not increase distance, vertical, AND intensity in the same week
 * - Follow large jumps (~15%) with a recovery week
 * - Do not increase >15% for two weeks in a row
 * - Use 3:1 or 2:1 build-to-recovery cycle
 * - Recovery weeks: Drop load by 40-60%
 * - Do not hold load constant for multiple weeks
 */

export interface ProgressionContext {
  currentWeekLoad: number;
  previousWeekLoad?: number;
  twoWeeksAgoLoad?: number;

  // Vertical tracking
  currentWeekVertical?: number;
  previousWeekVertical?: number;
  twoWeeksAgoVertical?: number;

  weeksInBuildCycle: number;  // How many consecutive build weeks
  recoveryRatio: '2:1' | '3:1';
  isIntensityWeek?: boolean;
  currentACWR?: number;
}

export interface ProgressionConstraints {
  maxIncrease: number;           // Maximum safe increase this week (distance)
  minDecrease?: number;          // Minimum decrease if recovery week
  mustRecover: boolean;          // Is recovery week mandatory?
  canHoldSteady: boolean;        // Can maintain current load?

  // Vertical constraints
  maxVerticalIncrease?: number;  // Maximum safe vertical increase (meters)
  minVerticalDecrease?: number;  // Minimum vertical decrease if recovery

  // Multi-dimensional
  canIncreaseDistance: boolean;  // Can increase distance this week
  canIncreaseVertical: boolean;  // Can increase vertical this week

  reasoning: string[];           // Why these limits?
  warnings?: string[];
}

//
// ─────────────────────────────────────────────────────────────
//   PROGRESSION CONSTANTS
// ─────────────────────────────────────────────────────────────
//

export const PROGRESSION_LIMITS = {
  STANDARD_INCREASE: 0.10,      // 10% standard increase
  LARGE_JUMP: 0.15,             // 15% is considered a "large jump"
  MAX_BUILD_WEEKS: 3,           // Maximum consecutive build weeks
  RECOVERY_DROP_MIN: 0.40,      // Recovery week minimum drop (40%)
  RECOVERY_DROP_MAX: 0.60,      // Recovery week maximum drop (60%)
  ACWR_CAUTION: 1.3,            // ACWR warning threshold
  ACWR_DANGER: 1.5,             // ACWR danger threshold
};

//
// ─────────────────────────────────────────────────────────────
//   MAIN PROGRESSION CALCULATOR
// ─────────────────────────────────────────────────────────────
//

/**
 * Calculate safe progression constraints based on rules
 * NO hard ceiling - just constraints based on current state
 * Applies independently to DISTANCE and VERTICAL
 */
export function calculateProgressionConstraints(
  context: ProgressionContext
): ProgressionConstraints {
  const reasoning: string[] = [];
  const warnings: string[] = [];
  let maxIncrease = context.currentWeekLoad;
  let maxVerticalIncrease: number | undefined;
  let mustRecover = false;
  let canHoldSteady = false;
  let minDecrease: number | undefined;
  let minVerticalDecrease: number | undefined;

  // Calculate vertical constraints if tracking vertical
  if (context.currentWeekVertical !== undefined && context.previousWeekVertical !== undefined) {
    maxVerticalIncrease = context.currentWeekVertical * (1 + PROGRESSION_LIMITS.STANDARD_INCREASE);
  }

  // Rule 1: Check if we've hit max build weeks
  const maxBuildWeeks = context.recoveryRatio === '3:1' ? 3 : 2;
  if (context.weeksInBuildCycle >= maxBuildWeeks) {
    mustRecover = true;
    minDecrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
    maxIncrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);

    // Apply same recovery to vertical
    if (context.currentWeekVertical !== undefined) {
      minVerticalDecrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
      maxVerticalIncrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);
    }

    reasoning.push(`Recovery week mandatory (${context.weeksInBuildCycle} build weeks completed)`);
    return {
      maxIncrease,
      minDecrease,
      maxVerticalIncrease,
      minVerticalDecrease,
      mustRecover,
      canHoldSteady: false,
      canIncreaseDistance: false,
      canIncreaseVertical: false,
      reasoning,
      warnings
    };
  }

  // Rule 2: Check for large jump in previous week (distance OR vertical)
  if (context.previousWeekLoad && context.twoWeeksAgoLoad) {
    const previousIncrease = (context.previousWeekLoad - context.twoWeeksAgoLoad) / context.twoWeeksAgoLoad;

    // Also check vertical jumps
    let previousVerticalIncrease = 0;
    if (context.previousWeekVertical && context.twoWeeksAgoVertical && context.twoWeeksAgoVertical > 0) {
      previousVerticalIncrease = (context.previousWeekVertical - context.twoWeeksAgoVertical) / context.twoWeeksAgoVertical;
    }

    const largeDistanceJump = previousIncrease >= PROGRESSION_LIMITS.LARGE_JUMP;
    const largeVerticalJump = previousVerticalIncrease >= PROGRESSION_LIMITS.LARGE_JUMP;

    if (largeDistanceJump || largeVerticalJump) {
      // Large jump last week → must recover this week
      mustRecover = true;
      minDecrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
      maxIncrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);

      if (context.currentWeekVertical !== undefined) {
        minVerticalDecrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
        maxVerticalIncrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);
      }

      const jumpType = largeDistanceJump ? 'distance' : 'vertical';
      const jumpPct = largeDistanceJump ? previousIncrease : previousVerticalIncrease;
      reasoning.push(`Recovery required after ${(jumpPct * 100).toFixed(0)}% ${jumpType} jump last week`);
      warnings.push(`Large ${jumpType} jump detected - mandatory recovery`);
      return {
        maxIncrease,
        minDecrease,
        maxVerticalIncrease,
        minVerticalDecrease,
        mustRecover,
        canHoldSteady: false,
        canIncreaseDistance: false,
        canIncreaseVertical: false,
        reasoning,
        warnings
      };
    }

    // Check if two large increases in a row
    const twoWeeksAgoIncrease = context.twoWeeksAgoLoad
      ? (context.twoWeeksAgoLoad - (context.previousWeekLoad || 0)) / (context.previousWeekLoad || 1)
      : 0;

    if (previousIncrease > 0.10 && twoWeeksAgoIncrease > 0.10) {
      warnings.push('Two consecutive increases detected - limit this week');
      maxIncrease = context.currentWeekLoad * (1 + 0.05); // Cap at 5%
      reasoning.push('Limited to 5% after two consecutive increases');
    }
  }

  // Rule 3: Standard progression (10% rule) - applies to both distance and vertical
  if (!mustRecover) {
    maxIncrease = context.currentWeekLoad * (1 + PROGRESSION_LIMITS.STANDARD_INCREASE);
    reasoning.push(`Standard 10% progression: ${context.currentWeekLoad.toFixed(0)} → ${maxIncrease.toFixed(0)}km`);

    if (context.currentWeekVertical !== undefined && maxVerticalIncrease === undefined) {
      maxVerticalIncrease = context.currentWeekVertical * (1 + PROGRESSION_LIMITS.STANDARD_INCREASE);
      reasoning.push(`Vertical 10% progression: ${context.currentWeekVertical.toFixed(0)} → ${maxVerticalIncrease.toFixed(0)}m`);
    }
  }

  // Rule 3.5: Multi-dimensional constraint - can't increase BOTH distance and vertical same week
  let canIncreaseDistance = !mustRecover;
  let canIncreaseVertical = !mustRecover;

  if (context.previousWeekLoad && context.previousWeekVertical) {
    const distanceIncreased = context.currentWeekLoad > context.previousWeekLoad;
    const verticalIncreased = (context.currentWeekVertical || 0) > context.previousWeekVertical;

    if (distanceIncreased && verticalIncreased) {
      // Both increased last week - can only increase ONE this week
      warnings.push('Both distance and vertical increased last week - limit increases this week');
      // Allow either, but system should choose only one
      reasoning.push('Multi-dimensional constraint: choose distance OR vertical increase, not both');
    }

    if (distanceIncreased) {
      canIncreaseVertical = false; // Just increased distance, must hold or reduce vertical
      reasoning.push('Distance increased recently - vertical should hold steady or decrease');
    }
    if (verticalIncreased) {
      canIncreaseDistance = false; // Just increased vertical, must hold or reduce distance
      reasoning.push('Vertical increased recently - distance should hold steady or decrease');
    }
  }

  // Rule 4: ACWR safety check
  if (context.currentACWR) {
    if (context.currentACWR >= PROGRESSION_LIMITS.ACWR_DANGER) {
      mustRecover = true;
      minDecrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
      maxIncrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);

      if (context.currentWeekVertical !== undefined) {
        minVerticalDecrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
        maxVerticalIncrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);
      }

      reasoning.push(`ACWR ${context.currentACWR.toFixed(2)} in danger zone - mandatory recovery`);
      warnings.push('ACWR too high - forced recovery week');
      canIncreaseDistance = false;
      canIncreaseVertical = false;
    } else if (context.currentACWR >= PROGRESSION_LIMITS.ACWR_CAUTION) {
      maxIncrease = Math.min(maxIncrease, context.currentWeekLoad * 1.05);
      if (maxVerticalIncrease !== undefined) {
        maxVerticalIncrease = Math.min(maxVerticalIncrease, context.currentWeekVertical! * 1.05);
      }
      reasoning.push(`ACWR ${context.currentACWR.toFixed(2)} elevated - limited to 5% increase`);
      warnings.push('ACWR elevated - conservative progression');
    }
  }

  // Rule 5: Intensity week constraint
  if (context.isIntensityWeek) {
    // If adding intensity, limit volume increase
    maxIncrease = Math.min(maxIncrease, context.currentWeekLoad * 1.05);
    reasoning.push('Intensity week - volume limited to 5% increase');
  }

  // Rule 6: Can't hold steady for multiple weeks
  canHoldSteady = context.weeksInBuildCycle === 0; // Only first week of cycle
  if (!canHoldSteady && maxIncrease === context.currentWeekLoad) {
    reasoning.push('Cannot hold load constant - must increase or recover');
  }

  return {
    maxIncrease,
    minDecrease,
    maxVerticalIncrease,
    minVerticalDecrease,
    mustRecover,
    canHoldSteady,
    canIncreaseDistance,
    canIncreaseVertical,
    reasoning,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

//
// ─────────────────────────────────────────────────────────────
//   MULTI-DIMENSIONAL PROGRESSION
// ─────────────────────────────────────────────────────────────
//

export interface MultiDimensionalLoad {
  distance: number;
  vertical: number;
  time: number;
  intensity?: number;  // Z3/Z4 volume
}

export interface MultiDimensionalConstraints {
  canIncreaseDistance: boolean;
  canIncreaseVertical: boolean;
  canIncreaseTime: boolean;
  canIncreaseIntensity: boolean;
  maxSimultaneousIncreases: number;
  reasoning: string[];
}

/**
 * Apply multi-dimensional progression rules
 * Can't increase distance, vertical, AND intensity same week
 */
export function checkMultiDimensionalConstraints(
  current: MultiDimensionalLoad,
  previous?: MultiDimensionalLoad
): MultiDimensionalConstraints {
  const reasoning: string[] = [];

  if (!previous) {
    return {
      canIncreaseDistance: true,
      canIncreaseVertical: true,
      canIncreaseTime: true,
      canIncreaseIntensity: true,
      maxSimultaneousIncreases: 2,
      reasoning: ['First week - can increase any 2 dimensions']
    };
  }

  // Count what increased last week
  const increases = {
    distance: current.distance > previous.distance,
    vertical: current.vertical > previous.vertical,
    time: current.time > previous.time,
    intensity: (current.intensity || 0) > (previous.intensity || 0)
  };

  const increaseCount = Object.values(increases).filter(Boolean).length;

  if (increaseCount >= 3) {
    reasoning.push('Already increased 3+ dimensions - no more increases allowed');
    return {
      canIncreaseDistance: false,
      canIncreaseVertical: false,
      canIncreaseTime: false,
      canIncreaseIntensity: false,
      maxSimultaneousIncreases: 0,
      reasoning
    };
  }

  // Allow up to 2 simultaneous increases
  const remainingIncreases = 2 - increaseCount;
  reasoning.push(`Can increase ${remainingIncreases} more dimension(s) this week`);

  return {
    canIncreaseDistance: increaseCount < 2,
    canIncreaseVertical: increaseCount < 2,
    canIncreaseTime: increaseCount < 2,
    canIncreaseIntensity: increaseCount < 2,
    maxSimultaneousIncreases: remainingIncreases,
    reasoning
  };
}

//
// ─────────────────────────────────────────────────────────────
//   RECOVERY WEEK CALCULATOR
// ─────────────────────────────────────────────────────────────
//

export interface RecoveryWeekTarget {
  targetLoad: number;
  dropPercentage: number;
  reasoning: string;
}

/**
 * Calculate recovery week target (40-60% drop)
 */
export function calculateRecoveryTarget(
  preRecoveryLoad: number,
  acwr?: number,
  fatigue?: number
): RecoveryWeekTarget {
  let dropPercentage = 0.50; // Default 50% drop
  let reasoning = 'Standard 50% recovery drop';

  // Adjust based on ACWR
  if (acwr) {
    if (acwr >= PROGRESSION_LIMITS.ACWR_DANGER) {
      dropPercentage = 0.60; // 60% drop for high risk
      reasoning = `Deep recovery (60%) due to ACWR ${acwr.toFixed(2)}`;
    } else if (acwr >= PROGRESSION_LIMITS.ACWR_CAUTION) {
      dropPercentage = 0.55; // 55% drop for caution
      reasoning = `Moderate recovery (55%) due to ACWR ${acwr.toFixed(2)}`;
    }
  }

  // Adjust based on fatigue
  if (fatigue && fatigue >= 8) {
    dropPercentage = Math.max(dropPercentage, 0.60);
    reasoning = `Deep recovery (60%) due to high fatigue (${fatigue}/10)`;
  }

  const targetLoad = preRecoveryLoad * (1 - dropPercentage);

  return {
    targetLoad: Math.round(targetLoad),
    dropPercentage,
    reasoning
  };
}

//
// ─────────────────────────────────────────────────────────────
//   INTENSITY PROGRESSION RULES
// ─────────────────────────────────────────────────────────────
//

export interface IntensityConstraints {
  maxZ3Percentage: number;        // Max % of weekly volume that can be Z3
  maxZ4Percentage: number;        // Max % of weekly volume that can be Z4
  canAddZ3: boolean;
  canAddZ4: boolean;
  mustReduceZ2: boolean;          // Must drop Z2 when adding intensity
  reasoning: string[];
}

/**
 * Calculate intensity progression constraints
 * - Start Z3 at ≤5% of weekly volume; build to 10%
 * - Add Z4 only when comfortable with Z3 at 10%
 * - Drop Z2 when adding Z3/Z4; do base work in Z1
 */
export function calculateIntensityConstraints(
  weeklyVolume: number,
  currentZ3: number,
  currentZ4: number,
  weeksWithZ3: number
): IntensityConstraints {
  const reasoning: string[] = [];
  const z3Percentage = (currentZ3 / weeklyVolume) * 100;
  const z4Percentage = (currentZ4 / weeklyVolume) * 100;

  // Z3 rules
  let maxZ3Percentage = 5;
  if (weeksWithZ3 >= 4) {
    maxZ3Percentage = 10;
    reasoning.push('Can progress Z3 to 10% (comfortable with 5%)');
  } else {
    reasoning.push('Z3 capped at 5% (building tolerance)');
  }

  // Z4 rules
  const canAddZ4 = z3Percentage >= 10 && weeksWithZ3 >= 6;
  const maxZ4Percentage = canAddZ4 ? 5 : 0;

  if (canAddZ4) {
    reasoning.push('Ready for Z4 (comfortable with Z3 at 10%)');
  } else if (currentZ3 > 0) {
    reasoning.push('Not ready for Z4 (build Z3 to 10% first)');
  }

  // Must reduce Z2 when adding intensity
  const totalIntensity = z3Percentage + z4Percentage;
  const mustReduceZ2 = totalIntensity > 0;

  if (mustReduceZ2) {
    reasoning.push('Drop Z2 when adding intensity; use Z1 for base work');
  }

  return {
    maxZ3Percentage,
    maxZ4Percentage,
    canAddZ3: true,
    canAddZ4,
    mustReduceZ2,
    reasoning
  };
}
