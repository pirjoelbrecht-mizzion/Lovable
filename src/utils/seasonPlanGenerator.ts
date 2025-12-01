/**
 * Season Plan Generator
 *
 * Algorithmic generation of training macrocycles based on race date and type.
 * Implements backward calculation from race day to determine optimal phase timing.
 * Supports continuous forward-looking multi-race season planning.
 */

import type {
  Macrocycle,
  MacrocyclePhase,
  SeasonPlan,
  SeasonPlanInputs,
  MacrocycleGroup,
  RacePriority,
} from '@/types/seasonPlan';
import {
  MACROCYCLE_COLORS,
  MACROCYCLE_NAMES,
  MACROCYCLE_DESCRIPTIONS,
} from '@/types/seasonPlan';
import type { Race } from '@/utils/races';

interface PhaseDurations {
  baseWeeks: number;
  sharpenWeeks: number;
  taperWeeks: number;
  raceWeeks: number;
  recoveryWeeks: number;
}

function getPhaseDurations(raceType: 'marathon' | 'ultra', raceDistanceKm: number): PhaseDurations {
  const isUltra = raceType === 'ultra' || raceDistanceKm > 50;

  if (isUltra) {
    const isLongUltra = raceDistanceKm >= 100;
    return {
      baseWeeks: isLongUltra ? 18 : 16,
      sharpenWeeks: isLongUltra ? 10 : 8,
      taperWeeks: 4,
      raceWeeks: 1,
      recoveryWeeks: isLongUltra ? 4 : 3,
    };
  }

  return {
    baseWeeks: 12,
    sharpenWeeks: 6,
    taperWeeks: 3,
    raceWeeks: 1,
    recoveryWeeks: 2,
  };
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function subtractWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - weeks * 7);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function createMacrocycle(
  phase: MacrocyclePhase,
  startDate: Date,
  durationWeeks: number,
  isManual: boolean = false,
  raceId?: string
): Macrocycle {
  const endDate = addWeeks(startDate, durationWeeks);

  const intensityMap: Record<MacrocyclePhase, number> = {
    base_building: 0.6,
    sharpening: 0.85,
    taper: 0.5,
    race: 1.0,
    recovery: 0.3,
  };

  return {
    phase,
    displayName: MACROCYCLE_NAMES[phase],
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    durationWeeks,
    color: MACROCYCLE_COLORS[phase],
    intensity: intensityMap[phase],
    description: MACROCYCLE_DESCRIPTIONS[phase],
    isManual,
    originalWeeks: durationWeeks,
    raceId,
  };
}

export function generateMacrocycles(inputs: SeasonPlanInputs, raceId?: string): Macrocycle[] {
  const { raceDate, raceType, raceDistanceKm, currentDate = new Date() } = inputs;

  const durations = getPhaseDurations(raceType, raceDistanceKm);

  const macrocycles: Macrocycle[] = [];

  const raceEnd = new Date(raceDate);
  const raceStart = subtractWeeks(raceEnd, durations.raceWeeks);
  const taperStart = subtractWeeks(raceStart, durations.taperWeeks);
  const sharpenStart = subtractWeeks(taperStart, durations.sharpenWeeks);
  const baseStart = subtractWeeks(sharpenStart, durations.baseWeeks);
  const recoveryEnd = addWeeks(raceEnd, durations.recoveryWeeks);

  macrocycles.push(createMacrocycle('base_building', baseStart, durations.baseWeeks, false, raceId));
  macrocycles.push(createMacrocycle('sharpening', sharpenStart, durations.sharpenWeeks, false, raceId));
  macrocycles.push(createMacrocycle('taper', taperStart, durations.taperWeeks, false, raceId));
  macrocycles.push(createMacrocycle('race', raceStart, durations.raceWeeks, false, raceId));
  macrocycles.push(createMacrocycle('recovery', raceEnd, durations.recoveryWeeks, false, raceId));

  return macrocycles;
}

export function buildSeasonPlan(
  raceId: string,
  raceName: string,
  inputs: SeasonPlanInputs
): SeasonPlan {
  const macrocycles = generateMacrocycles(inputs);

  const seasonStart = macrocycles[0].startDate;
  const seasonEnd = macrocycles[macrocycles.length - 1].endDate;

  const totalWeeks = macrocycles.reduce((sum, m) => sum + m.durationWeeks, 0);

  return {
    raceId,
    raceName,
    seasonStart,
    seasonEnd,
    totalWeeks,
    macrocycles,
    isManual: false,
    lastGenerated: new Date().toISOString(),
  };
}

export function getCurrentMacrocycle(seasonPlan: SeasonPlan, currentDate: Date = new Date()): Macrocycle | null {
  const currentDateStr = formatDate(currentDate);

  for (const macrocycle of seasonPlan.macrocycles) {
    if (currentDateStr >= macrocycle.startDate && currentDateStr <= macrocycle.endDate) {
      return macrocycle;
    }
  }

  return null;
}

export function getProgressInSeason(seasonPlan: SeasonPlan, currentDate: Date = new Date()): number {
  const start = new Date(seasonPlan.seasonStart).getTime();
  const end = new Date(seasonPlan.seasonEnd).getTime();
  const current = currentDate.getTime();

  if (current < start) return 0;
  if (current > end) return 100;

  return ((current - start) / (end - start)) * 100;
}

export function getMacrocycleForDate(seasonPlan: SeasonPlan, date: Date): Macrocycle | null {
  const dateStr = formatDate(date);

  for (const macrocycle of seasonPlan.macrocycles) {
    if (dateStr >= macrocycle.startDate && dateStr <= macrocycle.endDate) {
      return macrocycle;
    }
  }

  return null;
}

export function getWeeksUntilPhase(
  seasonPlan: SeasonPlan,
  targetPhase: MacrocyclePhase,
  currentDate: Date = new Date()
): number {
  const macrocycle = seasonPlan.macrocycles.find(m => m.phase === targetPhase);
  if (!macrocycle) return -1;

  const phaseStart = new Date(macrocycle.startDate);
  const current = new Date(currentDate);

  const diffMs = phaseStart.getTime() - current.getTime();
  const diffWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks;
}

export function adjustMacrocycleDuration(
  macrocycle: Macrocycle,
  newWeeks: number,
  raceDate: Date
): Macrocycle {
  const minWeeks: Record<MacrocyclePhase, number> = {
    base_building: 4,
    sharpening: 3,
    taper: 2,
    race: 1,
    recovery: 1,
  };

  const maxWeeks: Record<MacrocyclePhase, number> = {
    base_building: 24,
    sharpening: 12,
    taper: 4,
    race: 1,
    recovery: 6,
  };

  const clampedWeeks = Math.max(
    minWeeks[macrocycle.phase],
    Math.min(maxWeeks[macrocycle.phase], newWeeks)
  );

  return {
    ...macrocycle,
    durationWeeks: clampedWeeks,
    adjustedWeeks: clampedWeeks,
    isManual: true,
  };
}

export function recalculateMacrocycleDates(
  macrocycles: Macrocycle[],
  raceDate: Date
): Macrocycle[] {
  const updated: Macrocycle[] = [];
  let currentEnd = new Date(raceDate);

  for (let i = macrocycles.length - 1; i >= 0; i--) {
    const macro = macrocycles[i];
    const startDate = subtractWeeks(currentEnd, macro.durationWeeks);

    updated.unshift({
      ...macro,
      startDate: formatDate(startDate),
      endDate: formatDate(currentEnd),
    });

    currentEnd = startDate;
  }

  return updated;
}

export function generateMultiRaceSeasonPlan(races: Race[]): MacrocycleGroup[] {
  const aRaces = races
    .filter(r => r.priority === 'A')
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  if (aRaces.length === 0) {
    const fallbackRace = races
      .filter(r => r.dateISO >= new Date().toISOString().split('T')[0])
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];

    if (fallbackRace) {
      aRaces.push({ ...fallbackRace, priority: 'A' as RacePriority });
    } else {
      return [];
    }
  }

  const groups: MacrocycleGroup[] = [];

  for (const aRace of aRaces) {
    const raceType = (aRace.distanceKm || 42.195) > 50 ? 'ultra' : 'marathon';
    const macrocycles = generateMacrocycles({
      raceDate: new Date(aRace.dateISO),
      raceType,
      raceDistanceKm: aRace.distanceKm || 42.195,
    });

    const groupStart = macrocycles[0].startDate;
    const groupEnd = macrocycles[macrocycles.length - 1].endDate;

    const tuneUpRaces = races
      .filter(r => {
        if (r.priority === 'A' || r.id === aRace.id) return false;
        const raceDate = new Date(r.dateISO);
        const startDate = new Date(groupStart);
        const endDate = new Date(groupEnd);
        return raceDate >= startDate && raceDate <= endDate;
      })
      .map(r => ({
        id: r.id,
        name: r.name,
        date: r.dateISO,
        priority: r.priority || ('B' as RacePriority),
        distanceKm: r.distanceKm,
      }));

    groups.push({
      raceId: aRace.id,
      raceName: aRace.name,
      raceDate: aRace.dateISO,
      priority: aRace.priority || 'A',
      macrocycles,
      tuneUpRaces,
    });
  }

  return groups;
}

export function detectSeasonPlanConflict(
  seasonPlan: SeasonPlan,
  newRaceDate: string
): boolean {
  if (!seasonPlan.isManual) return false;

  const currentRaceDate = seasonPlan.macrocycles.find(m => m.phase === 'race')?.startDate;
  return currentRaceDate !== newRaceDate;
}

function insertTuneUpRaces(macrocycles: Macrocycle[], tuneUpRaces: Race[]): Macrocycle[] {
  if (tuneUpRaces.length === 0) return macrocycles;

  const result: Macrocycle[] = [];

  for (let i = 0; i < macrocycles.length; i++) {
    const macro = macrocycles[i];
    const macroStart = new Date(macro.startDate);
    const macroEnd = new Date(macro.endDate);
    macroStart.setHours(0, 0, 0, 0);
    macroEnd.setHours(0, 0, 0, 0);

    const racesInThisMacro = tuneUpRaces.filter(r => {
      const raceDate = new Date(r.dateISO);
      raceDate.setHours(0, 0, 0, 0);
      return raceDate >= macroStart && raceDate < macroEnd;
    }).sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    if (racesInThisMacro.length === 0 || macro.phase === 'race' || macro.phase === 'recovery') {
      result.push(macro);
      continue;
    }

    let cursor = new Date(macroStart);

    for (const race of racesInThisMacro) {
      const raceDate = new Date(race.dateISO);
      raceDate.setHours(0, 0, 0, 0);
      const priority = race.priority || 'C';

      if (priority === 'B') {
        const taperDays = 3;
        const recoveryDays = 2;
        const taperStart = addDays(raceDate, -taperDays);
        const recoveryEnd = addDays(raceDate, recoveryDays + 1);

        if (taperStart > cursor) {
          const daysToTaper = Math.ceil((taperStart.getTime() - cursor.getTime()) / (24 * 60 * 60 * 1000));
          const weeksToTaper = Math.max(1, Math.ceil(daysToTaper / 7));
          result.push(createMacrocycle(macro.phase, cursor, weeksToTaper, false, macro.raceId));
        }

        const taperDurationWeeks = Math.max(0.5, taperDays / 7);
        result.push({
          ...createMacrocycle('taper', taperStart, taperDurationWeeks, false, race.id),
          displayName: `B Race Taper`,
        });

        result.push({
          ...createMacrocycle('race', raceDate, 1 / 7, false, race.id),
          displayName: race.name,
        });

        const recoveryDurationWeeks = Math.max(0.5, recoveryDays / 7);
        result.push({
          ...createMacrocycle('recovery', addDays(raceDate, 1), recoveryDurationWeeks, false, race.id),
          displayName: `B Race Recovery`,
        });

        cursor = recoveryEnd;
      } else if (priority === 'C') {
        if (raceDate > cursor) {
          const daysToRace = Math.ceil((raceDate.getTime() - cursor.getTime()) / (24 * 60 * 60 * 1000));
          const weeksToRace = Math.max(1, Math.ceil(daysToRace / 7));
          result.push(createMacrocycle(macro.phase, cursor, weeksToRace, false, macro.raceId));
        }

        result.push({
          ...createMacrocycle('race', raceDate, 1 / 7, false, race.id),
          displayName: race.name,
        });

        cursor = addDays(raceDate, 1);
      }
    }

    if (cursor < macroEnd) {
      const remainingDays = Math.ceil((macroEnd.getTime() - cursor.getTime()) / (24 * 60 * 60 * 1000));
      const remainingWeeks = Math.max(1, Math.ceil(remainingDays / 7));
      result.push(createMacrocycle(macro.phase, cursor, remainingWeeks, false, macro.raceId));
    }
  }

  return result;
}

export function generateFullSeasonPlan(races: Race[], currentDate: Date = new Date()): SeasonPlan | null {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const oneYearFromNow = addWeeks(today, 52);

  const futureRaces = races
    .filter(r => {
      const raceDate = new Date(r.dateISO);
      raceDate.setHours(0, 0, 0, 0);
      return raceDate >= today && raceDate <= oneYearFromNow;
    })
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const allMacrocycles: Macrocycle[] = [];
  let cursor = new Date(today);

  const aRaces = futureRaces.filter(r => r.priority === 'A');
  const primaryRaces = aRaces.length > 0 ? aRaces : (futureRaces.length > 0 ? [futureRaces[0]] : []);

  for (let i = 0; i < primaryRaces.length; i++) {
    const race = primaryRaces[i];
    const raceDate = new Date(race.dateISO);
    const raceType = (race.distanceKm || 42.195) > 50 ? 'ultra' : 'marathon';
    const durations = getPhaseDurations(raceType, race.distanceKm || 42.195);

    const segments = generateMacrocycles({
      raceDate,
      raceType,
      raceDistanceKm: race.distanceKm || 42.195,
    }, race.id);

    const relevantSegments = segments.filter(m => {
      const segmentEnd = new Date(m.endDate);
      segmentEnd.setHours(0, 0, 0, 0);
      return segmentEnd >= cursor;
    });

    if (relevantSegments.length > 0) {
      const processedSegments: Macrocycle[] = [];

      for (const segment of relevantSegments) {
        const segmentStart = new Date(segment.startDate);
        const segmentEnd = new Date(segment.endDate);
        segmentStart.setHours(0, 0, 0, 0);
        segmentEnd.setHours(0, 0, 0, 0);

        if (segmentStart < cursor && segmentEnd >= cursor) {
          const adjustedSegment = { ...segment };
          adjustedSegment.startDate = formatDate(cursor);
          const actualWeeks = Math.ceil((segmentEnd.getTime() - cursor.getTime()) / (7 * 24 * 60 * 60 * 1000));
          adjustedSegment.durationWeeks = Math.max(1, actualWeeks);
          processedSegments.push(adjustedSegment);
        } else if (segmentStart >= cursor) {
          processedSegments.push(segment);
        }
      }

      allMacrocycles.push(...processedSegments);

      const lastSegment = processedSegments[processedSegments.length - 1];
      cursor = addWeeks(new Date(lastSegment.endDate), 0);

      if (i < primaryRaces.length - 1) {
        const nextRace = primaryRaces[i + 1];
        const nextRaceDate = new Date(nextRace.dateISO);
        const gapWeeks = Math.floor((nextRaceDate.getTime() - cursor.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const nextRaceType = (nextRace.distanceKm || 42.195) > 50 ? 'ultra' : 'marathon';
        const nextDurations = getPhaseDurations(nextRaceType, nextRace.distanceKm || 42.195);
        const requiredWeeks = nextDurations.baseWeeks + nextDurations.sharpenWeeks + nextDurations.taperWeeks + nextDurations.raceWeeks;

        if (gapWeeks > requiredWeeks + 2) {
          const transitionWeeks = gapWeeks - requiredWeeks;
          const transitionPhase = createMacrocycle(
            'base_building',
            cursor,
            transitionWeeks,
            false,
            nextRace.id
          );
          allMacrocycles.push(transitionPhase);
          cursor = addWeeks(cursor, transitionWeeks);
        }
      }
    }
  }

  if (allMacrocycles.length === 0 && primaryRaces.length === 0) {
    const basePhase = createMacrocycle('base_building', today, 52, false);
    allMacrocycles.push(basePhase);
  }

  const lastMacroEnd = allMacrocycles.length > 0
    ? new Date(allMacrocycles[allMacrocycles.length - 1].endDate)
    : new Date(today);
  lastMacroEnd.setHours(0, 0, 0, 0);

  const weeksUntilYearEnd = Math.floor((oneYearFromNow.getTime() - lastMacroEnd.getTime()) / (7 * 24 * 60 * 60 * 1000));

  if (weeksUntilYearEnd > 2) {
    const maintenancePhase = createMacrocycle(
      'base_building',
      lastMacroEnd,
      weeksUntilYearEnd,
      false
    );
    allMacrocycles.push(maintenancePhase);
  }

  const bcRaces = futureRaces.filter(r =>
    (r.priority === 'B' || r.priority === 'C') && !primaryRaces.find(pr => pr.id === r.id)
  );

  const macrocyclesWithTuneUps = insertTuneUpRaces(allMacrocycles, bcRaces);

  const seasonStart = macrocyclesWithTuneUps[0].startDate;
  const seasonEnd = macrocyclesWithTuneUps[macrocyclesWithTuneUps.length - 1].endDate;
  const totalWeeks = macrocyclesWithTuneUps.reduce((sum, m) => sum + m.durationWeeks, 0);

  const lastRace = primaryRaces.length > 0 ? primaryRaces[primaryRaces.length - 1] : null;

  const allRaceIds = [...primaryRaces.map(r => r.id), ...bcRaces.map(r => r.id)];

  return {
    raceId: lastRace?.id || 'year-plan',
    raceName: primaryRaces.length > 0
      ? `Season Plan (${primaryRaces.length} A ${primaryRaces.length === 1 ? 'race' : 'races'}${bcRaces.length > 0 ? `, ${bcRaces.length} tune-up` : ''})`
      : 'Annual Training Plan',
    seasonStart,
    seasonEnd,
    totalWeeks,
    macrocycles: macrocyclesWithTuneUps,
    isManual: false,
    lastGenerated: new Date().toISOString(),
    macrocycleGroups: primaryRaces.map(race => {
      const raceMacros = macrocyclesWithTuneUps.filter(m => m.raceId === race.id);
      return {
        raceId: race.id,
        raceName: race.name,
        raceDate: race.dateISO,
        priority: race.priority || 'A',
        macrocycles: raceMacros,
        tuneUpRaces: bcRaces
          .filter(tr => {
            const trDate = new Date(tr.dateISO);
            if (raceMacros.length === 0) return false;
            const groupStart = new Date(raceMacros[0].startDate);
            const groupEnd = new Date(raceMacros[raceMacros.length - 1].endDate);
            return trDate >= groupStart && trDate <= groupEnd;
          })
          .map(r => ({
            id: r.id,
            name: r.name,
            date: r.dateISO,
            priority: r.priority || ('C' as RacePriority),
            distanceKm: r.distanceKm,
          })),
      };
    }),
  };
}

export function filterFutureMacrocycles(seasonPlan: SeasonPlan, currentDate: Date = new Date()): SeasonPlan {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDate(today);

  const futureMacrocycles = seasonPlan.macrocycles.filter(m => m.endDate >= todayStr);

  if (futureMacrocycles.length === 0) {
    return seasonPlan;
  }

  const firstMacro = futureMacrocycles[0];
  if (firstMacro.startDate < todayStr) {
    firstMacro.startDate = todayStr;
    const endDate = new Date(firstMacro.endDate);
    const actualWeeks = Math.ceil((endDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000));
    firstMacro.durationWeeks = Math.max(1, actualWeeks);
  }

  const totalWeeks = futureMacrocycles.reduce((sum, m) => sum + m.durationWeeks, 0);

  return {
    ...seasonPlan,
    seasonStart: futureMacrocycles[0].startDate,
    seasonEnd: futureMacrocycles[futureMacrocycles.length - 1].endDate,
    totalWeeks,
    macrocycles: futureMacrocycles,
  };
}
