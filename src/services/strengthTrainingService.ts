import { supabase } from '@/lib/supabase';
import type {
  StrengthExercise,
  MESessionTemplate,
  UserStrengthProgress,
  SorenessRecord,
  UserTerrainAccess,
  MEAssignment,
  LoadAdjustment,
  ProgressionDecision,
  CompletedExercise,
} from '@/types/strengthTraining';

export async function fetchStrengthExercises(): Promise<StrengthExercise[]> {
  const { data, error } = await supabase
    .from('strength_exercises')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    exerciseType: row.exercise_type,
    targetMuscles: row.target_muscles || [],
    techniqueCues: row.technique_cues || [],
    videoUrl: row.video_url,
    isUpperBody: row.is_upper_body || false,
  }));
}

export async function fetchMESessionTemplates(): Promise<MESessionTemplate[]> {
  const { data, error } = await supabase
    .from('me_session_templates')
    .select('*')
    .order('workout_number', { ascending: true });

  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    name: row.name,
    workoutNumber: row.workout_number,
    meType: row.me_type,
    meCategory: row.me_category,
    terrainRequirement: row.terrain_requirement,
    durationMinutes: row.duration_minutes,
    description: row.description,
    exercises: row.exercises || [],
    restProtocol: row.rest_protocol,
  }));
}

export async function detectTerrainFromActivities(userId: string): Promise<{ maxGrade: number; avgElevationVariance: number }> {
  const { data, error } = await supabase
    .from('log_entries')
    .select('elevation_gain, distance')
    .eq('user_id', userId)
    .not('elevation_gain', 'is', null)
    .gt('distance', 1)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    return { maxGrade: 0, avgElevationVariance: 0 };
  }

  const grades = data
    .map(row => ((row.elevation_gain || 0) / ((row.distance || 1) * 1000)) * 100)
    .filter(g => g > 0 && g < 50);

  const maxGrade = grades.length > 0 ? Math.max(...grades) : 0;
  const avgVariance = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

  return { maxGrade, avgElevationVariance: avgVariance };
}

export async function fetchUserTerrainAccess(userId: string): Promise<UserTerrainAccess | null> {
  const { data, error } = await supabase
    .from('user_terrain_access')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    hasGymAccess: data.has_gym_access,
    hasHillsAccess: data.has_hills_access,
    maxHillGrade: data.max_hill_grade,
    treadmillAccess: data.treadmill_access,
    stairsAccess: data.stairs_access,
    usesPoles: data.uses_poles,
    isSkimoAthlete: data.is_skimo_athlete,
    manualOverride: data.manual_override,
    lastUpdated: data.last_updated,
  };
}

export async function upsertUserTerrainAccess(userId: string, access: Partial<UserTerrainAccess>): Promise<UserTerrainAccess> {
  const { data, error } = await supabase
    .from('user_terrain_access')
    .upsert({
      user_id: userId,
      has_gym_access: access.hasGymAccess,
      has_hills_access: access.hasHillsAccess,
      max_hill_grade: access.maxHillGrade,
      treadmill_access: access.treadmillAccess,
      stairs_access: access.stairsAccess,
      uses_poles: access.usesPoles,
      is_skimo_athlete: access.isSkimoAthlete,
      manual_override: access.manualOverride,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return {
    userId: data.user_id,
    hasGymAccess: data.has_gym_access,
    hasHillsAccess: data.has_hills_access,
    maxHillGrade: data.max_hill_grade,
    treadmillAccess: data.treadmill_access,
    stairsAccess: data.stairs_access,
    usesPoles: data.uses_poles,
    isSkimoAthlete: data.is_skimo_athlete,
    manualOverride: data.manual_override,
    lastUpdated: data.last_updated,
  };
}

export function determineMEType(terrainAccess: UserTerrainAccess | null): MEAssignment {
  if (!terrainAccess) {
    return {
      meType: 'gym_based',
      templateId: '',
      reason: 'No terrain access configured. Defaulting to gym-based ME.',
      alternativeTemplates: [],
    };
  }

  if (terrainAccess.hasHillsAccess && terrainAccess.maxHillGrade >= 15) {
    return {
      meType: 'outdoor_steep',
      templateId: '',
      reason: 'Steep hills available (≥15% grade). Optimal for outdoor hill ME.',
      alternativeTemplates: ['gym_based', 'treadmill_stairs'],
    };
  }

  if (terrainAccess.hasGymAccess) {
    return {
      meType: 'gym_based',
      templateId: '',
      reason: 'Gym access available. Progressive loading with weights.',
      alternativeTemplates: terrainAccess.hasHillsAccess ? ['outdoor_weighted'] : [],
    };
  }

  if (terrainAccess.hasHillsAccess) {
    return {
      meType: 'outdoor_weighted',
      templateId: '',
      reason: 'Moderate hills available. Use weighted vest or pack.',
      alternativeTemplates: ['gym_based'],
    };
  }

  if (terrainAccess.treadmillAccess || terrainAccess.stairsAccess) {
    return {
      meType: 'treadmill_stairs',
      templateId: '',
      reason: 'Treadmill or stairs available. Indoor ME alternative.',
      alternativeTemplates: ['gym_based'],
    };
  }

  return {
    meType: 'gym_based',
    templateId: '',
    reason: 'Limited terrain access. Defaulting to gym-based ME.',
    alternativeTemplates: [],
  };
}

export async function fetchUserStrengthProgress(userId: string, meCategory: string): Promise<UserStrengthProgress | null> {
  const { data, error } = await supabase
    .from('user_strength_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('me_category', meCategory)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    meCategory: data.me_category,
    currentWorkoutNumber: data.current_workout_number,
    lastCompletedWorkout: data.last_completed_workout,
    lastSessionDate: data.last_session_date,
    totalSessions: data.total_sessions,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function calculateProgressionDecision(
  progress: UserStrengthProgress | null,
  lastSessionDate: string | null
): ProgressionDecision {
  if (!progress || !lastSessionDate) {
    return {
      action: 'restart',
      targetWorkoutNumber: 1,
      reason: 'No previous progress. Starting from Workout 1.',
      daysSinceLastSession: null,
    };
  }

  const now = new Date();
  const lastDate = new Date(lastSessionDate);
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= 12) {
    const nextWorkout = Math.min(progress.currentWorkoutNumber + 1, 12);
    return {
      action: 'advance',
      targetWorkoutNumber: nextWorkout,
      reason: `${daysSince} days since last session. Progression on track—advancing to next workout.`,
      daysSinceLastSession: daysSince,
    };
  }

  if (daysSince <= 21) {
    return {
      action: 'repeat',
      targetWorkoutNumber: progress.currentWorkoutNumber,
      reason: `${daysSince} days since last session. Repeating last workout to maintain adaptations.`,
      daysSinceLastSession: daysSince,
    };
  }

  const targetWorkout = Math.max(progress.currentWorkoutNumber - 2, 1);
  return {
    action: 'regress',
    targetWorkoutNumber: targetWorkout,
    reason: `${daysSince} days since last session. Regressing 2 workouts due to extended break.`,
    daysSinceLastSession: daysSince,
  };
}

export async function getMETemplateForUser(userId: string): Promise<{ template: MESessionTemplate; progression: ProgressionDecision } | null> {
  const terrainAccess = await fetchUserTerrainAccess(userId);
  const meAssignment = determineMEType(terrainAccess);

  const templates = await fetchMESessionTemplates();
  const progress = await fetchUserStrengthProgress(userId, 'gym_lower');

  const progressionDecision = calculateProgressionDecision(progress, progress?.lastSessionDate || null);

  const matchingTemplate = templates.find(
    t => t.meType === meAssignment.meType && t.workoutNumber === progressionDecision.targetWorkoutNumber
  );

  if (!matchingTemplate) return null;

  return {
    template: matchingTemplate,
    progression: progressionDecision,
  };
}

export async function restartProgression(userId: string, meCategory: string): Promise<void> {
  await supabase
    .from('user_strength_progress')
    .upsert({
      user_id: userId,
      me_category: meCategory,
      current_workout_number: 1,
      last_completed_workout: null,
      last_session_date: null,
      total_sessions: 0,
      updated_at: new Date().toISOString(),
    });
}

export async function logStrengthSession(
  userId: string,
  session: {
    templateId: string;
    meCategory: string;
    workoutNumber: number;
    completedExercises: CompletedExercise[];
    notes?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('user_strength_sessions').insert({
    user_id: userId,
    template_id: session.templateId,
    me_category: session.meCategory,
    workout_number: session.workoutNumber,
    completed_exercises: session.completedExercises,
    notes: session.notes,
    session_date: new Date().toISOString(),
  });

  if (error) throw error;

  await supabase.from('user_strength_progress').upsert({
    user_id: userId,
    me_category: session.meCategory,
    current_workout_number: session.workoutNumber,
    last_completed_workout: session.workoutNumber,
    last_session_date: new Date().toISOString(),
    total_sessions: supabase.raw('COALESCE(total_sessions, 0) + 1'),
    updated_at: new Date().toISOString(),
  });
}

export async function recordSoreness(userId: string, data: {
  triggerSessionId: string | null;
  bodyAreas: { muscleGroup: string; level: number }[];
  overallSoreness: number;
  isFollowup: boolean;
  originalRecordId: string | null;
  hasPain: boolean;
  notes: string;
}): Promise<SorenessRecord> {
  const { data: record, error } = await supabase
    .from('user_soreness_records')
    .insert({
      user_id: userId,
      trigger_session_id: data.triggerSessionId,
      body_areas: data.bodyAreas,
      overall_soreness: data.overallSoreness,
      is_followup: data.isFollowup,
      original_record_id: data.originalRecordId,
      has_pain: data.hasPain,
      notes: data.notes,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: record.id,
    userId: record.user_id,
    triggerSessionId: record.trigger_session_id,
    bodyAreas: record.body_areas,
    overallSoreness: record.overall_soreness,
    isFollowup: record.is_followup,
    originalRecordId: record.original_record_id,
    hasPain: record.has_pain,
    notes: record.notes,
    recordedAt: record.recorded_at,
    followupCompletedAt: record.followup_completed_at,
  };
}

export async function getRecentSoreness(userId: string, days: number = 7): Promise<SorenessRecord[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('user_soreness_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', cutoffDate.toISOString())
    .order('recorded_at', { ascending: false });

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    userId: row.user_id,
    triggerSessionId: row.trigger_session_id,
    bodyAreas: row.body_areas,
    overallSoreness: row.overall_soreness,
    isFollowup: row.is_followup,
    originalRecordId: row.original_record_id,
    hasPain: row.has_pain,
    notes: row.notes,
    recordedAt: row.recorded_at,
    followupCompletedAt: row.followup_completed_at,
  }));
}

export async function getPendingFollowupChecks(userId: string): Promise<SorenessRecord[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 3);

  const { data, error } = await supabase
    .from('user_soreness_records')
    .select('*')
    .eq('user_id', userId)
    .eq('is_followup', false)
    .is('followup_completed_at', null)
    .gte('recorded_at', cutoffDate.toISOString())
    .lte('recorded_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    userId: row.user_id,
    triggerSessionId: row.trigger_session_id,
    bodyAreas: row.body_areas,
    overallSoreness: row.overall_soreness,
    isFollowup: row.is_followup,
    originalRecordId: row.original_record_id,
    hasPain: row.has_pain,
    notes: row.notes,
    recordedAt: row.recorded_at,
    followupCompletedAt: row.followup_completed_at,
  }));
}

export async function getActiveLoadAdjustment(userId: string): Promise<LoadAdjustment | null> {
  const { data, error } = await supabase
    .from('user_load_adjustments')
    .select('*')
    .eq('user_id', userId)
    .is('reverted_at', null)
    .order('triggered_at', { ascending: false })
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    triggerRecordId: data.trigger_record_id,
    adjustmentType: data.adjustment_type,
    reason: data.reason,
    exitCriteria: data.exit_criteria,
    triggeredAt: data.triggered_at,
    revertedAt: data.reverted_at,
  };
}

export async function checkAndRevertAdjustmentIfRecovered(userId: string): Promise<boolean> {
  const activeAdjustment = await getActiveLoadAdjustment(userId);
  if (!activeAdjustment) return false;

  const recentSoreness = await getRecentSoreness(userId, 3);
  if (recentSoreness.length === 0) return false;

  const latest = recentSoreness[0];
  if (latest.overallSoreness <= 3 && !latest.hasPain) {
    await supabase
      .from('user_load_adjustments')
      .update({ reverted_at: new Date().toISOString() })
      .eq('id', activeAdjustment.id);
    return true;
  }

  return false;
}
