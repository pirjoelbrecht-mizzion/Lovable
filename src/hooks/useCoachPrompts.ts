/**
 * AI Coach Prompts Hook
 * Provides personality-driven coaching messages throughout onboarding
 *
 * Tone adapts based on:
 * - Experience level (beginner = friendly, advanced = focused)
 * - Goal type (5K = encouraging, ultra = adventurous)
 * - Current step in the flow
 *
 * Philosophy: "Run like a puppy, train like a rockstar"
 */

import { useMemo } from 'react';
import type { UserProfile } from '@/types/onboarding';

export type CoachTone = 'friendly' | 'balanced' | 'focused';
export type OnboardingStep = 'goal' | 'activity' | 'availability' | 'device' | 'surface' | 'strength' | 'summary';

interface StepPrompt {
  title: string;
  text: string;
  subtext?: string;
}

interface CoachPrompts {
  intro: string;
  stepPrompts: StepPrompt[];
  closing: string;
  tone: CoachTone;
}

/**
 * Generate coach prompts based on user profile and current step
 */
export function useCoachPrompts(
  profile: Partial<UserProfile>,
  currentStep?: OnboardingStep
): CoachPrompts {
  const tone: CoachTone = useMemo(() => {
    if (profile.experienceLevel === 'beginner') return 'friendly';
    if (profile.experienceLevel === 'advanced' || profile.experienceLevel === 'expert') return 'focused';
    return 'balanced';
  }, [profile.experienceLevel]);

  const name = profile.name || 'runner';

  const prompts = useMemo(() => {
    const introductions: Record<CoachTone, string> = {
      friendly: `Hey ${name}! 🐾 Let's make running joyful and totally doable.`,
      balanced: `Hi ${name}! Great to see your motivation — let's shape this plan together.`,
      focused: `Welcome back, ${name}. You know the grind, we'll fine-tune the science.`,
    };

    const stepPrompts: StepPrompt[] = [
      {
        title: 'goal',
        text: 'Big dreams start small! Pick the adventure that excites you most — your first 5K, a faster 10K, or a mountain challenge.',
        subtext: 'Your goal shapes everything: training intensity, recovery time, and how we build your fitness.',
      },
      {
        title: 'activity',
        text: 'Every runner starts somewhere. Tell me how active you\'ve been so I can match your current rhythm — not push too hard too soon.',
        subtext: 'Honesty here = better training. We\'ll meet you where you are today.',
      },
      {
        title: 'availability',
        text: 'Consistency beats intensity. How many days can you move this week? Even 2-3 solid sessions can change everything.',
        subtext: 'Rest days aren\'t lazy days — they\'re when your body actually gets stronger.',
      },
      {
        title: 'device',
        text: 'If you have a watch or Strava, let\'s sync it — I\'ll quietly learn from it. If not, no worries, I\'ll build your plan by feel.',
        subtext: 'Device data helps me personalize your HR zones and adapt your training automatically.',
      },
      {
        title: 'surface',
        text: 'Roads, trails, or treadmill — wherever your feet are happiest, that\'s where we\'ll train!',
        subtext: 'Different surfaces need different approaches. Trail training builds strength; road training builds speed.',
      },
      {
        title: 'strength',
        text: 'A little strength goes a long way. I\'ll mix in quick sessions like Mountain Legs or Ultra Legs if you\'d like.',
        subtext: 'Strength training prevents injuries and makes you a more powerful runner. Just 15-20 minutes twice a week.',
      },
      {
        title: 'summary',
        text: 'Amazing! I\'ve got all I need to design your first week. Expect fun runs, recovery days, and the occasional stride party 🎉',
        subtext: 'Your plan will adapt as you progress. Trust the process, celebrate the wins.',
      },
    ];

    const closings: Record<CoachTone, string> = {
      friendly: 'This is going to be so fun. You\'ll surprise yourself in just a few weeks — promise!',
      balanced: 'Plan locked and loaded. Remember, rest days count as training too.',
      focused: 'All set. Let\'s chase those adaptations with smart effort and joyful miles.',
    };

    return {
      intro: introductions[tone],
      stepPrompts,
      closing: closings[tone],
      tone,
    };
  }, [name, tone]);

  return prompts;
}

/**
 * Get step-specific encouragement based on goal
 */
export function getStepEncouragement(
  step: OnboardingStep,
  profile: Partial<UserProfile>
): string {
  const { goalType, experienceLevel } = profile;

  switch (step) {
    case 'goal':
      if (goalType === '5k') return 'Perfect starting point! 5K is achievable and exciting.';
      if (goalType === '10k') return 'Great choice! 10K gives you room to grow.';
      if (goalType === 'half') return 'Half marathon — now we\'re talking! This is where it gets fun.';
      if (goalType === 'marathon') return 'Marathon mindset activated! This journey will transform you.';
      if (goalType === 'ultra') return 'Ultra distance! I love the ambition. Let\'s make it happen.';
      return 'Excellent goal selection!';

    case 'activity':
      if (experienceLevel === 'beginner') return 'Starting fresh is awesome! No bad habits to unlearn.';
      if (experienceLevel === 'intermediate') return 'You\'ve got a solid base. Now we refine it.';
      return 'Your experience shows. Time to level up strategically.';

    case 'availability':
      if ((profile.daysPerWeek || 0) <= 3) return 'Quality over quantity! 3 good days beat 6 mediocre ones.';
      if ((profile.daysPerWeek || 0) <= 5) return 'Great balance! Enough volume to progress, enough rest to recover.';
      return 'You\'re committed! Let\'s use that dedication wisely with smart periodization.';

    case 'device':
      if (profile.deviceConnected) return 'Connected! I\'ll pull your data and start learning your patterns.';
      return 'No device? No problem. We\'ll use perceived effort — it works just as well.';

    case 'surface':
      if (profile.surface === 'trail') return 'Trail runner! Get ready for strength and adventure.';
      if (profile.surface === 'road') return 'Road warrior mode! Smooth surfaces = consistent pacing.';
      if (profile.surface === 'mixed') return 'Best of both worlds! Variety keeps training fun.';
      return 'Whatever surface makes you smile works for me!';

    case 'strength':
      if (profile.strengthPreference === 'none') return 'All good! We\'ll focus on running-specific strength within your runs.';
      if (profile.strengthPreference === 'mountain') return 'Mountain Legs will transform your climbing power!';
      if (profile.strengthPreference === 'ultra') return 'Ultra Legs = bulletproof body for long distances.';
      return 'Strength work locks in! Your future self will thank you.';

    case 'summary':
      return 'You\'re all set! Time to lace up and start this adventure.';

    default:
      return 'Keep going! You\'re doing great.';
  }
}

/**
 * Get celebration messages for completing steps
 */
export function getCelebrationMessage(step: OnboardingStep): string {
  const celebrations = {
    goal: '🎯 Goal locked in!',
    activity: '✅ Baseline established!',
    availability: '📅 Schedule set!',
    device: '🔗 Connection ready!',
    surface: '🏃 Terrain selected!',
    strength: '💪 Strength plan added!',
    summary: '🎉 Plan created!',
  };

  return celebrations[step] || '✨ Step complete!';
}

/**
 * Get progress indicator text
 */
export function getProgressText(currentStep: number, totalSteps: number): string {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  if (percentage < 25) return 'Just getting started...';
  if (percentage < 50) return 'Making progress!';
  if (percentage < 75) return 'More than halfway there!';
  if (percentage < 100) return 'Almost done!';
  return 'Complete!';
}

/**
 * Get motivational tips for waiting/loading states
 */
export function getLoadingTip(): string {
  const tips = [
    'Most running improvements happen during rest, not during runs.',
    'Consistency beats intensity every single time.',
    'Your easy runs should feel conversational.',
    'Aim for 80% of your training at an easy pace.',
    'The best run is the one you actually do.',
    'Sleep is the most underrated performance enhancer.',
    'Run by feel first, data second.',
    'Progress isn\'t linear — trust the process.',
    'Hills make you stronger, flats make you faster.',
    'Hydration starts the day before your run.',
  ];

  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * Get personalized welcome message after plan creation
 */
export function getWelcomeMessage(profile: Partial<UserProfile>): string {
  const { goalType, daysPerWeek, experienceLevel } = profile;

  const greeting = experienceLevel === 'beginner'
    ? 'Welcome to your running journey!'
    : 'Welcome back to structured training!';

  const goalText = {
    '5k': 'Your 5K adventure starts now',
    '10k': 'Let\'s build toward that 10K',
    'half': 'Half marathon training begins today',
    'marathon': 'The marathon journey starts with one week',
    'ultra': 'Ultra training — the long game begins',
  };

  const scheduleText = daysPerWeek && daysPerWeek >= 5
    ? 'You\'re committed to training hard — I\'ll make sure you recover harder.'
    : 'Your smart schedule gives you room to grow without burning out.';

  return `${greeting} ${goalText[goalType || '5k']}. ${scheduleText}`;
}
