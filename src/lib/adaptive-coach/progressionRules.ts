/**
 * ======================================================================
 *  PROGRESSION RULES — ACWR-BASED LOAD MANAGEMENT
 * ======================================================================
 *
 * TIME-BASED PROGRESSION with ACWR as primary safety mechanism.
 * NO HARD CEILINGS. Safe load emerges from:
 * - ACWR boundaries (0.8-1.3 safe zone, >1.5 = danger)
 * - Safe progression rates (≤10% per week)
 * - Modulation cycles (3:1 or 2:1)
 * - Multi-dimensional constraints (load + vertical)
 *
 * Key Principles:
 * - Training load measured in TIME (minutes), not distance (km)
 * - ACWR is PRIMARY constraint (Acute:Chronic Workload Ratio)
 * - Vertical gain is INDEPENDENT dimension (meters)
 * - Keep increases at ≤10% per week for both load and vertical
 * - Do not increase for more than 3 weeks in a row
 * - Do not increase load AND vertical in the same week
 * - Follow large jumps (~15%) with a recovery week
 * - Use 3:1 or 2:1 build-to-recovery cycle
 * - Recovery weeks: Drop load by 40-60%
 * - Do not hold load constant for multiple weeks
 */

export interface ProgressionContext {
  // Training load (time-based, in minutes)
  currentWeekLoad: number;      // This week's total training time
  previousWeekLoad?: number;    // Last week's load
  twoWeeksAgoLoad?: number;     // Two weeks ago load

  // Vertical tracking (meters) - INDEPENDENT dimension
  currentWeekVertical?: number;
  previousWeekVertical?: number;
  twoWeeksAgoVertical?: number;

  // Build cycle tracking
  weeksInBuildCycle: number;    // How many consecutive build weeks
  recoveryRatio: '2:1' | '3:1';
  isIntensityWeek?: boolean;

  // PRIMARY CONSTRAINT: ACWR
  currentACWR?: number;         // If >1.3 = caution, if >1.5 = danger
}

export interface ProgressionConstraints {
  // Training load constraints (time-based, in minutes)
  maxLoadIncrease: number;       // Maximum safe load this week (minutes)
  minLoadDecrease?: number;      // Minimum decrease if recovery (minutes)
  mustRecover: boolean;          // Is recovery week mandatory?
  canHoldSteady: boolean;        // Can maintain current load?

  // Vertical constraints (meters) - INDEPENDENT
  maxVerticalIncrease?: number;  // Maximum safe vertical (meters)
  minVerticalDecrease?: number;  // Minimum decrease if recovery (meters)

  // Multi-dimensional flags
  canIncreaseLoad: boolean;      // Can increase training time this week
  canIncreaseVertical: boolean;  // Can increase vertical this week

  // Safety info
  reasoning: string[];           // Why these limits?
  warnings?: string[];
  acwrStatus?: 'safe' | 'caution' | 'danger'; // ACWR zone
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
 * ACWR is PRIMARY safety mechanism
 * NO hard ceiling - just constraints based on current state
 * Applies independently to LOAD (time) and VERTICAL
 */
export function calculateProgressionConstraints(
  context: ProgressionContext
): ProgressionConstraints {
  const reasoning: string[] = [];
  const warnings: string[] = [];
  let maxLoadIncrease = context.currentWeekLoad;
  let maxVerticalIncrease: number | undefined;
  let mustRecover = false;
  let canHoldSteady = false;
  let minLoadDecrease: number | undefined;
  let minVerticalDecrease: number | undefined;
  let acwrStatus: 'safe' | 'caution' | 'danger' = 'safe';
  let canIncreaseLoad = true;
  let canIncreaseVertical = true;

  // Calculate vertical constraints if tracking vertical
  if (context.currentWeekVertical !== undefined && context.previousWeekVertical !== undefined) {
    maxVerticalIncrease = context.currentWeekVertical * (1 + PROGRESSION_LIMITS.STANDARD_INCREASE);
  }

  // RULE 0: ACWR is PRIMARY constraint - check this FIRST
  if (context.currentACWR !== undefined) {
    if (context.currentACWR >= PROGRESSION_LIMITS.ACWR_DANGER) {
      // ACWR >=1.5 = mandatory recovery
      acwrStatus = 'danger';
      mustRecover = true;
      minLoadDecrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
      maxLoadIncrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);

      if (context.currentWeekVertical !== undefined) {
        minVerticalDecrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
        maxVerticalIncrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);
      }

      reasoning.push(`ACWR ${context.currentACWR.toFixed(2)} in danger zone (≥1.5) - mandatory recovery`);
      warnings.push('ACWR too high - forced recovery week');
      return {
        maxLoadIncrease,
        minLoadDecrease,
        maxVerticalIncrease,
        minVerticalDecrease,
        mustRecover,
        canHoldSteady: false,
        canIncreaseLoad: false,
        canIncreaseVertical: false,
        reasoning,
        warnings,
        acwrStatus
      };
    } else if (context.currentACWR >= PROGRESSION_LIMITS.ACWR_CAUTION) {
      // ACWR 1.3-1.5 = caution zone
      acwrStatus = 'caution';
      maxLoadIncrease = Math.min(maxLoadIncrease, context.currentWeekLoad * 1.05);
      if (maxVerticalIncrease !== undefined) {
        maxVerticalIncrease = Math.min(maxVerticalIncrease, context.currentWeekVertical! * 1.05);
      }
      reasoning.push(`ACWR ${context.currentACWR.toFixed(2)} elevated (1.3-1.5) - limited to 5% increase`);
      warnings.push('ACWR elevated - conservative progression');
    } else if (context.currentACWR < 0.8) {
      reasoning.push(`ACWR ${context.currentACWR.toFixed(2)} low (<0.8) - can increase load`);
    } else {
      reasoning.push(`ACWR ${context.currentACWR.toFixed(2)} in safe zone (0.8-1.3)`);
    }
  }

  // Rule 1: Check if we've hit max build weeks
  const maxBuildWeeks = context.recoveryRatio === '3:1' ? 3 : 2;
  if (context.weeksInBuildCycle >= maxBuildWeeks) {
    mustRecover = true;
    minLoadDecrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
    maxLoadIncrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);

    // Apply same recovery to vertical
    if (context.currentWeekVertical !== undefined) {
      minVerticalDecrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
      maxVerticalIncrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);
    }

    reasoning.push(`Recovery week mandatory (${context.weeksInBuildCycle} build weeks completed)`);
    return {
      maxLoadIncrease,
      minLoadDecrease,
      maxVerticalIncrease,
      minVerticalDecrease,
      mustRecover,
      canHoldSteady: false,
      canIncreaseLoad: false,
      canIncreaseVertical: false,
      reasoning,
      warnings,
      acwrStatus
    };
  }

  // Rule 2: Check for large jump in previous week (load OR vertical)
  if (context.previousWeekLoad && context.twoWeeksAgoLoad) {
    const previousIncrease = (context.previousWeekLoad - context.twoWeeksAgoLoad) / context.twoWeeksAgoLoad;

    // Also check vertical jumps
    let previousVerticalIncrease = 0;
    if (context.previousWeekVertical && context.twoWeeksAgoVertical && context.twoWeeksAgoVertical > 0) {
      previousVerticalIncrease = (context.previousWeekVertical - context.twoWeeksAgoVertical) / context.twoWeeksAgoVertical;
    }

    const largeLoadJump = previousIncrease >= PROGRESSION_LIMITS.LARGE_JUMP;
    const largeVerticalJump = previousVerticalIncrease >= PROGRESSION_LIMITS.LARGE_JUMP;

    if (largeLoadJump || largeVerticalJump) {
      // Large jump last week → must recover this week
      mustRecover = true;
      minLoadDecrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
      maxLoadIncrease = context.currentWeekLoad * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);

      if (context.currentWeekVertical !== undefined) {
        minVerticalDecrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MIN);
        maxVerticalIncrease = context.currentWeekVertical * (1 - PROGRESSION_LIMITS.RECOVERY_DROP_MAX);
      }

      const jumpType = largeLoadJump ? 'load' : 'vertical';
      const jumpPct = largeLoadJump ? previousIncrease : previousVerticalIncrease;
      reasoning.push(`Recovery required after ${(jumpPct * 100).toFixed(0)}% ${jumpType} jump last week`);
      warnings.push(`Large ${jumpType} jump detected - mandatory recovery`);
      return {
        maxLoadIncrease,
        minLoadDecrease,
        maxVerticalIncrease,
        minVerticalDecrease,
        mustRecover,
        canHoldSteady: false,
        canIncreaseLoad: false,
        canIncreaseVertical: false,
        reasoning,
        warnings,
        acwrStatus
      };
    }

    // Check if two large increases in a row
    const twoWeeksAgoIncrease = context.twoWeeksAgoLoad
      ? (context.twoWeeksAgoLoad - (context.previousWeekLoad || 0)) / (context.previousWeekLoad || 1)
      : 0;

    if (previousIncrease > 0.10 && twoWeeksAgoIncrease > 0.10) {
      warnings.push('Two consecutive load increases detected - limit this week');
      maxLoadIncrease = context.currentWeekLoad * (1 + 0.05); // Cap at 5%
      reasoning.push('Limited to 5% after two consecutive increases');
    }
  }

  // Rule 3: Standard progression (10% rule) - applies to both load and vertical
  if (!mustRecover) {
    maxLoadIncrease = context.currentWeekLoad * (1 + PROGRESSION_LIMITS.STANDARD_INCREASE);
    reasoning.push(`Standard 10% progression: ${context.currentWeekLoad.toFixed(0)} → ${maxLoadIncrease.toFixed(0)}min`);

    if (context.currentWeekVertical !== undefined && maxVerticalIncrease === undefined) {
      maxVerticalIncrease = context.currentWeekVertical * (1 + PROGRESSION_LIMITS.STANDARD_INCREASE);
      reasoning.push(`Vertical 10% progression: ${context.currentWeekVertical.toFixed(0)} → ${maxVerticalIncrease.toFixed(0)}m`);
    }
  }

  // Rule 3.5: Multi-dimensional constraint - can't increase BOTH load and vertical same week
  if (context.previousWeekLoad && context.previousWeekVertical) {
    const loadIncreased = context.currentWeekLoad > context.previousWeekLoad;
    const verticalIncreased = (context.currentWeekVertical || 0) > context.previousWeekVertical;

    if (loadIncreased && verticalIncreased) {
      // Both increased last week - can only increase ONE this week
      warnings.push('Both load and vertical increased last week - limit increases this week');
      reasoning.push('Multi-dimensional constraint: choose load OR vertical increase, not both');
    }

    if (loadIncreased) {
      canIncreaseVertical = false; // Just increased load, must hold or reduce vertical
      reasoning.push('Load increased recently - vertical should hold steady or decrease');
    }
    if (verticalIncreased) {
      canIncreaseLoad = false; // Just increased vertical, must hold or reduce load
      reasoning.push('Vertical increased recently - load should hold steady or decrease');
    }
  }

  // Rule 4: Intensity week constraint
  if (context.isIntensityWeek) {
    // If adding intensity, limit volume increase
    maxLoadIncrease = Math.min(maxLoadIncrease, context.currentWeekLoad * 1.05);
    reasoning.push('Intensity week - volume limited to 5% increase');
  }

  // Rule 5: Can't hold steady for multiple weeks
  canHoldSteady = context.weeksInBuildCycle === 0; // Only first week of cycle
  if (!canHoldSteady && maxLoadIncrease === context.currentWeekLoad) {
    reasoning.push('Cannot hold load constant - must increase or recover');
  }

  return {
    maxLoadIncrease,
    minLoadDecrease,
    maxVerticalIncrease,
    minVerticalDecrease,
    mustRecover,
    canHoldSteady,
    canIncreaseLoad,
    canIncreaseVertical,
    reasoning,
    warnings: warnings.length > 0 ? warnings : undefined,
    acwrStatus
  };
}

//
// ─────────────────────────────────────────────────────────────
//   MULTI-DIMENSIONAL PROGRESSION
// ─────────────────────────────────────────────────────────────
//

export interface MultiDimensionalLoad {
  load: number;       // Training load (time-based, minutes)
  vertical: number;   // Vertical gain (meters)
  intensity?: number; // Z3/Z4 volume or session intensity factor
}

export interface MultiDimensionalConstraints {
  canIncreaseLoad: boolean;        // Can increase training time
  canIncreaseVertical: boolean;    // Can increase vertical gain
  canIncreaseIntensity: boolean;   // Can increase intensity
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
