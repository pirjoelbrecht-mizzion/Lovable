/**
 * Motivation-Aware Coach Message Generator
 *
 * Extends existing AI personality system with archetype-specific tone and messaging.
 * Generates contextual coach messages based on user's motivation profile and training state.
 */

import type { ArchetypeType, MotivationProfile, TrainingMetrics } from './motivationDetection';

export interface CoachMessageContext {
  archetype: ArchetypeType;
  confidence: number;
  trainingMetrics?: Partial<TrainingMetrics>;
  recentActivity?: {
    type: 'rest' | 'easy' | 'hard' | 'long';
    kmThisWeek: number;
    fatigueLevel?: number;
  };
  upcomingRace?: {
    weeksAway: number;
    distance: string;
  };
}

export interface ArchetypeTheme {
  primaryColor: string;
  accentColor: string;
  gradient: string;
  icon: string;
  soundMotif?: string;
}

export const ARCHETYPE_THEMES: Record<ArchetypeType, ArchetypeTheme> = {
  performer: {
    primaryColor: '#DC2626',
    accentColor: '#F97316',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #F97316 100%)',
    icon: '⚡',
    soundMotif: 'drum-pulse',
  },
  adventurer: {
    primaryColor: '#059669',
    accentColor: '#3B82F6',
    gradient: 'linear-gradient(135deg, #059669 0%, #3B82F6 100%)',
    icon: '🏔️',
    soundMotif: 'wind-trail',
  },
  mindful: {
    primaryColor: '#A855F7',
    accentColor: '#9CA3AF',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #9CA3AF 100%)',
    icon: '🧘',
    soundMotif: 'soft-breeze',
  },
  health: {
    primaryColor: '#10B981',
    accentColor: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #10B981 0%, #FFFFFF 100%)',
    icon: '💚',
    soundMotif: 'gentle-chime',
  },
  transformer: {
    primaryColor: '#F59E0B',
    accentColor: '#1E40AF',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #1E40AF 100%)',
    icon: '💪',
    soundMotif: 'rising-synth',
  },
  connector: {
    primaryColor: '#3B82F6',
    accentColor: '#F472B6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #F472B6 100%)',
    icon: '🤝',
    soundMotif: 'group-cheer',
  },
};

const ARCHETYPE_QUOTES: Record<ArchetypeType, string[]> = {
  performer: [
    'Excellence is a habit and yours is forming.',
    'Every mile is a statement. Make it count.',
    'Pressure is a privilege. Own it.',
    'The clock respects effort. Show it what you have.',
    'Talent sets the floor. Discipline sets the ceiling.',
  ],
  adventurer: [
    'The trail does not care about your pace only that you keep moving.',
    'Every summit begins with a single step into the unknown.',
    'Freedom is not found at the finish line. It is earned in motion.',
    'Mountains teach patience. Trails teach resilience.',
    'Run where the horizon calls, not where the crowd gathers.',
  ],
  mindful: [
    'Every easy run is a conversation with your soul.',
    'Rest is not the absence of progress. It is the foundation of it.',
    'Your breath knows the pace. Listen to it.',
    'Some miles heal what racing breaks.',
    'Stillness between steps is where strength grows.',
  ],
  health: [
    'Consistency beats intensity. Every. Single. Time.',
    'Your body is your home. Treat it with respect.',
    'Progress is measured in how you feel, not just what you achieve.',
    'One run at a time. One day stronger.',
    'Energy today, endurance tomorrow. Balance builds both.',
  ],
  transformer: [
    'Every mile rewrites your story.',
    'You are not chasing a finish line. You are chasing who you can become.',
    'Setbacks are setups for comebacks.',
    'The hardest step is behind you. Now run toward the light.',
    'Transformation is not a moment. It is a thousand small victories.',
  ],
  connector: [
    'You do not run alone. Your energy lifts the whole pack.',
    'Running is better when shared. Your presence matters.',
    'The miles you log inspire the ones others will run.',
    'Community is not built at the finish line. It is built in training.',
    'Your pace is perfect when it brings people together.',
  ],
};

const TRAINING_STATE_MESSAGES: Record<
  ArchetypeType,
  Record<'highMileage' | 'rest' | 'highIntensity' | 'lowFatigue' | 'approaching_race', string>
> = {
  performer: {
    highMileage: 'Big mileage week. You are sharpening your edge.',
    rest: 'Perfect recharge. Recovery fuels results.',
    highIntensity: 'Watch the intensity. Efficiency beats exhaustion.',
    lowFatigue: 'Fresh legs, sharp mind. Ready to push.',
    approaching_race: 'The taper sharpens the blade. Trust the work.',
  },
  adventurer: {
    highMileage: 'You covered new ground. Adventure feeds endurance.',
    rest: 'Even explorers rest before summits.',
    highIntensity: 'Breathe deeper, pace the climbs.',
    lowFatigue: 'Energy flowing. Time to roam.',
    approaching_race: 'The trail ahead is yours. Run free.',
  },
  mindful: {
    highMileage: 'Smooth progress. Your patience pays off.',
    rest: 'Stillness is training too.',
    highIntensity: 'Ease up. Flow over force.',
    lowFatigue: 'Balanced and ready. Beautiful.',
    approaching_race: 'Trust your preparation. Run with presence.',
  },
  health: {
    highMileage: 'Strong week. Stay balanced.',
    rest: 'Excellent recovery discipline.',
    highIntensity: 'Keep heart health front and center.',
    lowFatigue: 'Feeling good is the goal. You are there.',
    approaching_race: 'Run smart. Finish strong. Feel great.',
  },
  transformer: {
    highMileage: 'Growth in motion. Transformation is visible.',
    rest: 'Rest builds your comeback.',
    highIntensity: 'Channel power wisely. Avoid burnout.',
    lowFatigue: 'Momentum is building. Keep rising.',
    approaching_race: 'This is your moment. Prove it to yourself.',
  },
  connector: {
    highMileage: 'Your dedication inspired the team.',
    rest: 'Resting together keeps everyone strong.',
    highIntensity: 'Share slower runs, enjoy connection.',
    lowFatigue: 'Ready to lift others with your energy.',
    approaching_race: 'Run for the crew. They are with you.',
  },
};

export function getArchetypeQuote(archetype: ArchetypeType): string {
  const quotes = ARCHETYPE_QUOTES[archetype];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function generateCoachMessage(context: CoachMessageContext): string {
  const { archetype, trainingMetrics, recentActivity } = context;

  if (!trainingMetrics && !recentActivity) {
    return getArchetypeQuote(archetype);
  }

  if (recentActivity) {
    const { kmThisWeek, fatigueLevel, type } = recentActivity;

    if (kmThisWeek > 60) {
      return TRAINING_STATE_MESSAGES[archetype].highMileage;
    }

    if (type === 'rest' || (trainingMetrics?.restDaysCount || 0) >= 4) {
      return TRAINING_STATE_MESSAGES[archetype].rest;
    }

    if (fatigueLevel && fatigueLevel > 0.7) {
      return TRAINING_STATE_MESSAGES[archetype].highIntensity;
    }

    if (fatigueLevel && fatigueLevel < 0.3) {
      return TRAINING_STATE_MESSAGES[archetype].lowFatigue;
    }
  }

  if (context.upcomingRace && context.upcomingRace.weeksAway <= 2) {
    return TRAINING_STATE_MESSAGES[archetype].approaching_race;
  }

  return getArchetypeQuote(archetype);
}

export function generateWelcomeMessage(archetype: ArchetypeType, confidence: number): string {
  const confidenceLevel = confidence > 0.7 ? 'strong' : confidence > 0.4 ? 'moderate' : 'emerging';

  const welcomeMessages: Record<ArchetypeType, Record<string, string>> = {
    performer: {
      strong: 'You run like a Performer focused, driven, and hungry for results. Your plan will sharpen your edge.',
      moderate: 'You have a Performer spark goal-oriented with room to grow. Let us build structure.',
      emerging: 'I see Performer potential. Let us channel that competitive fire wisely.',
    },
    adventurer: {
      strong: 'You run like an Adventurer seeking freedom, challenge, and new horizons. Your plan will build endurance with room to explore.',
      moderate: 'You have got the Adventurer spirit curious and eager for the trail. Let us grow your capacity.',
      emerging: 'The Adventurer in you is waking up. Let us nurture that curiosity.',
    },
    mindful: {
      strong: 'You run like a Mindful Mover balanced, reflective, and in tune with your body. Your plan will honor that rhythm.',
      moderate: 'You lean Mindful seeking balance and flow. Let us build on that foundation.',
      emerging: 'I sense Mindful qualities. Let us cultivate presence in your training.',
    },
    health: {
      strong: 'You run like a Health Builder consistent, wise, and focused on long-term wellness. Your plan will support sustainable growth.',
      moderate: 'You have got Health Builder instincts prioritizing balance. Let us strengthen that habit.',
      emerging: 'Your Health Builder side is showing. Let us make consistency feel natural.',
    },
    transformer: {
      strong: 'You run like a Transformer chasing change, growth, and reinvention. Your plan will honor that journey.',
      moderate: 'You have the Transformer mindset ready for change. Let us build that momentum.',
      emerging: 'I see Transformer energy. Let us channel it into purposeful progress.',
    },
    connector: {
      strong: 'You run like a Connector energized by community and shared experiences. Your plan will amplify that collective strength.',
      moderate: 'You have got Connector energy you lift others. Let us harness that power.',
      emerging: 'Your Connector qualities are emerging. Let us bring people along.',
    },
  };

  return welcomeMessages[archetype][confidenceLevel];
}

export function getArchetypeDescription(archetype: ArchetypeType): string {
  const descriptions: Record<ArchetypeType, string> = {
    performer: 'Driven by results, fueled by goals. You thrive on structure, challenges, and measurable progress.',
    adventurer: 'Freedom in motion. You seek endurance, exploration, and the joy of new horizons.',
    mindful: 'Running is meditation. You value balance, presence, and listening to your body.',
    health: 'Consistency over intensity. You run to feel good, build energy, and sustain long-term wellness.',
    transformer: 'Every mile is growth. You are rebuilding, reinventing, and becoming stronger than before.',
    connector: 'Running is better together. You thrive on community, shared progress, and lifting others.',
  };

  return descriptions[archetype];
}

export function getArchetypeStyles(archetype: ArchetypeType): {
  primary: string;
  accent: string;
  gradient: string;
} {
  const theme = ARCHETYPE_THEMES[archetype];
  return {
    primary: theme.primaryColor,
    accent: theme.accentColor,
    gradient: theme.gradient,
  };
}

export function shouldShowEvolutionPrompt(
  currentProfile: MotivationProfile,
  lastProfileDate: string
): boolean {
  const daysSinceUpdate = Math.floor(
    (new Date().getTime() - new Date(lastProfileDate).getTime()) / (24 * 60 * 60 * 1000)
  );

  return daysSinceUpdate >= 30;
}

export function generateEvolutionMessage(
  oldArchetype: ArchetypeType,
  newArchetype: ArchetypeType,
  confidence: number
): string {
  if (oldArchetype === newArchetype) {
    return `Your ${oldArchetype} identity is deepening. Let us keep this momentum going.`;
  }

  const transitionMessages: Record<string, string> = {
    'performer-adventurer': 'Your focus is shifting from speed to endurance. Interesting evolution.',
    'performer-mindful': 'You are learning to balance intensity with rest. Powerful growth.',
    'adventurer-performer': 'Trail freedom meeting race discipline. Nice blend.',
    'mindful-health': 'Mindfulness is becoming sustainable wellness. Beautiful shift.',
    'health-performer': 'Consistency is building confidence. Time to challenge yourself.',
    'transformer-performer': 'Rebuilding complete. Now it is time to sharpen and perform.',
    'connector-adventurer': 'Community energy fueling solo exploration. Great balance.',
  };

  const key = `${oldArchetype}-${newArchetype}`;
  const reverseKey = `${newArchetype}-${oldArchetype}`;

  return (
    transitionMessages[key] ||
    transitionMessages[reverseKey] ||
    `Your motivation is evolving from ${oldArchetype} to ${newArchetype}. Let us adapt your plan to match.`
  );
}
