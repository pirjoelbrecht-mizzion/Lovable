/**
 * ======================================================================
 *  ENHANCED EXPLANATION ENGINE WITH MOTIVATION INTEGRATION
 *  Combines base explanation logic with archetype-aware communication
 * ======================================================================
 *
 * This module wraps the original explanation engine with motivation-aware
 * enhancements, ensuring all coaching messages are personalized to the
 * athlete's motivation archetype.
 */

import type {
  AthleteProfile,
  WeeklyPlan,
  TrainingPhase,
  RaceEvent
} from './types';
import type { AdaptationDecision } from './adaptive-controller';
import type { FeedbackSummary } from './feedback-processor';
import type { ArchetypeType } from '@/lib/motivationDetection';

import {
  explainWeeklyPlan as baseExplainWeeklyPlan,
  explainAdaptation as baseExplainAdaptation,
  explainProgressTowardRace as baseExplainProgressTowardRace,
  generateMotivationalMessage as baseGenerateMotivationalMessage,
  explainWorkoutPurpose,
  generateWeeklySummary as baseGenerateWeeklySummary,
  explainRaceStrategy as baseExplainRaceStrategy,
  type CoachingMessage
} from './explain';

import {
  applyArchetypeTone,
  generateArchetypeWeeklySummary,
  calibrateChallengeLevel,
  getArchetypePreferences
} from './motivation-integration';

//
// ─────────────────────────────────────────────────────────────
//   ENHANCED EXPLANATION FUNCTIONS
// ─────────────────────────────────────────────────────────────
//

export interface MotivationContext {
  archetype: ArchetypeType;
  confidence: number;
}

/**
 * Explain weekly plan with archetype-aware tone
 */
export function explainWeeklyPlan(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  race: RaceEvent,
  weeksToRace: number,
  motivationContext?: MotivationContext
): CoachingMessage {
  // Get base explanation
  const baseMessage = baseExplainWeeklyPlan(plan, athlete, race, weeksToRace);

  // Apply archetype tone if motivation context available
  if (motivationContext && motivationContext.confidence > 0.4) {
    return applyArchetypeTone(baseMessage, motivationContext.archetype, motivationContext.confidence);
  }

  return baseMessage;
}

/**
 * Explain adaptation with archetype-aware communication
 */
export function explainAdaptation(
  decision: AdaptationDecision,
  athlete: AthleteProfile,
  originalPlan: WeeklyPlan,
  motivationContext?: MotivationContext
): CoachingMessage {
  const baseMessage = baseExplainAdaptation(decision, athlete, originalPlan);

  if (motivationContext && motivationContext.confidence > 0.4) {
    return applyArchetypeTone(baseMessage, motivationContext.archetype, motivationContext.confidence);
  }

  return baseMessage;
}

/**
 * Explain progress toward race with archetype framing
 */
export function explainProgressTowardRace(
  athlete: AthleteProfile,
  race: RaceEvent,
  currentWeek: number,
  totalWeeks: number,
  completedMileage: number,
  motivationContext?: MotivationContext
): CoachingMessage {
  const baseMessage = baseExplainProgressTowardRace(
    athlete,
    race,
    currentWeek,
    totalWeeks,
    completedMileage
  );

  if (motivationContext && motivationContext.confidence > 0.4) {
    return applyArchetypeTone(baseMessage, motivationContext.archetype, motivationContext.confidence);
  }

  return baseMessage;
}

/**
 * Generate motivational message with archetype calibration
 */
export function generateMotivationalMessage(
  feedbackSummary: FeedbackSummary,
  athlete: AthleteProfile,
  phase: TrainingPhase,
  motivationContext?: MotivationContext
): CoachingMessage {
  const baseMessage = baseGenerateMotivationalMessage(feedbackSummary, athlete, phase);

  if (motivationContext && motivationContext.confidence > 0.4) {
    // Apply tone transformation
    let enhanced = applyArchetypeTone(baseMessage, motivationContext.archetype, motivationContext.confidence);

    // Add challenge/comfort calibration
    const recentCompletionRate = feedbackSummary.readyForProgression ? 0.85 : 0.65;
    const fatigueLevel = feedbackSummary.trends.fatigue / 100;

    const calibration = calibrateChallengeLevel(
      motivationContext.archetype,
      recentCompletionRate,
      fatigueLevel,
      phase
    );

    // Append calibration message if it adds value
    if (calibration.shouldChallenge || feedbackSummary.riskLevel !== 'low') {
      enhanced = {
        ...enhanced,
        body: `${enhanced.body}\n\n${calibration.message}`
      };
    }

    return enhanced;
  }

  return baseMessage;
}

/**
 * Generate weekly summary with full archetype personalization
 */
export function generateWeeklySummary(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  race: RaceEvent,
  motivationContext?: MotivationContext
): string {
  if (motivationContext && motivationContext.confidence > 0.5) {
    return generateArchetypeWeeklySummary(
      plan,
      athlete,
      race,
      motivationContext.archetype
    );
  }

  return baseGenerateWeeklySummary(plan, athlete, race);
}

/**
 * Explain race strategy with archetype-appropriate framing
 */
export function explainRaceStrategy(
  race: RaceEvent,
  athlete: AthleteProfile,
  motivationContext?: MotivationContext
): CoachingMessage {
  const baseMessage = baseExplainRaceStrategy(race, athlete);

  if (motivationContext && motivationContext.confidence > 0.4) {
    const preferences = getArchetypePreferences(motivationContext.archetype);

    // Adjust level of detail based on archetype
    let adjusted = { ...baseMessage };

    if (preferences.detailLevel === 'minimal') {
      // Condense for adventurers
      const sentences = adjusted.body.split('. ');
      adjusted.body = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ') + '.';
    } else if (preferences.detailLevel === 'detailed') {
      // Keep full detail for performers and transformers
      // Already detailed, no change needed
    }

    return applyArchetypeTone(adjusted, motivationContext.archetype, motivationContext.confidence);
  }

  return baseMessage;
}

//
// ─────────────────────────────────────────────────────────────
//   HELPER: GET MOTIVATION CONTEXT FROM ATHLETE PROFILE
// ─────────────────────────────────────────────────────────────
//

/**
 * Extract motivation context from athlete profile if available
 * This function bridges the adaptive coach types with the motivation system
 */
export async function getMotivationContextForAthlete(
  userId: string
): Promise<MotivationContext | undefined> {
  try {
    const { getUserMotivationProfile } = await import('@/lib/motivationDetection');
    const profile = await getUserMotivationProfile(userId);

    if (!profile) {
      return undefined;
    }

    return {
      archetype: profile.dominant,
      confidence: profile.confidence
    };
  } catch (error) {
    console.error('Error fetching motivation context:', error);
    return undefined;
  }
}

//
// ─────────────────────────────────────────────────────────────
//   EXPORT BASE FUNCTIONS FOR BACKWARD COMPATIBILITY
// ─────────────────────────────────────────────────────────────
//

export { explainWorkoutPurpose } from './explain';
export type { CoachingMessage } from './explain';
