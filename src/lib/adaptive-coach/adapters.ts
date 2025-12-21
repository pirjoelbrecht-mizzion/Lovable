/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — TYPE ADAPTERS
 *  Bridges existing Mizzion types with new Adaptive Coach types
 * ======================================================================
 * 
 * This module provides transformation functions to convert between
 * existing Mizzion data structures and the new Adaptive Coach system.
 */

import type { UserProfile } from '@/types/onboarding';
import type { Race as MizzionRace, LogEntry } from '@/types';
import type { 
  AthleteProfile, 
  RaceEvent, 
  RaceResult,
  RaceType 
} from './types';

/**
 * Convert Mizzion UserProfile + training history to AthleteProfile
 */
export function buildAthleteProfile(
  userProfile: UserProfile,
  logEntries: LogEntry[],
  races: MizzionRace[]
): Partial<AthleteProfile> {
  // Calculate weekly mileage history from log entries
  const weeklyMileage = calculateWeeklyMileageHistory(logEntries, 12);
  const averageMileage = weeklyMileage.length > 0
    ? weeklyMileage.reduce((a, b) => a + b, 0) / weeklyMileage.length
    : userProfile.avgMileage || 0;

  // Calculate average weekly vertical gain
  const weeklyVertical = calculateWeeklyVerticalHistory(logEntries, 12);
  const averageVertical = weeklyVertical.length > 0
    ? weeklyVertical.reduce((a, b) => a + b, 0) / weeklyVertical.length
    : 0;

  // Convert races to RaceResults
  const recentRaces: RaceResult[] = races
    .filter(r => new Date(r.dateISO) < new Date())
    .map(r => ({
      raceName: r.name,
      distanceKm: r.distanceKm,
      finishTimeHours: r.goalTimeMin ? r.goalTimeMin / 60 : null,
      date: r.dateISO,
    }))
    .slice(-10); // Last 10 races

  const longestRace = races.reduce((max, race) => 
    race.distanceKm > max ? race.distanceKm : max, 0
  );

  // Infer years training from experience level
  const yearsTraining = inferYearsTraining(userProfile.experienceLevel);

  // Calculate training consistency (% of planned days completed)
  const consistency = calculateConsistency(logEntries);

  // Extract HR thresholds if available from device data
  const aerobicThreshold = userProfile.deviceData?.hrAvg 
    ? Math.round(userProfile.deviceData.hrAvg * 0.85) 
    : undefined;
  const lactateThreshold = userProfile.deviceData?.hrMax 
    ? Math.round(userProfile.deviceData.hrMax * 0.88) 
    : undefined;

  return {
    name: userProfile.user_id,
    age: 30, // TODO: Add age to UserProfile
    yearsTraining,
    weeklyMileageHistory: weeklyMileage,
    averageMileage,
    averageVertical,
    recentRaces,
    longestRaceCompletedKm: longestRace,
    trainingConsistency: consistency,
    injuryHistory: [], // TODO: Extract from notes/feedback
    aerobicThreshold,
    lactateThreshold,
    surfacePreference: userProfile.surface,
    strengthPreference: userProfile.strengthPreference,
  };
}

/**
 * Convert Mizzion Race to RaceEvent
 */
export function convertRaceToEvent(race: MizzionRace): RaceEvent {
  const raceType = inferRaceType(race.distanceKm);

  // Extract elevation gain from race data
  // Support both elevationM (new field from events table) and elevationGain (legacy)
  const verticalGain = race.elevationM || race.elevationGain || 0;

  return {
    id: race.id,
    name: race.name,
    date: race.dateISO,
    distanceKm: race.distanceKm,
    verticalGain,
    raceType,
    altitude: undefined,
    climate: undefined,
    terrain: undefined,
  };
}

/**
 * Infer race type from distance
 */
function inferRaceType(distanceKm: number): RaceType {
  if (distanceKm >= 320) return "200M";
  if (distanceKm >= 160) return "100M";
  if (distanceKm >= 80) return "100K";
  if (distanceKm >= 80) return "50M";
  if (distanceKm >= 50) return "50K";
  if (distanceKm >= 42) return "Marathon";
  if (distanceKm >= 21) return "HalfMarathon";
  return "Custom";
}

/**
 * Calculate weekly mileage history from log entries
 */
function calculateWeeklyMileageHistory(
  logEntries: LogEntry[], 
  numWeeks: number
): number[] {
  const now = new Date();
  const weeks: number[] = [];

  for (let i = 0; i < numWeeks; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekKm = logEntries
      .filter(entry => {
        const entryDate = new Date(entry.dateISO);
        return entryDate >= weekStart && entryDate < weekEnd;
      })
      .reduce((sum, entry) => sum + entry.km, 0);

    weeks.unshift(weekKm); // Add to front (chronological order)
  }

  return weeks;
}

/**
 * Calculate weekly vertical gain history (in meters)
 */
function calculateWeeklyVerticalHistory(logEntries: LogEntry[], numWeeks: number): number[] {
  const weeks: number[] = [];
  const now = new Date();

  for (let i = 0; i < numWeeks; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekVertical = logEntries
      .filter(e => {
        const date = new Date(e.dateISO);
        return date >= weekStart && date < weekEnd;
      })
      .reduce((sum, e) => sum + (e.elevationGain || 0), 0);

    weeks.unshift(weekVertical); // Add to front (chronological order)
  }

  return weeks;
}

/**
 * Infer years training from experience level
 */
function inferYearsTraining(level?: string): number {
  switch (level) {
    case 'beginner': return 1;
    case 'intermediate': return 3;
    case 'advanced': return 5;
    case 'expert': return 10;
    default: return 2;
  }
}

/**
 * Calculate training consistency (rough estimate)
 */
function calculateConsistency(logEntries: LogEntry[]): number {
  if (logEntries.length === 0) return 50; // Default

  const last12Weeks = 12 * 7;
  const recentDaysWithActivity = new Set(
    logEntries
      .filter(e => {
        const daysAgo = (Date.now() - new Date(e.dateISO).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= last12Weeks;
      })
      .map(e => e.dateISO)
  ).size;

  // Rough estimate: if running 4 days/week consistently = 100%
  const expectedDays = last12Weeks * (4 / 7);
  return Math.min(100, Math.round((recentDaysWithActivity / expectedDays) * 100));
}

/**
 * Reverse: Convert AthleteProfile back to UserProfile updates
 * (Useful for saving adaptive coach data back to main profile)
 */
export function syncAthleteProfileToUserProfile(
  athleteProfile: AthleteProfile
): Partial<UserProfile> {
  return {
    avgMileage: athleteProfile.averageMileage,
    experienceLevel: athleteProfile.category === "Cat1" ? 'intermediate' : 'advanced',
    // Can extend with more fields as needed
  };
}
