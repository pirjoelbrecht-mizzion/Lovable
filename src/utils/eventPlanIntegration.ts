/**
 * Utility to integrate calendar events into training plans
 */

import { getEventsForWeek, calculateEventDuration, formatDuration, type EventForDay } from './planEvents';
import type { WeekPlan, Session } from '@/lib/plan';

/**
 * Convert event to training session format
 */
export async function eventToSession(event: EventForDay): Promise<Session> {
  const durationMin = await calculateEventDuration(event);

  return {
    id: `event_${event.id}`,
    title: event.name,
    type: 'race',
    km: event.distanceKm,
    distanceKm: event.distanceKm,
    durationMin,
    elevationGain: event.elevationGain,
    notes: `${event.type === 'trail' ? 'Trail' : 'Street'} event • ${
      event.elevationGain ? `${event.elevationGain}m gain • ` : ''
    }${durationMin > 0 ? `Est. ${formatDuration(durationMin)}` : ''}${
      event.priority ? ` • Priority ${event.priority}` : ''
    }`,
    source: 'user',
  };
}

/**
 * Merge calendar events into a training plan
 * Events will be added to their respective days
 */
export async function mergeEventsIntoPlan(plan: WeekPlan): Promise<WeekPlan> {
  const eventsByDate = await getEventsForWeek(plan);

  // Create a copy of the plan
  const mergedPlan: WeekPlan = plan.map((day) => ({
    ...day,
    sessions: [...day.sessions],
  }));

  // Add events to corresponding days
  for (const [date, events] of eventsByDate.entries()) {
    const dayIndex = mergedPlan.findIndex((d) => d.dateISO === date);
    if (dayIndex >= 0) {
      const eventSessions = await Promise.all(events.map(eventToSession));
      // Add events at the beginning of the day's sessions
      mergedPlan[dayIndex].sessions.unshift(...eventSessions);
    }
  }

  return mergedPlan;
}

/**
 * Get event info for a specific date
 */
export async function getEventsForDate(date: string): Promise<Session[]> {
  const events = await getEventsForWeek([
    { dateISO: date, sessions: [] },
  ]);

  const eventList = events.get(date) || [];
  return Promise.all(eventList.map(eventToSession));
}
