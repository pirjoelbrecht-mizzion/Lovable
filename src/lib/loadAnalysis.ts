import { getLogEntriesByDateRange, getEvents } from './database';
import type { LogEntry } from '@/types';
import { isACWREligible, calculateACWRLoad } from './acwrActivityClassification';

export type TrainingLoad = {
  acuteLoad: number;         // ACWR-eligible minutes (cardio only)
  chronicLoad: number;        // ACWR-eligible minutes (cardio only)
  progressionRatio: number;   // ACWR ratio (acute / chronic)
  last7DaysKm: number;        // Total km (all activities) for display
  last28DaysKm: number;       // Total km (all activities) for display
  last7DaysMinutes: number;   // ACWR-eligible minutes
  last28DaysMinutes: number;  // ACWR-eligible minutes
  eventLoadLast7Days: number;
  eventLoadLast28Days: number;
  breakdown: {                // Activity type breakdown
    cardio: number;
    strength: number;
    skill: number;
    excluded: number;
  };
  recommendation: 'increase' | 'maintain' | 'reduce' | 'taper';
};

function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = d.getDay();
  // Calculate days to subtract to get to Monday (week start)
  // If Sunday (0), go back 6 days. Otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculate event workload in km-equivalent
 */
function calculateEventWorkload(event: any): number {
  let workloadKm = 0;

  // Base workload from distance
  if (event.distance_km) {
    workloadKm = event.distance_km;
  } else if (event.expected_time) {
    // Estimate from time (assume 6 min/km pace)
    const [hours, minutes] = event.expected_time.split(':').map(Number);
    const totalMinutes = (hours || 0) * 60 + (minutes || 0);
    workloadKm = totalMinutes / 6;
  }

  // Add elevation workload (100m elevation = 1km flat equivalent)
  if (event.elevation_gain) {
    workloadKm += event.elevation_gain / 100;
  }

  // Priority multiplier
  const priorityMultiplier = {
    'A': 1.5,
    'B': 1.2,
    'C': 1.0,
  };
  const priority = event.priority || 'B';
  workloadKm *= priorityMultiplier[priority as 'A' | 'B' | 'C'] || 1.0;

  return workloadKm;
}

export async function calculateTrainingLoad(referenceDate?: Date): Promise<TrainingLoad> {
  const today = referenceDate || new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const last7Start = addDays(todayStr, -6);
  const last28Start = addDays(todayStr, -27);

  // Get training activities
  const entries = await getLogEntriesByDateRange(last28Start, todayStr);

  // Calculate total km for ALL activities (for display/legacy compatibility)
  const last7DaysKm = entries
    .filter(e => e.dateISO >= last7Start)
    .reduce((sum, e) => sum + (e.km || 0), 0);

  const last28DaysKm = entries.reduce((sum, e) => sum + (e.km || 0), 0);

  // Calculate ACWR-eligible load (CARDIO ONLY, in minutes)
  const activitiesLast7Days = entries
    .filter(e => e.dateISO >= last7Start)
    .map(e => ({
      type: e.sportType || 'Run',  // Use sportType field
      durationMinutes: e.durationMin || 0,  // Use durationMin field
      hasHeartRate: !!e.hrAvg,
      averageHeartRate: e.hrAvg,
      isEnduranceMode: false,  // TODO: Add endurance mode detection
    }));

  const activitiesLast28Days = entries.map(e => ({
    type: e.sportType || 'Run',  // Use sportType field
    durationMinutes: e.durationMin || 0,  // Use durationMin field
    hasHeartRate: !!e.hrAvg,
    averageHeartRate: e.hrAvg,
    isEnduranceMode: false,
  }));

  const acwrDataLast7Days = calculateACWRLoad(activitiesLast7Days);
  const acwrDataLast28Days = calculateACWRLoad(activitiesLast28Days);

  const last7DaysMinutes = acwrDataLast7Days.totalACWRMinutes;
  const last28DaysMinutes = acwrDataLast28Days.totalACWRMinutes;

  // Log ACWR breakdown for transparency
  console.log('[ACWR Load Analysis] Last 28 days:', {
    totalACWRMinutes: last28DaysMinutes,
    includedActivities: acwrDataLast28Days.includedActivities,
    excludedActivities: acwrDataLast28Days.excludedActivities,
    breakdown: acwrDataLast28Days.breakdown,
    note: 'ACWR includes cardio only - strength/skill activities excluded',
  });

  // Get calendar events and calculate their workload (events are always cardio)
  const events = await getEvents(100);

  const eventLoadLast7Days = events
    .filter(e => e.date >= last7Start && e.date <= todayStr)
    .reduce((sum, e) => sum + calculateEventWorkload(e), 0);

  const eventLoadLast28Days = events
    .filter(e => e.date >= last28Start && e.date <= todayStr)
    .reduce((sum, e) => sum + calculateEventWorkload(e), 0);

  // ACWR = Acute Load (7 days) / Chronic Load (28 days average)
  // Acute = last 7 days of ACWR-eligible minutes
  // Chronic = average of last 28 days of ACWR-eligible minutes
  const acuteLoad = last7DaysMinutes;
  const chronicLoad = last28DaysMinutes / 4;  // 4-week average
  const progressionRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  let recommendation: TrainingLoad['recommendation'] = 'maintain';
  if (progressionRatio > 1.5) {
    recommendation = 'reduce';
  } else if (progressionRatio > 1.3) {
    recommendation = 'maintain';
  } else if (progressionRatio < 0.8) {
    recommendation = 'increase';
  } else if (progressionRatio < 0.6) {
    recommendation = 'taper';
  }

  return {
    acuteLoad,           // ACWR-eligible minutes (cardio only)
    chronicLoad,         // ACWR-eligible minutes (cardio only)
    progressionRatio,    // ACWR ratio
    last7DaysKm,         // Total km (all activities)
    last28DaysKm,        // Total km (all activities)
    last7DaysMinutes,    // ACWR-eligible minutes
    last28DaysMinutes,   // ACWR-eligible minutes
    eventLoadLast7Days,  // Event load (km-equivalent)
    eventLoadLast28Days, // Event load (km-equivalent)
    breakdown: acwrDataLast28Days.breakdown,  // Activity breakdown
    recommendation,
  };
}

export async function calculateWeeklyMetrics(weekStartDate: string): Promise<{
  total_km: number;
  avg_hr: number | undefined;
  avg_rpe: number | undefined;
  progression_ratio: number;
}> {
  const weekEndDate = addDays(weekStartDate, 6);
  const entries = await getLogEntriesByDateRange(weekStartDate, weekEndDate);

  const total_km = entries.reduce((sum, e) => sum + (e.km || 0), 0);

  const entriesWithHr = entries.filter(e => e.hrAvg);
  const avg_hr = entriesWithHr.length > 0
    ? entriesWithHr.reduce((sum, e) => sum + (e.hrAvg || 0), 0) / entriesWithHr.length
    : undefined;

  const avg_rpe = undefined;

  const load = await calculateTrainingLoad(new Date(weekEndDate));
  const progression_ratio = load.progressionRatio;

  return {
    total_km,
    avg_hr,
    avg_rpe,
    progression_ratio,
  };
}

export function getAdaptationScale(progressionRatio: number): {
  scale: number;
  reason: string;
} {
  if (progressionRatio > 1.5) {
    return {
      scale: 0.8,
      reason: 'High training load detected - reducing volume by 20% for recovery',
    };
  } else if (progressionRatio > 1.3) {
    return {
      scale: 0.9,
      reason: 'Elevated training load - reducing volume by 10% for adaptation',
    };
  } else if (progressionRatio < 0.8) {
    return {
      scale: 1.1,
      reason: 'Low training load - increasing volume by 10% for progression',
    };
  } else {
    return {
      scale: 1.0,
      reason: 'Training load is balanced - maintaining current volume',
    };
  }
}

export async function getLoadTrend(weeks = 4): Promise<{
  date: string;
  km: number;
  progressionRatio: number;
}[]> {
  const today = new Date();
  const trend: { date: string; km: number; progressionRatio: number }[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (i * 7));
    const weekStart = getWeekStartDate(weekDate);
    const weekEnd = addDays(weekStart, 6);

    const entries = await getLogEntriesByDateRange(weekStart, weekEnd);
    const km = entries.reduce((sum, e) => sum + (e.km || 0), 0);

    const load = await calculateTrainingLoad(new Date(weekEnd));

    trend.push({
      date: weekStart,
      km,
      progressionRatio: load.progressionRatio,
    });
  }

  return trend;
}
