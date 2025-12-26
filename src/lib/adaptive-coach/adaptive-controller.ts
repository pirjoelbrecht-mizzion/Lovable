/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — ADAPTIVE CONTROLLER
 *  Module 7 — AI Adjustment Logic
 * ======================================================================
 *
 * This module handles dynamic plan adjustments based on:
 * - Daily/weekly feedback
 * - Fatigue accumulation
 * - Performance trends
 * - Injury risk signals
 * - Life disruptions
 *
 * The controller uses a rule-based system with severity thresholds
 * to automatically adjust training plans while respecting safety limits.
 */

import type {
  AthleteProfile,
  WeeklyPlan,
  DailyPlan,
  DailyFeedback,
  TrainingPhase,
  Workout
} from './types';
import { checkWeeklyPlanSafety, calculateSafeVolumeRange } from './safety';

/**
 * STEP 2A MIGRATION HELPER
 *
 * Safely access primary session from day.sessions array.
 * Logs warning if multiple sessions exist (which shouldn't happen yet).
 *
 * TODO: Remove this helper in STEP 3 when we properly iterate sessions.
 */
export function getPrimarySession(day: DailyPlan): Workout | undefined {
  if (!day.sessions || day.sessions.length === 0) {
    return undefined;
  }

  if (day.sessions.length > 1) {
    console.warn(`[STEP 2A] Day ${day.date} has ${day.sessions.length} sessions - using first one`, {
      date: day.date,
      sessionCount: day.sessions.length,
      types: day.sessions.map(s => s.type)
    });
  }

  return day.sessions[0];
}

/**
 * STEP 2A MIGRATION HELPER
 *
 * Replace primary session in day.sessions array.
 * Preserves other sessions if they exist.
 *
 * TODO: Remove this helper in STEP 3 when we properly handle multi-session days.
 */
export function setPrimarySession(day: DailyPlan, workout: Workout): DailyPlan {
  if (day.sessions.length > 1) {
    console.warn(`[STEP 2A] Replacing primary session but ${day.sessions.length - 1} other sessions exist`, {
      date: day.date,
      sessionCount: day.sessions.length
    });
  }

  return {
    ...day,
    sessions: [workout, ...day.sessions.slice(1)]
  };
}

export interface AdaptationSignal {
  source: 'feedback' | 'performance' | 'injury' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicator: string;
  value: number;
  threshold: number;
  recommendation: AdaptationAction;
}

export type AdaptationAction =
  | 'maintain'
  | 'reduce_volume_minor'
  | 'reduce_volume_major'
  | 'reduce_intensity'
  | 'add_rest_day'
  | 'shift_long_run'
  | 'skip_workout'
  | 'deload_week'
  | 'medical_attention';

export interface AdaptationDecision {
  action: AdaptationAction;
  signals: AdaptationSignal[];
  volumeAdjustment: number;
  explanation: string;
  urgency: 'low' | 'medium' | 'high';
}

const FATIGUE_THRESHOLDS = {
  LOW: 3,
  MEDIUM: 5,
  HIGH: 7,
  CRITICAL: 9
} as const;

const ADAPTATION_RULES = {
  CONSECUTIVE_HIGH_FATIGUE_DAYS: 3,
  PAIN_THRESHOLD: 5,
  COMPLETION_RATE_LOW: 0.7,
  COMPLETION_RATE_CRITICAL: 0.5,
  SLEEP_DEFICIT_HOURS: 1.5,
  MOTIVATION_LOW: 3,
  HRV_DROP_PERCENT: 15
} as const;

export function analyzeFeedbackSignals(
  feedback: DailyFeedback[],
  athlete: AthleteProfile
): AdaptationSignal[] {
  const signals: AdaptationSignal[] = [];

  checkFatigueAccumulation(feedback, signals);
  checkPainIndicators(feedback, signals);
  checkCompletionRate(feedback, signals);
  checkRecoveryMarkers(feedback, signals);
  checkMotivation(feedback, signals);

  return signals;
}

function checkFatigueAccumulation(
  feedback: DailyFeedback[],
  signals: AdaptationSignal[]
): void {
  if (feedback.length === 0) return;

  const recentFeedback = feedback.slice(-7);
  const avgFatigue = recentFeedback.reduce((sum, f) => sum + f.fatigueLevel, 0) / recentFeedback.length;

  if (avgFatigue >= FATIGUE_THRESHOLDS.HIGH) {
    signals.push({
      source: 'feedback',
      severity: 'high',
      indicator: 'CHRONIC_FATIGUE',
      value: avgFatigue,
      threshold: FATIGUE_THRESHOLDS.HIGH,
      recommendation: 'deload_week'
    });
  } else if (avgFatigue >= FATIGUE_THRESHOLDS.MEDIUM) {
    signals.push({
      source: 'feedback',
      severity: 'medium',
      indicator: 'ELEVATED_FATIGUE',
      value: avgFatigue,
      threshold: FATIGUE_THRESHOLDS.MEDIUM,
      recommendation: 'reduce_volume_minor'
    });
  }

  const consecutiveHighFatigue = recentFeedback
    .slice(-ADAPTATION_RULES.CONSECUTIVE_HIGH_FATIGUE_DAYS)
    .filter(f => f.fatigueLevel >= FATIGUE_THRESHOLDS.MEDIUM)
    .length;

  if (consecutiveHighFatigue === ADAPTATION_RULES.CONSECUTIVE_HIGH_FATIGUE_DAYS) {
    signals.push({
      source: 'feedback',
      severity: 'high',
      indicator: 'CONSECUTIVE_FATIGUE',
      value: consecutiveHighFatigue,
      threshold: ADAPTATION_RULES.CONSECUTIVE_HIGH_FATIGUE_DAYS,
      recommendation: 'add_rest_day'
    });
  }
}

function checkPainIndicators(
  feedback: DailyFeedback[],
  signals: AdaptationSignal[]
): void {
  const recentFeedback = feedback.slice(-7);
  const avgPain = recentFeedback.reduce((sum, f) => sum + (f.muscleAches || 0), 0) / recentFeedback.length;

  if (avgPain >= ADAPTATION_RULES.PAIN_THRESHOLD) {
    signals.push({
      source: 'injury',
      severity: 'critical',
      indicator: 'ELEVATED_PAIN',
      value: avgPain,
      threshold: ADAPTATION_RULES.PAIN_THRESHOLD,
      recommendation: 'medical_attention'
    });
  }

  const hasInjuryNote = recentFeedback.some(f =>
    f.injuryNotes && f.injuryNotes.toLowerCase().includes('pain')
  );

  if (hasInjuryNote) {
    signals.push({
      source: 'injury',
      severity: 'high',
      indicator: 'INJURY_REPORTED',
      value: 1,
      threshold: 1,
      recommendation: 'reduce_volume_major'
    });
  }
}

function checkCompletionRate(
  feedback: DailyFeedback[],
  signals: AdaptationSignal[]
): void {
  const recentFeedback = feedback.slice(-7);
  const avgCompletion = recentFeedback.reduce((sum, f) => sum + (f.completionRate || 1), 0) / recentFeedback.length;

  if (avgCompletion < ADAPTATION_RULES.COMPLETION_RATE_CRITICAL) {
    signals.push({
      source: 'performance',
      severity: 'high',
      indicator: 'LOW_COMPLETION_RATE',
      value: avgCompletion,
      threshold: ADAPTATION_RULES.COMPLETION_RATE_CRITICAL,
      recommendation: 'reduce_volume_major'
    });
  } else if (avgCompletion < ADAPTATION_RULES.COMPLETION_RATE_LOW) {
    signals.push({
      source: 'performance',
      severity: 'medium',
      indicator: 'MODERATE_COMPLETION_RATE',
      value: avgCompletion,
      threshold: ADAPTATION_RULES.COMPLETION_RATE_LOW,
      recommendation: 'reduce_volume_minor'
    });
  }
}

function checkRecoveryMarkers(
  feedback: DailyFeedback[],
  signals: AdaptationSignal[]
): void {
  const recentFeedback = feedback.slice(-7);

  const avgSleepQuality = recentFeedback.reduce((sum, f) => sum + (f.sleepQuality || 5), 0) / recentFeedback.length;

  if (avgSleepQuality <= 3) {
    signals.push({
      source: 'feedback',
      severity: 'medium',
      indicator: 'POOR_SLEEP',
      value: avgSleepQuality,
      threshold: 3,
      recommendation: 'reduce_intensity'
    });
  }

  const hrvReadings = recentFeedback
    .filter(f => f.hrv !== undefined)
    .map(f => f.hrv!);

  if (hrvReadings.length >= 3) {
    const baseline = hrvReadings.slice(0, -3).reduce((a, b) => a + b, 0) / (hrvReadings.length - 3) || hrvReadings[0];
    const recent = hrvReadings.slice(-3).reduce((a, b) => a + b, 0) / 3;

    const dropPercent = ((baseline - recent) / baseline) * 100;

    if (dropPercent >= ADAPTATION_RULES.HRV_DROP_PERCENT) {
      signals.push({
        source: 'feedback',
        severity: 'high',
        indicator: 'HRV_DROP',
        value: dropPercent,
        threshold: ADAPTATION_RULES.HRV_DROP_PERCENT,
        recommendation: 'add_rest_day'
      });
    }
  }
}

function checkMotivation(
  feedback: DailyFeedback[],
  signals: AdaptationSignal[]
): void {
  const recentFeedback = feedback.slice(-7);
  const avgMotivation = recentFeedback.reduce((sum, f) => sum + (f.motivation || 5), 0) / recentFeedback.length;

  if (avgMotivation <= ADAPTATION_RULES.MOTIVATION_LOW) {
    signals.push({
      source: 'feedback',
      severity: 'low',
      indicator: 'LOW_MOTIVATION',
      value: avgMotivation,
      threshold: ADAPTATION_RULES.MOTIVATION_LOW,
      recommendation: 'reduce_intensity'
    });
  }
}

export function makeAdaptationDecision(
  signals: AdaptationSignal[],
  currentPlan: WeeklyPlan,
  athlete: AthleteProfile
): AdaptationDecision {
  if (signals.length === 0) {
    return {
      action: 'maintain',
      signals: [],
      volumeAdjustment: 0,
      explanation: 'No adaptation signals detected. Maintain current plan.',
      urgency: 'low'
    };
  }

  const criticalSignals = signals.filter(s => s.severity === 'critical');
  const highSignals = signals.filter(s => s.severity === 'high');
  const mediumSignals = signals.filter(s => s.severity === 'medium');

  if (criticalSignals.length > 0) {
    return {
      action: 'medical_attention',
      signals: criticalSignals,
      volumeAdjustment: -0.5,
      explanation: `Critical indicators detected: ${criticalSignals.map(s => s.indicator).join(', ')}. Recommend medical consultation and significant volume reduction.`,
      urgency: 'high'
    };
  }

  if (highSignals.length >= 2 || highSignals.some(s => s.indicator === 'INJURY_REPORTED')) {
    return {
      action: 'deload_week',
      signals: highSignals,
      volumeAdjustment: -0.3,
      explanation: `Multiple high-severity signals. Implementing deload week with 30% volume reduction.`,
      urgency: 'high'
    };
  }

  if (highSignals.length === 1) {
    const signal = highSignals[0];
    return {
      action: signal.recommendation,
      signals: [signal],
      volumeAdjustment: -0.2,
      explanation: `${signal.indicator} detected. Implementing ${signal.recommendation} with 20% volume reduction.`,
      urgency: 'medium'
    };
  }

  if (mediumSignals.length >= 2) {
    return {
      action: 'reduce_volume_minor',
      signals: mediumSignals,
      volumeAdjustment: -0.1,
      explanation: `Multiple medium-severity signals. Reducing volume by 10% for recovery.`,
      urgency: 'medium'
    };
  }

  if (mediumSignals.length === 1) {
    const signal = mediumSignals[0];
    return {
      action: signal.recommendation,
      signals: [signal],
      volumeAdjustment: -0.1,
      explanation: `${signal.indicator} detected. Minor adjustment recommended.`,
      urgency: 'low'
    };
  }

  return {
    action: 'maintain',
    signals: signals,
    volumeAdjustment: 0,
    explanation: 'Low-severity signals only. Monitoring but maintaining plan.',
    urgency: 'low'
  };
}

export function applyAdaptation(
  plan: WeeklyPlan,
  decision: AdaptationDecision,
  athlete: AthleteProfile
): WeeklyPlan {
  let adaptedPlan = { ...plan };

  switch (decision.action) {
    case 'maintain':
      return plan;

    case 'reduce_volume_minor':
    case 'reduce_volume_major':
      adaptedPlan = reduceWeeklyVolume(plan, decision.volumeAdjustment, athlete);
      break;

    case 'reduce_intensity':
      adaptedPlan = reduceIntensity(plan);
      break;

    case 'add_rest_day':
      adaptedPlan = addRestDay(plan);
      break;

    case 'deload_week':
      adaptedPlan = createDeloadWeek(plan, athlete);
      break;

    case 'skip_workout':
      adaptedPlan = skipNextHardWorkout(plan);
      break;

    case 'shift_long_run':
      adaptedPlan = shiftLongRun(plan);
      break;

    case 'medical_attention':
      adaptedPlan = createRecoveryWeek(plan);
      break;
  }

  adaptedPlan.adaptationNote = decision.explanation;

  const safetyCheck = checkWeeklyPlanSafety(adaptedPlan, athlete);
  if (!safetyCheck.passed) {
    adaptedPlan.notes = [
      ...(adaptedPlan.notes || []),
      'Safety check warnings: ' + safetyCheck.violations.map(v => v.message).join('; ')
    ];
  }

  return adaptedPlan;
}

function reduceWeeklyVolume(
  plan: WeeklyPlan,
  reductionPercent: number,
  athlete: AthleteProfile
): WeeklyPlan {
  const targetMileage = (plan.actualMileage || 0) * (1 + reductionPercent);

  const modifiedDays = plan.days.map(day => {
    const workout = getPrimarySession(day);
    if (!workout || workout.type === 'rest') return day;

    return setPrimarySession(day, {
      ...workout,
      distanceKm: Math.round(workout.distanceKm * (1 + reductionPercent) * 10) / 10,
      durationMinutes: Math.round(workout.durationMinutes * (1 + reductionPercent))
    });
  });

  return {
    ...plan,
    days: modifiedDays,
    actualMileage: targetMileage,
    adaptationNote: `Volume reduced by ${Math.abs(reductionPercent * 100).toFixed(0)}%`
  };
}

function reduceIntensity(plan: WeeklyPlan): WeeklyPlan {
  const modifiedDays = plan.days.map(day => {
    const workout = getPrimarySession(day);
    if (!workout) return day;

    if (workout.intensity === 'high') {
      return {
        ...setPrimarySession(day, {
          ...workout,
          intensity: 'medium' as const,
          description: `${workout.description} (intensity reduced)`
        }),
        rationale: 'Intensity reduced for recovery'
      };
    }

    return day;
  });

  return {
    ...plan,
    days: modifiedDays,
    adaptationNote: 'High-intensity workouts converted to moderate intensity'
  };
}

function addRestDay(plan: WeeklyPlan): WeeklyPlan {
  const easyDayIndex = plan.days.findIndex(d => {
    const workout = getPrimarySession(d);
    return workout && workout.intensity === 'low' && workout.type !== 'long';
  });

  if (easyDayIndex === -1) return plan;

  const modifiedDays = [...plan.days];
  modifiedDays[easyDayIndex] = {
    ...modifiedDays[easyDayIndex],
    sessions: [],
    rationale: 'Converted to rest day based on recovery needs'
  };

  return {
    ...plan,
    days: modifiedDays,
    adaptationNote: 'Added rest day for recovery'
  };
}

function createDeloadWeek(plan: WeeklyPlan, athlete: AthleteProfile): WeeklyPlan {
  const deloadVolume = (plan.actualMileage || 0) * 0.7;

  const modifiedDays = plan.days.map(day => {
    const workout = getPrimarySession(day);
    if (!workout || workout.type === 'rest') return day;

    if (workout.intensity === 'high') {
      return setPrimarySession(day, {
        ...workout,
        intensity: 'medium' as const,
        distanceKm: workout.distanceKm * 0.7,
        durationMinutes: Math.round(workout.durationMinutes * 0.7)
      });
    }

    return setPrimarySession(day, {
      ...workout,
      distanceKm: workout.distanceKm * 0.7,
      durationMinutes: Math.round(workout.durationMinutes * 0.7)
    });
  });

  return {
    ...plan,
    days: modifiedDays,
    actualMileage: deloadVolume,
    adaptationNote: 'Deload week: 30% volume reduction, intensity moderated'
  };
}

function skipNextHardWorkout(plan: WeeklyPlan): WeeklyPlan {
  const hardDayIndex = plan.days.findIndex(d =>
    d.workout && d.workout.intensity === 'high'
  );

  if (hardDayIndex === -1) return plan;

  const modifiedDays = [...plan.days];
  modifiedDays[hardDayIndex] = {
    ...modifiedDays[hardDayIndex],
    workout: {
      type: 'easy' as const,
      intensity: 'low' as const,
      distanceKm: modifiedDays[hardDayIndex].workout!.distanceKm * 0.5,
      durationMinutes: Math.round(modifiedDays[hardDayIndex].workout!.durationMinutes * 0.5),
      description: 'Easy recovery run (hard workout skipped)',
      purpose: 'Recovery and adaptation'
    },
    rationale: 'Hard workout replaced with easy recovery run'
  };

  return {
    ...plan,
    days: modifiedDays,
    adaptationNote: 'Next hard workout converted to easy run'
  };
}

function shiftLongRun(plan: WeeklyPlan): WeeklyPlan {
  const longRunIndex = plan.days.findIndex(d =>
    d.workout && d.workout.type === 'long'
  );

  if (longRunIndex === -1 || longRunIndex === plan.days.length - 1) return plan;

  const modifiedDays = [...plan.days];
  const longRunDay = modifiedDays[longRunIndex];

  [modifiedDays[longRunIndex], modifiedDays[longRunIndex + 1]] =
    [modifiedDays[longRunIndex + 1], modifiedDays[longRunIndex]];

  return {
    ...plan,
    days: modifiedDays,
    adaptationNote: 'Long run shifted to next day for better recovery'
  };
}

function createRecoveryWeek(plan: WeeklyPlan): WeeklyPlan {
  const modifiedDays = plan.days.map((day, i) => {
    if (i % 2 === 0) {
      return {
        ...day,
        sessions: [],
        rationale: 'Rest day for recovery'
      };
    }

    const workout = getPrimarySession(day);
    return {
      ...day,
      sessions: workout ? [{
        type: 'easy' as const,
        intensity: 'low' as const,
        distanceKm: Math.min(workout.distanceKm * 0.4, 8),
        durationMinutes: Math.round(Math.min(workout.durationMinutes * 0.4, 60)),
        description: 'Very easy recovery run',
        purpose: 'Active recovery'
      }] : [],
      rationale: 'Recovery focus week'
    };
  });

  return {
    ...plan,
    days: modifiedDays,
    actualMileage: (plan.actualMileage || 0) * 0.4,
    adaptationNote: 'Recovery week - alternating rest and very easy runs'
  };
}

export function assessOverallReadiness(
  athlete: AthleteProfile,
  recentFeedback: DailyFeedback[]
): { ready: boolean; score: number; blockers: string[] } {
  const signals = analyzeFeedbackSignals(recentFeedback, athlete);

  const criticalCount = signals.filter(s => s.severity === 'critical').length;
  const highCount = signals.filter(s => s.severity === 'high').length;

  if (criticalCount > 0) {
    return {
      ready: false,
      score: 20,
      blockers: signals.filter(s => s.severity === 'critical').map(s => s.indicator)
    };
  }

  if (highCount >= 2) {
    return {
      ready: false,
      score: 40,
      blockers: signals.filter(s => s.severity === 'high').map(s => s.indicator)
    };
  }

  const score = Math.max(0, 100 - (criticalCount * 40 + highCount * 20 + signals.length * 5));

  return {
    ready: score >= 70,
    score,
    blockers: score < 70 ? signals.map(s => s.indicator) : []
  };
}
