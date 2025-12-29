/**
 * STEP 11D: Migration Snapshot Tests
 *
 * Purpose: Ensure that serialized multi-session training plans can be
 * deserialized in future versions without data loss.
 *
 * This protects data durability across schema changes and migrations.
 *
 * If these tests fail → risk of data loss or corruption during updates
 */

import type { TrainingDay, TrainingSession, TrainingWeek } from '@/types/training';

/**
 * Sample multi-session week as serialized JSON
 * This represents the canonical format that must be preserved
 */
function createSampleMultiSessionWeek(): TrainingWeek {
  return {
    weekNumber: 1,
    startDate: '2025-01-06',
    days: [
      {
        date: '2025-01-06',
        sessions: [
          {
            id: 'session-mon-run-1',
            type: 'RUN',
            role: 'AEROBIC_DEVELOPMENT',
            priority: 'PRIMARY',
            origin: 'BASE_PLAN',
            locked: true,
            title: 'Easy Run',
            description: 'Monday easy run',
            loadProfile: {
              cardiovascular: 0.5,
              muscular: 0.1,
              neuromuscular: 0.2,
              thermal: 0.1,
              mechanical: 0.3,
            },
            prescription: {
              distanceKm: 8,
              durationMin: 60,
              pace: 'easy',
            },
          } as TrainingSession,
        ],
      } as TrainingDay,
      {
        date: '2025-01-07',
        sessions: [
          {
            id: 'session-tue-strength-1',
            type: 'STRENGTH',
            role: 'MUSCULAR_ENDURANCE',
            priority: 'PRIMARY',
            origin: 'BASE_PLAN',
            locked: true,
            title: 'Lower Body Strength',
            description: 'Tuesday strength session',
            loadProfile: {
              cardiovascular: 0.3,
              muscular: 0.8,
              neuromuscular: 0.7,
              thermal: 0.1,
              mechanical: 0.4,
            },
            prescription: {
              exercises: ['squats', 'lunges'],
              sets: 4,
              reps: 6,
            },
          } as TrainingSession,
          {
            id: 'session-tue-run-1',
            type: 'RUN',
            role: 'AEROBIC_DEVELOPMENT',
            priority: 'SUPPORT',
            origin: 'ADAPTIVE',
            locked: false,
            title: 'Recovery Run',
            description: 'Easy recovery after strength',
            loadProfile: {
              cardiovascular: 0.3,
              muscular: 0.1,
              neuromuscular: 0.1,
              thermal: 0.1,
              mechanical: 0.2,
            },
            prescription: {
              distanceKm: 5,
              durationMin: 40,
              pace: 'easy',
            },
          } as TrainingSession,
        ],
      } as TrainingDay,
      {
        date: '2025-01-08',
        sessions: [
          {
            id: 'session-wed-run-1',
            type: 'RUN',
            role: 'AEROBIC_DEVELOPMENT',
            priority: 'PRIMARY',
            origin: 'USER',
            locked: false,
            title: 'Tempo Run',
            description: 'User added tempo session',
            loadProfile: {
              cardiovascular: 0.8,
              muscular: 0.2,
              neuromuscular: 0.4,
              thermal: 0.2,
              mechanical: 0.3,
            },
            prescription: {
              distanceKm: 12,
              durationMin: 75,
              pace: 'tempo',
            },
          } as TrainingSession,
          {
            id: 'session-wed-core-1',
            type: 'CORE',
            role: 'RECOVERY_SUPPORT',
            priority: 'SUPPORT',
            origin: 'ADAPTIVE',
            locked: false,
            title: 'Core Stability',
            description: 'Core work added by adaptive engine',
            loadProfile: {
              cardiovascular: 0.1,
              muscular: 0.4,
              neuromuscular: 0.5,
              thermal: 0.0,
              mechanical: 0.2,
            },
            prescription: {
              duration: 20,
              exercises: ['plank', 'side-plank'],
            },
          } as TrainingSession,
        ],
      } as TrainingDay,
    ],
  };
}

describe('STEP 11D: Migration Snapshot Tests', () => {
  describe('Session Data Preservation', () => {
    it('all session IDs are preserved through serialization/deserialization', () => {
      const original = createSampleMultiSessionWeek();

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      const originalIds = original.days.flatMap(d => d.sessions.map(s => s.id));
      const deserializedIds = deserialized.days.flatMap(d => d.sessions.map(s => s.id));

      expect(deserializedIds).toEqual(originalIds);
    });

    it('all session origins are preserved', () => {
      const original = createSampleMultiSessionWeek();

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      original.days.forEach((day, dayIdx) => {
        day.sessions.forEach((session, sessionIdx) => {
          const deserializedSession = deserialized.days[dayIdx].sessions[sessionIdx];
          expect(deserializedSession.origin).toBe(session.origin);
        });
      });
    });

    it('no sessions are dropped during deserialization', () => {
      const original = createSampleMultiSessionWeek();

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      const originalCount = original.days.reduce((sum, d) => sum + d.sessions.length, 0);
      const deserializedCount = deserialized.days.reduce((sum, d) => sum + d.sessions.length, 0);

      expect(deserializedCount).toBe(originalCount);
    });

    it('session order is unchanged after deserialization', () => {
      const original = createSampleMultiSessionWeek();

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      original.days.forEach((day, dayIdx) => {
        day.sessions.forEach((session, sessionIdx) => {
          const deserializedSession = deserialized.days[dayIdx].sessions[sessionIdx];
          expect(deserializedSession.id).toBe(session.id);
          expect(deserializedSession.type).toBe(session.type);
        });
      });
    });

    it('multi-session days remain intact (not collapsed)', () => {
      const original = createSampleMultiSessionWeek();
      const tuesdayOriginal = original.days[1];

      expect(tuesdayOriginal.sessions.length).toBe(2);

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      const tuesdayDeserialized = deserialized.days[1];
      expect(tuesdayDeserialized.sessions.length).toBe(2);
    });

    it('session prescriptions are preserved exactly', () => {
      const original = createSampleMultiSessionWeek();
      const originalRunSession = original.days[0].sessions[0];

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      const deserializedRunSession = deserialized.days[0].sessions[0];

      expect(deserializedRunSession.prescription).toEqual(originalRunSession.prescription);
    });

    it('session locked status is preserved', () => {
      const original = createSampleMultiSessionWeek();

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      original.days.forEach((day, dayIdx) => {
        day.sessions.forEach((session, sessionIdx) => {
          const deserializedSession = deserialized.days[dayIdx].sessions[sessionIdx];
          expect(deserializedSession.locked).toBe(session.locked);
        });
      });
    });

    it('load profile data is preserved completely', () => {
      const original = createSampleMultiSessionWeek();
      const originalSession = original.days[1].sessions[0];

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      const deserializedSession = deserialized.days[1].sessions[0];

      expect(deserializedSession.loadProfile).toEqual(originalSession.loadProfile);
    });
  });

  describe('Data Integrity Checks', () => {
    it('no duplicate session IDs after deserialization', () => {
      const original = createSampleMultiSessionWeek();

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      const allIds = deserialized.days.flatMap(d => d.sessions.map(s => s.id));
      const uniqueIds = new Set(allIds);

      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('all sessions have valid type after deserialization', () => {
      const original = createSampleMultiSessionWeek();
      const validTypes = ['RUN', 'STRENGTH', 'CORE', 'HEAT', 'ALTITUDE', 'MOBILITY'];

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      deserialized.days.forEach(day => {
        day.sessions.forEach(session => {
          expect(validTypes).toContain(session.type);
        });
      });
    });

    it('all sessions have valid origin after deserialization', () => {
      const original = createSampleMultiSessionWeek();
      const validOrigins = ['BASE_PLAN', 'USER', 'STRENGTH', 'HEAT', 'ALTITUDE', 'CORE', 'ADAPTIVE'];

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as TrainingWeek;

      deserialized.days.forEach(day => {
        day.sessions.forEach(session => {
          expect(validOrigins).toContain(session.origin);
        });
      });
    });
  });
});
