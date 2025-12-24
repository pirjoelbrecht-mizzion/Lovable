export type METype =
  | 'gym_based'
  | 'outdoor_steep'
  | 'outdoor_weighted'
  | 'treadmill_stairs'
  | 'skierg_upper'
  | 'maintenance';

export type CoreCategory =
  | 'anti_extension'
  | 'anti_rotation'
  | 'lateral_stability'
  | 'hip_core_linkage';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type EccentricLoad = 'low' | 'moderate' | 'high';
export type MECategory = 'gym_lower' | 'skimo_upper' | 'maintenance' | 'outdoor_hills' | 'indoor_steep';
export type MEPhase = 'foundation' | 'loading' | 'density' | 'maintenance';
export type UpperBodyEligibilityType = 'full' | 'maintenance' | 'none';

export interface CoreExercise {
  id: string;
  name: string;
  coreCategories: CoreCategory[];
  difficulty: ExerciseDifficulty;
  eccentricLoad: EccentricLoad;
  equipment: string[];
  contraindications: string[];
  techniqueCues: string[];
  videoUrl?: string;
  durationSeconds?: number;
  repsDefault?: number;
  description?: string;
}

export interface UpperBodyEligibility {
  eligible: boolean;
  type: UpperBodyEligibilityType;
  reason: string;
}

export interface CoreEmphasis {
  primary: CoreCategory;
  secondary: CoreCategory;
  tertiary: CoreCategory;
  adjustments?: string[];
}

export interface CoreFrequencyConfig {
  frequency: number;
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'maintenance' | 'light' | 'activation' | 'optional';
}

export interface UserCoreProgress {
  id: string;
  userId: string;
  currentEmphasis: CoreCategory[];
  sessionsThisWeek: number;
  lastSessionDate?: string;
  sorenessLevel?: number;
  sorenessReportedAt?: string;
  volumeAdjustmentPercent: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserMEProgress {
  id: string;
  userId: string;
  category: MECategory;
  currentWorkoutNumber: number;
  lastSessionDate?: string;
  totalSessionsCompleted: number;
  currentLoadPercent: number;
  currentRestSeconds: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MEProgressionState {
  currentWorkoutNumber: number;
  lastSessionDate?: string;
  daysSinceLastSession: number | null;
  progressionAction: 'advance' | 'repeat' | 'regress' | 'restart';
  targetWorkoutNumber: number;
  reason: string;
}

export interface CoreSessionHistory {
  id: string;
  userId: string;
  completedAt: string;
  durationMinutes?: number;
  emphasisCategories: CoreCategory[];
  exercisesCompleted: { name: string; sets?: number; reps?: number; duration?: number }[];
  sorenessRating?: number;
  notes?: string;
}

export interface MESessionHistory {
  id: string;
  userId: string;
  templateId?: string;
  workoutNumber: number;
  category: MECategory;
  completedAt: string;
  durationMinutes?: number;
  loadPercent?: number;
  restSeconds?: number;
  sorenessRating?: number;
  notes?: string;
}

export interface StrengthExercise {
  id: string;
  name: string;
  category: string;
  exerciseType: string;
  targetMuscles: string[];
  techniqueCues: string[];
  videoUrl?: string;
  isUpperBody: boolean;
}

export interface MESessionExercise {
  name: string;
  sets: number;
  reps: string;
  load?: string;
  notes?: string;
}

export interface MESessionTemplate {
  id: string;
  name: string;
  workoutNumber: number;
  meType: METype;
  meCategory: MECategory;
  terrainRequirement?: string;
  durationMinutes: number;
  description?: string;
  exercises: MESessionExercise[];
  restProtocol: {
    between_sets_seconds: number;
    between_exercises_seconds: number;
  };
  isUpperBody: boolean;
  phase?: MEPhase;
}

export interface UserStrengthProgress {
  userId: string;
  meCategory: string;
  currentWorkoutNumber: number;
  lastCompletedWorkout: number | null;
  lastSessionDate?: string;
  totalSessions: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SorenessRecord {
  id: string;
  userId: string;
  triggerSessionId: string | null;
  bodyAreas: { muscleGroup: string; level: number }[];
  overallSoreness: number;
  isFollowup: boolean;
  originalRecordId: string | null;
  hasPain: boolean;
  notes?: string;
  recordedAt: string;
  followupCompletedAt: string | null;
}

export interface UserTerrainAccess {
  userId: string;
  hasGymAccess: boolean;
  hasHillsAccess: boolean;
  maxHillGrade: number;
  treadmillAccess: boolean;
  stairsAccess: boolean;
  usesPoles: boolean;
  isSkimoAthlete: boolean;
  manualOverride: boolean;
  lastUpdated?: string;
}

export interface MEAssignment {
  meType: METype;
  templateId: string;
  reason: string;
  alternativeTemplates: string[];
  includeUpperBody?: boolean;
}

export interface LoadAdjustment {
  id: string;
  userId: string;
  adjustmentType: 'reduce' | 'skip' | 'modify';
  adjustmentPercent: number | null;
  reason: string;
  triggeredBy: string;
  exitCriteria: string[];
  createdAt: string;
  revertedAt?: string | null;
}

export interface StrengthLoadAdjustment extends LoadAdjustment {}

export interface LoadRegulationDecision {
  shouldAdjust: boolean;
  adjustmentType: 'reduce' | 'skip' | 'modify' | null;
  adjustmentPercent: number | null;
  reason: string;
  exitCriteria: string[];
}

export interface ProgressionDecision {
  action: 'advance' | 'repeat' | 'regress' | 'restart';
  targetWorkoutNumber: number;
  reason: string;
  daysSinceLastSession: number | null;
}

export interface CompletedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  rpe?: number;
  notes?: string;
}
