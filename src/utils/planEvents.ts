// src/utils/planEvents.ts
import { getEvents, type DbEvent } from '@/lib/database';
import type { WeekPlan } from '@/lib/plan';

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
