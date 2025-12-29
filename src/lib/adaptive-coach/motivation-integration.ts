/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — MOTIVATION ARCHETYPE INTEGRATION
 *  Module 11 — Emotionally Intelligent Coaching
 * ======================================================================
 *
 * This module bridges the motivation archetype system with the adaptive coach,
 * creating personalized communication, workout variations, and training
 * adjustments based on the athlete's dominant motivation profile.
 *
 * Integration points:
 * - Tone and language personalization for all coach messages
 * - Workout variety adjustments based on archetype preferences
 * - Weekly summary generation with archetype-specific framing
 * - Encouragement patterns matched to motivation profile
 * - Challenge vs comfort calibration
 */

import type {
  AthleteProfile,
  WeeklyPlan,
  DailyPlan,
  Workout,
  WorkoutType,
  TrainingPhase,
  RaceEvent
} from './types';
import type { CoachingMessage } from './explain';
import type { ArchetypeType } from '@/lib/motivationDetection';

//
// ─────────────────────────────────────────────────────────────
//   ARCHETYPE PREFERENCES & CHARACTERISTICS
// ─────────────────────────────────────────────────────────────
//

export interface ArchetypePreferences {
  // Communication style
  tone: 'direct' | 'exploratory' | 'gentle' | 'supportive' | 'empowering' | 'collaborative';
  detailLevel: 'minimal' | 'moderate' | 'detailed';
  encouragementStyle: 'challenge' | 'support' | 'inspire' | 'inform';

  // Workout preferences
  varietyPreference: 'high' | 'moderate' | 'low';
  structurePreference: 'rigid' | 'flexible' | 'loose';
  intensityTolerance: 'high' | 'moderate' | 'low';

  // Social/group preferences
  prefersGroup: boolean;
  shareProgress: boolean;

  // Feedback needs
  needsFrequentFeedback: boolean;
  respondsToData: boolean;
  respondsToStories: boolean;
}

const ARCHETYPE_PROFILES: Record<ArchetypeType, ArchetypePreferences> = {
  performer: {
    tone: 'direct',
    detailLevel: 'detailed',
    encouragementStyle: 'challenge',
    varietyPreference: 'moderate',
    structurePreference: 'rigid',
    intensityTolerance: 'high',
    prefersGroup: false,
    shareProgress: true,
    needsFrequentFeedback: true,
    respondsToData: true,
    respondsToStories: false
  },
  adventurer: {
    tone: 'exploratory',
    detailLevel: 'minimal',
    encouragementStyle: 'inspire',
    varietyPreference: 'high',
    structurePreference: 'loose',
    intensityTolerance: 'high',
    prefersGroup: false,
    shareProgress: true,
    needsFrequentFeedback: false,
    respondsToData: false,
    respondsToStories: true
  },
  mindful: {
    tone: 'gentle',
    detailLevel: 'moderate',
    encouragementStyle: 'support',
    varietyPreference: 'low',
    structurePreference: 'flexible',
    intensityTolerance: 'low',
    prefersGroup: false,
    shareProgress: false,
    needsFrequentFeedback: false,
    respondsToData: false,
    respondsToStories: true
  },
  health: {
    tone: 'supportive',
    detailLevel: 'moderate',
    encouragementStyle: 'support',
    varietyPreference: 'low',
    structurePreference: 'flexible',
    intensityTolerance: 'moderate',
    prefersGroup: false,
    shareProgress: false,
    needsFrequentFeedback: true,
    respondsToData: true,
    respondsToStories: false
  },
  transformer: {
    tone: 'empowering',
    detailLevel: 'detailed',
    encouragementStyle: 'inspire',
    varietyPreference: 'moderate',
    structurePreference: 'flexible',
    intensityTolerance: 'moderate',
    prefersGroup: false,
    shareProgress: true,
    needsFrequentFeedback: true,
    respondsToData: true,
    respondsToStories: true
  },
  connector: {
    tone: 'collaborative',
    detailLevel: 'moderate',
    encouragementStyle: 'support',
    varietyPreference: 'high',
    structurePreference: 'flexible',
    intensityTolerance: 'moderate',
    prefersGroup: true,
    shareProgress: true,
    needsFrequentFeedback: true,
    respondsToData: false,
    respondsToStories: true
  }
};

//
// ─────────────────────────────────────────────────────────────
//   TONE TRANSFORMATION
// ─────────────────────────────────────────────────────────────
//

interface ToneTemplate {
  opening: string[];
  transition: string[];
  emphasis: string[];
  closing: string[];
}

const TONE_TEMPLATES: Record<ArchetypeType, ToneTemplate> = {
  performer: {
    opening: ['Let\'s execute.', 'Time to perform.', 'Here\'s the plan.', 'Focus up.'],
    transition: ['Next:', 'Then:', 'Moving to:', 'Step 2:'],
    emphasis: ['Critical:', 'Key point:', 'This matters:', 'Essential:'],
    closing: ['Make it count.', 'Execute the plan.', 'Get after it.', 'Dominate this week.']
  },
  adventurer: {
    opening: ['The trail awaits.', 'Let\'s explore.', 'Adventure time.', 'New horizons ahead.'],
    transition: ['And then...', 'From there...', 'Next up...', 'Beyond that...'],
    emphasis: ['Here\'s the magic:', 'The beauty:', 'What\'s exciting:', 'Discovery:'],
    closing: ['Run free.', 'Embrace the journey.', 'Find your path.', 'Go explore.']
  },
  mindful: {
    opening: ['Take a breath.', 'Let\'s flow.', 'In balance...', 'With presence...'],
    transition: ['And gently...', 'Flowing to...', 'Then softly...', 'Next, with ease...'],
    emphasis: ['Notice:', 'Feel into:', 'Observe:', 'Be aware:'],
    closing: ['Trust your body.', 'Stay present.', 'Find your rhythm.', 'Honor your pace.']
  },
  health: {
    opening: ['Let\'s build consistency.', 'Steady progress ahead.', 'Wellness first.', 'Smart training.'],
    transition: ['Also:', 'Additionally:', 'Next:', 'Then:'],
    emphasis: ['Important:', 'Remember:', 'Keep in mind:', 'Note:'],
    closing: ['Stay consistent.', 'Build your habit.', 'One day at a time.', 'Progress over perfection.']
  },
  transformer: {
    opening: ['This week, you evolve.', 'Growth in motion.', 'Your transformation continues.', 'Building your comeback.'],
    transition: ['Building on that...', 'Stacking progress...', 'Layering in...', 'Adding strength...'],
    emphasis: ['This changes you:', 'Growth moment:', 'Breakthrough zone:', 'Evolution point:'],
    closing: ['You\'re becoming stronger.', 'Own your transformation.', 'Keep rising.', 'This is your story.']
  },
  connector: {
    opening: ['We\'re in this together.', 'The crew is ready.', 'Team effort this week.', 'Let\'s do this collectively.'],
    transition: ['Together we...', 'As a team...', 'Collectively...', 'With the group...'],
    emphasis: ['Everyone benefits:', 'Shared wisdom:', 'Community insight:', 'Together we learn:'],
    closing: ['Lift each other up.', 'Run for the team.', 'Strength in numbers.', 'Together we\'re stronger.']
  }
};

/**
 * Apply archetype-specific tone to a coaching message
 */
export function applyArchetypeTone(
  message: CoachingMessage,
  archetype: ArchetypeType,
  confidence: number
): CoachingMessage {
  // Only apply strong tone transformation if confidence is high
  if (confidence < 0.5) {
    return message;
  }

  const templates = TONE_TEMPLATES[archetype];
  const preferences = ARCHETYPE_PROFILES[archetype];

  // Transform body text based on tone
  let transformedBody = message.body;

  // Add archetype-specific opening if message is long enough
  if (transformedBody.length > 100 && Math.random() > 0.5) {
    const opening = templates.opening[Math.floor(Math.random() * templates.opening.length)];
    transformedBody = `${opening} ${transformedBody}`;
  }

  // Add archetype-specific closing if appropriate
  if (message.priority === 'high' && message.tone === 'encouraging') {
    const closing = templates.closing[Math.floor(Math.random() * templates.closing.length)];
    transformedBody = `${transformedBody}\n\n${closing}`;
  }

  // Adjust detail level
  if (preferences.detailLevel === 'minimal') {
    // Remove parenthetical explanations for adventurers and mindful runners
    transformedBody = transformedBody.replace(/\s*\([^)]*\)/g, '');
  }

  return {
    ...message,
    body: transformedBody
  };
}

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT VARIETY ADJUSTMENTS
// ─────────────────────────────────────────────────────────────
//

/**
 * Suggest workout modifications based on archetype preferences
 */
export function adjustWorkoutForArchetype(
  workout: Workout,
  archetype: ArchetypeType,
  phase: TrainingPhase
): Workout {
  const preferences = ARCHETYPE_PROFILES[archetype];

  let adjusted = { ...workout };

  // Adventurer: Add variety and exploration
  if (archetype === 'adventurer' && workout.type === 'easy') {
    if (Math.random() > 0.7) {
      adjusted.notes = (adjusted.notes || '') + ' Try a new route or trail today.';
    }
  }

  // Performer: Add specific targets and metrics
  if (archetype === 'performer' && workout.type !== 'rest') {
    if (!workout.structure && workout.type !== 'easy') {
      adjusted.notes = (adjusted.notes || '') + ' Track pace and HR to measure progress.';
    }
  }

  // Mindful: Emphasize feel over metrics
  if (archetype === 'mindful') {
    adjusted.notes = (adjusted.notes || '').replace(/pace/gi, 'effort');
    if (workout.type === 'easy') {
      adjusted.notes = (adjusted.notes || '') + ' Focus on breathing and form.';
    }
  }

  // Connector: Suggest group opportunities
  if (archetype === 'connector' && ['easy', 'long'].includes(workout.type)) {
    if (Math.random() > 0.6) {
      adjusted.notes = (adjusted.notes || '') + ' Great day for a group run!';
    }
  }

  // Transformer: Emphasize progress markers
  if (archetype === 'transformer' && workout.isKeyWorkout) {
    adjusted.notes = (adjusted.notes || '') + ' This workout shows how far you\'ve come.';
  }

  return adjusted;
}

/**
 * Generate archetype-specific variety suggestions for weekly plans
 */
export function suggestWeeklyVariety(
  plan: WeeklyPlan,
  archetype: ArchetypeType
): string[] {
  const preferences = ARCHETYPE_PROFILES[archetype];
  const suggestions: string[] = [];

  if (preferences.varietyPreference === 'high') {
    const easyDays = plan.days.filter(d => d.workout?.type === 'easy').length;
    if (easyDays >= 3) {
      suggestions.push('Mix up your easy runs: try trails, new routes, or different times of day');
    }
  }

  if (archetype === 'adventurer') {
    suggestions.push('Scout out a new trail or explore an unfamiliar area this week');
  }

  if (archetype === 'connector' && !plan.notes?.includes('group')) {
    suggestions.push('Consider joining a group run for one of your easy sessions');
  }

  if (archetype === 'mindful' && plan.phase === 'intensity') {
    suggestions.push('Balance hard efforts with extra mindfulness during easy runs');
  }

  if (archetype === 'performer') {
    suggestions.push('Document splits and times for key workouts to track improvement');
  }

  if (archetype === 'transformer') {
    suggestions.push('Reflect on how this week\'s training builds on previous weeks');
  }

  return suggestions;
}

//
// ─────────────────────────────────────────────────────────────
//   ENCOURAGEMENT PATTERNS
// ─────────────────────────────────────────────────────────────
//

interface EncouragementContext {
  completionRate: number;
  fatigueLevel: number;
  momentum: 'building' | 'stable' | 'declining';
  recentBreakthroughs: number;
}

/**
 * Generate archetype-specific encouragement message
 */
export function generateEncouragement(
  context: EncouragementContext,
  archetype: ArchetypeType
): string {
  const { completionRate, momentum, recentBreakthroughs } = context;

  const messages: Record<ArchetypeType, Record<string, string[]>> = {
    performer: {
      high: [
        'You\'re crushing it. Keep that intensity.',
        'Exceptional execution this week.',
        'Performance metrics are trending up. Stay locked in.'
      ],
      medium: [
        'Solid work. Tighten up consistency for even better results.',
        'Good effort. Push a bit harder on key workouts.',
        'You\'re progressing. Time to raise the bar.'
      ],
      low: [
        'Consistency slipping. Refocus on the plan.',
        'Get back to basics. Execute the fundamentals.',
        'Reset and attack the next workout.'
      ]
    },
    adventurer: {
      high: [
        'You\'re flowing beautifully. The trail is yours.',
        'Every mile is an adventure. Keep exploring.',
        'Freedom in motion. This is your element.'
      ],
      medium: [
        'Nice rhythm. Mix in something new to reignite the spark.',
        'Steady exploration. Try a different path.',
        'Good momentum. Find a new summit to chase.'
      ],
      low: [
        'The trail still calls. Listen to it.',
        'Adventure awaits. Take one step back toward it.',
        'Rediscover what drew you to the trail.'
      ]
    },
    mindful: {
      high: [
        'Beautiful balance. You\'re in harmony.',
        'Presence and progress in perfect flow.',
        'This is mindful training at its best.'
      ],
      medium: [
        'You\'re finding your rhythm. Trust it.',
        'Balance is there. Keep breathing into it.',
        'Gentle progress is still progress.'
      ],
      low: [
        'Be gentle with yourself. Rest is training too.',
        'Listen to what your body needs right now.',
        'Stillness before movement. Take your time.'
      ]
    },
    health: {
      high: [
        'Consistency is your superpower. Keep building.',
        'You\'re creating lasting habits. This is how it\'s done.',
        'Steady, sustainable progress. Perfect.'
      ],
      medium: [
        'Good routine. Small adjustments keep momentum going.',
        'Building the habit. Stay the course.',
        'Wellness is a practice. You\'re practicing well.'
      ],
      low: [
        'Consistency matters more than intensity. Get back to basics.',
        'One run restarts the habit. Take that step.',
        'Health is built one day at a time. Today counts.'
      ]
    },
    transformer: {
      high: [
        'You\'re rewriting your story. Every mile counts.',
        'Transformation in motion. Feel the power.',
        'This is your comeback. Own it.'
      ],
      medium: [
        'Growth is happening. Keep stacking wins.',
        'You\'re building something special. Trust the process.',
        'Each week adds strength. You\'re evolving.'
      ],
      low: [
        'Setbacks are part of transformation. Rise again.',
        'Every comeback starts with a single step.',
        'You\'ve rebuilt before. You can do it again.'
      ]
    },
    connector: {
      high: [
        'Your energy lifts the whole crew. Keep showing up.',
        'The team is stronger because of you.',
        'Community thrives when you lead by example.'
      ],
      medium: [
        'Your consistency inspires others. Keep it up.',
        'The crew needs your presence. You matter.',
        'Together is better. Thanks for showing up.'
      ],
      low: [
        'Reach out to the crew. They\'ve got your back.',
        'Running is better together. Reconnect.',
        'The team is waiting. They need your energy.'
      ]
    }
  };

  let level: string;
  if (completionRate >= 0.85 && momentum !== 'declining') {
    level = 'high';
  } else if (completionRate >= 0.65 || recentBreakthroughs > 0) {
    level = 'medium';
  } else {
    level = 'low';
  }

  const options = messages[archetype][level];
  return options[Math.floor(Math.random() * options.length)];
}

//
// ─────────────────────────────────────────────────────────────
//   WEEKLY SUMMARY PERSONALIZATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Generate archetype-personalized weekly summary
 */
export function generateArchetypeWeeklySummary(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  race: RaceEvent,
  archetype: ArchetypeType
): string {
  const preferences = ARCHETYPE_PROFILES[archetype];

  let summary = '';

  // Opening tailored to archetype
  if (archetype === 'performer') {
    summary += `Week ${plan.weekNumber} performance summary: `;
  } else if (archetype === 'adventurer') {
    summary += `Week ${plan.weekNumber} adventure log: `;
  } else if (archetype === 'mindful') {
    summary += `Week ${plan.weekNumber} reflection: `;
  } else if (archetype === 'health') {
    summary += `Week ${plan.weekNumber} wellness check: `;
  } else if (archetype === 'transformer') {
    summary += `Week ${plan.weekNumber} transformation update: `;
  } else if (archetype === 'connector') {
    summary += `Week ${plan.weekNumber} team report: `;
  }

  // Core metrics - level of detail based on preferences
  if (preferences.respondsToData) {
    summary += `${plan.actualMileage || plan.targetMileage}km completed across ${plan.completionRate ? Math.round(plan.completionRate * 100) : '?'}% of planned workouts. `;
  } else {
    summary += `Good progress this week. `;
  }

  // Archetype-specific framing
  if (archetype === 'performer' && plan.actualMileage) {
    const delta = plan.actualMileage - plan.targetMileage;
    if (Math.abs(delta) > 2) {
      summary += delta > 0 ? `Exceeded target by ${delta.toFixed(1)}km. ` : `Came up ${Math.abs(delta).toFixed(1)}km short. `;
    } else {
      summary += `Hit target volume precisely. `;
    }
  } else if (archetype === 'adventurer') {
    summary += `New trails explored, new experiences gained. `;
  } else if (archetype === 'mindful') {
    summary += `Balance maintained, body listened to. `;
  } else if (archetype === 'health') {
    summary += `Consistency upheld, habits reinforced. `;
  } else if (archetype === 'transformer') {
    const weekProgress = (plan.weekNumber / 16) * 100; // Assuming 16-week plan
    summary += `${weekProgress.toFixed(0)}% through your transformation. `;
  } else if (archetype === 'connector') {
    summary += `Your dedication inspires the whole crew. `;
  }

  return summary.trim();
}

//
// ─────────────────────────────────────────────────────────────
//   CHALLENGE VS COMFORT CALIBRATION
// ─────────────────────────────────────────────────────────────
//

export interface ChallengeCalibration {
  shouldChallenge: boolean;
  intensity: 'gentle' | 'moderate' | 'strong';
  message: string;
}

/**
 * Determine whether to challenge or comfort based on archetype and context
 */
export function calibrateChallengeLevel(
  archetype: ArchetypeType,
  recentCompletionRate: number,
  fatigueLevel: number,
  phase: TrainingPhase
): ChallengeCalibration {
  const preferences = ARCHETYPE_PROFILES[archetype];

  // Base decision on completion rate and fatigue
  const isPerformingWell = recentCompletionRate > 0.8 && fatigueLevel < 0.6;
  const isStruggling = recentCompletionRate < 0.6 || fatigueLevel > 0.7;

  let shouldChallenge: boolean;
  let intensity: 'gentle' | 'moderate' | 'strong';
  let message: string;

  if (isStruggling) {
    shouldChallenge = false;
    intensity = 'gentle';

    if (archetype === 'performer') {
      message = 'Reset week. Execute recovery, then we attack again.';
    } else if (archetype === 'mindful') {
      message = 'Listen to your body. Rest is wisdom.';
    } else if (archetype === 'transformer') {
      message = 'Even transformations need recovery. Rebuild before rising.';
    } else {
      message = 'Take the pressure off. Consistency over perfection.';
    }
  } else if (isPerformingWell) {
    shouldChallenge = preferences.encouragementStyle === 'challenge';
    intensity = preferences.intensityTolerance === 'high' ? 'strong' : 'moderate';

    if (shouldChallenge) {
      if (archetype === 'performer') {
        message = 'Time to level up. You\'re ready for more.';
      } else if (archetype === 'adventurer') {
        message = 'You\'ve mastered this terrain. Explore harder trails.';
      } else if (archetype === 'transformer') {
        message = 'Growth moment. Push beyond your old limits.';
      } else {
        message = 'You\'re stronger than you think. Try something harder.';
      }
    } else {
      message = 'Excellent consistency. Keep this sustainable pace.';
    }
  } else {
    shouldChallenge = false;
    intensity = 'moderate';
    message = 'Steady progress. Stay the course.';
  }

  return { shouldChallenge, intensity, message };
}

//
// ─────────────────────────────────────────────────────────────
//   MAIN INTEGRATION FUNCTION
// ─────────────────────────────────────────────────────────────
//

export interface MotivationIntegrationContext {
  archetype: ArchetypeType;
  confidence: number;
  athlete: AthleteProfile;
  phase: TrainingPhase;
  recentCompletionRate: number;
  fatigueLevel: number;
}

/**
 * Apply full motivation integration to a weekly plan
 */
export function integrateMotivationProfile(
  plan: WeeklyPlan,
  context: MotivationIntegrationContext
): WeeklyPlan {
  const { archetype, confidence, athlete, phase, recentCompletionRate, fatigueLevel } = context;

  // Apply to all daily sessions
  const enhancedDays: DailyPlan[] = plan.days.map(day => {
    if (!day.sessions || day.sessions.length === 0) {
      return day;
    }

    // Apply archetype adjustments to all non-rest sessions
    const adjustedSessions = day.sessions
      .filter(s => s.type !== 'rest')
      .map(session => adjustWorkoutForArchetype(session, archetype, phase));

    // Include rest sessions unchanged
    const restSessions = day.sessions.filter(s => s.type === 'rest');

    return {
      ...day,
      sessions: [...adjustedSessions, ...restSessions]
    };
  });

  // Add archetype-specific variety suggestions to notes
  const varietySuggestions = suggestWeeklyVariety(plan, archetype);
  const enhancedNotes = [
    ...(plan.notes || []),
    ...varietySuggestions
  ];

  // Generate encouragement
  const encouragement = generateEncouragement(
    {
      completionRate: recentCompletionRate,
      fatigueLevel,
      momentum: recentCompletionRate > 0.75 ? 'building' : recentCompletionRate > 0.6 ? 'stable' : 'declining',
      recentBreakthroughs: 0 // Would be calculated from actual data
    },
    archetype
  );

  return {
    ...plan,
    days: enhancedDays,
    notes: enhancedNotes,
    adaptationNote: encouragement
  };
}

/**
 * Get archetype preferences for external use
 */
export function getArchetypePreferences(archetype: ArchetypeType): ArchetypePreferences {
  return ARCHETYPE_PROFILES[archetype];
}
