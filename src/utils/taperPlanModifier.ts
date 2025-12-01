import type { PlanWeek, Session } from '@/utils/plan';
import type { Race, RacePriority } from '@/utils/races';
import type { TaperTemplate } from '@/utils/taperTemplates';
import {
  getTaperTemplateForRace,
  buildTaperPlan,
  shouldTaper,
  getRecoveryDays,
} from '@/utils/taperTemplates';

export interface TaperModification {
  raceId: string;
  raceName: string;
  raceDate: string;
  racePriority: RacePriority;
  taperStartDate: string;
  taperEndDate: string;
  recoveryEndDate: string;
  appliedTemplate: TaperTemplate;
  volumeReductionPercent: number;
  reason: string;
}

export interface WeekModificationResult {
  originalWeek: PlanWeek;
  modifiedWeek: PlanWeek;
  modification: TaperModification | null;
  wasModified: boolean;
}

export async function applyTaperToWeek(
  week: PlanWeek,
  race: Race,
  baseWeeklyKm: number
): Promise<WeekModificationResult> {
  const priority = race.priority || 'B';
  const distanceKm = race.distanceKm || 0;

  if (!shouldTaper(priority, distanceKm)) {
    return {
      originalWeek: week,
      modifiedWeek: week,
      modification: null,
      wasModified: false,
    };
  }

  const template = await getTaperTemplateForRace(priority, distanceKm);
  const raceDate = new Date(race.dateISO);
  const taperPlan = buildTaperPlan(template, raceDate, baseWeeklyKm);

  const modifiedWeek = week.map((day, idx) => {
    const dayDate = new Date(day.dateISO);
    const daysToRace = Math.ceil((raceDate.getTime() - dayDate.getTime()) / (24 * 60 * 60 * 1000));

    const taperDay = taperPlan.days.find(d => Math.abs(d.dayOffset) === daysToRace);

    if (!taperDay) {
      return day;
    }

    const modifiedSessions = day.sessions.map(session => {
      const newKm = session.km ? Math.round(session.km * taperDay.volumeScale) : session.km;

      let newNotes = session.notes || '';
      if (taperDay.notes.length > 0) {
        newNotes += (newNotes ? '\n' : '') + taperDay.notes.join('\n');
      }

      return {
        ...session,
        km: newKm,
        notes: newNotes,
      };
    });

    return {
      ...day,
      sessions: modifiedSessions,
    };
  });

  const taperStartDate = new Date(raceDate);
  taperStartDate.setDate(taperStartDate.getDate() - template.taperDurationDays);

  const recoveryDays = getRecoveryDays(priority, distanceKm);
  const recoveryEndDate = new Date(raceDate);
  recoveryEndDate.setDate(recoveryEndDate.getDate() + recoveryDays);

  const avgReduction =
    taperPlan.days.reduce((sum, d) => sum + (1 - d.volumeScale), 0) / taperPlan.days.length;

  const modification: TaperModification = {
    raceId: race.id,
    raceName: race.name,
    raceDate: race.dateISO,
    racePriority: priority,
    taperStartDate: taperStartDate.toISOString().split('T')[0],
    taperEndDate: race.dateISO,
    recoveryEndDate: recoveryEndDate.toISOString().split('T')[0],
    appliedTemplate: template,
    volumeReductionPercent: Math.round(avgReduction * 100),
    reason: `${priority} race taper applied`,
  };

  return {
    originalWeek: week,
    modifiedWeek,
    modification,
    wasModified: true,
  };
}

export function generateRecoveryWeek(
  weekStartDate: string,
  race: Race,
  baseWeeklyKm: number
): PlanWeek {
  const priority = race.priority || 'B';
  const distanceKm = race.distanceKm || 0;
  const recoveryDays = getRecoveryDays(priority, distanceKm);

  const week: PlanWeek = [];
  const startDate = new Date(weekStartDate);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);
    const dateISO = dayDate.toISOString().split('T')[0];

    const raceDate = new Date(race.dateISO);
    const daysSinceRace = Math.floor(
      (dayDate.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    const sessions: Session[] = [];

    if (daysSinceRace === 0) {
      sessions.push({
        title: 'Race Day',
        km: distanceKm,
        notes: `${race.name} - Good luck!`,
      });
    } else if (daysSinceRace >= 1 && daysSinceRace <= recoveryDays) {
      const recoveryIntensity = getRecoveryIntensity(daysSinceRace, recoveryDays, priority);

      if (recoveryIntensity === 'rest') {
        sessions.push({
          title: 'Rest / Light Mobility',
          notes: 'Full rest or very light mobility work. Let the body recover.',
        });
      } else if (recoveryIntensity === 'very_easy') {
        const easyKm = Math.max(4, Math.round(baseWeeklyKm * 0.08));
        sessions.push({
          title: 'Recovery Run',
          km: easyKm,
          notes: 'Very easy pace, focus on blood flow and gentle movement.',
        });
      } else if (recoveryIntensity === 'easy') {
        const easyKm = Math.max(6, Math.round(baseWeeklyKm * 0.12));
        sessions.push({
          title: 'Easy Run',
          km: easyKm,
          notes: 'Easy aerobic pace. Check in with how your body feels.',
        });
      }
    } else {
      const normalKm = Math.round((baseWeeklyKm / 7) * (1 - 0.1));
      sessions.push({
        title: 'Easy Run',
        km: normalKm,
        notes: 'Return to normal training gradually.',
      });
    }

    week.push({
      dateISO,
      sessions,
    });
  }

  return week;
}

function getRecoveryIntensity(
  daysSinceRace: number,
  totalRecoveryDays: number,
  priority: RacePriority
): 'rest' | 'very_easy' | 'easy' | 'normal' {
  if (priority === 'A') {
    if (daysSinceRace <= 2) return 'rest';
    if (daysSinceRace <= Math.ceil(totalRecoveryDays * 0.6)) return 'very_easy';
    return 'easy';
  }

  if (priority === 'B') {
    if (daysSinceRace === 1) return 'rest';
    if (daysSinceRace <= Math.ceil(totalRecoveryDays * 0.5)) return 'very_easy';
    return 'easy';
  }

  if (daysSinceRace === 1) return 'very_easy';
  return 'easy';
}

export function preserveKeyWorkouts(
  originalWeek: PlanWeek,
  modifiedWeek: PlanWeek,
  daysToRace: number
): PlanWeek {
  if (daysToRace > 7 || daysToRace < 3) {
    return modifiedWeek;
  }

  return modifiedWeek.map((day, idx) => {
    const originalDay = originalWeek[idx];
    const hasQualitySession = originalDay.sessions.some(
      s => s.title.toLowerCase().includes('tempo') || s.title.toLowerCase().includes('interval')
    );

    if (hasQualitySession && daysToRace >= 5 && daysToRace <= 7) {
      const qualitySessions = originalDay.sessions.filter(
        s => s.title.toLowerCase().includes('tempo') || s.title.toLowerCase().includes('interval')
      );

      if (qualitySessions.length > 0) {
        const shortQuality = qualitySessions[0];
        const reducedKm = shortQuality.km ? Math.round(shortQuality.km * 0.7) : shortQuality.km;

        return {
          ...day,
          sessions: [
            {
              ...shortQuality,
              km: reducedKm,
              notes: `${shortQuality.notes || ''}\nSharpening session - reduced volume, maintain intensity.`,
            },
          ],
        };
      }
    }

    return day;
  });
}

export function checkRaceProximity(races: Race[]): {
  conflictPairs: Array<{ race1: Race; race2: Race; weeksBetween: number; warning: string }>;
  hasConflicts: boolean;
} {
  const conflictPairs: Array<{
    race1: Race;
    race2: Race;
    weeksBetween: number;
    warning: string;
  }> = [];

  const sortedRaces = [...races].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  for (let i = 0; i < sortedRaces.length - 1; i++) {
    const race1 = sortedRaces[i];
    const race2 = sortedRaces[i + 1];

    const date1 = new Date(race1.dateISO);
    const date2 = new Date(race2.dateISO);
    const weeksBetween = Math.ceil((date2.getTime() - date1.getTime()) / (7 * 24 * 60 * 60 * 1000));

    if (weeksBetween <= 6) {
      const priority1 = race1.priority || 'B';
      const priority2 = race2.priority || 'B';
      const dist1 = race1.distanceKm || 0;
      const dist2 = race2.distanceKm || 0;

      let warning = '';

      if ((priority1 === 'A' || priority2 === 'A') && weeksBetween < 4) {
        warning = `Critical: Only ${weeksBetween} weeks between A priority races. Taper periods will overlap. Consider treating one as a B race.`;
      } else if (weeksBetween < 3 && (dist1 > 30 || dist2 > 30)) {
        warning = `Caution: ${weeksBetween} weeks between significant races (${dist1}km and ${dist2}km). Recovery and taper will overlap.`;
      } else if (priority1 === 'A' && priority2 === 'A' && weeksBetween < 6) {
        warning = `Note: ${weeksBetween} weeks between A races. Second race may benefit from treating as B race to allow proper recovery.`;
      }

      if (warning) {
        conflictPairs.push({
          race1,
          race2,
          weeksBetween,
          warning,
        });
      }
    }
  }

  return {
    conflictPairs,
    hasConflicts: conflictPairs.length > 0,
  };
}

export function mergeTaperPeriods(
  race1: Race,
  race2: Race,
  weeksBetween: number
): {
  mergedStrategy: string;
  race1Treatment: 'full_taper' | 'mini_taper' | 'train_through';
  race2Treatment: 'full_taper' | 'mini_taper' | 'train_through';
  recommendation: string;
} {
  const priority1 = race1.priority || 'B';
  const priority2 = race2.priority || 'B';

  if (priority1 === 'A' && priority2 === 'A') {
    return {
      mergedStrategy: 'prioritize_later_race',
      race1Treatment: 'mini_taper',
      race2Treatment: 'full_taper',
      recommendation: `Both races are A priority but too close together. Recommend treating ${race1.name} as a supported training effort with mini-taper, then full taper for ${race2.name}.`,
    };
  }

  if (priority1 === 'A') {
    return {
      mergedStrategy: 'prioritize_first_race',
      race1Treatment: 'full_taper',
      race2Treatment: weeksBetween >= 4 ? 'mini_taper' : 'train_through',
      recommendation: `${race1.name} is your A race. After recovery, ${race2.name} can be a ${weeksBetween >= 4 ? 'supported training race' : 'hard workout'}.`,
    };
  }

  if (priority2 === 'A') {
    return {
      mergedStrategy: 'prioritize_second_race',
      race1Treatment: weeksBetween >= 4 ? 'mini_taper' : 'train_through',
      race2Treatment: 'full_taper',
      recommendation: `Focus on ${race2.name} as your A race. Use ${race1.name} as a tune-up with minimal taper.`,
    };
  }

  return {
    mergedStrategy: 'balance_both',
    race1Treatment: 'mini_taper',
    race2Treatment: 'mini_taper',
    recommendation: `Both B priority races. Apply light tapers to both while maintaining training momentum.`,
  };
}

export function calculateWeeklyVolumeTarget(
  baseKm: number,
  weeksToRace: number | null,
  racePriority: RacePriority,
  fatigueScore: number = 0.5
): number {
  if (weeksToRace === null || weeksToRace > 6) {
    return baseKm;
  }

  const taperMultipliers: Record<RacePriority, Record<number, number>> = {
    A: { 3: 0.85, 2: 0.8, 1: 0.7, 0: 0.55 },
    B: { 2: 0.85, 1: 0.75, 0: 0.6 },
    C: { 1: 0.9, 0: 0.7 },
  };

  const multipliers = taperMultipliers[racePriority];
  const keys = Object.keys(multipliers)
    .map(Number)
    .sort((a, b) => b - a);

  let multiplier = 1.0;
  for (const k of keys) {
    if (weeksToRace <= k) {
      multiplier = multipliers[k as keyof typeof multipliers];
      break;
    }
  }

  const fatigueAdjustment = fatigueScore > 0.75 ? 0.9 : fatigueScore > 0.6 ? 0.95 : 1.0;

  return Math.round(baseKm * multiplier * fatigueAdjustment);
}
