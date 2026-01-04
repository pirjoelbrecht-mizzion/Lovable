/**
 * ======================================================================
 *  ADAPTIVE DECISION ENGINE (ADE) - THE BRAIN
 *  Module 4 — Unified Adaptive Intelligence
 * ======================================================================
 *
 * This is the core intelligence system that integrates ALL learning modules:
 * - Athlete Classification (Cat1/Cat2)
 * - ACWR (Acute:Chronic Workload Ratio)
 * - Climate/Heat Stress
 * - Motivation Archetype
 * - Race Priority Logic
 * - Route/Location Intelligence
 * - Injury History
 *
 * Takes all signals → Produces ONE cohesive training recommendation
 * Resolves conflicts → Explains decisions transparently
 */

import type { WeeklyPlan, DailyPlan, Workout, AthleteProfile } from '@/lib/adaptive-coach/types';
import type { ArchetypeType } from '@/lib/motivationDetection';
import { fatiguePaceModifier, type FatigueMetrics } from '@/lib/environmental-learning/fatigueModel';
import type { HydrationNeeds } from '@/lib/environmental-learning/hydration';

//
// ─────────────────────────────────────────────────────────────
//   CORE TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────
//

export interface AdaptiveContext {
  // Core athlete data
  athlete: AthleteProfile;

  // Current training plan
  plan: WeeklyPlan;

  // ACWR data
  acwr: {
    current: number;
    projected: number;
    trend: 'rising' | 'stable' | 'falling';
    riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  };

  // Climate/weather data
  climate: {
    currentTemp: number;
    humidity: number;
    heatIndex: number;
    wbgt: number; // Wet Bulb Globe Temperature
    level: 'green' | 'yellow' | 'orange' | 'red' | 'black';
    conditions: string;
  };

  // Motivation data
  motivation: {
    archetype: ArchetypeType;
    confidence: number;
    recentEngagement: number; // 0-1
  };

  // Race calendar
  races: {
    mainRace: RaceInfo | null;
    nextRace: RaceInfo | null;
    allUpcoming: RaceInfo[];
    daysToMainRace: number;
    daysToNextRace: number;
  };

  // Training history
  history: {
    completionRate: number; // Last 4 weeks
    averageFatigue: number; // 1-10
    missedWorkouts: number; // Last 2 weeks
    lastHardWorkout: number; // Days ago
  };

  // Location/route data
  location: {
    currentElevation: number;
    recentElevationGain: number; // Last week
    terrainType: 'road' | 'trail' | 'mixed';
    isTravel: boolean;
  };

  // Fatigue assessment (NEW)
  fatigue?: {
    score: number; // 0-100
    metrics: FatigueMetrics;
    paceModifier: number; // multiplier (1.0 = no adjustment)
  };

  // Environmental needs (NEW)
  environmental?: {
    hydration?: HydrationNeeds;
  };
}

export interface RaceInfo {
  id: string;
  name: string;
  date: string;
  distanceKm: number;
  priority: 'A' | 'B' | 'C';
  verticalGain: number;
  climate?: 'hot' | 'humid' | 'cold' | 'temperate';
  expectedTimeMin?: number;
}

export interface AdjustmentLayer {
  name: string;
  applied: boolean;
  changes: WorkoutModification[];
  reasoning: string;
  priority: number; // Higher = more important
  safetyOverride: boolean;
}

export interface WorkoutModification {
  dayIndex: number;
  field: 'intensity' | 'volume' | 'type' | 'notes' | 'replace';
  oldValue: any;
  newValue: any;
  reason: string;
}

export interface AdaptiveDecision {
  originalPlan: WeeklyPlan;
  modifiedPlan: WeeklyPlan;
  layers: AdjustmentLayer[];
  finalReasoning: string[];
  safetyFlags: string[];
  warnings: string[];
  appliedAt: string;
  confidence: number; // 0-1 - how confident the system is
}

//
// ─────────────────────────────────────────────────────────────
//   MAIN DECISION ENGINE
// ─────────────────────────────────────────────────────────────
//

/**
 * Core decision engine - orchestrates all adjustment layers
 *
 * ⚠️ INTERNAL IMPLEMENTATION - DO NOT CALL DIRECTLY
 *
 * This function performs adaptive weekly plan adjustments by evaluating
 * ACWR, climate, motivation, and race priority signals.
 *
 * 🎯 For new code, use the public facade instead:
 *    `adjustWeeklyTrainingDecision()` from `/src/engine/decisionFacade.ts`
 *
 * This function remains exported only for backward compatibility with
 * existing hooks and components during the migration period.
 *
 * 📚 See architectural boundary documentation:
 *    `/docs/DECISION_BOUNDARY.md`
 */
export function computeTrainingAdjustment(context: AdaptiveContext): AdaptiveDecision {
  const layers: AdjustmentLayer[] = [];

  // Layer 1: Race Priority (modifies structure based on upcoming races)
  const raceLayer = applyRacePriority(context.plan, context.races, context.athlete);
  layers.push(raceLayer);

  // Layer 2: ACWR Guardrail (safety limits on volume/intensity)
  const acwrLayer = applyACWRGuardrail(
    raceLayer.applied ? applyLayerToPlan(context.plan, raceLayer) : context.plan,
    context.acwr,
    context.athlete
  );
  layers.push(acwrLayer);

  // Layer 3: Climate Adjustment (heat/weather modifications)
  const climateLayer = applyClimateLogic(
    acwrLayer.applied ? applyLayerToPlan(context.plan, acwrLayer) : context.plan,
    context.climate,
    context.location
  );
  layers.push(climateLayer);

  // Layer 4: Motivation Integration (tone, variety, encouragement)
  const motivationLayer = applyMotivationLayer(
    climateLayer.applied ? applyLayerToPlan(context.plan, climateLayer) : context.plan,
    context.motivation,
    context.history
  );
  layers.push(motivationLayer);

  // Resolve conflicts between layers
  const resolution = resolveConflicts(layers, context);

  // Apply all approved changes (pass context to check for race day)
  let modifiedPlan = applyAllLayers(context.plan, resolution.approvedLayers, context);

  // Generate final reasoning
  const finalReasoning = generateReasoning(resolution.approvedLayers, context);

  // Extract safety flags and warnings
  const safetyFlags = resolution.approvedLayers
    .filter(l => l.safetyOverride)
    .map(l => l.reasoning);

  const warnings = detectWarnings(context, resolution.approvedLayers);

  // FINAL INVARIANT CHECK: Ensure modified plan has exactly 7 days
  if (!modifiedPlan.days || modifiedPlan.days.length !== 7) {
    console.error('[ADE] CRITICAL INVARIANT VIOLATION: Modified plan has', modifiedPlan.days?.length, 'days instead of 7');
    console.error('[ADE] Original plan had', context.plan.days?.length, 'days');
    console.error('[ADE] Fixing by filling missing days...');

    if (modifiedPlan.days.length === 0) {
      modifiedPlan = createEmptyWeekPlan();
    } else if (modifiedPlan.days.length < 7) {
      modifiedPlan = fillMissingDays(modifiedPlan);
    }

    console.log('[ADE] Fixed plan now has', modifiedPlan.days.length, 'days');
  }

  return {
    originalPlan: context.plan,
    modifiedPlan,
    layers: resolution.approvedLayers,
    finalReasoning,
    safetyFlags,
    warnings,
    appliedAt: new Date().toISOString(),
    confidence: calculateConfidence(context, resolution.approvedLayers)
  };
}

//
// ─────────────────────────────────────────────────────────────
//   LAYER 1: RACE PRIORITY RESOLVER
// ─────────────────────────────────────────────────────────────
//

/**
 * 🚧 MIGRATION: Race Priority function needs update to work with multi-session (day.sessions[])
 * Currently a no-op until refactored to iterate over day.sessions
 */
function applyRacePriority(
  plan: WeeklyPlan,
  races: AdaptiveContext['races'],
  athlete: AthleteProfile
): AdjustmentLayer {
  const changes: WorkoutModification[] = [];
  let reasoning = '';
  let applied = false;

  // No races = no adjustments
  if (!races.mainRace && !races.nextRace) {
    return {
      name: 'Race Priority',
      applied: false,
      changes: [],
      reasoning: 'No upcoming races - maintaining base training',
      priority: 3,
      safetyOverride: false
    };
  }

  const daysToRace = races.daysToNextRace;
  const raceDistance = races.nextRace?.distanceKm || 0;
  const racePriority = races.nextRace?.priority || 'C';

  // CRITICAL: Debug log for race priority detection
  console.log('🏁 [RacePriority] Days to race:', daysToRace, '| Priority:', racePriority, '| Distance:', raceDistance + 'km');

  // 🚧 MIGRATION GUARD: Race priority logic uses legacy day.workout pattern
  // This function will be refactored to use day.sessions[] in next iteration
  // For now, returning no adjustments to prevent breaking multi-session structure
  return {
    name: 'Race Priority',
    applied: false,
    changes: [],
    reasoning: '[MIGRATION] Race priority logic temporarily disabled - requires day.sessions[] refactoring',
    priority: 3,
    safetyOverride: false
  };

  // POST-RACE RECOVERY: Handle races that just happened (negative daysToRace means race is in past)
  if (daysToRace < 0 && daysToRace >= -7) {
    const daysSinceRace = Math.abs(daysToRace);
    console.log('🏁 [RacePriority] POST-RACE RECOVERY: Race was', daysSinceRace, 'days ago');

    // Recovery days based on race priority and distance
    let recoveryDays = 1;
    if (racePriority === 'A') {
      // A-race: 3-7 days recovery based on distance
      if (raceDistance >= 50) recoveryDays = 7; // Ultra
      else if (raceDistance >= 42) recoveryDays = 5; // Marathon
      else if (raceDistance >= 21) recoveryDays = 3; // Half marathon
      else recoveryDays = 2;
    } else if (racePriority === 'B') {
      // B-race: 2-3 days recovery
      recoveryDays = raceDistance >= 42 ? 3 : 2;
    } else {
      // C-race: 1 day recovery
      recoveryDays = 1;
    }

    console.log(`🏁 [RacePriority] Prescribing ${recoveryDays} recovery days`);

    // Apply rest days for early part of week
    plan.days.forEach((day, idx) => {
      if (!day.workout) return;

      // First N days after race = rest
      if (idx < recoveryDays && day.workout.type !== 'rest') {
        changes.push({
          dayIndex: idx,
          field: 'replace',
          oldValue: day.workout.type,
          newValue: 'rest',
          reason: `Post-race recovery: ${races.nextRace?.name} was ${daysSinceRace} days ago`
        });
      }
      // Gradual return: easy runs only after recovery period
      else if (idx < recoveryDays + 2 && day.workout.type !== 'rest' && day.workout.type !== 'easy') {
        changes.push({
          dayIndex: idx,
          field: 'type',
          oldValue: day.workout.type,
          newValue: 'easy',
          reason: 'Post-race gradual return to training'
        });

        // Reduce volume for return runs
        const oldKm = day.workout.distanceKm || 10;
        const newKm = Math.max(5, Math.round(oldKm * 0.5));
        changes.push({
          dayIndex: idx,
          field: 'volume',
          oldValue: oldKm,
          newValue: newKm,
          reason: 'Post-race gradual return to training'
        });
      }
    });

    reasoning = `🏁 POST-RACE RECOVERY: ${races.nextRace?.name} was ${daysSinceRace} days ago. ${recoveryDays} rest days + gradual return.`;
    applied = true;

    return {
      name: 'Race Priority',
      applied,
      changes,
      reasoning,
      priority: 3,
      safetyOverride: false
    };
  }

  // CRITICAL FIX: Race Week Logic (0-7 days)
  if (daysToRace <= 7 && racePriority === 'A') {
    console.log('⚠️ [RacePriority] RACE WEEK ACTIVE - Applying aggressive taper');

    // Determine taper aggressiveness based on days remaining
    const isRaceWeek = daysToRace <= 7;
    const isFinalDays = daysToRace <= 3;

    // Race week: Shakeouts and rest only
    plan.days.forEach((day, idx) => {
      if (!day.workout) return;

      const workout = day.workout;
      const daysFromNow = idx; // Approximate

      // Day of race or day before = Rest
      if (daysFromNow >= 6 || isFinalDays) {
        if (workout.type !== 'rest') {
          changes.push({
            dayIndex: idx,
            field: 'replace',
            oldValue: workout.type,
            newValue: 'rest',
            reason: `Race week rest: ${daysToRace} days to ${races.nextRace?.name}`
          });
        }
      }
      // Earlier in race week = Shakeout runs only (3-5km, easy)
      else if (isRaceWeek && workout.type !== 'rest') {
        const oldKm = workout.distanceKm || 10;
        const newKm = Math.min(5, Math.max(3, oldKm * 0.3)); // Max 5km, min 3km

        changes.push({
          dayIndex: idx,
          field: 'volume',
          oldValue: oldKm,
          newValue: newKm,
          reason: `Race week shakeout: ${daysToRace} days to ${races.nextRace?.name}`
        });

        // Force to easy/recovery type
        if (workout.type === 'long' || workout.type === 'tempo' || workout.type === 'intervals') {
          changes.push({
            dayIndex: idx,
            field: 'type',
            oldValue: workout.type,
            newValue: 'easy',
            reason: 'Race week - no hard efforts'
          });
        }
      }
    });

    reasoning = `🏁 RACE WEEK: ${races.nextRace?.name} in ${daysToRace} days. Shakeouts and rest only. Peak performance on race day!`;
    applied = true;
  }
  // Taper week (8-14 days)
  else if (daysToRace <= 14 && daysToRace > 7 && racePriority === 'A') {
    console.log('📉 [RacePriority] Taper week - reducing volume by 40%');
    // Moderate taper
    const volumeReduction = 0.4;

    plan.days.forEach((day, idx) => {
      if (day.workout && day.workout.type !== 'rest') {
        const oldKm = day.workout.distanceKm || 10;
        const newKm = Math.round(oldKm * (1 - volumeReduction));

        changes.push({
          dayIndex: idx,
          field: 'volume',
          oldValue: oldKm,
          newValue: newKm,
          reason: `Taper week: ${daysToRace} days to ${races.nextRace?.name}`
        });
      }
    });

    reasoning = `Taper week for A-race ${races.nextRace?.name} in ${daysToRace} days. Volume reduced ${Math.round(volumeReduction * 100)}%.`;
    applied = true;
  }
  // Pre-taper (15-21 days)
  else if (daysToRace <= 21 && daysToRace > 14 && racePriority === 'A') {
    console.log('🎯 [RacePriority] Pre-taper - race-specific work');
    // Race-specific work, minor volume reduction
    const volumeReduction = 0.15;

    plan.days.forEach((day, idx) => {
      if (day.workout && day.workout.type === 'long') {
        const oldKm = day.workout.distanceKm || 20;
        const newKm = Math.round(oldKm * (1 - volumeReduction));

        changes.push({
          dayIndex: idx,
          field: 'volume',
          oldValue: oldKm,
          newValue: newKm,
          reason: `Pre-taper adjustment: ${daysToRace} days to ${races.nextRace?.name}`
        });
      }
    });

    reasoning = `Pre-taper phase for ${races.nextRace?.name}. Race-specific workouts with slight volume reduction.`;
    applied = true;
  } else if (daysToRace <= 7 && racePriority === 'B' && raceDistance >= 30) {
    // B-race: Micro-taper for longer distances
    const volumeReduction = 0.15;

    plan.days.forEach((day, idx) => {
      if (day.workout && day.workout.type === 'long') {
        const oldKm = day.workout.distanceKm || 20;
        const newKm = Math.round(oldKm * (1 - volumeReduction));

        changes.push({
          dayIndex: idx,
          field: 'volume',
          oldValue: oldKm,
          newValue: newKm,
          reason: `B-race micro-taper: ${daysToRace} days to ${races.nextRace?.name}`
        });
      }
    });

    reasoning = `Micro-taper for B-race ${races.nextRace?.name}. Long run volume reduced ${Math.round(volumeReduction * 100)}%.`;
    applied = true;
  } else if (daysToRace <= 3 && racePriority === 'C') {
    // C-race: Instructions only, no taper
    const lastDayIdx = plan.days.length - 1;

    changes.push({
      dayIndex: lastDayIdx,
      field: 'notes',
      oldValue: plan.days[lastDayIdx].workout?.notes || '',
      newValue: `C-race ${races.nextRace?.name} in ${daysToRace} days. Treat as training effort, not peak performance.`,
      reason: 'C-race guidance'
    });

    reasoning = `C-race ${races.nextRace?.name} approaching. No taper - use as training stimulus.`;
    applied = true;
  }

  return {
    name: 'Race Priority',
    applied,
    changes,
    reasoning,
    priority: 3,
    safetyOverride: false
  };
}

//
// ─────────────────────────────────────────────────────────────
//   LAYER 2: ACWR VOLUME GUARDRAIL
// ─────────────────────────────────────────────────────────────
//

function applyACWRGuardrail(
  plan: WeeklyPlan,
  acwr: AdaptiveContext['acwr'],
  athlete: AthleteProfile
): AdjustmentLayer {
  const changes: WorkoutModification[] = [];
  let reasoning = '';
  let applied = false;
  let safetyOverride = false;

  const current = acwr.current;
  const projected = acwr.projected;

  // Critical thresholds
  if (current >= 2.2 || projected >= 2.2) {
    // EXTREME: Replace intensity + long run
    safetyOverride = true;

    plan.days.forEach((day, idx) => {
      if (day.workout && ['threshold', 'intervals', 'tempo', 'long'].includes(day.workout.type)) {
        changes.push({
          dayIndex: idx,
          field: 'replace',
          oldValue: day.workout.type,
          newValue: 'easy',
          reason: `ACWR extreme (${current.toFixed(2)}) - safety override`
        });
      }
    });

    reasoning = `🚨 ACWR at ${current.toFixed(2)} (extreme risk). All hard sessions replaced with easy runs. Mandatory recovery week.`;
    applied = true;

  } else if (current >= 2.0 || projected >= 2.0) {
    // VERY HIGH: Remove intensity, reduce long run
    safetyOverride = true;

    plan.days.forEach((day, idx) => {
      if (day.workout) {
        if (['threshold', 'intervals', 'tempo'].includes(day.workout.type)) {
          changes.push({
            dayIndex: idx,
            field: 'replace',
            oldValue: day.workout.type,
            newValue: 'easy',
            reason: `ACWR very high (${current.toFixed(2)}) - removing intensity`
          });
        } else if (day.workout.type === 'long') {
          const oldKm = day.workout.distanceKm || 20;
          const newKm = Math.round(oldKm * 0.7);

          changes.push({
            dayIndex: idx,
            field: 'volume',
            oldValue: oldKm,
            newValue: newKm,
            reason: `ACWR very high (${current.toFixed(2)}) - reducing long run`
          });
        }
      }
    });

    reasoning = `⚠️ ACWR at ${current.toFixed(2)} (high risk). Intensity removed, long run reduced 30%.`;
    applied = true;

  } else if (current >= 1.85 || projected >= 1.85) {
    // HIGH: Remove intensity sessions

    plan.days.forEach((day, idx) => {
      if (day.workout && ['threshold', 'intervals'].includes(day.workout.type)) {
        changes.push({
          dayIndex: idx,
          field: 'intensity',
          oldValue: 'high',
          newValue: 'moderate',
          reason: `ACWR elevated (${current.toFixed(2)}) - reducing intensity`
        });
      }
    });

    reasoning = `ACWR at ${current.toFixed(2)} (elevated). High-intensity sessions converted to tempo/moderate.`;
    applied = true;

  } else if (current >= 1.65 || projected >= 1.65) {
    // MODERATE: Restrict volume increase
    const targetVolume = plan.targetMileage;
    const safeVolume = Math.round(targetVolume * 0.95);

    if (targetVolume > safeVolume) {
      changes.push({
        dayIndex: -1, // Applies to whole week
        field: 'volume',
        oldValue: targetVolume,
        newValue: safeVolume,
        reason: `ACWR trending up (${current.toFixed(2)}) - capping volume increase`
      });

      reasoning = `ACWR at ${current.toFixed(2)} (moderate). Weekly volume capped at ${safeVolume}km to prevent spike.`;
      applied = true;
    }
  }

  return {
    name: 'ACWR Guardrail',
    applied,
    changes,
    reasoning,
    priority: 5, // High priority - safety critical
    safetyOverride
  };
}

//
// ─────────────────────────────────────────────────────────────
//   LAYER 3: CLIMATE ADJUSTMENT ENGINE
// ─────────────────────────────────────────────────────────────
//

function applyClimateLogic(
  plan: WeeklyPlan,
  climate: AdaptiveContext['climate'],
  location: AdaptiveContext['location']
): AdjustmentLayer {
  const changes: WorkoutModification[] = [];
  let reasoning = '';
  let applied = false;
  let safetyOverride = false;

  const level = climate.level;
  const wbgt = climate.wbgt;

  switch (level) {
    case 'green':
      // Safe - no adjustment needed
      reasoning = `Good conditions for training (${climate.currentTemp}°C). Stay hydrated.`;
      break;

    case 'yellow':
      // Moderate - reduce intensity by 5-7%
      plan.days.forEach((day, idx) => {
        if (day.workout && ['threshold', 'intervals', 'tempo'].includes(day.workout.type)) {
          changes.push({
            dayIndex: idx,
            field: 'notes',
            oldValue: day.workout.notes || '',
            newValue: `Moderate heat (${climate.currentTemp}°C, ${climate.humidity}% humidity). Reduce pace 5-7%, increase hydration.`,
            reason: 'Moderate heat stress'
          });
        }
      });

      reasoning = `Moderate heat stress (WBGT ${wbgt.toFixed(1)}°C). Reduce intensity 5-7%, prioritize hydration.`;
      applied = true;
      break;

    case 'orange':
      // High - reduce intensity by 10-15% OR switch to steady
      plan.days.forEach((day, idx) => {
        if (day.workout && day.workout.type === 'intervals') {
          changes.push({
            dayIndex: idx,
            field: 'replace',
            oldValue: 'intervals',
            newValue: 'tempo',
            reason: `High heat stress (WBGT ${wbgt.toFixed(1)}°C) - converting intervals to steady tempo`
          });
        } else if (day.workout && ['threshold', 'tempo'].includes(day.workout.type)) {
          changes.push({
            dayIndex: idx,
            field: 'intensity',
            oldValue: 'high',
            newValue: 'moderate',
            reason: `High heat stress - reducing intensity 15%`
          });
        }
      });

      reasoning = `⚠️ High heat stress (WBGT ${wbgt.toFixed(1)}°C, ${climate.currentTemp}°C). Intervals→tempo, intensity reduced 15%.`;
      applied = true;
      break;

    case 'red':
      // Extreme - replace with easy/indoor
      safetyOverride = true;

      plan.days.forEach((day, idx) => {
        if (day.workout && day.workout.type !== 'rest' && day.workout.type !== 'easy') {
          changes.push({
            dayIndex: idx,
            field: 'replace',
            oldValue: day.workout.type,
            newValue: 'easy',
            reason: `Extreme heat (WBGT ${wbgt.toFixed(1)}°C) - safety override`
          });

          changes.push({
            dayIndex: idx,
            field: 'notes',
            oldValue: day.workout.notes || '',
            newValue: `🔥 EXTREME HEAT WARNING (${climate.currentTemp}°C, ${climate.humidity}% humidity). Run indoors or very early morning only. Stay safe.`,
            reason: 'Extreme heat safety warning'
          });
        }
      });

      reasoning = `🚨 EXTREME HEAT (WBGT ${wbgt.toFixed(1)}°C). All workouts downgraded to easy. Indoor training strongly recommended.`;
      applied = true;
      break;

    case 'black':
      // Unsafe - force indoor only
      safetyOverride = true;

      plan.days.forEach((day, idx) => {
        if (day.workout && day.workout.type !== 'rest') {
          changes.push({
            dayIndex: idx,
            field: 'replace',
            oldValue: day.workout.type,
            newValue: 'cross_train',
            reason: `Unsafe outdoor conditions (WBGT ${wbgt.toFixed(1)}°C) - mandatory indoor`
          });

          changes.push({
            dayIndex: idx,
            field: 'notes',
            oldValue: day.workout.notes || '',
            newValue: `⛔ UNSAFE OUTDOOR CONDITIONS. Indoor training only. Consider treadmill, pool, or cross-training. Do not run outside.`,
            reason: 'Unsafe heat - mandatory indoor'
          });
        }
      });

      reasoning = `⛔ UNSAFE HEAT (WBGT ${wbgt.toFixed(1)}°C). Outdoor running prohibited. Indoor training only.`;
      applied = true;
      break;
  }

  return {
    name: 'Climate Adjustment',
    applied,
    changes,
    reasoning,
    priority: 4, // High priority - safety related
    safetyOverride
  };
}

//
// ─────────────────────────────────────────────────────────────
//   LAYER 4: MOTIVATION INTEGRATION
// ─────────────────────────────────────────────────────────────
//

function applyMotivationLayer(
  plan: WeeklyPlan,
  motivation: AdaptiveContext['motivation'],
  history: AdaptiveContext['history']
): AdjustmentLayer {
  const changes: WorkoutModification[] = [];
  const archetype = motivation.archetype;
  let reasoning = '';
  let applied = false;

  // Apply archetype-specific tone and messaging adjustments
  const archetypeTones: Record<string, string> = {
    performer: 'Focus on performance metrics and targets',
    adventurer: 'Emphasize exploration and varied terrain',
    mindful: 'Highlight balance and mindful training',
    health: 'Prioritize consistency and sustainable habits',
    transformer: 'Celebrate progress and personal growth',
    connector: 'Encourage social aspects and community'
  };

  plan.days.forEach((day, idx) => {
    if (day.workout && day.workout.type !== 'rest') {
      const tone = archetypeTones[archetype] || 'Standard guidance';
      const enhancedNotes = day.workout.notes
        ? `${day.workout.notes} [${tone}]`
        : tone;

      if (enhancedNotes !== day.workout.notes) {
        changes.push({
          dayIndex: idx,
          field: 'notes',
          oldValue: day.workout.notes || '',
          newValue: enhancedNotes,
          reason: `Motivation archetype (${archetype}) personalization`
        });
        applied = true;
      }
    }
  });

  reasoning = applied
    ? `Training personalized for ${archetype} archetype with appropriate messaging tone`
    : `No motivation adjustments needed for ${archetype} archetype`;

  return {
    name: 'Motivation Integration',
    applied,
    changes,
    reasoning,
    priority: 1, // Lowest priority - preference, not safety
    safetyOverride: false
  };
}

//
// ─────────────────────────────────────────────────────────────
//   CONFLICT RESOLUTION
// ─────────────────────────────────────────────────────────────
//

interface ConflictResolution {
  approvedLayers: AdjustmentLayer[];
  rejectedLayers: AdjustmentLayer[];
  conflicts: string[];
}

function resolveConflicts(
  layers: AdjustmentLayer[],
  context: AdaptiveContext
): ConflictResolution {
  const approved: AdjustmentLayer[] = [];
  const rejected: AdjustmentLayer[] = [];
  const conflicts: string[] = [];

  // Sort by priority (higher priority first)
  const sorted = [...layers].sort((a, b) => b.priority - a.priority);

  // Safety overrides always win
  const safetyLayers = sorted.filter(l => l.safetyOverride && l.applied);
  if (safetyLayers.length > 0) {
    approved.push(...safetyLayers);

    // Reject non-safety layers if they conflict
    sorted.forEach(layer => {
      if (!layer.safetyOverride && layer.applied) {
        conflicts.push(`${layer.name} overridden by safety protocols`);
        rejected.push(layer);
      } else if (!layer.safetyOverride && layer.applied) {
        approved.push(layer);
      }
    });
  } else {
    // No safety overrides - apply all layers in priority order
    sorted.forEach(layer => {
      if (layer.applied) {
        approved.push(layer);
      }
    });
  }

  return {
    approvedLayers: approved,
    rejectedLayers: rejected,
    conflicts
  };
}

//
// ─────────────────────────────────────────────────────────────
//   HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────
//

function applyLayerToPlan(plan: WeeklyPlan, layer: AdjustmentLayer): WeeklyPlan {
  // ARCHITECTURAL GUARD: Do NOT mutate modern adaptive plans that use day.sessions[]
  // Legacy mutation code operates on day.workout (deprecated schema)
  // Modern adaptive plans use day.sessions[] and must NEVER be mutated post-generation
  const usesModernSchema = plan.days?.some(d => Array.isArray(d.sessions) && !d.workout);
  if (usesModernSchema) {
    console.log('[applyLayerToPlan] BLOCKED: Cannot mutate modern adaptive plan (uses day.sessions[])');
    return plan; // Return unmodified
  }

  const modified = JSON.parse(JSON.stringify(plan)); // Deep clone

  layer.changes.forEach(change => {
    if (change.dayIndex === -1) {
      // Whole-week change
      if (change.field === 'volume') {
        modified.targetMileage = change.newValue;
      }
    } else {
      // Day-specific change
      const day = modified.days[change.dayIndex];
      if (!day || !day.workout) return;

      switch (change.field) {
        case 'volume':
          day.workout.distanceKm = change.newValue;
          break;
        case 'intensity':
          day.workout.notes = (day.workout.notes || '') + ` [Intensity: ${change.newValue}]`;
          break;
        case 'notes':
          day.workout.notes = change.newValue;
          break;
        case 'replace':
          day.workout.type = change.newValue;
          // DEPRECATED: This mutation code violates architectural principles
          // Constraints should influence INPUT, never mutate OUTPUT
          // Kept for legacy plans only - will be removed in future refactor
          if (change.newValue === 'rest') {
            day.workout.distanceKm = 0;
            day.workout.description = 'Complete rest day for recovery';
            day.workout.notes = '';
          }
          break;
      }
    }
  });

  return modified;
}

function applyAllLayers(plan: WeeklyPlan, layers: AdjustmentLayer[], context?: AdaptiveContext): WeeklyPlan {
  let result = plan;

  // CRITICAL GUARD: Ensure input plan has 7 days
  if (!result.days || result.days.length === 0) {
    console.error('[applyAllLayers] CRITICAL: Input plan has 0 days! Creating empty 7-day structure.');
    result = createEmptyWeekPlan();
  } else if (result.days.length < 7) {
    console.warn('[applyAllLayers] Input plan has only', result.days.length, 'days. Filling to 7 days.');
    result = fillMissingDays(result);
  }

  layers.forEach(layer => {
    result = applyLayerToPlan(result, layer);
  });

  // CRITICAL: If this is race week, insert the race on race day
  if (context?.races.mainRace && context.races.daysToMainRace <= 7) {
    const raceDateStr = context.races.mainRace.date;
    console.log('🏁 [applyAllLayers] Race week! Inserting race on', raceDateStr);
    console.log('🏁 [applyAllLayers] Plan days:', result.days.map(d => `${d.day}: ${d.date}`));

    result = {
      ...result,
      days: result.days.map(day => {
        // Check if this day is race day
        console.log(`[applyAllLayers] Checking ${day.day} (${day.date}) vs Race (${raceDateStr}): ${day.date === raceDateStr}`);

        if (day.date === raceDateStr) {
          const race = context.races.mainRace!;
          console.log('🏁 [applyAllLayers] Race object:', race);
          console.log('🏁 [applyAllLayers] Race expectedTimeMin:', race.expectedTimeMin);

          // Calculate duration: use expected time if available, otherwise estimate
          let durationMin: number;
          if (race.expectedTimeMin) {
            durationMin = Math.round(race.expectedTimeMin);
            console.log(`🏁 [applyAllLayers] Using expected time: ${durationMin} min (${Math.floor(durationMin/60)}:${String(durationMin%60).padStart(2,'0')})`);
          } else {
            // Fallback: estimate with elevation penalty
            const elevationPenaltyMin = (race.verticalGain || 0) / 100 * 10; // 10 min per 100m
            durationMin = Math.round(race.distanceKm * 6 + elevationPenaltyMin);
            console.log(`🏁 [applyAllLayers] Calculated duration: ${durationMin} min (${race.distanceKm}km × 6 + ${elevationPenaltyMin.toFixed(0)}m penalty)`);
          }

          console.log('🏁 [applyAllLayers] ✅ RACE INSERTED on', day.day, day.date);

          return {
            ...day,
            workout: {
              type: 'simulation',
              title: `🏁 ${race.name}`,
              description: `Race day! ${race.distanceKm}km with ${race.verticalGain || 0}m elevation gain.`,
              distanceKm: race.distanceKm,
              durationMin,
              verticalGain: race.verticalGain || 0,
              intensityZones: ['Z4', 'Z5'],
              notes: `🏁 RACE DAY - ${race.name}. Execute your race plan and trust your training!`
            }
          };
        }
        return day;
      })
    };
  }

  return result;
}

function generateReasoning(layers: AdjustmentLayer[], context: AdaptiveContext): string[] {
  const reasons: string[] = [];

  layers.forEach(layer => {
    if (layer.applied && layer.reasoning) {
      reasons.push(layer.reasoning);
    }
  });

  // Add context-specific notes
  if (context.history.completionRate < 0.7) {
    reasons.push(`Recent completion rate low (${Math.round(context.history.completionRate * 100)}%). Consider reducing volume.`);
  }

  if (context.history.averageFatigue > 7) {
    reasons.push(`High fatigue levels detected (${context.history.averageFatigue}/10). Prioritize recovery.`);
  }

  return reasons;
}

/**
 * Create an empty 7-day week plan with all rest days
 * Used as a fallback when the input plan has 0 days
 */
function createEmptyWeekPlan(): WeeklyPlan {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - daysToMonday);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const days: DailyPlan[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    return {
      day: dayNames[i],
      date: date.toISOString().slice(0, 10),
      sessions: [{
        type: 'rest',
        title: 'Rest Day',
        description: 'Recovery',
      }],
      completed: false,
    };
  });

  return {
    weekNumber: 1,
    phase: 'base',
    targetMileage: 0,
    targetVert: 0,
    days,
    actualMileage: 0,
    actualVert: 0,
  };
}

/**
 * Fill missing days in a plan to ensure it has exactly 7 days
 */
function fillMissingDays(plan: WeeklyPlan): WeeklyPlan {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get the Monday of the current week from the first day in the plan
  let monday: Date;
  if (plan.days.length > 0 && plan.days[0].date) {
    monday = new Date(plan.days[0].date);
  } else {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday = new Date(now);
    monday.setDate(monday.getDate() - daysToMonday);
  }

  const filledDays = [...plan.days];

  while (filledDays.length < 7) {
    const idx = filledDays.length;
    const date = new Date(monday);
    date.setDate(date.getDate() + idx);

    filledDays.push({
      day: dayNames[idx],
      date: date.toISOString().slice(0, 10),
      sessions: [{
        type: 'rest',
        title: 'Rest Day',
        description: 'Recovery',
      }],
      completed: false,
    });
  }

  return {
    ...plan,
    days: filledDays,
  };
}

function detectWarnings(context: AdaptiveContext, layers: AdjustmentLayer[]): string[] {
  const warnings: string[] = [];

  // ACWR warnings
  if (context.acwr.current > 1.5) {
    warnings.push(`Elevated ACWR (${context.acwr.current.toFixed(2)}). Monitor for fatigue and soreness.`);
  }

  // Climate warnings
  if (context.climate.level === 'orange' || context.climate.level === 'red') {
    warnings.push(`Heat stress elevated. Early morning training recommended.`);
  }

  // Race warnings
  if (context.races.daysToMainRace > 0 && context.races.daysToMainRace < 14) {
    warnings.push(`Race approaching in ${context.races.daysToMainRace} days. Focus on staying healthy.`);
  }

  // Fatigue warnings (NEW)
  if (context.fatigue && context.fatigue.score >= 70) {
    warnings.push(`High fatigue detected (${context.fatigue.score.toFixed(0)}). Prioritize recovery.`);
  } else if (context.fatigue && context.fatigue.score >= 50) {
    warnings.push(`Moderate fatigue accumulation. Monitor recovery markers.`);
  }

  return warnings;
}

function calculateConfidence(context: AdaptiveContext, layers: AdjustmentLayer[]): number {
  let confidence = 0.8; // Base confidence

  // Reduce confidence if missing data
  if (!context.acwr) confidence -= 0.1;
  if (!context.motivation) confidence -= 0.1;
  if (!context.climate) confidence -= 0.1;

  // Increase confidence if safety overrides present (clear decision)
  const hasSafetyOverride = layers.some(l => l.safetyOverride);
  if (hasSafetyOverride) confidence = 0.95;

  return Math.max(0.5, Math.min(1.0, confidence));
}

/**
 * Helper: Apply fatigue-based pace adjustments to workout paces
 * NEW EXPORT for Today's Training integration
 */
export function applyFatigueToPace(
  basePaceSec: number,
  fatigueScore: number
): { adjustedPaceSec: number; adjustmentPct: number; explanation: string } {
  const modifier = fatiguePaceModifier(fatigueScore);
  const adjustedPaceSec = basePaceSec * modifier;
  const adjustmentPct = (modifier - 1) * 100;

  let explanation = '';
  if (fatigueScore < 30) {
    explanation = 'No fatigue adjustment needed - training proceeding normally';
  } else if (fatigueScore < 50) {
    explanation = `Moderate fatigue detected - reduce target pace by ${adjustmentPct.toFixed(0)}%`;
  } else if (fatigueScore < 70) {
    explanation = `High fatigue accumulation - pace reduced by ${adjustmentPct.toFixed(0)}% for recovery`;
  } else {
    explanation = `Extreme fatigue - significant pace reduction (${adjustmentPct.toFixed(0)}%) recommended`;
  }

  return {
    adjustedPaceSec,
    adjustmentPct,
    explanation
  };
}
