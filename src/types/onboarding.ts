/**
 * Onboarding Type Definitions
 *
 * Defines the data structure for user onboarding and profile initialization
 */

export type GoalType = '5k' | '10k' | 'half' | 'marathon' | 'ultra';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SurfaceType = 'road' | 'trail' | 'treadmill' | 'mixed';
export type StrengthPreference = 'none' | 'base' | 'mountain' | 'ultra';
export type AdaptationLevel = 0 | 1 | 2; // 0=fun, 1=adaptive, 2=AI+HR

export interface DeviceData {
  hrAvg?: number;
  hrMax?: number;
  hrResting?: number;
  recentMileage?: number;
  weeklyMileage?: number;
  longestRun?: number;
  elevationGain?: number;
  paceAvg?: number;
  lastActivityDate?: string;
  totalActivities?: number;
}

export interface TargetRace {
  name: string;
  date: string;
  distanceKm: number;
  location?: string;
  elevationM?: number;
  surface?: SurfaceType;
}

export interface UserProfile {
  id: string;
  user_id?: string;

  // Goal & Experience
  goalType: GoalType;
  experienceLevel: ExperienceLevel;
  motivation?: string;

  // Training Schedule
  daysPerWeek: number;
  restDays?: string[];
  preferredRunDays?: string[];

  // Preferences
  surface?: SurfaceType;
  crossTraining?: string[];
  strengthPreference?: StrengthPreference;

  // Current Fitness
  avgMileage?: number;
  longRunDistance?: number;
  currentPace?: number;

  // Device Integration
  deviceConnected: boolean;
  deviceType?: 'strava' | 'garmin' | 'coros' | 'apple' | 'polar' | 'suunto';
  deviceData?: DeviceData;

  // Target Race (optional)
  targetRace?: TargetRace;

  // Plan Configuration
  planTemplate: string;
  planStartDate: string;
  aiAdaptationLevel: AdaptationLevel;

  // Metadata
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  profile: Partial<UserProfile>;
  isComplete: boolean;
}

export interface OnboardingStepProps {
  profile: Partial<UserProfile>;
  update: (data: Partial<UserProfile>) => void;
  next: () => void;
  back?: () => void;
}

export interface GoalOption {
  key: GoalType;
  label: string;
  description: string;
  emoji: string;
  recommendedWeeks: number;
  minExperience: ExperienceLevel;
}

export interface ActivityLevelOption {
  key: string;
  label: string;
  description: string;
  inferredExperience: ExperienceLevel;
  inferredMileage: number;
}

export interface MotivationOption {
  key: string;
  label: string;
  emoji: string;
  aiPersonality?: 'supportive' | 'challenging' | 'educational' | 'fun';
}

// Plan template metadata
export interface PlanTemplate {
  key: string;
  name: string;
  description: string;
  goalTypes: GoalType[];
  durationWeeks: number;
  minDaysPerWeek: number;
  maxDaysPerWeek: number;
  includesStrength: boolean;
  requiresDevice: boolean;
  adaptationLevel: AdaptationLevel;
}

// Default values
export const DEFAULT_PROFILE: Partial<UserProfile> = {
  daysPerWeek: 3,
  deviceConnected: false,
  aiAdaptationLevel: 0,
  strengthPreference: 'none',
  surface: 'road',
  experienceLevel: 'beginner',
  onboardingCompleted: false,
};

// Goal options for onboarding
export const GOAL_OPTIONS: GoalOption[] = [
  {
    key: '5k',
    label: 'My First 5K',
    description: 'Build confidence and complete your first 5K race',
    emoji: '🎯',
    recommendedWeeks: 8,
    minExperience: 'beginner',
  },
  {
    key: '10k',
    label: 'Improve My 10K',
    description: 'Increase endurance and speed for 10K distance',
    emoji: '🏃',
    recommendedWeeks: 10,
    minExperience: 'beginner',
  },
  {
    key: 'half',
    label: 'Half Marathon',
    description: 'Train for the classic 21.1K distance',
    emoji: '🏅',
    recommendedWeeks: 12,
    minExperience: 'intermediate',
  },
  {
    key: 'marathon',
    label: 'Marathon',
    description: 'Conquer the full 42.2K marathon distance',
    emoji: '🏆',
    recommendedWeeks: 16,
    minExperience: 'intermediate',
  },
  {
    key: 'ultra',
    label: 'Trail / Ultra',
    description: 'Adventure beyond the marathon with trail ultras',
    emoji: '⛰️',
    recommendedWeeks: 20,
    minExperience: 'advanced',
  },
];

// Activity level options
export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelOption[] = [
  {
    key: 'sedentary',
    label: 'Not active at all',
    description: "I don't currently exercise regularly",
    inferredExperience: 'beginner',
    inferredMileage: 0,
  },
  {
    key: 'walker',
    label: 'I walk sometimes',
    description: 'I walk for exercise a few times per week',
    inferredExperience: 'beginner',
    inferredMileage: 5,
  },
  {
    key: 'jogger',
    label: 'I jog occasionally',
    description: 'I run or jog 1-2 times per week',
    inferredExperience: 'beginner',
    inferredMileage: 10,
  },
  {
    key: 'regular',
    label: 'I run weekly',
    description: 'I run consistently 2-3 times per week',
    inferredExperience: 'intermediate',
    inferredMileage: 20,
  },
  {
    key: 'experienced',
    label: 'Experienced runner',
    description: 'I run 4+ times per week with structured training',
    inferredExperience: 'advanced',
    inferredMileage: 40,
  },
];

// Motivation options
export const MOTIVATION_OPTIONS: MotivationOption[] = [
  { key: 'health', label: 'Feel healthier', emoji: '💪', aiPersonality: 'supportive' },
  { key: 'race', label: 'Complete my first race', emoji: '🎯', aiPersonality: 'educational' },
  { key: 'fun', label: 'Just for fun', emoji: '😊', aiPersonality: 'fun' },
  { key: 'speed', label: 'Get faster', emoji: '⚡', aiPersonality: 'challenging' },
  { key: 'adventure', label: 'Chase a big adventure', emoji: '🏔️', aiPersonality: 'challenging' },
];
