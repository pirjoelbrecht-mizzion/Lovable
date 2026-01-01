/**
 * ======================================================================
 *  ADAPTIVE CONTEXT BUILDER
 *  Aggregates all Module 4 input signals into a unified context
 * ======================================================================
 *
 * This module collects data from all learning systems:
 * - ACWR (Acute:Chronic Workload Ratio)
 * - Climate/Weather conditions
 * - Motivation Archetype
 * - Race Calendar
 * - Training History
 * - Location/Terrain data
 * - Athlete Profile
 *
 * Provides a single function that returns a complete AdaptiveContext
 * ready for consumption by the Adaptive Decision Engine.
 *
 * ======================================================================
 * 🚧 MULTI-SESSION MIGRATION IN PROGRESS 🚧
 * ======================================================================
 * DO NOT REINTRODUCE:
 * - Single-workout assumptions (day.workout)
 * - Title-based session detection
 * - Session merging/collapsing logic
 * - Accessing sessions[0] directly without checking length
 *
 * ALWAYS:
 * - Use day.sessions[] array
 * - Iterate over all sessions
 * - Preserve all sessions during transformations
 * - Treat sessions as atomic units
 * ======================================================================
 */

import type { AdaptiveContext, RaceInfo } from '@/engine';
import type { AthleteProfile, WeeklyPlan as AdaptiveWeeklyPlan, DailyPlan, Workout } from '@/lib/adaptive-coach/types';
import { assertNoDayWorkoutUsage } from '@/lib/architecture/invariants';
import { calculateReadinessScore } from '@/utils/readiness';
import { calculateTrainingLoad } from '@/lib/loadAnalysis';
import { getACWRZoneStatus, getACWRTrendDirection } from '@/utils/acwrZones';
import { getWeatherForLocation, type CurrentWeather } from '@/utils/weather';
import { detectMotivationArchetype } from '@/lib/motivationDetection';
import { listRaces } from '@/utils/races';
import { getLogEntriesByDateRange, getEvents, type DbEvent } from '@/lib/database';
import { getSavedLocation } from '@/utils/location';
import { loadUserProfile } from '@/state/userData';
import { load } from '@/utils/storage';
import type { WeekPlan as LocalStorageWeekPlan } from '@/lib/plan';
import { getCurrentUserId } from '@/lib/supabase';
import { deriveRestDays } from '@/lib/adaptive-coach/restDays';
import type { TrainingConstraints } from '@/lib/adaptive-coach/constraints';

/**
 * Convert localStorage WeekPlan format to Adaptive Coach WeeklyPlan format
 * ✅ MIGRATION COMPLETE: Preserves all multi-session structure
 */
function convertToAdaptiveWeekPlan(localPlan: LocalStorageWeekPlan | AdaptiveWeeklyPlan): AdaptiveWeeklyPlan {
  // Check if it's already in the correct format (has days property as array)
  if ('days' in localPlan && Array.isArray(localPlan.days)) {
    return localPlan as AdaptiveWeeklyPlan;
  }

  // Convert from localStorage array format to adaptive coach object format
  const planArray = localPlan as unknown as LocalStorageWeekPlan;

  console.log('[convertToAdaptiveWeekPlan] Converting plan with dates:', planArray.map(d => d.dateISO));

  // Safety logging: Track sessions per day
  console.log('[MULTI-SESSION] Sessions per day:',
    planArray.map((d, i) => `${d.label}: ${d.sessions?.length || 0} sessions`)
  );

  // STEP 10: Ensure no legacy day.workout property
  planArray.forEach((day) => {
    assertNoDayWorkoutUsage(day, 'adaptiveContextBuilder.convertToAdaptiveWeekPlan');
  });

  const days: DailyPlan[] = planArray.map((day, index) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Convert all sessions, or create rest day if no sessions
    const sessions = day.sessions && day.sessions.length > 0
      ? day.sessions.map((session) => ({
          type: (session.type as any) || 'easy',
          title: session.title || 'Training',
          description: session.notes || session.description,
          distanceKm: session.km || session.distanceKm,
          durationMin: session.durationMin,
          intensityZones: session.zones || [],
          verticalGain: session.elevationGain,
        }))
      : [{
          type: 'rest',
          title: 'Rest Day',
          description: 'Recovery',
        }];

    return {
      day: dayNames[index],
      date: day.dateISO,
      sessions,
      completed: false,
    };
  });

  // Calculate totals (sum across all sessions)
  const totalMileage = days.reduce((sum, d) => sum + d.sessions.reduce((s, w) => s + (w.distanceKm || 0), 0), 0);
  const totalVert = days.reduce((sum, d) => sum + d.sessions.reduce((s, w) => s + (w.verticalGain || 0), 0), 0);

  return {
    weekNumber: 1,
    phase: 'base',
    targetMileage: totalMileage,
    targetVert: totalVert,
    days,
    actualMileage: totalMileage,
    actualVert: totalVert,
  };
}

/**
 * Convert Adaptive Coach WeeklyPlan back to localStorage format
 * ✅ MIGRATION COMPLETE: Preserves all multi-session structure
 * CRITICAL: Preserves all original sessions from adaptive plan
 */
export function convertToLocalStoragePlan(
  adaptivePlan: AdaptiveWeeklyPlan,
  originalPlan?: LocalStorageWeekPlan
): LocalStorageWeekPlan {
  // Safety logging: Track conversion
  console.log('[MULTI-SESSION] Converting adaptive plan to localStorage');
  console.log('[MULTI-SESSION] Days in adaptive plan:', adaptivePlan.days.length);

  // CRITICAL GUARD: Ensure we always have 7 days
  if (!adaptivePlan.days || adaptivePlan.days.length === 0) {
    console.error('[convertToLocalStoragePlan] CRITICAL: Adaptive plan has 0 days! Creating empty week structure.');

    // Create a valid 7-day structure with rest days
    const monday = getMondayOfWeek();
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      const restSession = {
        id: `rest_${i}`,
        title: 'Rest Day',
        type: 'rest',
        notes: 'Recovery',
        km: 0,
        distanceKm: 0,
        durationMin: 0,
        zones: [],
        elevationGain: 0,
        source: 'coach' as const,
      };
      return {
        label: dayLabels[i],
        dateISO: date.toISOString().slice(0, 10),
        sessions: [restSession],
        workouts: [sessionToWorkout(restSession)], // CRITICAL: Convert to workouts
      };
    });
  }

  // Ensure exactly 7 days (fill missing days with rest days if needed)
  if (adaptivePlan.days.length < 7) {
    console.warn('[convertToLocalStoragePlan] Plan has only', adaptivePlan.days.length, 'days. Filling to 7 days.');
    const monday = getMondayOfWeek();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Fill missing days
    while (adaptivePlan.days.length < 7) {
      const idx = adaptivePlan.days.length;
      const date = new Date(monday);
      date.setDate(date.getDate() + idx);

      adaptivePlan.days.push({
        day: dayNames[idx],
        date: date.toISOString().slice(0, 10),
        sessions: [{
          type: 'rest',
          title: 'Rest Day',
          description: 'Recovery',
        }],
        completed: false,
      });
    }
  }

  const result = adaptivePlan.days.map((day, idx) => {
    // Convert all sessions from adaptive format to localStorage format
    const adaptiveSessions = day.sessions || [];

    const sessions = adaptiveSessions.map((session) => ({
      id: `s_${Math.random().toString(36).slice(2)}`,
      title: session.title || session.type,
      type: session.type,
      notes: session.description,
      km: session.distanceKm,
      distanceKm: session.distanceKm,
      durationMin: session.durationMin,
      zones: session.intensityZones || [],
      elevationGain: session.verticalGain || 0,
      source: 'coach' as const,
    }));

    // CRITICAL: Convert sessions to workouts for UI rendering
    // The UI exclusively renders from day.workouts, not day.sessions
    const workouts = sessions.map(sessionToWorkout);

    return {
      label: day.day.slice(0, 3), // Mon, Tue, etc.
      dateISO: day.date,
      sessions,
      workouts, // UI rendering layer
    };
  });

  // Safety logging: Verify output
  console.log('[MULTI-SESSION] Output sessions per day:',
    result.map(d => `${d.label}: ${d.sessions.length} sessions`)
  );
  console.log('[MULTI-SESSION] Output workouts per day:',
    result.map(d => `${d.label}: ${d.workouts?.length || 0} workouts`)
  );

  // FINAL GUARD: Ensure exactly 7 days in output
  if (result.length !== 7) {
    console.error('[convertToLocalStoragePlan] INVARIANT VIOLATION: Output has', result.length, 'days instead of 7');
    throw new Error(`Invariant violation: convertToLocalStoragePlan must return 7 days, got ${result.length}`);
  }

  // CRITICAL INVARIANT: Every day must have workouts.length === sessions.length
  const invalidDays = result.filter(day => day.workouts.length !== day.sessions.length);
  if (invalidDays.length > 0) {
    console.error('[convertToLocalStoragePlan] INVARIANT VIOLATION: Mismatch between sessions and workouts');
    invalidDays.forEach(day => {
      console.error(`  ${day.label}: ${day.sessions.length} sessions but ${day.workouts.length} workouts`);
    });
    throw new Error(`Invariant violation: workouts.length must equal sessions.length on all days`);
  }

  return result;
}

/**
 * Calculate climate risk level from weather data
 * Only flags HEAT stress levels - cold is not heat stress
 */
function calculateClimateLevel(weather: CurrentWeather): 'green' | 'yellow' | 'orange' | 'red' | 'black' {
  const { heatIndex, temp } = weather;

  const effectiveTemp = heatIndex || temp;

  if (effectiveTemp < 25) return 'green'; // Cool to comfortable - no heat stress
  if (effectiveTemp < 28) return 'yellow'; // Warm - mild heat concern
  if (effectiveTemp < 32) return 'orange'; // Hot - moderate heat stress
  if (effectiveTemp < 38) return 'red'; // Very hot - high heat stress
  return 'black'; // Extreme heat danger
}

/**
 * Calculate WBGT (Wet Bulb Globe Temperature) approximation
 */
function calculateWBGT(temp: number, humidity: number): number {
  // Simplified WBGT formula for outdoor conditions
  // WBGT ≈ 0.7 * wetBulb + 0.2 * globeTemp + 0.1 * dryBulb
  // Approximation: wetBulb ≈ temp * atan(0.151977 * sqrt(humidity + 8.313659)) + ...

  const humidityFactor = humidity / 100;
  const wbgt = temp * (0.567 + 0.393 * humidityFactor) + 3.94;

  return Math.round(wbgt * 10) / 10;
}

/**
 * Convert user profile to athlete profile for Module 4
 */
function buildAthleteProfile(): AthleteProfile {
  const userProfile = loadUserProfile();

  return {
    id: 'current-user',
    level: userProfile.experienceLevel === 'beginner' ? 'novice' :
           userProfile.experienceLevel === 'intermediate' ? 'intermediate' : 'advanced',
    weeklyKmBase: userProfile.weeklyVolumeKm || 40,
    maxWeeklyKm: (userProfile.weeklyVolumeKm || 40) * 1.5,
    restDaysPerWeek: 1,
    longRunMaxKm: userProfile.longRunKm || 20,
    vo2max: userProfile.vo2max,
    thresholdPace: userProfile.paceBase,
    easyPace: userProfile.paceBase * 1.15,
    injuries: [],
    preferences: {
      terrain: userProfile.preferredTerrain as 'road' | 'trail' | 'mixed' || 'mixed',
      morningRunner: true,
      intensity: 'moderate',
    },
  };
}

/**
 * Load Supabase user profile for rest days and training preferences
 */
async function loadSupabaseProfile(): Promise<any> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const { getUserProfile } = await import('@/lib/userProfile');
      return await getUserProfile(userId);
    }
  } catch (error) {
    console.warn('[loadSupabaseProfile] Failed to load:', error);
  }
  return null;
}

/**
 * Get training history metrics
 */
async function getTrainingHistory() {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate4Weeks = new Date();
  startDate4Weeks.setDate(startDate4Weeks.getDate() - 28);
  const start4Weeks = startDate4Weeks.toISOString().slice(0, 10);

  const startDate2Weeks = new Date();
  startDate2Weeks.setDate(startDate2Weeks.getDate() - 14);
  const start2Weeks = startDate2Weeks.toISOString().slice(0, 10);

  const entries4Weeks = await getLogEntriesByDateRange(start4Weeks, endDate);
  const entries2Weeks = await getLogEntriesByDateRange(start2Weeks, endDate);

  // Calculate completion rate (assuming 5 sessions per week expected)
  const expectedSessions = 4 * 5;
  const completionRate = Math.min(1.0, entries4Weeks.length / expectedSessions);

  // Calculate average fatigue
  const fatigueValues = entries4Weeks
    .map(e => load<number>(`fatigue:${e.dateISO}`, 5))
    .filter(f => f > 0);
  const averageFatigue = fatigueValues.length > 0
    ? fatigueValues.reduce((sum, f) => sum + f, 0) / fatigueValues.length
    : 5;

  // Count missed workouts in last 2 weeks
  const expected2Weeks = 2 * 5;
  const missedWorkouts = Math.max(0, expected2Weeks - entries2Weeks.length);

  // Find last hard workout
  const sortedEntries = [...entries4Weeks].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  let lastHardWorkout = 7;

  for (const entry of sortedEntries) {
    const isHard = (entry.hrAvg && entry.hrAvg > 160) ||
                   (entry.km && entry.km > 15) ||
                   (entry.durationMin && entry.km && (entry.durationMin / entry.km) < 5.5);

    if (isHard) {
      const daysDiff = Math.floor(
        (new Date().getTime() - new Date(entry.dateISO).getTime()) / (1000 * 60 * 60 * 24)
      );
      lastHardWorkout = daysDiff;
      break;
    }
  }

  return {
    completionRate,
    averageFatigue,
    missedWorkouts,
    lastHardWorkout,
  };
}

/**
 * Convert calendar event to RaceInfo format
 */
function convertEventToRaceInfo(event: DbEvent): RaceInfo {
  // Parse expected time (HH:MM:SS) to calculate distance if not provided
  let distanceKm = event.distance_km || 0;
  let expectedTimeMin: number | undefined;

  // Parse expected_time to minutes
  if (event.expected_time) {
    const parts = event.expected_time.split(':').map(Number);
    if (parts.length >= 2) {
      const hours = parts[0] || 0;
      const minutes = parts[1] || 0;
      const seconds = parts.length >= 3 ? parts[2] || 0 : 0;
      expectedTimeMin = hours * 60 + minutes + seconds / 60;
    }
  }

  // If GPX was uploaded, distance will be available
  // Otherwise estimate from expected time (conservative estimate)
  if (!distanceKm && expectedTimeMin) {
    // Assume 6 min/km pace for estimation
    distanceKm = expectedTimeMin / 6;
  }

  const raceInfo = {
    id: event.id || 'event-' + event.date,
    name: event.name,
    date: event.date,
    distanceKm,
    priority: (event.priority as 'A' | 'B' | 'C') || 'B',
    verticalGain: event.elevation_gain || 0,
    expectedTimeMin,
    climate: undefined,
  };

  console.log('[convertEventToRaceInfo] Event:', event.name, {
    elevation_gain: event.elevation_gain,
    expected_time: event.expected_time,
    verticalGain: raceInfo.verticalGain,
    expectedTimeMin: raceInfo.expectedTimeMin
  });

  return raceInfo;
}

/**
 * Get race calendar data (includes both races and calendar events)
 */
async function getRaceCalendarData() {
  const races = await listRaces();
  const events = await getEvents();
  const now = new Date();

  // Include races from the last 7 days to handle post-race recovery planning
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Combine races and events (include recent past races for recovery planning)
  const upcomingRaces = races
    .filter(r => new Date(r.dateISO) >= sevenDaysAgo)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= sevenDaysAgo)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Convert events to RaceInfo format
  const eventInfos = upcomingEvents.map(convertEventToRaceInfo);

  // Convert races to RaceInfo format
  const raceInfos: RaceInfo[] = upcomingRaces.map(r => ({
    id: r.id,
    name: r.name,
    date: r.dateISO,
    distanceKm: r.distanceKm || 42.195,
    priority: (r.priority || 'C') as 'A' | 'B' | 'C',
    verticalGain: r.elevationGain || 0,
    climate: undefined,
  }));

  // Merge and sort all events (events first - they have more detailed data like expectedTimeMin)
  const allUpcoming = [...eventInfos, ...raceInfos].sort((a, b) => a.date.localeCompare(b.date));

  console.log('[getRaceCalendarData] allUpcoming:', allUpcoming.map((r, i) => ({
    index: i,
    name: r.name,
    date: r.date,
    priority: r.priority,
    expectedTimeMin: r.expectedTimeMin,
    verticalGain: r.verticalGain,
    id: r.id
  })));

  const mainRace = allUpcoming.find(r => r.priority === 'A') || allUpcoming[0] || null;
  const mainRaceIndex = mainRace ? allUpcoming.indexOf(mainRace) : -1;
  console.log('[getRaceCalendarData] Selected mainRace at index', mainRaceIndex, ':', mainRace ? {
    name: mainRace.name,
    expectedTimeMin: mainRace.expectedTimeMin,
    verticalGain: mainRace.verticalGain,
    id: mainRace.id
  } : null);

  const nextRace = allUpcoming[0] || null;

  const daysToMainRace = mainRace
    ? Math.ceil((new Date(mainRace.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const daysToNextRace = nextRace
    ? Math.ceil((new Date(nextRace.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // CRITICAL: Debug log for race/event detection
  if (mainRace) {
    console.log('🏁 Race/Event Found:', mainRace.name, '| Days away:', daysToMainRace, '| Priority:', mainRace.priority);
    if (daysToMainRace <= 7) {
      console.log('⚠️ RACE WEEK ACTIVE - Should override to race_week/taper phase');
    }
  }

  return {
    mainRace,
    nextRace,
    allUpcoming,
    daysToMainRace,
    daysToNextRace,
  };
}

/**
 * Get location and terrain data
 */
function getLocationData() {
  const location = getSavedLocation();
  const recentElevation = load<number>('recentElevationGain', 0);
  const terrainType = load<'road' | 'trail' | 'mixed'>('terrainType', 'mixed');
  const isTravel = load<boolean>('isTravelMode', false);

  return {
    currentElevation: location?.elevation || 0,
    recentElevationGain: recentElevation,
    terrainType,
    isTravel,
  };
}

/**
 * Helper: Get Monday of current week
 */
function getMondayOfWeek(): string {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Build complete adaptive context for Module 4
 */
export async function buildAdaptiveContext(plan?: LocalStorageWeekPlan | AdaptiveWeeklyPlan): Promise<AdaptiveContext> {
  // Validate plan week alignment
  if (plan && Array.isArray(plan) && plan.length > 0) {
    const expectedMonday = getMondayOfWeek();
    const planMonday = plan[0].dateISO;

    if (planMonday !== expectedMonday) {
      console.warn(`⚠️ [buildAdaptiveContext] Plan week misalignment detected!`);
      console.warn(`   Expected Monday: ${expectedMonday}`);
      console.warn(`   Plan starts on: ${planMonday}`);
      console.warn(`   Clearing cached plan to regenerate with correct dates...`);

      // Clear the cached plan
      localStorage.removeItem('weekPlan');
      localStorage.removeItem('weekPlan_current');

      // Return empty plan to force regeneration
      plan = undefined;
    }
  }

  // Load Supabase profile for user-defined rest days
  const supabaseProfile = await loadSupabaseProfile();

  // Get athlete profile early (needed for constraints and context)
  const athlete = buildAthleteProfile();
  const userProfile = loadUserProfile();

  // PHASE 2 CRITICAL GUARD: Check if adaptive plan exists and is authoritative
  // If adaptive plan exists, skip ALL default plan generation
  const existingPlanSource = Array.isArray(plan) && plan.length > 0 ? plan[0]?.planSource : null;
  const isAdaptiveAuthoritative = existingPlanSource === 'adaptive' &&
                                  Array.isArray(plan) &&
                                  plan.some(day => day.sessions && day.sessions.length > 0);

  if (isAdaptiveAuthoritative) {
    console.log('[buildAdaptiveContext] ✅ Adaptive plan is authoritative - skipping default generation');
  }

  // Convert plan to adaptive format (handles both formats)
  // If no plan exists or all days are empty, create a default base plan
  // BUT ONLY if no adaptive plan exists (never override adaptive plans)
  let adaptivePlan: AdaptiveWeeklyPlan;
  const isEmptyPlan = !plan ||
                      (Array.isArray(plan) && plan.length === 0) ||
                      (Array.isArray(plan) && plan.every(day => !day.sessions || day.sessions.length === 0));

  // CRITICAL GUARD: Check if adaptive execution is pending
  // If adaptive execution will run soon, don't generate fallback plan
  const userId = await getCurrentUserId();
  const { shouldTriggerAdaptiveExecution } = await import('@/lib/adaptiveExecutionLock');
  const { should: adaptivePending } = shouldTriggerAdaptiveExecution(userId);

  if (isEmptyPlan && !isAdaptiveAuthoritative) {
    // If adaptive execution is pending and we have user constraints, skip fallback
    const hasUserConstraints = supabaseProfile?.restDays || supabaseProfile?.daysPerWeek;

    if (adaptivePending && hasUserConstraints) {
      console.log('[buildAdaptiveContext] ⏭️ Skipping fallback plan - adaptive execution pending with user constraints');
      // Return minimal valid 7-day plan with all rest days
      // CRITICAL: Must have 7 days to prevent downstream failures
      const monday = getMondayOfWeek();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const emptyDays: DailyPlan[] = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + i);
        return {
          day: dayNames[i],
          date: date.toISOString().slice(0, 10),
          sessions: [{
            type: 'rest',
            title: 'Rest Day',
            description: 'Recovery',
          }],
          completed: false,
        };
      });

      adaptivePlan = {
        weekNumber: 1,
        phase: 'base',
        targetMileage: 0,
        targetVert: 0,
        days: emptyDays,
        actualMileage: 0,
        actualVert: 0,
      };
    } else {
      console.log('[buildAdaptiveContext] Generating default base plan (empty/missing plan detected)');

      // Extract constraints to respect rest days during plan generation
      // Pass Supabase profile to get user-defined rest days
      const constraints = extractTrainingConstraints(athlete, supabaseProfile || userProfile);
      const restDaySet = new Set(constraints.restDays || []);

      console.log('[buildAdaptiveContext] Rest days from constraints:', constraints.restDays, 'daysPerWeek:', constraints.daysPerWeek);

      // Generate a default 7-day base plan RESPECTING REST DAYS
      const monday = getMondayOfWeek();
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
      const defaultPlan: LocalStorageWeekPlan = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + i);
        const dayLabel = dayLabels[i];
        const dateStr = date.toISOString().slice(0, 10);

        // CRITICAL: Check if this day is a rest day
        const isRestDay = restDaySet.has(dayLabel);

        if (isRestDay) {
          // Rest days have no sessions
          console.log(`[buildAdaptiveContext] ${dayLabel} is a rest day (from constraints)`);
          return {
            label: dayLabel,
            dateISO: dateStr,
            sessions: []
          };
        }

        // Wednesday is easy run + strength training day
        if (i === 2) {
          return {
            label: dayLabel,
            dateISO: dateStr,
            sessions: [
              {
                id: `default_${i}_run`,
                title: 'Easy run',
                type: 'easy',
                notes: 'Recovery run',
                km: 6,
                distanceKm: 6,
                durationMin: 36,
                zones: ['Z2'],
                elevationGain: 0,
                source: 'coach' as const
              },
              {
                id: `default_${i}_strength`,
                title: 'Strength Training',
                type: 'strength',
                notes: 'ME session - terrain-based strength work',
                km: 0,
                distanceKm: 0,
                durationMin: 40,
                zones: [],
                elevationGain: 0,
                source: 'coach' as const
              }
            ]
          };
        }

        return {
          label: dayLabel,
          dateISO: dateStr,
          sessions: [{
            id: `default_${i}`,
            title: 'Easy Run',
            type: 'easy',
            notes: 'Base training',
            km: 8,
            distanceKm: 8,
            durationMin: 48,
            zones: ['Z2'],
            elevationGain: 0,
            source: 'coach' as const
          }]
        };
      });

      // Validate training day count matches constraints
      const trainingDays = defaultPlan.filter(d => d.sessions && d.sessions.length > 0);
      if (trainingDays.length !== constraints.daysPerWeek) {
        console.warn('[buildAdaptiveContext] Training day count mismatch!', {
          expected: constraints.daysPerWeek,
          actual: trainingDays.length,
          trainingDays: trainingDays.map(d => d.label),
          restDays: constraints.restDays
        });
      }

      adaptivePlan = convertToAdaptiveWeekPlan(defaultPlan);
    }
  } else {
    adaptivePlan = convertToAdaptiveWeekPlan(plan);
  }

  // Get ACWR data
  const trainingLoad = await calculateTrainingLoad();
  const acwrHistory = load<number[]>('acwrHistory', []);
  const currentACWR = trainingLoad.chronicLoad > 0
    ? trainingLoad.acuteLoad / trainingLoad.chronicLoad
    : 1.0;
  const projectedACWR = load<number>('projectedACWR', currentACWR);
  const acwrTrend = getACWRTrendDirection([...acwrHistory, currentACWR]);
  const acwrZone = getACWRZoneStatus(currentACWR);

  const riskLevel = acwrZone === 'extreme-risk' ? 'extreme' :
                    acwrZone === 'high-risk' ? 'high' :
                    acwrZone === 'caution' ? 'moderate' : 'low';

  // Get climate data
  const location = getSavedLocation();
  let weather: CurrentWeather;

  if (location) {
    try {
      weather = await getWeatherForLocation(location.lat, location.lon);
    } catch (error) {
      // Fallback to default weather
      weather = {
        temp: 20,
        humidity: 50,
        wind: 5,
        conditions: 'Clear',
        feelsLike: 20,
        precipChance: 0,
        uvIndex: 5,
        icon: 'sun',
        description: 'Clear conditions',
      };
    }
  } else {
    weather = {
      temp: 20,
      humidity: 50,
      wind: 5,
      conditions: 'Clear',
      feelsLike: 20,
      precipChance: 0,
      uvIndex: 5,
      icon: 'sun',
      description: 'Clear conditions',
    };
  }

  const wbgt = calculateWBGT(weather.temp, weather.humidity);
  const climateLevel = calculateClimateLevel(weather);

  // Reuse userId from earlier (already loaded)
  if (!userId) {
    console.warn('[Context Builder] No user ID found - returning fallback motivation data');
  }

  // Get motivation data
  const motivationProfile = userId
    ? await detectMotivationArchetype(userId)
    : null;
  const recentEngagement = load<number>('recentEngagement', 0.8);

  // Get training history
  const history = await getTrainingHistory();

  // Get race calendar
  const races = await getRaceCalendarData();

  // Get location data
  const locationData = getLocationData();

  return {
    athlete,
    plan: adaptivePlan,
    acwr: {
      current: currentACWR,
      projected: projectedACWR,
      trend: acwrTrend,
      riskLevel,
    },
    climate: {
      currentTemp: weather.temp,
      humidity: weather.humidity,
      heatIndex: weather.heatIndex || weather.feelsLike,
      wbgt,
      level: climateLevel,
      conditions: weather.conditions,
    },
    motivation: {
      archetype: motivationProfile?.dominant || 'achiever',
      confidence: motivationProfile?.confidence || 0.5,
      recentEngagement,
    },
    races,
    history,
    location: locationData,
  };
}

/**
 * Check if context needs refresh
 * Returns true if any key data is stale
 */
export function shouldRefreshContext(): boolean {
  const lastRefresh = load<number>('lastContextRefresh', 0);
  const now = Date.now();
  const hoursSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60);

  // Refresh if more than 1 hour old
  if (hoursSinceRefresh > 1) {
    return true;
  }

  // Refresh if ACWR was recently updated
  const acwrUpdated = load<number>('acwrLastUpdate', 0);
  if (acwrUpdated > lastRefresh) {
    return true;
  }

  // Refresh if weather was recently updated
  const weatherUpdated = load<number>('weatherLastUpdate', 0);
  if (weatherUpdated > lastRefresh) {
    return true;
  }

  // Refresh if race calendar changed
  const racesUpdated = load<number>('racesLastUpdate', 0);
  if (racesUpdated > lastRefresh) {
    return true;
  }

  return false;
}

/**
 * Extract training constraints from athlete profile and user profile.
 * v2.0: Respects user-defined rest days, only derives from daysPerWeek as fallback.
 *
 * Rest days are HARD constraints:
 * - Auto-fill never places sessions on rest days
 * - Rest days always win over time/volume targets
 * - Plan validation flags any rest-day violations
 *
 * Priority order:
 * 1. User-defined rest days (from onboarding/profile)
 * 2. Derived from daysPerWeek (only if no explicit rest days)
 *
 * @param athlete - Athlete profile from onboarding/history
 * @param userProfile - User profile with optional rest days and daysPerWeek
 * @returns Training constraints with user-defined or derived rest days
 */
export function extractTrainingConstraints(
  athlete: AthleteProfile,
  userProfile?: ReturnType<typeof loadUserProfile>
): TrainingConstraints {
  const daysPerWeek = userProfile?.daysPerWeek ?? athlete.daysPerWeek ?? 3;

  // CRITICAL FIX: Check for user-defined rest days first
  // Load from Supabase profile if available
  let restDays: string[] = [];

  // Try to get rest days from user profile (Supabase)
  const userRestDays = (userProfile as any)?.restDays;

  if (userRestDays && Array.isArray(userRestDays) && userRestDays.length > 0) {
    // User has explicitly defined rest days - use them
    restDays = userRestDays;
    console.log('[extractTrainingConstraints] Using user-defined rest days:', restDays);
  } else {
    // No explicit rest days - derive from daysPerWeek as soft preference
    restDays = deriveRestDays(daysPerWeek);
    console.log('[extractTrainingConstraints] Deriving rest days from daysPerWeek:', daysPerWeek, '→', restDays);
  }

  return {
    daysPerWeek,
    restDays,
    targetHoursMin: athlete.targetHoursMin,
    targetHoursMax: athlete.targetHoursMax,
    maxVertPerDay: athlete.maxVertPerDay,
  };
}

/**
 * Mark context as refreshed
 */
export function markContextRefreshed(): void {
  const now = Date.now();
  load('lastContextRefresh', now);
}
