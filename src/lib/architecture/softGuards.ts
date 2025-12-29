/**
 * ======================================================================
 * SOFT GUARDS — Production Safety Without Crashing
 * ======================================================================
 *
 * STEP 11B: Non-throwing validation for production safety
 *
 * STEP 10 throws in dev mode to catch violations early.
 * In production, we log & continue to ensure user experience isn't impacted.
 *
 * RULES:
 * ✅ Warn (log) on violations
 * ✅ Continue execution
 * ✅ Never throw
 * ✅ Never mutate
 * ✅ Never block rendering
 * ❌ Never affect behavior
 */

import { logArchitecturalConcern } from '../telemetry/trainingTelemetry';

/**
 * Conditional soft warning
 * Used for production-safe guards
 */
export function warnIf(
  condition: boolean,
  message: string,
  context?: any
): void {
  if (!condition) return;

  console.warn('[ARCH SOFT WARNING]', message, context);
  logArchitecturalConcern('softGuard', message, context);
}

/**
 * Guard: Check that a session has required type
 * Production: Warns only, never blocks
 */
export function guardSessionType(
  sessionId: string,
  expectedType: string,
  actualType: string | undefined,
  module: string
): boolean {
  const isValid = actualType === expectedType;

  warnIf(
    !isValid,
    `Session type mismatch in ${module}`,
    {
      sessionId,
      expected: expectedType,
      actual: actualType,
    }
  );

  return isValid;
}

/**
 * Guard: Check that session is not locked when needed for deletion
 * Production: Warns only, never blocks
 */
export function guardSessionLocked(
  sessionId: string,
  locked: boolean,
  operation: string
): boolean {
  warnIf(
    locked && operation === 'delete',
    `Attempted to delete locked session`,
    {
      sessionId,
      operation,
      locked,
    }
  );

  return !locked;
}

/**
 * Guard: Check that session has required origin
 * Production: Warns only, never blocks
 */
export function guardSessionOrigin(
  sessionId: string,
  origin: string | undefined,
  allowedOrigins: string[],
  module: string
): boolean {
  const isValid = origin && allowedOrigins.includes(origin);

  warnIf(
    !isValid,
    `Session origin not in allowed list for ${module}`,
    {
      sessionId,
      origin,
      allowedOrigins,
    }
  );

  return isValid || false;
}

/**
 * Guard: Check day structure is valid
 * Production: Warns only, never blocks
 */
export function guardDayStructure(date: string, sessionCount: number): boolean {
  const isValid = sessionCount >= 0;

  warnIf(
    !isValid,
    `Invalid day structure`,
    {
      date,
      sessionCount,
    }
  );

  return isValid;
}

/**
 * Guard: Check that session ID is present
 * Production: Warns only, never blocks
 */
export function guardSessionId(
  sessionId: string | undefined,
  module: string
): boolean {
  const isValid = sessionId !== undefined && sessionId !== '';

  warnIf(
    !isValid,
    `Missing session ID in ${module}`,
    { sessionId }
  );

  return isValid || false;
}

/**
 * Guard: Check for duplicate session IDs
 * Production: Warns only, never blocks
 */
export function guardNoDuplicateIds(
  sessionIds: string[],
  module: string
): boolean {
  const unique = new Set(sessionIds);
  const hasDuplicates = unique.size !== sessionIds.length;

  warnIf(
    hasDuplicates,
    `Duplicate session IDs detected in ${module}`,
    { totalIds: sessionIds.length, uniqueIds: unique.size }
  );

  return !hasDuplicates;
}

/**
 * Guard: Check session not in wrong module
 * Production: Warns only, never blocks
 */
export function guardSessionInCorrectModule(
  sessionType: string,
  expectedTypes: string[],
  module: string
): boolean {
  const isCorrect = expectedTypes.includes(sessionType);

  warnIf(
    !isCorrect,
    `Session type not expected in ${module}`,
    { sessionType, expectedTypes }
  );

  return isCorrect;
}
