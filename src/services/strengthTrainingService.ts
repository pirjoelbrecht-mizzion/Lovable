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

  if (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    exerciseType: row.exercise_type,
    targetMuscles: row.target_muscles || [],
    techniqueCues: row.technique_cues || row.cues || [],
    videoUrl: row.video_url,
    isUpperBody: row.is_upper_body || false,
  }));
}

export async function fetchMESessionTemplates(): Promise<MESessionTemplate[]> {
  const { data, error } = await supabase
    .from('me_session_templates')
    .select('*')
    .order('workout_number', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    workoutNumber: row.workout_number || 1,
    meType: row.me_type || 'gym_based',
    meCategory: row.category || 'gym_lower',
    terrainRequirement: row.terrain_requirement,
    durationMinutes: row.duration_minutes || 35,
    description: row.description,
    exercises: row.exercises || [],
    restProtocol: row.rest_protocol || { between_sets_seconds: 60, between_exercises_seconds: 90 },
  }));
}

export async function detectTerrainFromActivities(userId: string): Promise<{ maxGrade: number; avgElevationVariance: number }> {
  try {
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
  } catch {
    return { maxGrade: 0, avgElevationVariance: 0 };
  }
}

export async function fetchUserTerrainAccess(userId: string): Promise<UserTerrainAccess | null> {
  try {
    const { data, error } = await supabase
      .from('user_terrain_access')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      hasGymAccess: data.has_gym_access ?? data.gym_access ?? false,
      hasHillsAccess: data.has_hills_access ?? (data.steep_hills_access !== 'no') ?? false,
      maxHillGrade: data.max_hill_grade ?? data.detected_max_grade ?? 10,
      treadmillAccess: data.treadmill_access ?? false,
      stairsAccess: data.stairs_access ?? false,
      usesPoles: data.uses_poles ?? false,
      isSkimoAthlete: data.is_skimo_athlete ?? false,
      manualOverride: data.manual_override ?? false,
      lastUpdated: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function upsertUserTerrainAccess(userId: string, access: Partial<UserTerrainAccess>): Promise<UserTerrainAccess | null> {
  try {
    console.log('[upsertUserTerrainAccess] Starting with userId:', userId, 'access:', access);

    const steepHillsValue = access.hasHillsAccess
      ? (access.maxHillGrade && access.maxHillGrade >= 15 ? 'yes' : 'some')
      : 'no';

    const { data: existing } = await supabase
      .from('user_terrain_access')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[upsertUserTerrainAccess] Existing record:', existing);

    const payload = {
      user_id: userId,
      gym_access: access.hasGymAccess ?? false,
      has_gym_access: access.hasGymAccess ?? false,
      steep_hills_access: steepHillsValue,
      has_hills_access: access.hasHillsAccess ?? false,
      max_hill_grade: access.maxHillGrade ?? 10,
      treadmill_access: access.treadmillAccess ?? false,
      stairs_access: access.stairsAccess ?? false,
      uses_poles: access.usesPoles ?? false,
      is_skimo_athlete: access.isSkimoAthlete ?? false,
      manual_override: access.manualOverride ?? false,
      updated_at: new Date().toISOString(),
    };

    console.log('[upsertUserTerrainAccess] Payload:', payload);

    let result;
    if (existing) {
      console.log('[upsertUserTerrainAccess] Updating existing record');
      const { data, error } = await supabase
        .from('user_terrain_access')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) {
        console.error('[upsertUserTerrainAccess] Update error:', error);
        console.error('[upsertUserTerrainAccess] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      result = data;
    } else {
      console.log('[upsertUserTerrainAccess] Inserting new record');
      const { data, error } = await supabase
        .from('user_terrain_access')
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error('[upsertUserTerrainAccess] Insert error:', error);
        console.error('[upsertUserTerrainAccess] Error code:', error.code);
        console.error('[upsertUserTerrainAccess] Error message:', error.message);
        console.error('[upsertUserTerrainAccess] Error details:', error.details);
        console.error('[upsertUserTerrainAccess] Error hint:', error.hint);
        throw error;
      }
      result = data;
    }

    console.log('[upsertUserTerrainAccess] Result:', result);

    return {
      userId: result.user_id,
      hasGymAccess: result.has_gym_access ?? result.gym_access ?? false,
      hasHillsAccess: result.has_hills_access ?? (result.steep_hills_access !== 'no') ?? false,
      maxHillGrade: result.max_hill_grade ?? 10,
      treadmillAccess: result.treadmill_access ?? false,
      stairsAccess: result.stairs_access ?? false,
      usesPoles: result.uses_poles ?? false,
      isSkimoAthlete: result.is_skimo_athlete ?? false,
      manualOverride: result.manual_override ?? false,
      lastUpdated: result.updated_at,
    };
  } catch (err) {
    console.error('[upsertUserTerrainAccess] Error:', err);
    return null;
  }
}

export function determineMEType(terrainAccess: UserTerrainAccess | null): MEAssignment {
  if (!terrainAccess) {
    return {
      meType: 'gym_based',
      templateId: '',
      reason: 'Gym-based ME recommended. Configure terrain access for more options.',
      alternativeTemplates: [],
    };
  }

  if (terrainAccess.hasHillsAccess && terrainAccess.maxHillGrade >= 15) {
    return {
      meType: 'outdoor_steep',
      templateId: '',
      reason: 'Steep hills available. Optimal for running-specific ME.',
      alternativeTemplates: ['gym_based', 'treadmill_stairs'],
    };
  }

  if (terrainAccess.hasGymAccess) {
    return {
      meType: 'gym_based',
      templateId: '',
      reason: 'Gym access allows progressive overload with controlled movements.',
      alternativeTemplates: terrainAccess.hasHillsAccess ? ['outdoor_weighted'] : [],
    };
  }

  if (terrainAccess.hasHillsAccess) {
    return {
      meType: 'outdoor_weighted',
      templateId: '',
      reason: 'Moderate hills available. Use weighted vest/pack for ME stimulus.',
      alternativeTemplates: ['gym_based'],
    };
  }

  if (terrainAccess.treadmillAccess || terrainAccess.stairsAccess) {
    return {
      meType: 'treadmill_stairs',
      templateId: '',
      reason: 'Indoor training options available.',
      alternativeTemplates: ['gym_based'],
    };
  }

  return {
    meType: 'gym_based',
    templateId: '',
    reason: 'Default gym-based ME training.',
    alternativeTemplates: [],
  };
}

export async function fetchUserStrengthProgress(userId: string, meCategory: string): Promise<UserStrengthProgress | null> {
  try {
    const { data, error } = await supabase
      .from('user_strength_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('category', meCategory)
      .maybeSingle();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      meCategory: data.category || meCategory,
      currentWorkoutNumber: data.current_workout_number || 1,
      lastCompletedWorkout: data.current_workout_number || null,
      lastSessionDate: data.last_session_date,
      totalSessions: data.total_sessions_completed || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
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
      reason: `${daysSince} days since last session. Advancing to next workout.`,
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
    reason: `${daysSince} days since last session. Regressing due to extended break.`,
    daysSinceLastSession: daysSince,
  };
}

export async function getMETemplateForUser(userId: string): Promise<{ template: MESessionTemplate; progression: ProgressionDecision } | null> {
  try {
    const terrainAccess = await fetchUserTerrainAccess(userId);
    const meAssignment = determineMEType(terrainAccess);
    const templates = await fetchMESessionTemplates();
    const progress = await fetchUserStrengthProgress(userId, 'gym_lower');
    const progressionDecision = calculateProgressionDecision(progress, progress?.lastSessionDate || null);

    const matchingTemplate = templates.find(
      t => t.meType === meAssignment.meType && t.workoutNumber === progressionDecision.targetWorkoutNumber
    ) || templates.find(t => t.workoutNumber === progressionDecision.targetWorkoutNumber);

    if (!matchingTemplate) return null;

    return {
      template: matchingTemplate,
      progression: progressionDecision,
    };
  } catch {
    return null;
  }
}

export async function restartProgression(userId: string, meCategory: string): Promise<void> {
  try {
    await supabase
      .from('user_strength_progress')
      .upsert({
        user_id: userId,
        category: meCategory,
        current_workout_number: 1,
        last_session_date: null,
        total_sessions_completed: 0,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('Error restarting progression:', err);
  }
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
  try {
    await supabase.from('user_strength_sessions').insert({
      user_id: userId,
      template_id: session.templateId || null,
      category: session.meCategory,
      workout_number: session.workoutNumber,
      exercises_completed: session.completedExercises,
      notes: session.notes,
      completed_date: new Date().toISOString().split('T')[0],
    });

    const { data: currentProgress } = await supabase
      .from('user_strength_progress')
      .select('total_sessions_completed')
      .eq('user_id', userId)
      .eq('category', session.meCategory)
      .maybeSingle();

    const currentTotal = currentProgress?.total_sessions_completed || 0;

    await supabase.from('user_strength_progress').upsert({
      user_id: userId,
      category: session.meCategory,
      current_workout_number: session.workoutNumber,
      last_session_date: new Date().toISOString(),
      total_sessions_completed: currentTotal + 1,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error logging strength session:', err);
  }
}

export async function recordSoreness(userId: string, data: {
  triggerSessionId?: string | null;
  bodyAreas?: { muscleGroup: string; level: number }[];
  overallSoreness: number;
  isFollowup?: boolean;
  originalRecordId?: string | null;
  hasPain?: boolean;
  notes?: string;
}): Promise<SorenessRecord | null> {
  try {
    const primaryArea = data.bodyAreas?.[0];

    const { data: record, error } = await supabase
      .from('user_soreness_records')
      .insert({
        user_id: userId,
        recorded_date: new Date().toISOString().split('T')[0],
        muscle_group: primaryArea?.muscleGroup || 'general',
        soreness_level: data.overallSoreness,
        pain_location: data.hasPain ? (primaryArea?.muscleGroup || 'general') : null,
        notes: data.notes,
        affects_training: data.overallSoreness >= 6 || data.hasPain,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording soreness:', error);
      return null;
    }

    return {
      id: record.id,
      userId: record.user_id,
      triggerSessionId: null,
      bodyAreas: [{ muscleGroup: record.muscle_group, level: record.soreness_level }],
      overallSoreness: record.soreness_level,
      isFollowup: false,
      originalRecordId: null,
      hasPain: !!record.pain_location,
      notes: record.notes,
      recordedAt: record.recorded_date,
      followupCompletedAt: null,
    };
  } catch (err) {
    console.error('Error recording soreness:', err);
    return null;
  }
}

export async function getRecentSoreness(userId: string, days: number = 7): Promise<SorenessRecord[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('user_soreness_records')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_date', cutoffDate.toISOString().split('T')[0])
      .order('recorded_date', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      triggerSessionId: null,
      bodyAreas: [{ muscleGroup: row.muscle_group, level: row.soreness_level }],
      overallSoreness: row.soreness_level,
      isFollowup: false,
      originalRecordId: null,
      hasPain: !!row.pain_location,
      notes: row.notes,
      recordedAt: row.recorded_date,
      followupCompletedAt: null,
    }));
  } catch {
    return [];
  }
}

export async function getPendingFollowupChecks(_userId: string): Promise<SorenessRecord[]> {
  return [];
}

export async function getActiveLoadAdjustment(_userId: string): Promise<LoadAdjustment | null> {
  return null;
}

export async function checkAndRevertAdjustmentIfRecovered(_userId: string): Promise<boolean> {
  return false;
}
