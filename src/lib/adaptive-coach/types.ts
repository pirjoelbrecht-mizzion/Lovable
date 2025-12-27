/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — GLOBAL TYPES & INTERFACES
 *  Module 1 — Foundation
 * ======================================================================
 *
 * This module provides all TypeScript types and foundational interfaces
 * used across the Adaptive Ultra Training Engine.
 *
 * Design Note: These types are namespaced to avoid conflicts with existing
 * Mizzion types (e.g., UserProfile from onboarding). Where integration is
 * needed, adapter functions will bridge the two systems.
 */

import type { SessionOrigin, LockReason } from '../../types/session-ownership';

//
// ─────────────────────────────────────────────────────────────
//   ATHLETE PROFILE & BACKGROUND
// ─────────────────────────────────────────────────────────────
//

/** Category 1 = beginner/low volume; Category 2 = experienced/high volume */
export type AthleteCategory = "Cat1" | "Cat2";

/** Sex is optional but useful for some training load calculations */
export type AthleteSex = "male" | "female" | "other" | null;

/**
 * Complete Athlete Profile for Adaptive Coach.
 * This extends and complements the existing UserProfile from onboarding.
 * 
 * Integration: Can be derived from existing UserProfile + training history.
 */
export interface AthleteProfile {
  id?: string;                    // Supabase ID (optional)
  name?: string;

  age: number;                    // Age affects recovery + volume scaling
  sex?: AthleteSex;

  yearsTraining: number;          // Total years running or training seriously
  weeklyMileageHistory: number[]; // e.g. last 6–12 weeks
  averageMileage: number;         // Simplified metric for quick logic
  averageVertical?: number;       // Average weekly vertical gain (m)

  recentRaces: RaceResult[];      // Input used for Cat1/Cat2 classification
  longestRaceCompletedKm: number; // Useful proxy if no data

  trainingConsistency: number;    // % of planned workouts completed (0-100)
  injuryHistory?: string[];       // "achilles", "knee", etc.
  aerobicThreshold?: number;      // AeT HR (bpm)
  lactateThreshold?: number;      // LT HR (bpm)

  // Terrain & Training Preferences (from onboarding)
  surfacePreference?: "road" | "trail" | "treadmill" | "mixed";
  strengthPreference?: "none" | "base" | "mountain" | "ultra";

  // Computed by Module 2 (Athlete Profiler)
  category?: AthleteCategory;
  startMileage?: number;
  volumeCeiling?: number;
  recoveryRatio?: "2:1" | "3:1";
}

//
// ─────────────────────────────────────────────────────────────
//   RACE DEFINITIONS
// ─────────────────────────────────────────────────────────────
//

export type RaceType =
  | "50K"
  | "50M"
  | "100K"
  | "100M"
  | "200M"
  | "StageRace"
  | "Skimo"
  | "Marathon"
  | "HalfMarathon"
  | "Custom";

export type RacePriority = 'A' | 'B' | 'C';

export interface RaceEvent {
  id?: string;
  name: string;
  date: string;             // ISO date (YYYY-MM-DD)
  distanceKm: number;
  verticalGain: number;     // meters
  raceType: RaceType;
  priority?: RacePriority;  // A = goal race, B = tune-up, C = training race
  altitude?: number;        // base altitude in meters
  climate?: "hot" | "humid" | "cold" | "temperate" | "mixed";
  terrain?: "road" | "trail" | "mountain" | "mixed";
  technicalDifficulty?: "easy" | "moderate" | "hard" | "extreme";
  expectedTimeMin?: number; // Expected finish time in minutes (from GPX or user input)
}

export interface RaceResult {
  raceName: string;
  distanceKm: number;
  finishTimeHours: number | null;
  date: string;             // ISO date
  verticalGain?: number;
}

//
// ─────────────────────────────────────────────────────────────
//   TRAINING PHASES
// ─────────────────────────────────────────────────────────────
//

/**
 * Training phases for periodization.
 * Note: These align with but are distinct from existing MacrocyclePhase
 * (base_building, sharpening, etc.) for ultra-specific training logic.
 */
export type TrainingPhase =
  | "transition"    // Post-race recovery / off-season
  | "base"          // Aerobic development
  | "intensity"     // Speed & lactate threshold work
  | "specificity"   // Race-specific training (peak volume)
  | "taper"         // Pre-race freshening
  | "goal";         // Race week

export interface MacrocycleWeek {
  weekNumber: number;       // Week 1, 2, 3... in the plan
  phase: TrainingPhase;
  startDate: string;        // ISO date
  endDate: string;          // ISO date
  phaseWeek?: number;       // Week within this phase (e.g., week 2 of base)
}

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT DEFINITIONS
// ─────────────────────────────────────────────────────────────
//

/**
 * Comprehensive workout types for ultra training.
 * More granular than existing Focus enum for advanced adaptations.
 */
export type WorkoutType =
  | "easy"                  // Easy aerobic run
  | "aerobic"               // Steady Z1-Z2 effort
  | "long"                  // Long run (primary endurance builder)
  | "backToBack"            // Back-to-back long days
  | "tempo"                 // Comfortably hard Z3 effort
  | "threshold"             // Lactate threshold Z4
  | "vo2"                   // VO2max intervals Z4-Z5
  | "hill_sprints"          // Short powerful hill efforts (10-30s)
  | "hill_repeats"          // Longer hill intervals (2-5 min)
  | "muscular_endurance"    // ME sessions (weighted climbs, etc.)
  | "strength"              // Gym/bodyweight strength work
  | "cross_train"           // Bike, swim, elliptical, ski
  | "rest"                  // Complete rest
  | "shakeout"              // Very short easy run (pre-race)
  | "race_pace"             // Sustained goal race effort
  | "speed_play"            // Fartlek / unstructured speed
  | "hike"                  // Training hike (with or without weight)
  | "skimo"                 // Ski mountaineering session
  | "heat_adaptation"       // Heat acclimation protocol
  | "overnight"             // Night training (for 200M prep)
  | "simulation";           // Race simulation effort

export interface Workout {
  id?: string;
  type: WorkoutType;
  title: string;            // e.g., "Easy Morning Run"

  /** Duration OR distance — engine will interpret based on phase */
  durationMin?: number;
  durationRange?: [number, number]; // e.g., [45, 60] minutes

  distanceKm?: number;
  distanceRange?: [number, number]; // e.g., [12, 16] km

  verticalGain?: number | null; // planned vert focus (meters)
  verticalRange?: [number, number]; // e.g., [200, 400] m

  /** Intensity zones (can be multiple for structured workouts) */
  intensityZones?: ("Z1" | "Z2" | "Z3" | "Z4" | "Z5")[];
  
  /** Workout structure (for intervals, etc.) */
  structure?: {
    warmup?: number;        // minutes
    cooldown?: number;      // minutes
    intervals?: {
      work: number;         // minutes or km
      rest: number;         // minutes or km
      reps: number;
      intensity: string;    // e.g., "5K pace", "VO2max"
    }[];
  };

  description?: string;     // Detailed instructions
  purpose?: string;         // Educational: why this workout?

  /** Flags used by adaptive logic */
  isHard?: boolean;         // Counts as key workout
  isOptional?: boolean;     // Can be skipped if needed
  isKeyWorkout?: boolean;   // Critical session of the week

  /** Workout substitutions */
  crossTrainAlternative?: string; // e.g., "60 min bike ride"
  notes?: string;                 // Coach notes

  /**
   * ======================================================================
   * STEP 2B: OWNERSHIP & PROTECTION METADATA
   * ======================================================================
   *
   * These fields control adaptive engine behavior:
   * - origin: Who created this workout? (BASE_PLAN, USER, ADAPTIVE, etc.)
   * - locked: Can adaptive engine delete this? (false = can modify/delete)
   * - lockReason: Why is this locked? (undefined if not locked)
   *
   * CRITICAL RULES:
   * - ALWAYS set origin explicitly (never infer from context)
   * - Initial state: locked = false, lockReason = undefined
   * - Origin determines delete authority (adaptive can't delete BASE_PLAN)
   * - Lock mechanism is separate from origin (allows ADAPTIVE to lock later)
   *
   * Types imported from: /src/types/session-ownership.ts (canonical source)
   */
  origin?: SessionOrigin;      // Who created this workout
  locked?: boolean;            // Protected from deletion (default: false)
  lockReason?: LockReason;     // Why locked (undefined = not locked)
}

//
// ─────────────────────────────────────────────────────────────
//   DAILY & WEEKLY PLAN STRUCTURES
// ─────────────────────────────────────────────────────────────
//
// 🚧 MIGRATION NOTE:
// DailyPlan is being migrated from single-workout to multi-session model
// See /src/types/training.ts for the canonical multi-session types
// DO NOT assume one workout per day in new code
//

/**
 * Daily Plan - ONE DAY in the weekly plan
 *
 * ⚠️ MIGRATION IN PROGRESS:
 * This currently uses `workout: Workout` (singular) which causes data loss
 * when a day has multiple sessions (run + strength, run + core, etc.)
 *
 * Target structure: `sessions: Workout[]`
 *
 * Until migration is complete:
 * - This field represents the PRIMARY session only
 * - Additional sessions may exist in localStorage but are lost during adaptation
 * - DO NOT write code that assumes this is the only session
 *
 * See /src/types/training.ts for the canonical TrainingDay interface
 */
export interface DailyPlan {
  day: string;              // "Mon", "Tue", etc.
  date: string;             // ISO date (YYYY-MM-DD)
  sessions: Workout[];      // ✅ MIGRATION COMPLETE: Array of sessions (was `workout`)
  completed?: boolean;      // Has athlete completed this?
  actualPerformance?: {     // Logged performance
    distanceKm?: number;
    durationMin?: number;
    verticalGain?: number;
    hrAvg?: number;
    rpe?: number;           // 1-10
  };
  overridden?: boolean;     // If user edits manually
  overrideReason?: string;
}

export interface WeeklyPlan {
  weekNumber: number;
  phase: TrainingPhase;

  targetMileage: number;    // km
  targetVert: number;       // meters
  targetTime?: number;      // minutes (for time-based plans)

  days: DailyPlan[];

  /** Summary stats */
  actualMileage?: number;
  actualVert?: number;
  completionRate?: number;  // % of workouts completed

  notes?: string[];         // General week notes (can be multiple)

  /** Will be filled by explain.ts */
  explanation?: string;     // Why this week looks like this
  adjustmentReason?: string; // Why plan was modified
  adaptationNote?: string;  // Note about adaptations made
}

//
// ─────────────────────────────────────────────────────────────
//   FEEDBACK INPUT (DAILY + WEEKLY)
// ─────────────────────────────────────────────────────────────
//

export interface DailyFeedback {
  date: string;             // ISO date
  workoutId?: string;       // Reference to planned workout

  rpe?: number;             // Rate of Perceived Exertion (1–10)
  fatigueLevel?: number;    // Fatigue level (1–10) - alias for fatigue
  fatigue?: number;         // Fatigue level (1–10)
  muscleAches?: number;     // Muscle aches/soreness (1–10)
  soreness?: number;        // Muscle soreness (1–10)
  sleepHours?: number;      // Hours slept
  sleepQuality?: number;    // 1–10
  mood?: number;            // 1–10
  stress?: number;          // Life stress level (1–10)
  motivation?: number;      // 1–10
  completionRate?: number;  // 0–1 (percentage of workout completed)
  overallFeeling?: number;  // 1–10 overall feeling
  injuryNotes?: string;     // Injury or pain notes
  hrv?: number;             // Heart rate variability

  /** Pain map - specific body areas */
  pain?: {
    knee?: number;          // 0–10 pain scale
    ankle?: number;
    hip?: number;
    foot?: number;
    achilles?: number;
    shin?: number;
    quad?: number;
    calf?: number;
    back?: number;
    other?: string;         // Free text for other areas
  };

  hrAvg?: number;           // Average HR if available
  hrMax?: number;           // Max HR during workout
  morningHR?: number;       // Resting HR (for HRV proxy)

  notes?: string;           // Free text feedback
}

export interface WeeklyFeedback {
  weekNumber: number;
  weekStartDate: string;    // ISO date

  overallFatigue: number;       // 1–10 (weekly average)
  soreness: number;             // 1–10
  motivation: number;           // 1–10
  sleepQuality: number;         // 1–10 (average)
  stress: number;               // 1–10

  missedWorkouts: number;       // Count of skipped sessions
  missedWorkoutReasons?: string[]; // Why workouts were missed

  injuryFlags?: boolean;        // Any injury concerns?
  injuryDescription?: string;

  comments?: string;            // Athlete's overall week reflection

  /** Signals training phase readiness */
  perceivedReadiness: number;   // 1–10 (ready for harder training?)

  /** Performance highlights */
  breakthroughWorkouts?: string[]; // Workouts that felt great
  struggledWorkouts?: string[];    // Workouts that were tough
}

//
// ─────────────────────────────────────────────────────────────
//   SAFETY FLAGS & MONITORING
// ─────────────────────────────────────────────────────────────
//

export interface SafetyStatus {
  overtrainingRisk: boolean;      // Chronic high fatigue
  injuryRisk: boolean;            // Pain patterns detected
  excessiveFatigue: boolean;      // Acute fatigue spike
  excessiveVert: boolean;         // Too much climbing too fast
  excessiveMileageJump: boolean;  // >10% weekly increase
  taperViolation: boolean;        // Too much volume in taper
  intensityOverload: boolean;     // Too many hard sessions
  recoveryDeficit: boolean;       // Insufficient easy days

  /** Quantified risk scores (0-100) */
  riskScores?: {
    overtraining: number;
    injury: number;
    burnout: number;
  };
}

//
// ─────────────────────────────────────────────────────────────
//   ADAPTATION OUTPUTS (CONTROL MODULE RETURNS THESE)
// ─────────────────────────────────────────────────────────────
//

export interface AdaptationDirective {
  // Volume adjustments
  adjustMileage?: number;           // + or - km
  adjustVert?: number;              // + or - meters
  adjustTime?: number;              // + or - minutes

  // Workout modifications
  replaceWorkouts?: string[];       // ids/types to replace
  swapToEasy?: string[];            // Convert these to easy runs
  swapToCrossTrain?: string[];      // Convert to cross-training
  removeWorkouts?: string[];        // Skip entirely

  // Phase/structure changes
  insertRecoveryWeek?: boolean;
  extendPhase?: boolean;
  shortenPhase?: boolean;
  startTaperEarly?: boolean;
  delayIntensity?: boolean;

  // Intensity modifications
  reduceIntensity?: boolean;
  increaseIntensity?: boolean;
  maintainIntensity?: boolean;

  // Special protocols
  flagInjuryProtocol?: boolean;
  activateHeatProtocol?: boolean;
  activateAltitudeProtocol?: boolean;
  
  // Communication
  provideWarning?: string;
  encouragement?: string;
  education?: string;               // Training concept to teach

  // Reasoning (for transparency)
  reason: string;
  confidence?: number;              // 0-1 (how sure is the AI?)
}

//
// ─────────────────────────────────────────────────────────────
//   TRAINING LOAD & PROGRESSION METRICS
// ─────────────────────────────────────────────────────────────
//

export interface TrainingLoad {
  // Time windows
  last7DaysKm: number;
  last28DaysKm: number;
  last7DaysVert: number;
  last28DaysVert: number;

  // ACWR (Acute:Chronic Workload Ratio)
  acwr: number;                     // Typical range: 0.8 - 1.5
  acwrStatus: "low" | "optimal" | "high" | "extreme";

  // Training impulse
  weeklyTrimp?: number;             // Training Impulse score
  chronicTrimp?: number;            // 4-week average

  // Monotony & strain
  monotony?: number;                // Variation in daily load
  strain?: number;                  // Load × monotony

  // Progression
  weekOverWeekChange: number;       // % change from last week
  isOverreaching: boolean;
}

//
// ─────────────────────────────────────────────────────────────
//   OPENAI INTERACTION SCHEMAS
// ─────────────────────────────────────────────────────────────
//

export interface ExplanationRequest {
  previousPlan?: WeeklyPlan;
  newPlan: WeeklyPlan;
  athlete: AthleteProfile;
  feedback?: WeeklyFeedback;
  adaptationDirective?: AdaptationDirective;
  trainingLoad?: TrainingLoad;
}

export interface ExplanationResponse {
  summary: string;          // "I reduced volume due to fatigue..."
  dailyNotes: string[];     // One per day
  warnings?: string[];      // Safety warnings
  encouragement?: string;   // Motivational message
  education?: string;       // Training concept explanation
}

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT LIBRARY STRUCTURE
// ─────────────────────────────────────────────────────────────
//

export interface WorkoutLibraryEntry {
  id: string;
  type: WorkoutType;
  phase: TrainingPhase[];   // Which phases this workout applies to
  category: AthleteCategory[]; // Which athlete categories can do this
  raceTypes: RaceType[];    // Which race types this supports

  template: Workout;        // Base template (will be personalized)

  variations?: {            // Optional variations by intensity
    easy?: Partial<Workout>;
    moderate?: Partial<Workout>;
    hard?: Partial<Workout>;
  };

  prerequisites?: {         // Requirements to do this workout
    minWeeklyMileage?: number;
    minTrainingAge?: number; // weeks of consistent training
    fitnessLevel?: "low" | "medium" | "high";
  };
}

//
// ─────────────────────────────────────────────────────────────
//   HELPER TYPES & UTILITIES
// ─────────────────────────────────────────────────────────────
//

/**
 * Recovery cycle ratios.
 * 2:1 = 2 weeks building, 1 week recovery
 * 3:1 = 3 weeks building, 1 week recovery
 */
export type RecoveryRatio = "2:1" | "3:1" | "4:1";

/**
 * Training zones (standard 5-zone model)
 */
export type Zone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5";

/**
 * Phase transition readiness assessment
 */
export interface PhaseReadiness {
  currentPhase: TrainingPhase;
  nextPhase: TrainingPhase;
  isReady: boolean;
  readinessScore: number;       // 0-100
  blockers?: string[];          // What's preventing transition
  greenLights?: string[];       // Positive indicators
}

/**
 * Complete training plan (macrocycle to microcycle)
 */
export interface CompletePlan {
  athlete: AthleteProfile;
  race: RaceEvent;
  macrocycle: MacrocycleWeek[];
  weeklyPlans: WeeklyPlan[];
  startDate: string;
  raceDate: string;
  totalWeeks: number;
  currentWeek: number;
  
  metadata: {
    createdAt: string;
    lastUpdated: string;
    version: string;
    adaptationCount: number;  // How many times plan has adapted
  };
}

//
// ─────────────────────────────────────────────────────────────
//   CONSTANTS & DEFAULTS
// ─────────────────────────────────────────────────────────────
//

export const PHASE_COLORS: Record<TrainingPhase, string> = {
  transition: "#10B981",    // Green
  base: "#00BFC2",          // Cyan
  intensity: "#FBBF24",     // Amber
  specificity: "#F97316",   // Orange
  taper: "#EF4444",         // Red
  goal: "#8B5CF6",          // Purple
};

export const PHASE_NAMES: Record<TrainingPhase, string> = {
  transition: "Transition / Recovery",
  base: "Base Building",
  intensity: "Intensity Block",
  specificity: "Race Specificity",
  taper: "Taper",
  goal: "Race Week",
};

export const SAFE_ACWR_RANGE = {
  min: 0.8,
  max: 1.3,
  optimal: 1.0,
};

export const MAX_WEEKLY_INCREASE_PCT = 10; // Conservative 10% rule

export const TAPER_DURATION_WEEKS: Record<RaceType, number> = {
  "50K": 2,
  "50M": 2,
  "100K": 2,
  "100M": 3,
  "200M": 3,
  "StageRace": 2,
  "Skimo": 1,
  "Marathon": 2,
  "HalfMarathon": 1.5,
  "Custom": 2,
};
