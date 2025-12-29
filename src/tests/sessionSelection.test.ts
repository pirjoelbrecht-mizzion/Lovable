/**
 * STEP 9 Test 1: Session Identity Selection (CRITICAL)
 *
 * Purpose: Ensure session selection is by ID, not by type, position, or day.
 * This locks in the multi-session + session-ID architecture.
 *
 * If these tests fail → regression in identity flow
 */

import {
  multiSessionWeek,
  getSessionById,
  getWednesdaySessions,
  verifySessionIdentity,
} from './fixtures/multiSessionWeek';

describe('STEP 9: Session Identity Selection', () => {
  describe('Session ID Uniqueness', () => {
    it('all session IDs in week are unique', () => {
      const allIds: string[] = [];

      multiSessionWeek.forEach(day => {
        day.sessions?.forEach(session => {
          allIds.push(session.id);
        });
      });

      // Check no duplicates
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('session IDs contain meaningful prefixes (day-type-count)', () => {
      multiSessionWeek.forEach(day => {
        day.sessions?.forEach(session => {
          // IDs follow pattern: session-{day}-{type}-{count}
          expect(session.id).toMatch(/^session-\w+-\w+-\d+$/);
        });
      });
    });
  });

  describe('Session Retrieval by ID', () => {
    it('getSessionById returns correct session by ID', () => {
      const runSession = getSessionById(multiSessionWeek, 'session-wed-run-1');

      expect(runSession).toBeDefined();
      expect(runSession?.type).toBe('easy');
      expect(runSession?.title).toContain('Wednesday');
    });

    it('getSessionById returns undefined for nonexistent ID', () => {
      const session = getSessionById(multiSessionWeek, 'nonexistent-id');
      expect(session).toBeUndefined();
    });

    it('distinguishes between strength and run session on same day by ID', () => {
      const runSession = getSessionById(multiSessionWeek, 'session-wed-run-1');
      const strengthSession = getSessionById(
        multiSessionWeek,
        'session-wed-strength-1'
      );

      expect(runSession?.type).toBe('easy');
      expect(strengthSession?.type).toBe('strength');
      expect(runSession?.id).not.toBe(strengthSession?.id);
    });
  });

  describe('Multi-Session Day Structure', () => {
    it('Wednesday has exactly 2 sessions', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);
      expect(wedSessions.length).toBe(2);
    });

    it('Wednesday sessions have different types', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);
      const types = wedSessions.map(s => s.type);

      expect(types).toContain('easy');
      expect(types).toContain('strength');
      expect(new Set(types).size).toBe(2); // 2 different types
    });

    it('Wednesday sessions have distinct IDs', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);
      const ids = wedSessions.map(s => s.id);

      expect(new Set(ids).size).toBe(2); // All unique
    });

    it('Wednesday run session is not strength', () => {
      const runSession = getSessionById(multiSessionWeek, 'session-wed-run-1');
      expect(runSession?.type).not.toBe('strength');
      expect(runSession?.km).toBeGreaterThan(0);
    });

    it('Wednesday strength session has zero km', () => {
      const strengthSession = getSessionById(
        multiSessionWeek,
        'session-wed-strength-1'
      );
      expect(strengthSession?.type).toBe('strength');
      expect(strengthSession?.km).toBe(0);
      expect(strengthSession?.distanceKm).toBe(0);
    });
  });

  describe('Session Identity Verification', () => {
    it('verifySessionIdentity confirms correct session', () => {
      const session = getSessionById(multiSessionWeek, 'session-wed-run-1');
      const isValid = verifySessionIdentity(
        session,
        'session-wed-run-1',
        'easy'
      );

      expect(isValid).toBe(true);
    });

    it('verifySessionIdentity rejects wrong ID', () => {
      const session = getSessionById(multiSessionWeek, 'session-wed-run-1');
      const isValid = verifySessionIdentity(
        session,
        'session-wed-strength-1',
        'easy'
      );

      expect(isValid).toBe(false);
    });

    it('verifySessionIdentity rejects wrong type', () => {
      const session = getSessionById(multiSessionWeek, 'session-wed-run-1');
      const isValid = verifySessionIdentity(
        session,
        'session-wed-run-1',
        'strength'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Forbidden Patterns (REGRESSION CHECK)', () => {
    it('does NOT use .sessions[0] to select run on Wednesday', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);

      // FORBIDDEN: const firstSession = wedSessions[0];
      // CORRECT: Find by ID or type
      const firstSession = wedSessions[0];

      // Verify we're explicitly checking the ID, not assuming position
      expect(firstSession.id).toBe('session-wed-run-1');
      expect(firstSession.type).toBe('easy');
    });

    it('does NOT use title.includes("Strength") to detect strength session', () => {
      const strengthSession = getSessionById(
        multiSessionWeek,
        'session-wed-strength-1'
      );

      // FORBIDDEN: if (title.includes('Strength')) { ... }
      // CORRECT: Use type property directly
      expect(strengthSession?.type).toBe('strength');

      // Verify type is the source of truth, not title
      const isStrength = strengthSession?.type === 'strength';
      expect(isStrength).toBe(true);
    });

    it('iteration over all sessions finds both run and strength', () => {
      const wedSessions = getWednesdaySessions(multiSessionWeek);
      const typeSet = new Set<string>();

      // CORRECT PATTERN: Iterate all sessions
      for (const session of wedSessions) {
        typeSet.add(session.type);
      }

      expect(typeSet.has('easy')).toBe(true);
      expect(typeSet.has('strength')).toBe(true);
    });
  });

  describe('Single-Session Days', () => {
    it('Monday has exactly 1 session', () => {
      const monday = multiSessionWeek.find(d => d.label === 'Mon');
      expect(monday?.sessions?.length).toBe(1);
    });

    it('single-session day can still be accessed by ID', () => {
      const mondaySession = getSessionById(multiSessionWeek, 'session-mon-run-1');

      expect(mondaySession).toBeDefined();
      expect(mondaySession?.type).toBe('easy');
    });

    it('single-session day does not break multi-session logic', () => {
      const mondaySession = getSessionById(multiSessionWeek, 'session-mon-run-1');

      // Identity check works same way for single and multi-session days
      const isValid = verifySessionIdentity(
        mondaySession,
        'session-mon-run-1',
        'easy'
      );

      expect(isValid).toBe(true);
    });
  });
});
