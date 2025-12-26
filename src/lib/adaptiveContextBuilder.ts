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
 */

import type { AdaptiveContext, RaceInfo } from '@/engine';
import type { AthleteProfile, WeeklyPlan as AdaptiveWeeklyPlan, DailyPlan, Workout } from '@/lib/adaptive-coach/types';
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

/**
 * Convert localStorage WeekPlan format to Adaptive Coach WeeklyPlan format
 */
function convertToAdaptiveWeekPlan(localPlan: LocalStorageWeekPlan | AdaptiveWeeklyPlan): AdaptiveWeeklyPlan {
  // Check if it's already in the correct format (has days property as array)
  if ('days' in localPlan && Array.isArray(localPlan.days)) {
    return localPlan as AdaptiveWeeklyPlan;
  }

  // Convert from localStorage array format to adaptive coach object format
  const planArray = localPlan as unknown as LocalStorageWeekPlan;

  console.log('[convertToAdaptiveWeekPlan] Converting plan with dates:', planArray.map(d => d.dateISO));

  const days: DailyPlan[] = planArray.map((day, index) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Convert first session to workout, or create rest day
    const firstSession = day.sessions?.[0];
    let workout: Workout;

    if (firstSession) {
      workout = {
        type: (firstSession.type as any) || 'easy',
        title: firstSession.title || 'Training',
        description: firstSession.notes || firstSession.description,
        distanceKm: firstSession.km || firstSession.distanceKm,
        durationMin: firstSession.durationMin,
        intensityZones: firstSession.zones || [],
        verticalGain: firstSession.elevationGain,
      };
    } else {
      workout = {
        type: 'rest',
        title: 'Rest Day',
        description: 'Recovery',
      };
    }

    return {
      day: dayNames[index],
      date: day.dateISO,
      workout,
      completed: false,
      feedback: null,
    };
  });

  // Calculate totals
  const totalMileage = days.reduce((sum, d) => sum + (d.workout.distanceKm || 0), 0);
  const totalVert = days.reduce((sum, d) => sum + (d.workout.verticalGain || 0), 0);

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
 * Preserves any additional sessions from the original plan (e.g., strength sessions)
 * CRITICAL: Adds easy run before strength training on Wednesday (index 2)
 */
export function convertToLocalStoragePlan(
  adaptivePlan: AdaptiveWeeklyPlan,
  originalPlan?: LocalStorageWeekPlan
): LocalStorageWeekPlan {
  return adaptivePlan.days.map((day, idx) => {
    const primarySession = {
      id: `s_${Math.random().toString(36).slice(2)}`,
      title: day.workout.title || day.workout.type,
      type: day.workout.type,
      notes: day.workout.description,
      km: day.workout.distanceKm,
      distanceKm: day.workout.distanceKm,
      durationMin: day.workout.durationMin,
      zones: day.workout.intensityZones || [],
      elevationGain: day.workout.verticalGain,
      source: 'coach' as const,
    };

    const originalDay = originalPlan?.[idx];
    const additionalSessions = originalDay?.sessions?.slice(1) || [];

    // CRITICAL: Wednesday (index 2) should have BOTH easy run AND strength training
    // The adaptive coach only generates one workout per day (strength on Wednesday)
    // So we need to ADD the easy run when converting back to localStorage format
    const isWednesday = idx === 2;
    const isStrengthSession = primarySession.type === 'strength';

    let sessions: any[] = [];

    if (isWednesday && isStrengthSession) {
      // Add easy run BEFORE strength session
      const easyRunSession = {
        id: `s_${Math.random().toString(36).slice(2)}`,
        title: 'Easy run',
        type: 'easy',
        notes: 'Recovery run before strength work',
        km: 6,
        distanceKm: 6,
        durationMin: 36,
        zones: ['Z2'],
        elevationGain: 0,
        source: 'coach' as const,
      };
      sessions = [easyRunSession, primarySession, ...additionalSessions];
    } else {
      sessions = [primarySession, ...additionalSessions];
    }

    return {
      label: day.day.slice(0, 3), // Mon, Tue, etc.
      dateISO: day.date,
      sessions,
    };
  });
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

  // Convert plan to adaptive format (handles both formats)
  // If no plan exists or all days are empty, create a default base plan
  let adaptivePlan: AdaptiveWeeklyPlan;
  const isEmptyPlan = !plan ||
                      (Array.isArray(plan) && plan.length === 0) ||
                      (Array.isArray(plan) && plan.every(day => !day.sessions || day.sessions.length === 0));

  if (isEmptyPlan) {
    console.log('[buildAdaptiveContext] Generating default base plan (empty/missing plan detected)');
    // Generate a default 7-day base plan
    const monday = getMondayOfWeek();
    const defaultPlan: LocalStorageWeekPlan = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      const dayLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];

      // Wednesday is easy run + strength training day
      if (i === 2) {
        return {
          label: dayLabel,
          dateISO: date.toISOString().slice(0, 10),
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
        dateISO: date.toISOString().slice(0, 10),
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
    adaptivePlan = convertToAdaptiveWeekPlan(defaultPlan);
  } else {
    adaptivePlan = convertToAdaptiveWeekPlan(plan);
  }

  // Get athlete profile
  const athlete = buildAthleteProfile();

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

  // Get user ID for database queries
  const userId = await getCurrentUserId();
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
 * Mark context as refreshed
 */
export function markContextRefreshed(): void {
  const now = Date.now();
  load('lastContextRefresh', now);
}
