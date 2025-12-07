import { emit, on } from '../bus';
import {
  processWeightedDailyFeedback,
  processRaceFeedback,
  processDNFFeedback,
} from './weighted-feedback-processor';
import {
  generateMicroAdjustment,
  generateMacroAdjustment,
  generateDNFRecoveryPlan,
} from './adaptive-response';
import type { AthleteProfile } from './types';

let isInitialized = false;

export function initializeAdaptiveCoachEventBus() {
  if (isInitialized) {
    console.warn('[AdaptiveCoach] Event bus already initialized');
    return;
  }

  console.log('[AdaptiveCoach] Initializing event bus listeners');

  on('feedback:training-saved', async ({ feedback, weight, sessionImportance }) => {
    console.log('[AdaptiveCoach] Training feedback received:', {
      date: feedback.date,
      weight,
      sessionImportance,
    });

    try {
      const athleteProfile: AthleteProfile = {
        weeklyVolume: 50,
        experienceLevel: 'intermediate',
        injuryHistory: [],
        preferredTerrain: 'trail',
      };

      const insights = processWeightedDailyFeedback(
        feedback,
        sessionImportance === 'key_workout' || sessionImportance === 'long_run'
          ? 'training_key_workout'
          : 'training_normal',
        athleteProfile
      );

      console.log('[AdaptiveCoach] Generated insights:', insights);

      const microAdj = generateMicroAdjustment(feedback, athleteProfile);
      console.log('[AdaptiveCoach] Micro adjustment:', microAdj);

      emit('plan:micro-adjustment', {
        adjustment: microAdj,
        reason: `Training feedback with ${weight}× weight`,
      });

      emit('coach:insight-generated', {
        insights,
        weight,
      });
    } catch (error) {
      console.error('[AdaptiveCoach] Error processing training feedback:', error);
    }
  });

  on('feedback:race-saved', async ({ feedback, weight, logEntryId }) => {
    console.log('[AdaptiveCoach] Race feedback received:', {
      date: feedback.event_date,
      type: feedback.event_type,
      weight,
    });

    try {
      const athleteProfile: AthleteProfile = {
        weeklyVolume: 50,
        experienceLevel: 'intermediate',
        injuryHistory: [],
        preferredTerrain: 'trail',
      };

      const insights = processRaceFeedback(feedback, athleteProfile);
      console.log('[AdaptiveCoach] Generated race insights:', insights);

      const macroAdj = generateMacroAdjustment(feedback, athleteProfile);
      console.log('[AdaptiveCoach] Macro adjustment:', macroAdj);

      emit('plan:macro-adjustment', {
        adjustment: macroAdj,
        reason: `Race feedback with ${weight}× weight`,
      });

      emit('coach:insight-generated', {
        insights,
        weight,
      });

      emit('models:update', {
        models: insights.flatMap(i => i.affectedModels),
        weight,
        source: 'race_feedback',
      });
    } catch (error) {
      console.error('[AdaptiveCoach] Error processing race feedback:', error);
    }
  });

  on('feedback:dnf-saved', async ({ dnfEvent, weight, logEntryId }) => {
    console.log('[AdaptiveCoach] DNF feedback received:', {
      date: dnfEvent.event_date,
      cause: dnfEvent.dnf_cause,
      weight,
    });

    try {
      const athleteProfile: AthleteProfile = {
        weeklyVolume: 50,
        experienceLevel: 'intermediate',
        injuryHistory: [],
        preferredTerrain: 'trail',
      };

      const insights = processDNFFeedback(dnfEvent, athleteProfile);
      console.log('[AdaptiveCoach] Generated DNF insights:', insights);

      const recoveryPlan = generateDNFRecoveryPlan(dnfEvent, athleteProfile);
      console.log('[AdaptiveCoach] Recovery plan:', recoveryPlan);

      emit('plan:recovery-protocol', {
        plan: recoveryPlan,
        reason: `DNF due to ${dnfEvent.dnf_cause} with ${weight}× weight`,
      });

      emit('coach:insight-generated', {
        insights,
        weight,
      });

      emit('models:update', {
        models: ['recovery', 'readiness', 'training_stress', 'injury_risk'],
        weight,
        source: 'dnf_event',
      });
    } catch (error) {
      console.error('[AdaptiveCoach] Error processing DNF feedback:', error);
    }
  });

  isInitialized = true;
  console.log('[AdaptiveCoach] Event bus listeners initialized successfully');
}

export function destroyAdaptiveCoachEventBus() {
  if (!isInitialized) {
    return;
  }

  isInitialized = false;
  console.log('[AdaptiveCoach] Event bus listeners destroyed');
}
