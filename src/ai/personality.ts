import type { ArchetypeType } from '@/lib/motivationDetection';

export type Persona = "coach"|"mentor"|"friend"|"analyst";

export function getPersona(tab:string, signal?:{ rpe?:number; mood?:string }):Persona{
  if (signal?.rpe && signal.rpe > 7) return "friend";
  if (tab === "insights") return "analyst";
  if (tab === "log") return "coach";
  return "mentor";
}

export function toneLine(p:Persona, base:string){
  switch(p){
    case "coach":   return `🔥 Coach: ${base} Let's crush the hills!`;
    case "mentor":  return `🧭 Mentor: ${base} Sustainable progress compounds over weeks.`;
    case "friend":  return `🤝 Friend: ${base} Take the win, breathe—you've got this.`;
    case "analyst": return `📊 Analyst: ${base}`;
  }
}

/**
 * Blends persona with motivation archetype for personalized tone
 */
export function getArchetypeAwareTone(
  persona: Persona,
  archetype: ArchetypeType | null,
  base: string
): string {
  if (!archetype) {
    return toneLine(persona, base);
  }

  const archetypeTones: Record<ArchetypeType, Record<Persona, string>> = {
    performer: {
      coach: `⚡ ${base} Let's sharpen that edge!`,
      mentor: `🎯 ${base} Structure builds champions.`,
      friend: `💪 ${base} You earned this. Own it.`,
      analyst: `📊 ${base}`,
    },
    adventurer: {
      coach: `🏔️ ${base} The trail's waiting for you!`,
      mentor: `🧭 ${base} Endurance grows through exploration.`,
      friend: `🌲 ${base} Beautiful run—keep flowing.`,
      analyst: `📊 ${base}`,
    },
    mindful: {
      coach: `🧘 ${base} Listen to your body.`,
      mentor: `🌿 ${base} Balance creates lasting strength.`,
      friend: `💚 ${base} You're in tune with your rhythm.`,
      analyst: `📊 ${base}`,
    },
    health: {
      coach: `💚 ${base} Consistency wins every time!`,
      mentor: `🌱 ${base} Sustainable habits build lifelong fitness.`,
      friend: `☀️ ${base} Feeling good is the goal.`,
      analyst: `📊 ${base}`,
    },
    transformer: {
      coach: `💪 ${base} Every mile rewrites your story!`,
      mentor: `🌅 ${base} Growth compounds in small victories.`,
      friend: `🔥 ${base} Proud of your progress.`,
      analyst: `📊 ${base}`,
    },
    connector: {
      coach: `🤝 ${base} Your energy lifts the pack!`,
      mentor: `👥 ${base} Community makes us all stronger.`,
      friend: `💙 ${base} Running is better together.`,
      analyst: `📊 ${base}`,
    },
  };

  return archetypeTones[archetype][persona];
}

/**
 * Gets motivational prefix based on archetype
 */
export function getArchetypePrefix(archetype: ArchetypeType | null): string {
  if (!archetype) return '';

  const prefixes: Record<ArchetypeType, string> = {
    performer: '⚡',
    adventurer: '🏔️',
    mindful: '🧘',
    health: '💚',
    transformer: '💪',
    connector: '🤝',
  };

  return prefixes[archetype];
}

/**
 * Generates archetype-aware encouragement
 */
export function getEncouragement(archetype: ArchetypeType | null, context?: 'rest' | 'hard' | 'easy'): string {
  if (!archetype) {
    return 'Keep moving forward!';
  }

  const encouragements: Record<ArchetypeType, Record<string, string>> = {
    performer: {
      rest: 'Recovery sharpens your edge.',
      hard: 'Push through. Champions are built here.',
      easy: 'Controlled effort—efficiency matters.',
    },
    adventurer: {
      rest: 'Even explorers rest before summits.',
      hard: 'Embrace the challenge. This is where legends grow.',
      easy: 'Find your flow. The trail reveals itself.',
    },
    mindful: {
      rest: 'Stillness is strength.',
      hard: 'Breathe. Flow over force.',
      easy: 'Perfect pace. Listen to your body.',
    },
    health: {
      rest: 'Rest builds resilience.',
      hard: 'Balance intensity with wisdom.',
      easy: 'Sustainable progress—well done.',
    },
    transformer: {
      rest: 'Recovery fuels your comeback.',
      hard: 'This is where transformation happens.',
      easy: 'Building momentum, one mile at a time.',
    },
    connector: {
      rest: 'Resting together keeps the pack strong.',
      hard: 'Your effort inspires others.',
      easy: 'Enjoy the journey with your crew.',
    },
  };

  return encouragements[archetype][context || 'easy'];
}
