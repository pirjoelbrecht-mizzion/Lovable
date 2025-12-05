/**
 * Hook to fetch and integrate calendar events into weekly training
 */

import { useEffect, useState } from 'react';
import { getEventsForWeek, type EventForDay, calculateEventWorkload } from '@/utils/planEvents';
import type { WeekPlan } from '@/lib/plan';

export interface WeeklyEventsData {
  eventsByDate: Map<string, EventForDay[]>;
  totalEventWorkload: number;
  hasEvents: boolean;
  loading: boolean;
}

export function useWeeklyEvents(weekPlan: WeekPlan): WeeklyEventsData {
  const [eventsByDate, setEventsByDate] = useState<Map<string, EventForDay[]>>(new Map());
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
        if (mounted) {
          setEventsByDate(events);
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
