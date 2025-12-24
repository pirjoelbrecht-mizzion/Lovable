import { supabase } from '../lib/supabase';
import type {
  CoreCategory,
  CoreExercise,
  CoreEmphasis,
  CoreFrequencyConfig,
  UserCoreProgress,
  UpperBodyEligibility,
  UpperBodyEligibilityType,
  UserTerrainAccess,
  MEProgressionState,
  UserMEProgress,
  MESessionTemplate,
  MECategory,
} from '../types/strengthTraining';

type RaceType = 'vk' | 'ultra' | 'skimo' | 'trail' | 'road' | 'marathon';
type TrainingPeriod = 'transition' | 'base' | 'intensity' | 'recovery' | 'taper' | 'goal';

const RACE_TYPE_CORE_EMPHASIS: Record<RaceType, { primary: CoreCategory; secondary: CoreCategory; tertiary: CoreCategory }> = {
  vk: { primary: 'anti_extension', secondary: 'hip_core_linkage', tertiary: 'anti_rotation' },
  ultra: { primary: 'lateral_stability', secondary: 'anti_rotation', tertiary: 'anti_extension' },
  skimo: { primary: 'anti_rotation', secondary: 'anti_extension', tertiary: 'hip_core_linkage' },
  trail: { primary: 'lateral_stability', secondary: 'anti_extension', tertiary: 'hip_core_linkage' },
  road: { primary: 'anti_extension', secondary: 'hip_core_linkage', tertiary: 'lateral_stability' },
  marathon: { primary: 'anti_extension', secondary: 'hip_core_linkage', tertiary: 'lateral_stability' },
};

const PERIOD_CORE_CONFIG: Record<TrainingPeriod, CoreFrequencyConfig> = {
  transition: { frequency: 3, durationMinutes: 20, intensity: 'low' },
  base: { frequency: 2, durationMinutes: 25, intensity: 'moderate' },
  intensity: { frequency: 2, durationMinutes: 15, intensity: 'maintenance' },
  recovery: { frequency: 1, durationMinutes: 15, intensity: 'light' },
  taper: { frequency: 1, durationMinutes: 10, intensity: 'activation' },
  goal: { frequency: 0, durationMinutes: 0, intensity: 'optional' },
};

export function determineUpperBodyEligibility(
  terrainAccess: UserTerrainAccess | null,
  raceType?: RaceType
): UpperBodyEligibility {
  if (raceType === 'skimo' || terrainAccess?.isSkimoAthlete) {
    return {
      eligible: true,
      type: 'full',
      reason: 'Skimo athlete requires full upper-body ME for pole propulsion',
    };
  }

  if (terrainAccess?.usesPoles) {
    return {
      eligible: true,
      type: 'maintenance',
      reason: 'Pole user gets light upper-body maintenance only',
    };
  }

  return {
    eligible: false,
    type: 'none',
    reason: 'Running focus - lower body ME only',
  };
}

export function determineCoreEmphasis(
  raceType: RaceType = 'trail',
  painReports: string[] = [],
  usesPoles: boolean = false
): CoreEmphasis {
  const baseEmphasis = RACE_TYPE_CORE_EMPHASIS[raceType] || RACE_TYPE_CORE_EMPHASIS.trail;
  const adjustments: string[] = [];

  let { primary, secondary, tertiary } = baseEmphasis;

  if (painReports.includes('knee_downhill') || painReports.includes('knee_pain')) {
    primary = 'lateral_stability';
    secondary = 'hip_core_linkage';
    adjustments.push('Knee pain detected - emphasizing lateral stability and hip control');
  }

  if (painReports.includes('legs_fatigue_before_breathing')) {
    primary = 'anti_extension';
    adjustments.push('Frontier fiber issue detected - emphasizing anti-extension and carries');
  }

  if (usesPoles && raceType !== 'skimo') {
    if (secondary !== 'anti_rotation') {
      tertiary = secondary;
      secondary = 'anti_rotation';
    }
    adjustments.push('Pole usage - adding anti-rotation emphasis');
  }

  return { primary, secondary, tertiary, adjustments };
}

export function getCoreFrequencyForPeriod(
  period: TrainingPeriod,
  isRecoveryWeek: boolean = false
): CoreFrequencyConfig {
  if (isRecoveryWeek) {
    return PERIOD_CORE_CONFIG.recovery;
  }
  return PERIOD_CORE_CONFIG[period] || PERIOD_CORE_CONFIG.base;
}

export function calculateMEProgressionState(
  progress: UserMEProgress | null,
  now: Date = new Date()
): MEProgressionState {
  if (!progress || !progress.lastSessionDate) {
    return {
      currentWorkoutNumber: 1,
      lastSessionDate: undefined,
      daysSinceLastSession: null,
      progressionAction: 'advance',
      targetWorkoutNumber: 1,
      reason: 'Starting new ME progression',
    };
  }

  const lastDate = new Date(progress.lastSessionDate);
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= 12) {
    const nextWorkout = Math.min(progress.currentWorkoutNumber + 1, 12);
    return {
      currentWorkoutNumber: progress.currentWorkoutNumber,
      lastSessionDate: progress.lastSessionDate,
      daysSinceLastSession: daysSince,
      progressionAction: 'advance',
      targetWorkoutNumber: nextWorkout,
      reason: `Good consistency (${daysSince} days) - advancing to workout ${nextWorkout}`,
    };
  }

  if (daysSince <= 21) {
    return {
      currentWorkoutNumber: progress.currentWorkoutNumber,
      lastSessionDate: progress.lastSessionDate,
      daysSinceLastSession: daysSince,
      progressionAction: 'repeat',
      targetWorkoutNumber: progress.currentWorkoutNumber,
      reason: `Extended break (${daysSince} days) - repeating workout ${progress.currentWorkoutNumber}`,
    };
  }

  const regressTo = Math.max(progress.currentWorkoutNumber - 2, 1);
  return {
    currentWorkoutNumber: progress.currentWorkoutNumber,
    lastSessionDate: progress.lastSessionDate,
    daysSinceLastSession: daysSince,
    progressionAction: 'regress',
    targetWorkoutNumber: regressTo,
    reason: `Long break (${daysSince} days) - regressing to workout ${regressTo}`,
  };
}

export function calculateSorenessAdjustment(
  sorenessLevel: number,
  sorenessReportedAt: string | null,
  now: Date = new Date()
): { adjustmentPercent: number; reason: string } {
  if (!sorenessReportedAt || sorenessLevel <= 4) {
    return { adjustmentPercent: 0, reason: 'Soreness within acceptable range' };
  }

  const reportedDate = new Date(sorenessReportedAt);
  const hoursSince = (now.getTime() - reportedDate.getTime()) / (1000 * 60 * 60);

  if (hoursSince > 48 && sorenessLevel > 4) {
    return {
      adjustmentPercent: -30,
      reason: `Persistent soreness (${sorenessLevel}/10 for ${Math.round(hoursSince)}h) - reducing volume by 30%`,
    };
  }

  return { adjustmentPercent: 0, reason: 'Soreness not yet persistent' };
}

export async function fetchCoreExercises(
  categories?: CoreCategory[],
  difficulty?: string,
  excludeContraindications?: string[]
): Promise<CoreExercise[]> {
  let query = supabase.from('core_exercises').select('*');

  if (categories && categories.length > 0) {
    query = query.overlaps('core_categories', categories);
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching core exercises:', error);
    return [];
  }

  let exercises = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    coreCategories: row.core_categories as CoreCategory[],
    difficulty: row.difficulty as 'beginner' | 'intermediate' | 'advanced',
    eccentricLoad: row.eccentric_load as 'low' | 'moderate' | 'high',
    equipment: row.equipment || [],
    contraindications: row.contraindications || [],
    techniqueCues: row.technique_cues || [],
    videoUrl: row.video_url,
    durationSeconds: row.duration_seconds,
    repsDefault: row.reps_default,
    description: row.description,
  }));

  if (excludeContraindications && excludeContraindications.length > 0) {
    exercises = exercises.filter(
      (ex) => !ex.contraindications.some((c) => excludeContraindications.includes(c))
    );
  }

  return exercises;
}

export async function fetchMETemplates(
  category?: MECategory,
  includeUpperBody: boolean = false
): Promise<MESessionTemplate[]> {
  let query = supabase.from('me_session_templates').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  if (!includeUpperBody) {
    query = query.eq('is_upper_body', false);
  }

  query = query.order('workout_number', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching ME templates:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    workoutNumber: row.workout_number,
    meType: row.me_type,
    meCategory: row.category as MECategory,
    terrainRequirement: row.terrain_requirement,
    durationMinutes: row.duration_minutes,
    description: row.description,
    exercises: row.exercises || [],
    restProtocol: row.rest_protocol || { between_sets_seconds: 60, between_exercises_seconds: 90 },
    isUpperBody: row.is_upper_body,
    phase: row.phase,
  }));
}

export async function getUserCoreProgress(userId: string): Promise<UserCoreProgress | null> {
  const { data, error } = await supabase
    .from('user_core_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    currentEmphasis: data.current_emphasis || [],
    sessionsThisWeek: data.sessions_this_week || 0,
    lastSessionDate: data.last_session_date,
    sorenessLevel: data.soreness_level,
    sorenessReportedAt: data.soreness_reported_at,
    volumeAdjustmentPercent: data.volume_adjustment_percent || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getUserMEProgress(
  userId: string,
  category: MECategory
): Promise<UserMEProgress | null> {
  const { data, error } = await supabase
    .from('user_me_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    category: data.category as MECategory,
    currentWorkoutNumber: data.current_workout_number,
    lastSessionDate: data.last_session_date,
    totalSessionsCompleted: data.total_sessions_completed || 0,
    currentLoadPercent: data.current_load_percent || 0,
    currentRestSeconds: data.current_rest_seconds || 60,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateUserMEProgress(
  userId: string,
  category: MECategory,
  workoutNumber: number
): Promise<void> {
  const existing = await getUserMEProgress(userId, category);

  if (existing) {
    await supabase
      .from('user_me_progress')
      .update({
        current_workout_number: workoutNumber,
        last_session_date: new Date().toISOString(),
        total_sessions_completed: existing.totalSessionsCompleted + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('user_me_progress').insert({
      user_id: userId,
      category,
      current_workout_number: workoutNumber,
      last_session_date: new Date().toISOString(),
      total_sessions_completed: 1,
    });
  }
}

export async function resetMEProgression(userId: string, category: MECategory): Promise<void> {
  await supabase
    .from('user_me_progress')
    .update({
      current_workout_number: 1,
      last_session_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('category', category);
}

export async function recordCoreSoreness(
  userId: string,
  sorenessLevel: number
): Promise<void> {
  const existing = await getUserCoreProgress(userId);

  if (existing) {
    await supabase
      .from('user_core_progress')
      .update({
        soreness_level: sorenessLevel,
        soreness_reported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('user_core_progress').insert({
      user_id: userId,
      soreness_level: sorenessLevel,
      soreness_reported_at: new Date().toISOString(),
    });
  }
}

export function selectCoreExercisesForSession(
  allExercises: CoreExercise[],
  emphasis: CoreEmphasis,
  targetCount: number = 5,
  difficulty?: string,
  eccentricLoadLimit?: 'low' | 'moderate'
): CoreExercise[] {
  let filtered = [...allExercises];

  if (eccentricLoadLimit) {
    const allowedLoads = eccentricLoadLimit === 'low' ? ['low'] : ['low', 'moderate'];
    filtered = filtered.filter((ex) => allowedLoads.includes(ex.eccentricLoad));
  }

  if (difficulty) {
    const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
    const maxIndex = difficultyOrder.indexOf(difficulty);
    filtered = filtered.filter((ex) => difficultyOrder.indexOf(ex.difficulty) <= maxIndex);
  }

  const primaryExercises = filtered.filter((ex) =>
    ex.coreCategories.includes(emphasis.primary)
  );
  const secondaryExercises = filtered.filter((ex) =>
    ex.coreCategories.includes(emphasis.secondary) && !ex.coreCategories.includes(emphasis.primary)
  );
  const tertiaryExercises = filtered.filter((ex) =>
    ex.coreCategories.includes(emphasis.tertiary) &&
    !ex.coreCategories.includes(emphasis.primary) &&
    !ex.coreCategories.includes(emphasis.secondary)
  );

  const selected: CoreExercise[] = [];
  const targetPrimary = Math.ceil(targetCount * 0.4);
  const targetSecondary = Math.ceil(targetCount * 0.35);
  const targetTertiary = targetCount - targetPrimary - targetSecondary;

  const shuffled = (arr: CoreExercise[]) => arr.sort(() => Math.random() - 0.5);

  selected.push(...shuffled(primaryExercises).slice(0, targetPrimary));
  selected.push(...shuffled(secondaryExercises).slice(0, targetSecondary));
  selected.push(...shuffled(tertiaryExercises).slice(0, targetTertiary));

  while (selected.length < targetCount && filtered.length > selected.length) {
    const remaining = filtered.filter((ex) => !selected.includes(ex));
    if (remaining.length > 0) {
      selected.push(remaining[0]);
    } else {
      break;
    }
  }

  return selected;
}

export function getMETemplateForWorkout(
  templates: MESessionTemplate[],
  workoutNumber: number,
  upperBodyEligibility: UpperBodyEligibility
): MESessionTemplate | null {
  let filtered = templates;

  if (upperBodyEligibility.type === 'none') {
    filtered = templates.filter((t) => !t.isUpperBody);
  } else if (upperBodyEligibility.type === 'maintenance') {
    filtered = templates.filter((t) => !t.isUpperBody || t.meCategory === 'maintenance');
  }

  const template = filtered.find((t) => t.workoutNumber === workoutNumber);
  return template || filtered[0] || null;
}

export function getDefaultFallbackTemplate(includeUpperBody: boolean): MESessionTemplate {
  const baseExercises = [
    { name: 'Bulgarian Split Squat', sets: 3, reps: '12', load: 'bodyweight' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10', load: 'light' },
    { name: 'Box Step-ups', sets: 3, reps: '12', load: 'bodyweight' },
    { name: 'Calf Raises', sets: 3, reps: '20', load: 'bodyweight' },
    { name: 'Plank', sets: 2, reps: '30s' },
  ];

  const upperBodyMaintenance = [
    { name: 'Band Pull-apart', sets: 2, reps: '15' },
    { name: 'Pallof Press', sets: 2, reps: '10' },
  ];

  return {
    id: 'fallback',
    name: includeUpperBody ? 'Fallback ME with Upper Maintenance' : 'Fallback ME Lower Body',
    workoutNumber: 1,
    meType: 'gym_based',
    meCategory: 'gym_lower',
    durationMinutes: includeUpperBody ? 50 : 45,
    description: 'Emergency fallback template - respects user configuration',
    exercises: includeUpperBody ? [...baseExercises, ...upperBodyMaintenance] : baseExercises,
    restProtocol: { between_sets_seconds: 60, between_exercises_seconds: 90 },
    isUpperBody: false,
    phase: 'foundation',
  };
}
