/* eslint-disable no-console */

/**
 * STEP 10 — Architectural Guardrails
 *
 * Dev-only runtime invariants that enforce STEP 9 architecture.
 * These assertions ONLY run in development mode.
 * Production builds skip all checks for zero overhead.
 */

export const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * Assert that a session has an ID property.
 * Session identity MUST always be based on session.id, never on index or position.
 *
 * @throws Error in dev mode if session lacks id
 * @example
 *   assertSessionHasId(session, 'Quest.onWorkoutClick')
 */
export function assertSessionHasId(session: any, context: string): void {
  if (!__DEV__) return;

  if (!session?.id) {
    throw new Error(
      `[ARCHITECTURE VIOLATION] Session missing id in ${context}\n\n` +
      `Session: ${JSON.stringify(session)}\n\n` +
      `RULE: Session identity MUST be id-based.\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Assert that a session has a type property.
 * Session type MUST always be determined by session.type, never inferred from title.
 *
 * @throws Error in dev mode if session lacks type
 * @example
 *   assertSessionHasType(session, 'Quest.render')
 */
export function assertSessionHasType(session: any, context: string): void {
  if (!__DEV__) return;

  if (!session?.type) {
    throw new Error(
      `[ARCHITECTURE VIOLATION] Session missing type in ${context}\n\n` +
      `Session: ${JSON.stringify(session)}\n\n` +
      `RULE: Session type MUST be explicit (session.type property).\n` +
      `FORBIDDEN: Inferring from title.includes() or other heuristics.\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Assert that a day does NOT use legacy day.workout property.
 * Modern architecture ONLY uses day.sessions[].
 *
 * @throws Error in dev mode if day.workout detected
 * @example
 *   assertNoDayWorkoutUsage(day, 'adaptiveContextBuilder')
 */
export function assertNoDayWorkoutUsage(day: any, context: string): void {
  if (!__DEV__) return;

  if ('workout' in day) {
    throw new Error(
      `[ARCHITECTURE VIOLATION] Forbidden property "day.workout" detected in ${context}\n\n` +
      `Day: ${JSON.stringify(day)}\n\n` +
      `RULE: day.workout is LEGACY. Use day.sessions[] ONLY.\n` +
      `Modern architecture always uses sessions[]:` +
      `  ✅ day.sessions[] = [ { id, type, ... }, { id, type, ... } ]` +
      `  ❌ day.workout = { type, ... } (FORBIDDEN)\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Assert that a session intended for Strength module actually has type === 'strength'.
 * This is the hard isolation guard. Runs must NEVER appear in StrengthTraining.
 *
 * @throws Error in dev mode if session type is not 'strength'
 * @example
 *   assertStrengthSession(session, 'StrengthTraining.render')
 */
export function assertStrengthSession(session: any, context: string): void {
  if (!__DEV__) return;

  if (session?.type !== 'strength') {
    throw new Error(
      `[ARCHITECTURE VIOLATION] Non-strength session reached Strength module in ${context}\n\n` +
      `Session: ${JSON.stringify(session)}\n\n` +
      `RULE: Strength module MUST ONLY process sessions with type === 'strength'.\n` +
      `Received type: "${session?.type}"\n` +
      `Title: "${session?.title}"\n\n` +
      `This indicates a filtering bug. Check:` +
      `  ✅ Correct: sessions.filter(s => s.type === 'strength')\n` +
      `  ❌ Wrong: sessions.filter(s => s.title?.includes('Strength'))\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Assert that all sessions in an array have unique IDs.
 * Duplicate IDs indicate a data corruption or merging bug.
 *
 * @throws Error in dev mode if any IDs are duplicated
 * @example
 *   assertUniqueSessionIds(day.sessions, 'Quest.weekPlan')
 */
export function assertUniqueSessionIds(
  sessions: any[],
  context: string
): void {
  if (!__DEV__) return;

  const ids = sessions.map((s: any) => s.id).filter(Boolean);
  const unique = new Set(ids);

  if (ids.length !== unique.size) {
    const duplicates = ids.filter(
      (id, idx) => ids.indexOf(id) !== idx
    );
    throw new Error(
      `[ARCHITECTURE VIOLATION] Duplicate session IDs detected in ${context}\n\n` +
      `IDs: ${ids.join(', ')}\n` +
      `Duplicates: ${[...new Set(duplicates)].join(', ')}\n\n` +
      `RULE: Each session MUST have a unique ID.\n` +
      `This indicates:` +
      `  - Sessions were merged incorrectly\n` +
      `  - IDs were not preserved during conflict resolution\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Assert that a day does not have more sessions than expected by position-based logic.
 * If this fails, position-based selection (.sessions[0]) will be unreliable.
 *
 * @throws Warning (non-fatal) if day has multiple sessions
 * @example
 *   warnMultiSessionDay(day.sessions, 'StrengthTraining.render')
 */
export function warnMultiSessionDay(
  sessions: any[],
  context: string
): void {
  if (!__DEV__) return;

  if (sessions.length > 1) {
    console.warn(
      `[ARCHITECTURE] Multi-session day detected in ${context}\n` +
      `Sessions: ${sessions.length}\n` +
      `IDs: ${sessions.map((s: any) => s.id).join(', ')}\n\n` +
      `⚠️ If selecting by .sessions[0], you will miss other sessions.\n` +
      `✅ Always use: sessions.find(s => s.id === targetId)\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Assert that sessions being processed follow proper ownership rules.
 * BASE_PLAN and USER sessions MUST NOT be deleted during conflict resolution.
 *
 * @throws Error in dev mode if session ownership is suspicious
 * @example
 *   assertSessionOwnershipPreserved(originalSessions, resolvedSessions, 'conflictResolution')
 */
export function assertSessionOwnershipPreserved(
  original: any[],
  resolved: any[],
  context: string
): void {
  if (!__DEV__) return;

  const originalBaseIds = original
    .filter((s: any) => s.source === 'coach' || s.source === 'user')
    .map((s: any) => s.id);

  const resolvedIds = resolved.map((s: any) => s.id);

  const missingIds = originalBaseIds.filter((id: string) => !resolvedIds.includes(id));

  if (missingIds.length > 0) {
    throw new Error(
      `[ARCHITECTURE VIOLATION] BASE_PLAN or USER sessions deleted in ${context}\n\n` +
      `Missing IDs: ${missingIds.join(', ')}\n\n` +
      `RULE: Sessions with source === 'coach' or 'user' MUST be preserved.\n` +
      `Adaptive logic can MODIFY but NEVER DELETE protected sessions.\n` +
      `Context: ${context}`
    );
  }
}

/**
 * Debug helper: Log all sessions in a day for inspection.
 * ONLY runs in dev mode, ONLY when explicitly called.
 *
 * @example
 *   debugDay(day, 'Quest.weekplan')
 */
export function debugDay(day: any, context: string): void {
  if (!__DEV__) return;

  const sessions = day.sessions || [];
  console.debug(`[DEBUG] Day: ${day.label} (${day.dateISO}) in ${context}`, {
    totalSessions: sessions.length,
    sessions: sessions.map((s: any) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      km: s.km,
    })),
  });
}

/**
 * Debug helper: Log session selection for inspection.
 * ONLY runs in dev mode, ONLY when explicitly called.
 *
 * @example
 *   debugSessionSelection(session, 'Quest.onWorkoutClick')
 */
export function debugSessionSelection(session: any, context: string): void {
  if (!__DEV__) return;

  console.debug(`[DEBUG] Session selected in ${context}:`, {
    id: session?.id,
    type: session?.type,
    title: session?.title,
    source: session?.source,
  });
}

/**
 * CRITICAL AUTHORITY CONTRACT
 *
 * Assert that an adaptive plan is treated as authoritative.
 * Once Module 4 generates a plan, NO other plan generator may override it.
 *
 * @throws Error in dev mode if adaptive plan is being replaced
 * @example
 *   assertAdaptivePlanAuthority(weekPlan, 'adaptiveContextBuilder')
 */
export function assertAdaptivePlanAuthority(weekPlan: any, context: string): void {
  if (!__DEV__) return;

  const isAdaptive = weekPlan?.[0]?.planSource === 'adaptive';
  const hasSessions = weekPlan?.some((day: any) => (day.sessions?.length ?? 0) > 0);

  if (isAdaptive && hasSessions) {
    throw new Error(
      `[ARCHITECTURE VIOLATION] Attempting to override adaptive plan in ${context}\n\n` +
      `RULE: Once adaptive plan exists, it is AUTHORITATIVE.\n` +
      `NO default plans, NO constraint-based generation, NO fallback logic.\n\n` +
      `Current plan: ${JSON.stringify({ planSource: weekPlan[0]?.planSource, totalSessions: weekPlan.reduce((sum: number, d: any) => sum + (d.sessions?.length ?? 0), 0) })}\n\n` +
      `Context: ${context}`
    );
  }
}

/**
 * CRITICAL: Check if an adaptive plan exists and is authoritative.
 * Returns true if NO other plan generators should run.
 *
 * @example
 *   if (isAdaptivePlanAuthoritative(weekPlan)) {
 *     console.log('Skipping default plan generation - adaptive plan exists');
 *     return weekPlan;
 *   }
 */
export function isAdaptivePlanAuthoritative(weekPlan: any): boolean {
  if (!weekPlan || weekPlan.length === 0) return false;

  const isAdaptive = weekPlan[0]?.planSource === 'adaptive';
  const totalSessions = weekPlan.reduce((sum: number, day: any) => sum + (day.sessions?.length ?? 0), 0);

  return isAdaptive && totalSessions > 0;
}

/**
 * Assert that normalization is not adding rest days.
 * Normalization ONLY maps sessions → workouts. It MUST NOT add days.
 *
 * @throws Error in dev mode if normalization added days
 * @example
 *   assertNormalizationDidNotAddDays(originalPlan, normalizedPlan, 'plan.normalize')
 */
export function assertNormalizationDidNotAddDays(
  original: any[],
  normalized: any[],
  context: string
): void {
  if (!__DEV__) return;

  const originalSessions = original.reduce((sum: number, d: any) => sum + (d.sessions?.length ?? 0), 0);
  const normalizedSessions = normalized.reduce((sum: number, d: any) => sum + (d.sessions?.length ?? 0), 0);

  if (normalizedSessions > originalSessions) {
    throw new Error(
      `[ARCHITECTURE VIOLATION] Normalization ADDED sessions in ${context}\n\n` +
      `Before: ${originalSessions} sessions\n` +
      `After: ${normalizedSessions} sessions\n\n` +
      `RULE: Normalization may ONLY map sessions → workouts.\n` +
      `It MUST NOT add rest days, training days, or any sessions.\n` +
      `Context: ${context}`
    );
  }
}
