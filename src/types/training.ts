/**
 * ======================================================================
 * CANONICAL MULTI-SESSION TRAINING MODEL
 * ======================================================================
 *
 * This defines the foundational data model for multi-session training days.
 *
 * CORE PRINCIPLES:
 * 1. Days are containers only - they hold sessions
 * 2. Sessions are atomic - they are never merged or inferred
 * 3. Each session has a clear type, role, and priority
 * 4. Load is tracked per session across multiple dimensions
 * 5. Sessions are never removed - only adapted or reduced
 *
 * ======================================================================
 */

/**
 * Session types - what kind of training is this?
 */
export type SessionType =
  | 'RUN'           // Running workout
  | 'STRENGTH'      // Strength/ME training
  | 'CORE'          // Core stability work
  | 'HEAT'          // Heat acclimatization
  | 'ALTITUDE'      // Altitude training
  | 'MOBILITY';     // Mobility/recovery work

/**
 * Session role - what training system does this target?
 */
export type SessionRole =
  | 'AEROBIC_DEVELOPMENT'    // Building aerobic capacity
  | 'MUSCULAR_ENDURANCE'     // Building muscular strength/endurance
  | 'THERMOREGULATION'       // Heat/cold adaptation
  | 'RECOVERY_SUPPORT';      // Active recovery, mobility

/**
 * ======================================================================
 * SESSION OWNERSHIP TYPES
 * ======================================================================
 * Imported from canonical source: /src/types/session-ownership.ts
 * DO NOT redefine these types here - import only
 */
export type {
  SessionOrigin,
  SessionPriority,
  LockReason
} from './session-ownership';

/**
 * Multi-dimensional load profile
 * Each session contributes load across different systems
 */
export interface LoadProfile {
  cardiovascular: number;   // 0-1: HR stress, duration
  muscular: number;          // 0-1: Strength/eccentric load
  neuromuscular: number;     // 0-1: Coordination, high-speed work
  thermal: number;           // 0-1: Heat/cold stress
  mechanical: number;        // 0-1: Impact, ground contact forces
}

/**
 * Training session - atomic unit of training
 *
 * RULES:
 * - Sessions are NEVER merged
 * - Type is NEVER inferred from title/notes
 * - Sessions maintain their identity through all transformations
 */
export interface TrainingSession {
  id: string;
  type: SessionType;
  role: SessionRole;
  priority: SessionPriority;

  /**
   * Multi-dimensional load profile
   * Allows intelligent conflict resolution
   */
  loadProfile: LoadProfile;

  /**
   * Session-specific prescription
   * Structure depends on session type:
   * - RUN: { distanceKm, durationMin, zones, vertical, pace }
   * - STRENGTH: { exercises, sets, reps, load }
   * - HEAT: { duration, temperature, protocol }
   * etc.
   */
  prescription: Record<string, any>;

  /**
   * Ownership & Metadata
   * CRITICAL: Prevents adaptive engine from deleting sessions it didn't create
   */
  origin: SessionOrigin;
  locked: boolean;     // If true, cannot be removed by adaptation (only modified)
  lockReason?: LockReason;  // Why is this locked? (critical for debugging & logic)

  /**
   * Display metadata
   */
  title?: string;
  description?: string;
  notes?: string;
  completed?: boolean;
  source?: 'coach' | 'user' | 'template';  // Legacy field, will migrate to origin
}

/**
 * Training day - container for sessions
 *
 * ======================================================================
 * 🔑 CRITICAL: Sessions are first-class citizens. Days are containers only.
 * ======================================================================
 *
 * RULES:
 * - Days hold multiple sessions (0, 1, 2, or more)
 * - Days have NO TYPE - only their sessions have types
 * - Days are NOT analyzed as a unit - sessions are analyzed individually
 * - DO NOT assume sessions.length === 1
 * - DO NOT access sessions[0] without checking length
 * - DO NOT infer session type from day properties
 *
 * WRONG: day.workout or day.type
 * RIGHT: day.sessions.forEach(session => ...)
 *
 * ======================================================================
 */
export interface TrainingDay {
  date: string;  // YYYY-MM-DD
  sessions: TrainingSession[];

  /**
   * Aggregated metrics (computed from sessions)
   * These are READ-ONLY derived values
   */
  totalLoad?: LoadProfile;
  totalDuration?: number;
  totalDistance?: number;
}

/**
 * Weekly plan - collection of training days
 */
export interface TrainingWeek {
  weekNumber: number;
  startDate: string;  // Monday YYYY-MM-DD
  days: TrainingDay[];

  /**
   * Weekly totals (computed from all sessions)
   */
  totalLoad?: LoadProfile;
  totalDistance?: number;
  totalDuration?: number;
  totalVertical?: number;
}

/**
 * Adaptation result - how a session was modified
 */
export interface SessionAdaptation {
  sessionId: string;
  originalPrescription: Record<string, any>;
  adaptedPrescription: Record<string, any>;
  reason: string;
  factors: string[];  // What influenced the adaptation
}

/**
 * Daily adaptation result - all session changes for a day
 */
export interface DayAdaptation {
  date: string;
  sessionAdaptations: SessionAdaptation[];
  conflictsResolved: string[];  // List of conflicts that were resolved
  sessionsRemoved: string[];    // Should be EMPTY for primary/locked sessions
}

/**
 * ======================================================================
 * ADAPTATION OWNERSHIP RULES (NON-NEGOTIABLE)
 * ======================================================================
 *
 * The adaptive engine has LIMITED AUTHORITY over sessions:
 *
 * ✅ CAN DO:
 * - Modify prescription (distance, duration, intensity)
 * - Reduce load when fatigued
 * - Add recovery sessions (origin: ADAPTIVE)
 *
 * ❌ CANNOT DO:
 * - Delete sessions with origin !== ADAPTIVE
 * - Delete locked sessions
 * - Delete primary priority sessions
 * - Replace sessions wholesale
 * - Merge multiple sessions into one
 * - Create sessions that duplicate existing types
 *
 * CONFLICT RESOLUTION ORDER:
 * 1. Reduce support sessions first
 * 2. Reduce secondary sessions second
 * 3. Modify (but never remove) primary sessions
 * 4. Never touch locked sessions
 *
 * SESSION CREATION AUTHORITY:
 * - BASE_PLAN: microcycle distributor, plan templates
 * - USER: manual additions by user
 * - STRENGTH/HEAT/ALTITUDE: respective feature modules
 * - ADAPTIVE: only for recovery/compensation sessions
 *
 * If a session was not created by ADAPTIVE, it cannot be deleted by ADAPTIVE.
 *
 * ======================================================================
 */
