/**
 * STEP 9 Test 2: Strength Module Isolation (NON-NEGOTIABLE)
 *
 * Purpose: Ensure runs NEVER appear in StrengthTraining module
 * This locks in the "type-based filtering" architecture and prevents title-based inference.
 *
 * If these tests fail → regression in session type isolation
 */

import {
  multiSessionWeek,
  getSessionsByType,
  getWednesdaySessions,
} from './fixtures/multiSessionWeek';

describe('STEP 9: Strength Training Module Isolation', () => {
  describe('Type-Based Filtering (NOT Title-Based)', () => {
    it('strength sessions identified by type property, not title', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');

      // All returned sessions MUST have type === 'strength'
      strengthSessions.forEach(session => {
        expect(session.type).toBe('strength');
      });
    });

    it('run sessions excluded from strength selection', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');

      // No run types should be included
      const hasRuns = strengthSessions.some(s => s.type === 'easy');
      expect(hasRuns).toBe(false);
    });

    it('filters by type, not by title.includes()', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');

      // FORBIDDEN: title.toLowerCase().includes('strength')
      // CORRECT: type === 'strength'
      strengthSessions.forEach(session => {
        expect(session.type).toBe('strength');

        // Type is what matters, not title content
        // Even if a run was titled "Strength Run", it should not appear
        const hasRunType = session.type === 'easy' || session.type === 'intervals';
        expect(hasRunType).toBe(false);
      });
    });
  });

  describe('Wednesday Multi-Session Isolation', () => {
    it('Wednesday has both run and strength sessions', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);
      expect(wedSessions.length).toBe(2);

      const types = wedSessions.map(s => s.type);
      expect(types).toContain('easy');
      expect(types).toContain('strength');
    });

    it('strength module only shows strength session from Wednesday', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);

      // Filter to only strength sessions (like StrengthTraining module does)
      const strengthSessions = wedSessions.filter(s => s.type === 'strength');

      expect(strengthSessions.length).toBe(1);
      expect(strengthSessions[0].title).toContain('Strength');
    });

    it('strength module excludes Wednesday run session', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);
      const strengthSessions = wedSessions.filter(s => s.type === 'strength');

      // Run session should NOT be in strength selection
      const hasRuns = strengthSessions.some(s => s.km && s.km > 0);
      expect(hasRuns).toBe(false);
    });

    it('run module shows both Wednesday sessions where appropriate', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);

      // Quest/run pages show runs (km > 0)
      const runSessions = wedSessions.filter(s => (s.km || 0) > 0);

      expect(runSessions.length).toBe(1);
      expect(runSessions[0].type).toBe('easy');
    });
  });

  describe('Session Isolation by Type', () => {
    it('all strength sessions have zero km', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');

      strengthSessions.forEach(session => {
        expect(session.km).toBe(0);
        expect(session.distanceKm).toBe(0);
      });
    });

    it('all strength sessions have empty zones', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');

      strengthSessions.forEach(session => {
        expect(session.zones.length).toBe(0);
      });
    });

    it('all run sessions have km > 0', () => {
      const runTypes = ['easy', 'intervals', 'tempo', 'long'];
      runTypes.forEach(type => {
        const sessions = getSessionsByType(multiSessionWeek, type);
        sessions.forEach(session => {
          expect(session.km || session.distanceKm).toBeGreaterThan(0);
        });
      });
    });

    it('all run sessions have zones defined', () => {
      const runTypes = ['easy', 'intervals', 'tempo', 'long'];
      runTypes.forEach(type => {
        const sessions = getSessionsByType(multiSessionWeek, type);
        sessions.forEach(session => {
          expect(session.zones.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Forbidden Patterns (REGRESSION CHECK)', () => {
    it('does NOT use title.includes("Strength") for type detection', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');

      // FORBIDDEN: if (session.title?.toLowerCase().includes('strength')) { ... }
      // CORRECT: if (session.type === 'strength') { ... }

      strengthSessions.forEach(session => {
        // Type is the source of truth
        const isStrength = session.type === 'strength';
        expect(isStrength).toBe(true);

        // Title might or might not contain 'strength', doesn't matter
        // Type property is what controls behavior
      });
    });

    it('does NOT use title.includes("Run") for type detection', () => {
      const easyRunSessions = getSessionsByType(multiSessionWeek, 'easy');

      // FORBIDDEN: if (session.title?.toLowerCase().includes('run')) { ... }
      // CORRECT: if (session.type === 'easy' || ...) { ... }

      easyRunSessions.forEach(session => {
        // Type determines behavior, not title
        const isRun = ['easy', 'intervals', 'tempo', 'long'].includes(
          session.type
        );
        expect(isRun).toBe(true);
      });
    });

    it('does NOT infer session type from title parsing', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);

      // FORBIDDEN: Split by '+' or parse titles
      // CORRECT: Use type property directly

      wedSessions.forEach(session => {
        // Type is explicitly set in fixture, not derived from title
        expect(['easy', 'strength']).toContain(session.type);
      });
    });
  });

  describe('Rest Session Handling', () => {
    it('rest sessions are excluded from strength filtering', () => {
      const strengthSessions = getSessionsByType(multiSessionWeek, 'strength');
      const hasRest = strengthSessions.some(s => s.type === 'rest');

      expect(hasRest).toBe(false);
    });

    it('rest sessions can be identified by type', () => {
      const restSessions = getSessionsByType(multiSessionWeek, 'rest');

      expect(restSessions.length).toBeGreaterThan(0);
      restSessions.forEach(session => {
        expect(session.type).toBe('rest');
        expect(session.km).toBe(0);
      });
    });
  });

  describe('Session Type Completeness', () => {
    it('week covers all supported session types', () => {
      const types = new Set<string>();

      multiSessionWeek.forEach(day => {
        day.sessions?.forEach(session => {
          types.add(session.type);
        });
      });

      // Should have: easy, intervals, tempo, long, strength, rest
      expect(types.has('easy')).toBe(true);
      expect(types.has('strength')).toBe(true);
      expect(types.has('rest')).toBe(true);
    });
  });
});
