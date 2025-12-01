import type { Race } from '@/utils/races';
import { getSupabase, getCurrentUserId } from '@/lib/supabase';

export type PlanType =
  | 'BASE'
  | 'SPEED'
  | '10K'
  | 'HALF'
  | 'MARATHON'
  | '50K'
  | '50M'
  | '100K'
  | '100M'
  | '200M';

export interface GoalState {
  goalDistance: number;
  planType: PlanType;
  targetRace: Race | null;
  nextRace: Race | null;
  computedAt: string;
  metadata?: Record<string, any>;
}

export interface TrainingGoalStateDb {
  id?: string;
  user_id?: string;
  goal_distance_km: number;
  plan_type: string;
  target_race_id: string | null;
  target_race_name: string | null;
  target_race_date: string | null;
  next_race_id: string | null;
  next_race_name: string | null;
  next_race_date: string | null;
  computation_metadata?: Record<string, any>;
  last_computed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export function mapDistanceToPlan(distanceKm: number): PlanType {
  if (distanceKm >= 200) return '200M';
  if (distanceKm >= 160) return '100M';
  if (distanceKm >= 120) return '100K';
  if (distanceKm >= 80) return '50M';
  if (distanceKm >= 42) return '50K';
  if (distanceKm >= 21) return 'MARATHON';
  if (distanceKm >= 10) return 'HALF';
  if (distanceKm >= 5) return '10K';
  return 'BASE';
}

export function computeGoalState(races: Race[], currentDate: Date = new Date()): GoalState {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const futureRaces = races
    .filter(r => {
      const raceDate = new Date(r.dateISO);
      raceDate.setHours(0, 0, 0, 0);
      return raceDate >= today;
    })
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  if (futureRaces.length === 0) {
    return {
      goalDistance: 0,
      planType: 'BASE',
      targetRace: null,
      nextRace: null,
      computedAt: new Date().toISOString(),
      metadata: {
        totalFutureRaces: 0,
        reason: 'no_upcoming_races',
      },
    };
  }

  const longestRace = futureRaces.reduce((max, r) => {
    const maxDist = max.distanceKm || 0;
    const rDist = r.distanceKm || 0;
    return rDist > maxDist ? r : max;
  });

  const nextRace = futureRaces[0];

  const planType = mapDistanceToPlan(longestRace.distanceKm || 0);

  const aRaces = futureRaces.filter(r => r.priority === 'A');
  const weeksToLongestRace = Math.ceil(
    (new Date(longestRace.dateISO).getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  return {
    goalDistance: longestRace.distanceKm || 0,
    planType,
    targetRace: longestRace,
    nextRace: nextRace.id !== longestRace.id ? nextRace : null,
    computedAt: new Date().toISOString(),
    metadata: {
      totalFutureRaces: futureRaces.length,
      aRaceCount: aRaces.length,
      weeksToGoalRace: weeksToLongestRace,
      reason: 'longest_race_distance',
      allFutureRaceIds: futureRaces.map(r => r.id),
    },
  };
}

export async function updateTrainingGoal(races: Race[]): Promise<GoalState> {
  const state = computeGoalState(races);

  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[goalEngine] Supabase not available, returning computed state without persisting');
    return state;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[goalEngine] No user ID, returning computed state without persisting');
    return state;
  }

  const dbState: Partial<TrainingGoalStateDb> = {
    user_id: userId,
    goal_distance_km: state.goalDistance,
    plan_type: state.planType,
    target_race_id: state.targetRace?.id || null,
    target_race_name: state.targetRace?.name || null,
    target_race_date: state.targetRace?.dateISO || null,
    next_race_id: state.nextRace?.id || null,
    next_race_name: state.nextRace?.name || null,
    next_race_date: state.nextRace?.dateISO || null,
    computation_metadata: state.metadata || {},
    last_computed_at: state.computedAt,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: fetchError } = await supabase
    .from('training_goal_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('[goalEngine] Error fetching existing goal state:', fetchError);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('training_goal_state')
      .update(dbState)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[goalEngine] Error updating training goal state:', updateError);
    } else {
      console.log('[goalEngine] Training goal updated:', {
        planType: state.planType,
        goalDistance: state.goalDistance,
        targetRace: state.targetRace?.name,
      });
    }
  } else {
    const { error: insertError } = await supabase
      .from('training_goal_state')
      .insert([{ ...dbState, created_at: new Date().toISOString() }]);

    if (insertError) {
      console.error('[goalEngine] Error inserting training goal state:', insertError);
    } else {
      console.log('[goalEngine] Training goal created:', {
        planType: state.planType,
        goalDistance: state.goalDistance,
        targetRace: state.targetRace?.name,
      });
    }
  }

  window.dispatchEvent(
    new CustomEvent('training:goalUpdated', {
      detail: state,
    })
  );

  return state;
}

export async function getTrainingGoalState(): Promise<GoalState | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[goalEngine] Supabase not available');
    return null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[goalEngine] No user ID');
    return null;
  }

  const { data, error } = await supabase
    .from('training_goal_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[goalEngine] Error fetching goal state:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    goalDistance: data.goal_distance_km,
    planType: data.plan_type as PlanType,
    targetRace: data.target_race_id
      ? {
          id: data.target_race_id,
          name: data.target_race_name || '',
          dateISO: data.target_race_date || '',
          distanceKm: data.goal_distance_km,
        }
      : null,
    nextRace: data.next_race_id
      ? {
          id: data.next_race_id,
          name: data.next_race_name || '',
          dateISO: data.next_race_date || '',
        }
      : null,
    computedAt: data.last_computed_at || data.updated_at || '',
    metadata: data.computation_metadata || {},
  };
}

export function shouldRegenerateSeasonPlan(
  currentGoal: GoalState | null,
  newGoal: GoalState
): boolean {
  if (!currentGoal) return true;

  if (currentGoal.planType !== newGoal.planType) return true;

  if (currentGoal.targetRace?.id !== newGoal.targetRace?.id) return true;

  if (currentGoal.goalDistance !== newGoal.goalDistance) return true;

  return false;
}

export function detectGoalConflicts(races: Race[]): {
  hasConflict: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureRaces = races
    .filter(r => {
      const raceDate = new Date(r.dateISO);
      raceDate.setHours(0, 0, 0, 0);
      return raceDate >= today;
    })
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  if (futureRaces.length === 0) return { hasConflict: false, warnings };

  const aRaces = futureRaces.filter(r => r.priority === 'A');
  const longestRace = futureRaces.reduce((max, r) =>
    (r.distanceKm || 0) > (max.distanceKm || 0) ? r : max
  );

  if (aRaces.length > 0 && !aRaces.find(r => r.id === longestRace.id)) {
    const shortestARace = aRaces.reduce((min, r) =>
      (r.distanceKm || 0) < (min.distanceKm || 0) ? r : min
    );

    if ((shortestARace.distanceKm || 0) < (longestRace.distanceKm || 0) * 0.7) {
      warnings.push(
        `Your longest race is ${longestRace.name} (${longestRace.distanceKm}km), ` +
          `but you've marked ${shortestARace.name} (${shortestARace.distanceKm}km) as an A priority race. ` +
          `Training will focus on the longer distance to ensure proper preparation.`
      );
    }
  }

  for (let i = 0; i < futureRaces.length - 1; i++) {
    const race1 = futureRaces[i];
    const race2 = futureRaces[i + 1];

    const date1 = new Date(race1.dateISO);
    const date2 = new Date(race2.dateISO);
    const weeksBetween = Math.ceil((date2.getTime() - date1.getTime()) / (7 * 24 * 60 * 60 * 1000));

    if (weeksBetween < 3 && (race1.priority === 'A' || race2.priority === 'A')) {
      const dist1 = race1.distanceKm || 0;
      const dist2 = race2.distanceKm || 0;

      if (dist1 > 30 || dist2 > 30) {
        warnings.push(
          `${race1.name} and ${race2.name} are only ${weeksBetween} weeks apart. ` +
            `This may not allow sufficient recovery and preparation time.`
        );
      }
    }
  }

  return {
    hasConflict: warnings.length > 0,
    warnings,
  };
}

export function getPlanDescription(planType: PlanType): string {
  const descriptions: Record<PlanType, string> = {
    BASE: 'Base building and aerobic development',
    SPEED: 'Speed and 5K-10K performance focus',
    '10K': '10K road racing program',
    HALF: 'Half marathon training',
    MARATHON: 'Marathon training (42.2km)',
    '50K': '50K ultra marathon training',
    '50M': '50 mile ultra marathon training',
    '100K': '100K ultra marathon training',
    '100M': '100 mile ultra marathon training',
    '200M': '200 mile ultra marathon training',
  };

  return descriptions[planType] || 'Custom training plan';
}
