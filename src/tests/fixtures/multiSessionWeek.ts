/**
 * STEP 9 Test Fixture: Multi-Session Week
 *
 * This fixture represents a typical week with:
 * - Wednesday: Easy run + Strength training (2 distinct sessions)
 * - Other days: Single run sessions
 *
 * All sessions have stable, distinct IDs for testing identity-based logic.
 * Purpose: Lock in session ID and ownership architecture
 */

import type { WeekPlan as LocalStorageWeekPlan } from '@/lib/plan';

export const multiSessionWeek: LocalStorageWeekPlan = [
  {
    label: 'Mon',
    dateISO: '2025-12-29',
    sessions: [
      {
        id: 'session-mon-run-1',
        type: 'easy',
        title: 'Easy Run - Monday',
        km: 8,
        distanceKm: 8,
        durationMin: 48,
        zones: ['Z2'],
        elevationGain: 0,
        notes: 'Base building run',
        source: 'coach' as const,
      },
    ],
  },
  {
    label: 'Tue',
    dateISO: '2025-12-30',
    sessions: [
      {
        id: 'session-tue-intervals-1',
        type: 'intervals',
        title: 'Interval Training - Tuesday',
        km: 10,
        distanceKm: 10,
        durationMin: 60,
        zones: ['Z3', 'Z4'],
        elevationGain: 100,
        notes: '6x3min at threshold',
        source: 'coach' as const,
      },
    ],
  },
  {
    label: 'Wed',
    dateISO: '2025-12-31',
    sessions: [
      {
        id: 'session-wed-run-1',
        type: 'easy',
        title: 'Easy Run - Wednesday AM',
        km: 6,
        distanceKm: 6,
        durationMin: 36,
        zones: ['Z2'],
        elevationGain: 0,
        notes: 'Recovery run before strength',
        source: 'coach' as const,
      },
      {
        id: 'session-wed-strength-1',
        type: 'strength',
        title: 'Strength Training - ME Circuit',
        km: 0,
        distanceKm: 0,
        durationMin: 40,
        zones: [],
        elevationGain: 0,
        notes: 'Terrain-based strength work',
        source: 'coach' as const,
      },
    ],
  },
  {
    label: 'Thu',
    dateISO: '2026-01-02',
    sessions: [
      {
        id: 'session-thu-tempo-1',
        type: 'tempo',
        title: 'Tempo Run - Thursday',
        km: 12,
        distanceKm: 12,
        durationMin: 70,
        zones: ['Z3'],
        elevationGain: 50,
        notes: '20min at tempo pace',
        source: 'coach' as const,
      },
    ],
  },
  {
    label: 'Fri',
    dateISO: '2026-01-03',
    sessions: [
      {
        id: 'session-fri-easy-1',
        type: 'easy',
        title: 'Easy Run - Friday',
        km: 7,
        distanceKm: 7,
        durationMin: 42,
        zones: ['Z2'],
        elevationGain: 0,
        notes: 'Recovery day',
        source: 'coach' as const,
      },
    ],
  },
  {
    label: 'Sat',
    dateISO: '2026-01-04',
    sessions: [
      {
        id: 'session-sat-long-1',
        type: 'long',
        title: 'Long Run - Saturday',
        km: 20,
        distanceKm: 20,
        durationMin: 120,
        zones: ['Z2'],
        elevationGain: 200,
        notes: 'Build mileage',
        source: 'coach' as const,
      },
    ],
  },
  {
    label: 'Sun',
    dateISO: '2026-01-05',
    sessions: [
      {
        id: 'session-sun-rest-1',
        type: 'rest',
        title: 'Rest Day',
        km: 0,
        distanceKm: 0,
        durationMin: 0,
        zones: [],
        elevationGain: 0,
        notes: 'Complete rest for recovery',
        source: 'coach' as const,
      },
    ],
  },
];

/**
 * Helper: Get session by ID
 * Tests MUST use this pattern instead of .sessions[0]
 */
export function getSessionById(
  week: LocalStorageWeekPlan,
  sessionId: string
): typeof multiSessionWeek[0]['sessions'][0] | undefined {
  for (const day of week) {
    const session = day.sessions?.find(s => s.id === sessionId);
    if (session) return session;
  }
  return undefined;
}

/**
 * Helper: Get all sessions of a specific type
 * Tests use this for filtering instead of title inference
 */
export function getSessionsByType(
  week: LocalStorageWeekPlan,
  type: string
): typeof multiSessionWeek[0]['sessions'] {
  const sessions: typeof multiSessionWeek[0]['sessions'] = [];
  for (const day of week) {
    const typedSessions = day.sessions?.filter(s => s.type === type) || [];
    sessions.push(...typedSessions);
  }
  return sessions;
}

/**
 * Helper: Get Wednesday sessions (multi-session day)
 * Used to verify both run and strength sessions exist
 */
export function getWednesdaySessions(week: LocalStorageWeekPlan) {
  const wednesday = week.find(d => d.label === 'Wed');
  return wednesday?.sessions || [];
}

/**
 * Helper: Verify session identity
 * Locks in that sessions are identified by ID, not type or position
 */
export function verifySessionIdentity(
  session: any,
  expectedId: string,
  expectedType: string
): boolean {
  return session?.id === expectedId && session?.type === expectedType;
}
