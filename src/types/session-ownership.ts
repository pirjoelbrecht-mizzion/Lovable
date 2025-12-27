/**
 * ======================================================================
 *  SESSION OWNERSHIP & PROTECTION TYPES
 *  Canonical Source of Truth
 * ======================================================================
 *
 * CRITICAL: This is the ONLY place where ownership types are defined.
 * All other modules MUST import from here.
 *
 * These types control adaptive engine behavior:
 * - origin: Who created this session?
 * - locked: Can adaptive engine delete this?
 * - lockReason: Why is this locked?
 *
 * AUTHORITY GRAPH:
 * ┌─────────────┬──────────────────┬───────────────────┐
 * │   Origin    │ Can Adaptive     │ Can Adaptive      │
 * │             │ Modify?          │ Delete?           │
 * ├─────────────┼──────────────────┼───────────────────┤
 * │ BASE_PLAN   │ ✅ Yes           │ ❌ No             │
 * │ USER        │ ⚠️  Limited      │ ❌ No             │
 * │ STRENGTH    │ ✅ Load only     │ ❌ No             │
 * │ HEAT        │ ✅ Timing only   │ ❌ No             │
 * │ ALTITUDE    │ ✅ Timing only   │ ❌ No             │
 * │ ADAPTIVE    │ ✅ Yes           │ ✅ Yes            │
 * └─────────────┴──────────────────┴───────────────────┘
 */

/**
 * Session origin - who created this session?
 *
 * CRITICAL: The adaptive engine may MODIFY but NOT DELETE sessions it didn't create
 *
 * This prevents data loss scenarios like:
 * - User adds strength training → adaptive engine deletes it
 * - Heat module adds acclimation → adaptive engine removes it
 * - User manually schedules run → adaptive engine replaces it
 */
export type SessionOrigin =
  | 'BASE_PLAN'     // From plan template (e.g., microcycle distributor)
  | 'USER'          // User-created session (highest protection)
  | 'ADAPTIVE'      // Created by adaptive engine (can be deleted)
  | 'STRENGTH'      // From strength training module
  | 'HEAT'          // From heat acclimatization module
  | 'ALTITUDE';     // From altitude training module

/**
 * Lock reason - why is this session protected from deletion?
 *
 * CRITICAL: This allows ADAPTIVE sessions to become locked later
 *
 * Use cases:
 * - ADAPTIVE session that becomes critical for recovery (e.g., taper rest day)
 * - Safety-critical sessions (e.g., mandatory rest before race)
 * - User explicitly protects a session
 *
 * Prevents boolean logic explosion in adaptation:
 * Instead of: (locked && origin !== 'ADAPTIVE') || (origin === 'ADAPTIVE' && taperActive)
 * You get: locked && lockReason === 'PHYSIOLOGY'
 */
export type LockReason =
  | 'PHYSIOLOGY'     // Critical for recovery/adaptation (e.g., taper logic)
  | 'SAFETY'         // Injury prevention, mandatory rest
  | 'USER_OVERRIDE'; // User explicitly locked this session

/**
 * Session priority - determines adaptation behavior
 *
 * When the adaptive engine needs to reduce load:
 * - 'primary': Main workout - never remove, can reduce distance
 * - 'secondary': Support workout - can reduce or remove if overloaded
 * - 'support': Optional workout - can skip if fatigued
 */
export type SessionPriority =
  | 'primary'      // Main workout - protected
  | 'secondary'    // Support workout - can reduce
  | 'support';     // Optional workout - can skip
