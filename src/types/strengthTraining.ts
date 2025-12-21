export type METype =
  | 'gym_based'
  | 'outdoor_steep'
  | 'outdoor_weighted'
  | 'treadmill_stairs'
  | 'skierg_upper';

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
  meCategory: string;
  terrainRequirement?: string;
  durationMinutes: number;
  description?: string;
  exercises: MESessionExercise[];
  restProtocol: {
    between_sets_seconds: number;
    between_exercises_seconds: number;
  };
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
