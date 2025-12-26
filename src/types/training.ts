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
 * Session priority - determines adaptation behavior
 */
export type SessionPriority =
  | 'primary'      // Main workout - never remove, can reduce distance
  | 'secondary'    // Support workout - can reduce or remove if overloaded
  | 'support';     // Optional workout - can skip if fatigued

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
   * Metadata
   */
  title?: string;
  description?: string;
  notes?: string;
  completed?: boolean;
  source?: 'coach' | 'user' | 'template';
}

/**
 * Training day - container for sessions
 *
 * RULES:
 * - Days hold multiple sessions
 * - Days have no type - only their sessions have types
 * - Days are NOT analyzed as a unit - sessions are
 */
export interface TrainingDay {
  date: string;  // YYYY-MM-DD
  sessions: TrainingSession[];

  /**
   * Aggregated metrics (computed from sessions)
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
  sessionsRemoved: string[];    // Should be EMPTY for primary sessions
}
