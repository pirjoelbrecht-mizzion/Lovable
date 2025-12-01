import type { Race } from '@/utils/races';

export interface CRacePacingNotes {
  raceId: string;
  raceName: string;
  effortGuidance: string;
  paceRecommendation: string;
  nutritionReminders: string[];
  mentalFocus: string[];
  warning?: string;
}

export function generateCRacePacingNotes(
  race: Race,
  weeksToARace: number | null,
  trainingGoalDistance: number
): CRacePacingNotes {
  const distanceKm = race.distanceKm || 0;
  const isCloseToARace = weeksToARace !== null && weeksToARace <= 4;

  const effortGuidance = getEffortGuidance(distanceKm, isCloseToARace, trainingGoalDistance);
  const paceRecommendation = getPaceRecommendation(distanceKm, isCloseToARace);
  const nutritionReminders = getNutritionReminders(distanceKm, isCloseToARace);
  const mentalFocus = getMentalFocus(distanceKm, isCloseToARace);
  const warning = getWarning(isCloseToARace, weeksToARace);

  return {
    raceId: race.id,
    raceName: race.name,
    effortGuidance,
    paceRecommendation,
    nutritionReminders,
    mentalFocus,
    warning,
  };
}

function getEffortGuidance(
  distanceKm: number,
  isCloseToARace: boolean,
  trainingGoalDistance: number
): string {
  if (isCloseToARace) {
    if (distanceKm < 15) {
      return 'Treat as a quality tempo workout. Run at 80-85% effort, controlled and steady. This is NOT a max effort race.';
    } else if (distanceKm < 30) {
      return 'Run at marathon effort (comfortable-hard). Keep it controlled - this is an extended training run, not a goal race.';
    } else {
      return 'Run at ultra easy-moderate effort. Focus on time on feet and fueling practice. Stay well below your goal race pace.';
    }
  }

  if (distanceKm < 10) {
    return 'Use as a threshold workout. Run at half-marathon to 10K race pace. Hard but controlled effort.';
  } else if (distanceKm < 21) {
    return 'Run at half-marathon effort (comfortably hard). Good opportunity to practice race execution without going all-out.';
  } else if (distanceKm < 42) {
    return 'Run at marathon effort. Steady, sustainable pace. Use this to dial in your race day fueling and pacing strategy.';
  } else if (distanceKm < trainingGoalDistance * 0.7) {
    return 'Run at your goal ultra race effort. Focus on efficient pacing, fueling, and building confidence for the longer distance ahead.';
  } else {
    return 'This is a significant effort. Run conservatively at 70-80% of race effort. Prioritize finishing strong and learning over racing hard.';
  }
}

function getPaceRecommendation(distanceKm: number, isCloseToARace: boolean): string {
  if (isCloseToARace) {
    return 'Start conservatively. Aim for even effort throughout. You should finish feeling like you could have gone faster.';
  }

  if (distanceKm < 10) {
    return 'Start at half-marathon pace for the first half, then gradually work to 10K pace if feeling good. Negative split preferred.';
  } else if (distanceKm < 21) {
    return 'Run even effort throughout. First 5K should feel easy. Only push in the final 5K if you have energy to spare.';
  } else if (distanceKm < 42) {
    return 'Negative split strategy: Start 10-15 seconds per km slower than goal pace. Gradually work to goal pace at halfway. Push final 10K only if feeling strong.';
  } else {
    return 'Ultra pacing: Start slower than you think necessary. Walk aid stations. Focus on consistent effort rather than pace. Let the strong feeling develop naturally in the second half.';
  }
}

function getNutritionReminders(distanceKm: number, isCloseToARace: boolean): string[] {
  const reminders: string[] = [];

  if (isCloseToARace) {
    reminders.push('Do NOT experiment with new nutrition - stick to proven fueling');
    reminders.push('This is practice for your goal race fueling strategy');
  }

  if (distanceKm < 15) {
    reminders.push('Hydrate normally pre-race');
    reminders.push('Sip water if available, but nutrition not critical for this distance');
  } else if (distanceKm < 30) {
    reminders.push('Start fueling by 45-60 minutes');
    reminders.push('Aim for 30-40g carbs per hour');
    reminders.push('Hydrate consistently every 15-20 minutes');
  } else {
    reminders.push('Begin fueling early (30-45 minutes)');
    reminders.push('Target 60+ grams carbs per hour');
    reminders.push('Practice your goal race fueling plan exactly');
    reminders.push('Hydration is critical - drink before you feel thirsty');
    reminders.push('Consider sodium supplementation (500-700mg/hour)');
  }

  if (!isCloseToARace) {
    reminders.push('This is an excellent opportunity to test new fueling strategies');
  }

  return reminders;
}

function getMentalFocus(distanceKm: number, isCloseToARace: boolean): string[] {
  const focus: string[] = [];

  if (isCloseToARace) {
    focus.push('Stay mentally composed - save your race-day intensity');
    focus.push('Use this to build confidence, not deplete yourself');
    focus.push('Practice positive self-talk and race-day mindset');
  } else {
    focus.push('Stay present and focused on execution');
    focus.push('Practice race-day mental strategies');
    focus.push('Enjoy the experience - this is training with people');
  }

  if (distanceKm < 21) {
    focus.push('Focus on smooth, efficient form');
    focus.push('Stay relaxed through shoulders and jaw');
  } else if (distanceKm < 42) {
    focus.push('Break the race into thirds mentally');
    focus.push('Practice your mantras and mental checkpoints');
  } else {
    focus.push('Embrace the challenge - ultras are mental games');
    focus.push('Stay adaptable - things will get hard, plan for it');
    focus.push('Focus on what you can control: effort, fueling, attitude');
  }

  focus.push('Listen to your body - this is not your goal race');

  return focus;
}

function getWarning(isCloseToARace: boolean, weeksToARace: number | null): string | undefined {
  if (!isCloseToARace) {
    return undefined;
  }

  if (weeksToARace === null) {
    return undefined;
  }

  if (weeksToARace <= 2) {
    return `⚠️ CAUTION: This race is only ${weeksToARace} week${weeksToARace === 1 ? '' : 's'} before your goal race. Run conservatively to avoid compromising your taper. Treat this as a supported long run, not a race.`;
  }

  if (weeksToARace <= 4) {
    return `⚠️ NOTE: This race is ${weeksToARace} weeks before your goal race. Keep effort controlled. You're in the final preparation phase - don't sacrifice your goal for this race.`;
  }

  return undefined;
}

export function formatPacingNotesForUI(notes: CRacePacingNotes): string {
  let formatted = `# ${notes.raceName} - Training Race Strategy\n\n`;

  if (notes.warning) {
    formatted += `${notes.warning}\n\n---\n\n`;
  }

  formatted += `## Effort Guidance\n${notes.effortGuidance}\n\n`;
  formatted += `## Pacing Recommendation\n${notes.paceRecommendation}\n\n`;

  formatted += `## Nutrition Reminders\n`;
  notes.nutritionReminders.forEach(reminder => {
    formatted += `- ${reminder}\n`;
  });

  formatted += `\n## Mental Focus Points\n`;
  notes.mentalFocus.forEach(point => {
    formatted += `- ${point}\n`;
  });

  formatted += `\n---\n\n`;
  formatted += `**Remember**: This is a C priority race. The purpose is training benefit and experience, not a PR attempt. Trust your training and stay smart.`;

  return formatted;
}

export function shouldShowPacingNotes(race: Race): boolean {
  return race.priority === 'C' || (race.priority === 'B' && (race.distanceKm || 0) < 30);
}

export function getQuickPacingTip(distanceKm: number, weeksToARace: number | null): string {
  const isCloseToARace = weeksToARace !== null && weeksToARace <= 4;

  if (isCloseToARace) {
    if (distanceKm < 15) {
      return '💡 Run at 80-85% effort. This is a workout, not a race.';
    }
    return '💡 Conservative effort. Save your legs for the goal race.';
  }

  if (distanceKm < 10) {
    return '💡 Tempo effort - half marathon to 10K pace';
  } else if (distanceKm < 21) {
    return '💡 Half marathon effort - comfortably hard';
  } else if (distanceKm < 42) {
    return '💡 Marathon effort - steady and sustainable';
  } else {
    return '💡 Ultra effort - start easy, fuel well, finish strong';
  }
}
