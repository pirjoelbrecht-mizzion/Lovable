/**
 * ======================================================================
 *  REST DAYS ENFORCEMENT TESTS
 *  Validates rest-day derivation and constraint enforcement
 * ======================================================================
 */

import { deriveRestDays, isRestDay, getTrainingDays } from '../restDays';
import { validateWeeklyPlan } from '../planValidator';
import type { WeeklyPlan } from '../types';
import type { TrainingConstraints } from '../constraints';

describe('Rest Days - Deterministic Derivation', () => {
  test('3 days/week should distribute evenly', () => {
    const restDays = deriveRestDays(3);
    expect(restDays).toHaveLength(4);
    expect(new Set(restDays).size).toBe(4); // Unique days
  });

  test('4 days/week should have 3 rest days', () => {
    const restDays = deriveRestDays(4);
    expect(restDays).toHaveLength(3);
  });

  test('5 days/week should have 2 rest days', () => {
    const restDays = deriveRestDays(5);
    expect(restDays).toHaveLength(2);
  });

  test('7 days/week should have 0 rest days', () => {
    const restDays = deriveRestDays(7);
    expect(restDays).toHaveLength(0);
  });

  test('1 day/week should have 6 rest days', () => {
    const restDays = deriveRestDays(1);
    expect(restDays).toHaveLength(6);
  });

  test('Derivation is deterministic (same input = same output)', () => {
    const run1 = deriveRestDays(4);
    const run2 = deriveRestDays(4);
    expect(run1).toEqual(run2);
  });
});

describe('Rest Days - Validation Queries', () => {
  test('isRestDay returns true for rest days', () => {
    const restDays = deriveRestDays(3);
    const firstRestDay = restDays[0];
    expect(isRestDay(firstRestDay, restDays)).toBe(true);
  });

  test('isRestDay returns false for training days', () => {
    const restDays = deriveRestDays(3);
    const trainingDays = getTrainingDays(3);
    const firstTrainingDay = trainingDays[0];
    expect(isRestDay(firstTrainingDay, restDays)).toBe(false);
  });

  test('getTrainingDays returns correct count', () => {
    const trainingDays = getTrainingDays(4);
    expect(trainingDays).toHaveLength(4);
  });
});

describe('Plan Validation - Rest Day Violations', () => {
  test('Plan with session on rest day is invalid', () => {
    const constraints: TrainingConstraints = {
      daysPerWeek: 3,
      restDays: ['Mon', 'Thu', 'Fri'],
    };

    const plan: WeeklyPlan = {
      weekNumber: 1,
      phase: 'base',
      targetMileage: 40,
      targetVert: 500,
      days: [
        {
          day: 'Mon',
          date: '2024-01-01',
          sessions: [
            {
              type: 'easy',
              title: 'Easy Run',
              distanceKm: 8,
              durationMin: 48,
            },
          ],
        },
        {
          day: 'Tue',
          date: '2024-01-02',
          sessions: [],
        },
        {
          day: 'Wed',
          date: '2024-01-03',
          sessions: [
            {
              type: 'easy',
              title: 'Easy Run',
              distanceKm: 8,
              durationMin: 48,
            },
          ],
        },
        {
          day: 'Thu',
          date: '2024-01-04',
          sessions: [],
        },
        {
          day: 'Fri',
          date: '2024-01-05',
          sessions: [],
        },
        {
          day: 'Sat',
          date: '2024-01-06',
          sessions: [
            {
              type: 'long',
              title: 'Long Run',
              distanceKm: 18,
              durationMin: 108,
            },
          ],
        },
        {
          day: 'Sun',
          date: '2024-01-07',
          sessions: [],
        },
      ],
    };

    const result = validateWeeklyPlan(plan, constraints);

    expect(result.isValid).toBe(false);
    expect(result.flags.some(f => f.code === 'rest-day-violation')).toBe(true);
  });

  test('Plan without rest day violations is valid', () => {
    const constraints: TrainingConstraints = {
      daysPerWeek: 3,
      restDays: ['Mon', 'Thu', 'Fri'],
    };

    const plan: WeeklyPlan = {
      weekNumber: 1,
      phase: 'base',
      targetMileage: 40,
      targetVert: 500,
      days: [
        {
          day: 'Mon',
          date: '2024-01-01',
          sessions: [],
        },
        {
          day: 'Tue',
          date: '2024-01-02',
          sessions: [
            {
              type: 'easy',
              title: 'Easy Run',
              distanceKm: 8,
              durationMin: 48,
            },
          ],
        },
        {
          day: 'Wed',
          date: '2024-01-03',
          sessions: [
            {
              type: 'easy',
              title: 'Easy Run',
              distanceKm: 8,
              durationMin: 48,
            },
          ],
        },
        {
          day: 'Thu',
          date: '2024-01-04',
          sessions: [],
        },
        {
          day: 'Fri',
          date: '2024-01-05',
          sessions: [],
        },
        {
          day: 'Sat',
          date: '2024-01-06',
          sessions: [
            {
              type: 'long',
              title: 'Long Run',
              distanceKm: 18,
              durationMin: 108,
            },
          ],
        },
        {
          day: 'Sun',
          date: '2024-01-07',
          sessions: [],
        },
      ],
    };

    const result = validateWeeklyPlan(plan, constraints);

    expect(result.isValid).toBe(true);
    expect(result.flags.filter(f => f.code === 'rest-day-violation')).toHaveLength(0);
  });

  test('Validation returns correct training day count', () => {
    const constraints: TrainingConstraints = {
      daysPerWeek: 3,
      restDays: ['Mon', 'Thu', 'Fri'],
    };

    const plan: WeeklyPlan = {
      weekNumber: 1,
      phase: 'base',
      targetMileage: 40,
      targetVert: 500,
      days: [
        {
          day: 'Mon',
          date: '2024-01-01',
          sessions: [],
        },
        {
          day: 'Tue',
          date: '2024-01-02',
          sessions: [
            {
              type: 'easy',
              title: 'Easy Run',
              distanceKm: 8,
            },
          ],
        },
        {
          day: 'Wed',
          date: '2024-01-03',
          sessions: [
            {
              type: 'easy',
              title: 'Easy Run',
              distanceKm: 8,
            },
          ],
        },
        {
          day: 'Thu',
          date: '2024-01-04',
          sessions: [],
        },
        {
          day: 'Fri',
          date: '2024-01-05',
          sessions: [],
        },
        {
          day: 'Sat',
          date: '2024-01-06',
          sessions: [
            {
              type: 'long',
              title: 'Long Run',
              distanceKm: 18,
            },
          ],
        },
        {
          day: 'Sun',
          date: '2024-01-07',
          sessions: [],
        },
      ],
    };

    const result = validateWeeklyPlan(plan, constraints);

    expect(result.trainingDayCount).toBe(3);
    expect(result.restDayCount).toBe(4);
    expect(result.sessionCount).toBe(3);
  });
});
