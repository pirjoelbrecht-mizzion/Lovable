/**
 * ======================================================================
 *  DECISION FACADE — Single Entry Point for Weekly Training Adjustments
 * ======================================================================
 *
 * This facade provides the canonical entry point for adaptive weekly
 * training plan adjustments in Mizzion.
 *
 * SCOPE:
 * - Covers adjustments to existing weekly plans
 * - Does NOT cover initial plan generation (see generateMicrocycle, generateMaintenancePlan)
 *
 * RESPONSIBILITY:
 * - Delegates to computeTrainingAdjustment without modification
 * - Provides explicit, stable API boundary
 *
 * NO LOGIC LIVES HERE. This is a pure delegation facade.
 */

import { computeTrainingAdjustment, type AdaptiveContext, type AdaptiveDecision } from './adaptiveDecisionEngine';

/**
 * Adjust an existing weekly training plan based on adaptive context.
 *
 * This is the single entry point for adaptive weekly training decisions.
 *
 * @param context - Complete adaptive context containing athlete profile, existing plan, ACWR, climate, motivation, races, and history
 * @returns Decision containing original plan, modified plan, adjustment layers, reasoning, safety flags, and warnings
 */
export function adjustWeeklyTrainingDecision(context: AdaptiveContext): AdaptiveDecision {
  return computeTrainingAdjustment(context);
}
