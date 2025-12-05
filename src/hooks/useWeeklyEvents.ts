/**
 * Hook to fetch and integrate calendar events into weekly training
 */

import { useEffect, useState } from 'react';
import { getEventsForWeek, type EventForDay, calculateEventWorkload, calculateEventDuration } from '@/utils/planEvents';
import type { WeekPlan } from '@/lib/plan';

export interface EventWithDuration extends EventForDay {
  calculatedDurationMin?: number;
}

export interface WeeklyEventsData {
  eventsByDate: Map<string, EventWithDuration[]>;
  totalEventWorkload: number;
  hasEvents: boolean;
  loading: boolean;
}

export function useWeeklyEvents(weekPlan: WeekPlan): WeeklyEventsData {
  const [eventsByDate, setEventsByDate] = useState<Map<string, EventWithDuration[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchEvents() {
      if (!weekPlan || weekPlan.length === 0) {
        setEventsByDate(new Map());
        setLoading(false);
        return;
      }

      try {
        const events = await getEventsForWeek(weekPlan);

        // Calculate duration for each event
        const eventsWithDuration = new Map<string, EventWithDuration[]>();

        for (const [date, eventList] of events.entries()) {
          const enrichedEvents = await Promise.all(
            eventList.map(async (event) => {
              const calculatedDurationMin = await calculateEventDuration(event);
              return {
                ...event,
                calculatedDurationMin,
              };
            })
          );
          eventsWithDuration.set(date, enrichedEvents);
        }

        if (mounted) {
          setEventsByDate(eventsWithDuration);
        }
      } catch (error) {
        console.error('Failed to fetch weekly events:', error);
        if (mounted) {
          setEventsByDate(new Map());
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      mounted = false;
    };
  }, [weekPlan]);

  // Calculate total event workload
  const totalEventWorkload = Array.from(eventsByDate.values())
    .flat()
    .reduce((sum, event) => sum + calculateEventWorkload(event), 0);

  const hasEvents = eventsByDate.size > 0;

  return {
    eventsByDate,
    totalEventWorkload,
    hasEvents,
    loading,
  };
}
