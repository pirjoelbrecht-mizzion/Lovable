export type FeedbackType =
  | 'training_normal'
  | 'training_key_workout'
  | 'race_simulation'
  | 'race'
  | 'dnf';

export type EventType = 'race' | 'simulation' | 'time_trial';

export type CompletionStatus = 'completed' | 'dnf' | 'dns';

export type LimiterType =
  | 'legs'
  | 'stomach'
  | 'heat'
  | 'pacing'
  | 'mindset'
  | 'equipment'
  | 'other';

export type DNFCause =
  | 'injury'
  | 'heat'
  | 'stomach'
  | 'pacing'
  | 'mental'
  | 'equipment'
  | 'other';

export type SessionImportance =
  | 'normal'
  | 'key_workout'
  | 'long_run'
  | 'heat_session'
  | 'back_to_back';

export interface DifficultyRatings {
  climbing: number;
  downhills: number;
  heat: number;
  technicality: number;
}

export interface RaceFeedback {
  id?: string;
  user_id: string;
  log_entry_id?: string;
  event_date: string;
  event_type: EventType;
  climbing_difficulty?: number;
  downhill_difficulty?: number;
  heat_perception?: number;
  technicality?: number;
  biggest_limiter?: LimiterType;
  limiter_notes?: string;
  fuel_log?: string;
  issues_start_km?: number;
  strongest_performance_area?: string;
  completion_status: CompletionStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DNFEvent {
  id?: string;
  user_id: string;
  log_entry_id?: string;
  event_date: string;
  dnf_cause: DNFCause;
  dnf_cause_notes?: string;
  km_stopped: number;
  had_warning_signs: boolean;
  what_would_change?: string;
  what_went_well?: string;
  auto_detected: boolean;
  user_confirmed: boolean;
  detection_confidence?: number;
  recovery_protocol_activated_at?: string;
  recovery_protocol_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackWeight {
  id: string;
  feedback_type: FeedbackType;
  weight_multiplier: number;
  description?: string;
  created_at: string;
}

export const FEEDBACK_WEIGHTS: Record<FeedbackType, number> = {
  training_normal: 1.0,
  training_key_workout: 1.5,
  race_simulation: 3.0,
  race: 5.0,
  dnf: 8.0,
};

export interface ExtendedDailyFeedback {
  id?: string;
  user_id: string;
  date: string;
  session_importance?: SessionImportance;
  feedback_prompted: boolean;
  feedback_weight_multiplier: number;
  feel?: number;
  effort?: number;
  fatigue?: number;
  sleep_quality?: number;
  pain_location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackPromptCriteria {
  shouldPrompt: boolean;
  reason: string;
  sessionImportance: SessionImportance;
  modalType: 'training' | 'race' | 'dnf' | 'none';
}

export interface DNFDetectionResult {
  detected: boolean;
  confidence: number;
  reason: string;
  suggestedModal: 'dnf' | 'race' | 'none';
}

export interface FeedbackImpact {
  feedbackType: FeedbackType;
  weight: number;
  modelsUpdated: string[];
  confidenceChange: number;
  adaptationsTriggered: string[];
}

export interface WeightedFeedbackInsight {
  sourceType: FeedbackType;
  confidence: number;
  weight: number;
  insight: string;
  date: string;
  affectedModels: string[];
}

export interface FeedbackCompletionStats {
  totalKeySessions: number;
  feedbackCollected: number;
  completionRate: number;
  missingSessions: Array<{
    date: string;
    sessionType: string;
    importance: SessionImportance;
  }>;
}

export interface RaceLimiterDistribution {
  legs: number;
  stomach: number;
  heat: number;
  pacing: number;
  mindset: number;
  equipment: number;
  other: number;
}

export interface DNFCauseDistribution {
  injury: number;
  heat: number;
  stomach: number;
  pacing: number;
  mental: number;
  equipment: number;
  other: number;
}

export interface RaceReadinessScore {
  overall: number;
  terrainConfidence: number;
  pacingAccuracy: number;
  nutritionReliability: number;
  heatAdaptation: number;
  downhillDurability: number;
  basedOnDataPoints: number;
  lastUpdated: string;
}

export interface ModelConfidenceLevel {
  modelName: string;
  confidence: number;
  dataPoints: number;
  lastUpdated: string;
  accuracy: number;
}

export interface AdaptiveDecisionTimeline {
  date: string;
  decision: string;
  sourceType: FeedbackType;
  weight: number;
  explanation: string;
  modelsAffected: string[];
}

export interface RecoveryProtocol {
  startDate: string;
  weekNumber: number;
  volumePercentage: number;
  intensityGuidelines: string[];
  focusAreas: string[];
  completed: boolean;
}
