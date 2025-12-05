// src/utils/planEvents.ts
import { getEvents, type DbEvent } from '@/lib/database';
import type { WeekPlan } from '@/lib/plan';
import { calculateUserPaceProfile } from '@/engine/historicalAnalysis/calculateUserPaceProfile';

export function onPlannerUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener("planner:updated", h as EventListener);
  return () => window.removeEventListener("planner:updated", h as EventListener);
}
export function pingPlannerUpdated() {
  try { window.dispatchEvent(new CustomEvent("planner:updated")); } catch {}
}

export interface EventForDay {
  id: string;
  name: string;
  date: string;
  distanceKm?: number;
  expectedTime?: string;
  elevationGain?: number;
  priority?: 'A' | 'B' | 'C';
  type: 'street' | 'trail' | 'other';
}

/**
 * Get events that fall within the current week's training plan
 */
export async function getEventsForWeek(weekPlan: WeekPlan): Promise<Map<string, EventForDay[]>> {
  const events = await getEvents();
  const eventsByDate = new Map<string, EventForDay[]>();

  if (weekPlan.length === 0) return eventsByDate;

  // Get date range from week plan
  const startDate = weekPlan[0].dateISO;
  const endDate = weekPlan[weekPlan.length - 1].dateISO;

  // Filter events within the week
  const weekEvents = events.filter(event => {
    return event.date >= startDate && event.date <= endDate;
  });

  // Group by date
  weekEvents.forEach(event => {
    const eventForDay: EventForDay = {
      id: event.id || '',
      name: event.name,
      date: event.date,
      distanceKm: event.distance_km,
      expectedTime: event.expected_time,
      elevationGain: event.elevation_gain,
      priority: (event.priority as 'A' | 'B' | 'C') || 'B',
      type: event.type as 'street' | 'trail' | 'other',
    };

    const existing = eventsByDate.get(event.date) || [];
    existing.push(eventForDay);
    eventsByDate.set(event.date, existing);
  });

  return eventsByDate;
}

/**
 * Calculate workload for an event (in training load units)
 */
export function calculateEventWorkload(event: EventForDay): number {
  let workload = 0;

  // Base workload from distance
  if (event.distanceKm) {
    workload = event.distanceKm * 10; // 10 units per km
  } else if (event.expectedTime) {
    // Estimate from time (assume 6 min/km pace)
    const [hours, minutes] = event.expectedTime.split(':').map(Number);
    const totalMinutes = (hours || 0) * 60 + (minutes || 0);
    const estimatedKm = totalMinutes / 6;
    workload = estimatedKm * 10;
  }

  // Add elevation workload
  if (event.elevationGain) {
    // 100m elevation = ~1km flat equivalent
    workload += (event.elevationGain / 100) * 10;
  }

  // Priority multiplier (A races are more stressful)
  const priorityMultiplier = {
    'A': 1.5,
    'B': 1.2,
    'C': 1.0,
  };
  workload *= priorityMultiplier[event.priority || 'B'];

  return Math.round(workload);
}

/**
 * Check if an event should replace or supplement training for a day
 */
export function shouldReplaceTraining(event: EventForDay): boolean {
  // A-priority events or events over 15km should replace training
  if (event.priority === 'A') return true;
  if (event.distanceKm && event.distanceKm > 15) return true;

  // Long duration events (over 2 hours) replace training
  if (event.expectedTime) {
    const [hours] = event.expectedTime.split(':').map(Number);
    if (hours && hours >= 2) return true;
  }

  return false;
}

/**
 * Calculate event duration using personalized pace profile
 * Returns duration in minutes
 */
export async function calculateEventDuration(event: EventForDay): Promise<number> {
  // If user provided expected time, parse and use it
  if (event.expectedTime) {
    const parts = event.expectedTime.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parts.length >= 3 ? parseInt(parts[2]) || 0 : 0;
      return hours * 60 + minutes + seconds / 60;
    }
  }

  // If no distance, can't calculate
  if (!event.distanceKm) {
    return 0;
  }

  try {
    // Try to get personalized pace profile
    const paceProfile = await calculateUserPaceProfile();

    if (paceProfile && paceProfile.baseFlatPaceMinKm) {
      // Use personalized pace with elevation adjustment
      const basePace = paceProfile.baseFlatPaceMinKm;
      let totalTime = event.distanceKm * basePace;

      // Add time for elevation gain (conservative: 1 minute per 100m gain)
      if (event.elevationGain) {
        totalTime += (event.elevationGain / 100) * 10; // 10 min per 100m
      }

      return Math.round(totalTime);
    }
  } catch (error) {
    console.warn('Could not calculate personalized pace, using default:', error);
  }

  // Fallback: use conservative 6:00 min/km pace
  let totalTime = event.distanceKm * 6;

  // Add time for elevation gain
  if (event.elevationGain) {
    totalTime += (event.elevationGain / 100) * 10;
  }

  return Math.round(totalTime);
}

/**
 * Format duration in minutes to HH:MM:SS string
 */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
