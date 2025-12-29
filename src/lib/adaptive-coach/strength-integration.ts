import type {
  MEAssignment,
  LoadRegulationDecision,
  SorenessRecord,
  UserTerrainAccess,
  StrengthLoadAdjustment,
  METype,
} from '@/types/strengthTraining';
import type { WeeklyPlan, TrainingPhase, DailyPlan } from './types';

/**
 * Generate suggested terrain access configuration based on surface preference
 * This helps auto-configure terrain access when user selects their surface preference
 */
export function suggestTerrainAccessFromSurface(
  surfacePreference: 'road' | 'trail' | 'treadmill' | 'mixed',
  strengthPreference?: 'none' | 'base' | 'mountain' | 'ultra'
): Partial<UserTerrainAccess> {
  const baseAccess: Partial<UserTerrainAccess> = {
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
  };

  switch (surfacePreference) {
    case 'trail':
      return {
        ...baseAccess,
        hasHillsAccess: true,
        maxHillGrade: strengthPreference === 'mountain' || strengthPreference === 'ultra' ? 15 : 8,
        treadmillAccess: false,
        hasGymAccess: strengthPreference === 'ultra' || strengthPreference === 'mountain',
        stairsAccess: true,
        usesPoles: strengthPreference === 'ultra',
      };

    case 'road':
      return {
        ...baseAccess,
        hasHillsAccess: false,
        maxHillGrade: 0,
        treadmillAccess: false,
        hasGymAccess: strengthPreference !== 'none',
        stairsAccess: true,
        usesPoles: false,
      };

    case 'treadmill':
      return {
        ...baseAccess,
        hasHillsAccess: false,
        maxHillGrade: 0,
        treadmillAccess: true,
        hasGymAccess: true,
        stairsAccess: true,
        usesPoles: false,
      };

    case 'mixed':
      return {
        ...baseAccess,
        hasHillsAccess: true,
        maxHillGrade: 10,
        treadmillAccess: true,
        hasGymAccess: strengthPreference !== 'none',
        stairsAccess: true,
        usesPoles: false,
      };
  }
}

interface StrengthIntegrationInput {
  weeklyPlan: WeeklyPlan;
  terrainAccess: UserTerrainAccess | null;
  recentSoreness: SorenessRecord[];
  activeLoadAdjustment: StrengthLoadAdjustment | null;
  isAdvancedUser: boolean;
  phase: TrainingPhase;
  raceType?: 'trail' | 'road' | 'skimo' | 'ultra';
  usesPoles?: boolean;
}

interface StrengthIntegrationResult {
  modifiedPlan: WeeklyPlan;
  meAssignment: MEAssignment | null;
  loadRegulation: LoadRegulationDecision;
  changes: string[];
  coachingNotes: string[];
}

export function integrateStrengthTraining(input: StrengthIntegrationInput): StrengthIntegrationResult {
  const {
    weeklyPlan,
    terrainAccess,
    recentSoreness,
    activeLoadAdjustment,
    phase,
    raceType,
    usesPoles,
  } = input;

  const changes: string[] = [];
  const coachingNotes: string[] = [];

  const loadRegulation = determineLoadRegulation(recentSoreness, activeLoadAdjustment);

  if (!shouldIncludeME(phase, terrainAccess)) {
    return {
      modifiedPlan: weeklyPlan,
      meAssignment: null,
      loadRegulation,
      changes: [],
      coachingNotes: ['ME training not scheduled for current phase or terrain access.'],
    };
  }

  const meAssignment = determineMEAssignment(terrainAccess, raceType, usesPoles, undefined);

  const modifiedPlan = insertMESessionsIntoPlan(weeklyPlan, meAssignment, phase, loadRegulation);

  if (meAssignment) {
    changes.push(`Added ${meAssignment.meType.replace('_', ' ')} ME session`);
    coachingNotes.push(meAssignment.reason);
  }

  if (loadRegulation.shouldAdjust) {
    changes.push(`Load adjusted: ${loadRegulation.adjustmentType}`);
    coachingNotes.push(loadRegulation.reason);
  }

  return {
    modifiedPlan,
    meAssignment,
    loadRegulation,
    changes,
    coachingNotes,
  };
}

function shouldIncludeME(phase: TrainingPhase, terrainAccess: UserTerrainAccess | null): boolean {
  const mePhases: TrainingPhase[] = ['base', 'build', 'peak'];
  if (!mePhases.includes(phase)) {
    return false;
  }

  if (!terrainAccess) {
    return true;
  }

  return (
    terrainAccess.hasGymAccess ||
    terrainAccess.hasHillsAccess ||
    terrainAccess.treadmillAccess ||
    terrainAccess.stairsAccess
  );
}

function determineMEAssignment(
  terrainAccess: UserTerrainAccess | null,
  raceType?: string,
  usesPoles?: boolean,
  strengthPreference?: 'none' | 'base' | 'mountain' | 'ultra'
): MEAssignment {
  const includeUpperBody = shouldIncludeUpperBodyME(terrainAccess, raceType, usesPoles);

  let meType: METype = 'gym_based';
  let reason = '';
  const alternativeTemplates: string[] = [];

  if (!terrainAccess) {
    meType = 'gym_based';
    reason = 'Gym-based ME recommended. Configure terrain access for more options.';
    return { meType, templateId: '', reason, alternativeTemplates, includeUpperBody };
  }

  if (terrainAccess.hasHillsAccess && terrainAccess.maxHillGrade >= 15) {
    meType = 'outdoor_steep';
    reason = `Steep hills available (${terrainAccess.maxHillGrade}% grade). Optimal for running-specific ME.`;
    alternativeTemplates.push('gym_based', 'treadmill_stairs');
  } else if (terrainAccess.hasGymAccess) {
    meType = 'gym_based';
    reason = 'Gym access allows progressive overload with controlled movements.';
    if (terrainAccess.hasHillsAccess) {
      alternativeTemplates.push('outdoor_weighted');
    }
  } else if (terrainAccess.hasHillsAccess) {
    meType = 'outdoor_weighted';
    reason = `Moderate hills (${terrainAccess.maxHillGrade}% grade). Use weighted vest/pack for ME stimulus.`;
    alternativeTemplates.push('gym_based');
  } else if (terrainAccess.treadmillAccess) {
    meType = 'treadmill_stairs';
    reason = 'Treadmill with incline provides controlled ME environment.';
    alternativeTemplates.push('gym_based');
  } else if (terrainAccess.stairsAccess) {
    meType = 'treadmill_stairs';
    reason = 'Stairs provide excellent ME stimulus without gym equipment.';
    alternativeTemplates.push('gym_based');
  }

  if (strengthPreference === 'ultra') {
    reason += ' Advanced strength focus: Include eccentric work and extended ME sessions.';
  } else if (strengthPreference === 'mountain') {
    reason += ' Mountain legs focus: Emphasize leg strength and power for climbing.';
  } else if (strengthPreference === 'base') {
    reason += ' Basic strength: Keep ME sessions moderate and focus on form.';
  }

  return {
    meType,
    templateId: '',
    reason,
    alternativeTemplates,
    includeUpperBody,
  };
}

function shouldIncludeUpperBodyME(
  terrainAccess: UserTerrainAccess | null,
  raceType?: string,
  usesPoles?: boolean
): boolean {
  if (raceType === 'skimo') return true;
  if (terrainAccess?.isSkimoAthlete) return true;
  if (terrainAccess?.usesPoles) return true;
  if (usesPoles) return true;
  return false;
}

function determineLoadRegulation(
  recentSoreness: SorenessRecord[],
  activeAdjustment: StrengthLoadAdjustment | null
): LoadRegulationDecision {
  if (activeAdjustment && !activeAdjustment.revertedAt) {
    return {
      shouldAdjust: true,
      adjustmentType: activeAdjustment.adjustmentType as 'reduce' | 'skip' | 'modify',
      adjustmentPercent: activeAdjustment.adjustmentType === 'reduce' ? 30 : null,
      reason: activeAdjustment.reason,
      exitCriteria: activeAdjustment.exitCriteria || [],
    };
  }

  if (recentSoreness.length === 0) {
    return {
      shouldAdjust: false,
      adjustmentType: null,
      adjustmentPercent: null,
      reason: 'Normal training - no adjustments needed',
      exitCriteria: [],
    };
  }

  const latestSoreness = recentSoreness[0];

  if (latestSoreness.hasPain) {
    return {
      shouldAdjust: true,
      adjustmentType: 'skip',
      adjustmentPercent: null,
      reason: 'Pain reported. Skipping ME until cleared. Focus on mobility and recovery.',
      exitCriteria: ['No pain reported for 3 consecutive days', 'Clearance from healthcare provider if persistent'],
    };
  }

  if (latestSoreness.overallSoreness >= 8) {
    return {
      shouldAdjust: true,
      adjustmentType: 'skip',
      adjustmentPercent: null,
      reason: 'Severe soreness detected. Skipping ME to allow recovery.',
      exitCriteria: ['Soreness drops below 5', 'At least 48 hours since last report'],
    };
  }

  if (latestSoreness.overallSoreness >= 6) {
    return {
      shouldAdjust: true,
      adjustmentType: 'reduce',
      adjustmentPercent: 30,
      reason: 'Moderate-high soreness. Reducing ME load by 30%.',
      exitCriteria: ['Soreness drops below 4', 'Complete 2 sessions without increased soreness'],
    };
  }

  if (latestSoreness.overallSoreness >= 4) {
    return {
      shouldAdjust: true,
      adjustmentType: 'modify',
      adjustmentPercent: 15,
      reason: 'Mild soreness. Slight load reduction as precaution.',
      exitCriteria: ['Complete session normally', 'Soreness stable or decreasing'],
    };
  }

  return {
    shouldAdjust: false,
    adjustmentType: null,
    adjustmentPercent: null,
    reason: 'Soreness within normal range. Proceed with planned ME.',
    exitCriteria: [],
  };
}

function insertMESessionsIntoPlan(
  weeklyPlan: WeeklyPlan,
  meAssignment: MEAssignment | null,
  phase: TrainingPhase,
  loadRegulation: LoadRegulationDecision
): WeeklyPlan {
  if (!meAssignment || loadRegulation.adjustmentType === 'skip') {
    return weeklyPlan;
  }

  const meDaysPerWeek = getMEFrequency(phase);
  const preferredDays = getPreferredMEDays(weeklyPlan, meDaysPerWeek);

  const modifiedDays = weeklyPlan.days.map((day, index) => {
    if (!preferredDays.includes(index)) {
      return day;
    }

    const meSession = createMESession(meAssignment, loadRegulation, index + 1);
    return {
      ...day,
      sessions: [...day.sessions, meSession],
    };
  });

  return {
    ...weeklyPlan,
    days: modifiedDays,
  };
}

function getMEFrequency(phase: TrainingPhase): number {
  switch (phase) {
    case 'base':
      return 2;
    case 'build':
      return 2;
    case 'peak':
      return 1;
    case 'taper':
      return 0;
    case 'race':
      return 0;
    case 'recovery':
      return 0;
    default:
      return 1;
  }
}

function getPreferredMEDays(weeklyPlan: WeeklyPlan, count: number): number[] {
  const dayLoads = weeklyPlan.days.map((day, idx) => ({
    idx,
    load: day.sessions.reduce((sum, s) => {
      if (s.type === 'rest' || s.type === 'recovery') return sum;
      return sum + (s.durationMin || 30);
    }, 0),
    isKeyDay: day.sessions.some(s =>
      ['intervals', 'tempo', 'long', 'race'].includes(s.type || '')
    ),
  }));

  const availableDays = dayLoads
    .filter(d => !d.isKeyDay && d.load < 90)
    .sort((a, b) => a.load - b.load);

  const preferred: number[] = [];
  for (const d of availableDays) {
    if (preferred.length >= count) break;

    const hasAdjacentME = preferred.some(p => Math.abs(p - d.idx) <= 1);
    if (!hasAdjacentME) {
      preferred.push(d.idx);
    }
  }

  if (preferred.length < count) {
    for (const d of availableDays) {
      if (!preferred.includes(d.idx)) {
        preferred.push(d.idx);
        if (preferred.length >= count) break;
      }
    }
  }

  return preferred.sort((a, b) => a - b);
}

function createMESession(
  meAssignment: MEAssignment,
  loadRegulation: LoadRegulationDecision,
  workoutNumber: number
): DailyPlan['sessions'][0] {
  const baseTitle = `ME ${meAssignment.meType.replace('_', ' ').toUpperCase()}`;
  let adjustedTitle = baseTitle;

  if (loadRegulation.shouldAdjust) {
    if (loadRegulation.adjustmentType === 'reduce') {
      adjustedTitle = `${baseTitle} (Reduced)`;
    } else if (loadRegulation.adjustmentType === 'modify') {
      adjustedTitle = `${baseTitle} (Modified)`;
    }
  }

  return {
    title: adjustedTitle,
    type: 'strength',
    durationMin: 35,
    notes: `${meAssignment.reason}${loadRegulation.shouldAdjust ? `\n\nLoad Adjustment: ${loadRegulation.reason}` : ''}`,
    source: 'coach',
    meData: {
      meType: meAssignment.meType,
      workoutNumber,
      loadAdjustment: loadRegulation.shouldAdjust ? loadRegulation.adjustmentPercent : null,
      includeUpperBody: meAssignment.includeUpperBody,
    },
  };
}

export function shouldPromptSorenessCheck(
  lastStrengthSession: Date | null,
  lastSorenessRecord: Date | null
): { shouldPrompt: boolean; type: 'immediate' | 'followup_48h' } {
  if (!lastStrengthSession) {
    return { shouldPrompt: false, type: 'immediate' };
  }

  const now = new Date();
  const hoursSinceSession = (now.getTime() - lastStrengthSession.getTime()) / (1000 * 60 * 60);

  if (!lastSorenessRecord || lastSorenessRecord < lastStrengthSession) {
    if (hoursSinceSession >= 1 && hoursSinceSession <= 24) {
      return { shouldPrompt: true, type: 'immediate' };
    }
  }

  if (hoursSinceSession >= 44 && hoursSinceSession <= 52) {
    const hasFollowup = lastSorenessRecord && lastSorenessRecord > lastStrengthSession;
    const hoursSinceRecord = lastSorenessRecord
      ? (now.getTime() - lastSorenessRecord.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (!hasFollowup || hoursSinceRecord > 24) {
      return { shouldPrompt: true, type: 'followup_48h' };
    }
  }

  return { shouldPrompt: false, type: 'immediate' };
}

export function getStrengthCoachingMessage(
  loadRegulation: LoadRegulationDecision | null,
  meAssignment: MEAssignment | null,
  phase: TrainingPhase
): string {
  if (!meAssignment) {
    if (phase === 'taper' || phase === 'race') {
      return 'ME training paused for taper/race period. Maintain with light mobility work.';
    }
    if (phase === 'recovery') {
      return 'Recovery phase: focus on gentle movement and tissue repair.';
    }
    return 'Configure terrain access in Settings to enable personalized ME training.';
  }

  if (loadRegulation?.adjustmentType === 'skip') {
    return loadRegulation.reason;
  }

  const typeDescriptions: Record<METype, string> = {
    gym_based: 'Gym-based ME builds foundational strength for climbing efficiency.',
    outdoor_steep: 'Steep hill ME develops race-specific uphill power.',
    outdoor_weighted: 'Weighted pack ME simulates race demands on moderate terrain.',
    treadmill_stairs: 'Indoor ME provides consistent stimulus regardless of weather.',
    skierg_upper: 'SkiErg ME targets pole propulsion power for skiing disciplines.',
  };

  let message = typeDescriptions[meAssignment.meType] || 'ME session scheduled.';

  if (loadRegulation?.shouldAdjust && loadRegulation.adjustmentType === 'reduce') {
    message += ` Load reduced by ${loadRegulation.adjustmentPercent}% based on recent soreness.`;
  }

  if (meAssignment.includeUpperBody) {
    message += ' Upper body exercises included for pole efficiency.';
  }

  return message;
}

export function getMESessionForToday(
  weeklyPlan: WeeklyPlan,
  meAssignment: MEAssignment | null
): { hasME: boolean; session: DailyPlan['sessions'][0] | null; dayIndex: number } {
  if (!meAssignment) {
    return { hasME: false, session: null, dayIndex: -1 };
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const todayPlan = weeklyPlan.days[todayIndex];
  if (!todayPlan) {
    return { hasME: false, session: null, dayIndex: todayIndex };
  }

  const meSession = todayPlan.sessions.find(
    s => s.type === 'strength' && s.meData
  );

  return {
    hasME: !!meSession,
    session: meSession || null,
    dayIndex: todayIndex,
  };
}
