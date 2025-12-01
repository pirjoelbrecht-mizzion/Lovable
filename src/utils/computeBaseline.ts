import type { LogEntry } from '@/types';
import { listRaces, type Race } from '@/utils/races';
import { getLogEntries } from '@/lib/database';

export type BaselineRace = {
  id: string;
  name: string;
  dateISO: string;
  distanceKm: number;
  timeMin: number;
  paceMinPerKm: number;
  type: 'real' | 'derived';
  source: 'race' | 'training';
  hrAvg?: number;
  confidenceScore: number;
};

const STANDARD_RACE_DISTANCES = [5, 10, 15, 21.0975, 42.195, 50, 80, 100, 160];

function calculateConfidenceScore(
  type: 'real' | 'derived',
  dateISO: string,
  hasHR: boolean
): number {
  let score = type === 'real' ? 0.9 : 0.7;

  const daysAgo = (Date.now() - new Date(dateISO).getTime()) / (1000 * 60 * 60 * 24);

  if (daysAgo <= 30) {
    score *= 1.0;
  } else if (daysAgo <= 60) {
    score *= 0.95;
  } else if (daysAgo <= 90) {
    score *= 0.85;
  } else if (daysAgo <= 180) {
    score *= 0.75;
  } else {
    score *= 0.6;
  }

  if (hasHR) {
    score = Math.min(1.0, score * 1.1);
  }

  return Math.max(0.3, Math.min(1.0, score));
}

function isValidPace(paceMinPerKm: number): boolean {
  return paceMinPerKm >= 3.0 && paceMinPerKm <= 10.0;
}

function isStandardRaceDistance(distanceKm: number): boolean {
  return STANDARD_RACE_DISTANCES.some(d => Math.abs(distanceKm - d) < 0.5);
}

export async function computeBaseline(
  preferredRaceId?: string
): Promise<BaselineRace | null> {
  const races = await listRaces();
  const logEntries = await getLogEntries(500);

  const candidates: BaselineRace[] = [];

  for (const race of races) {
    if (!race.dateISO || !race.distanceKm) continue;

    const distKm = Number(race.distanceKm);
    if (distKm < 3 || distKm > 200) continue;

    const raceLog = logEntries.find(
      e => e.dateISO === race.dateISO &&
      Math.abs((e.km || 0) - distKm) < 0.5
    );

    if (!raceLog?.durationMin) continue;

    const paceMinPerKm = raceLog.durationMin / distKm;

    if (!isValidPace(paceMinPerKm)) continue;

    const confidenceScore = calculateConfidenceScore(
      'real',
      race.dateISO,
      !!raceLog.hrAvg
    );

    candidates.push({
      id: race.id,
      name: race.name,
      dateISO: race.dateISO,
      distanceKm: distKm,
      timeMin: raceLog.durationMin,
      paceMinPerKm,
      type: 'real',
      source: 'race',
      hrAvg: raceLog.hrAvg,
      confidenceScore
    });
  }

  if (preferredRaceId) {
    const preferred = candidates.find(c => c.id === preferredRaceId);
    if (preferred) {
      return preferred;
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const aScore = a.confidenceScore * 0.6 + (1 / a.paceMinPerKm) * 0.4;
      const bScore = b.confidenceScore * 0.6 + (1 / b.paceMinPerKm) * 0.4;
      return bScore - aScore;
    });

    return candidates[0];
  }

  const derivedCandidates: BaselineRace[] = [];

  for (const entry of logEntries) {
    if (!entry.dateISO || !entry.km || !entry.durationMin) continue;
    if (entry.km < 5 || entry.km > 200) continue;

    const paceMinPerKm = entry.durationMin / entry.km;

    if (!isValidPace(paceMinPerKm)) continue;

    const alreadyHasRace = candidates.some(
      c => c.dateISO === entry.dateISO && Math.abs(c.distanceKm - entry.km) < 0.5
    );

    if (alreadyHasRace) continue;

    const isLongRaceEffort = entry.km >= 20;
    const isStandardDistance = isStandardRaceDistance(entry.km);
    const isSignificantEffort = entry.km >= 10 && entry.durationMin >= 45;

    if (!isLongRaceEffort && !isStandardDistance && !isSignificantEffort) {
      continue;
    }

    const useFactor = isLongRaceEffort ? 0.99 : 0.97;
    const estimatedRaceTime = entry.durationMin * useFactor;
    const estimatedRacePace = estimatedRaceTime / entry.km;

    let baseConfidence = isLongRaceEffort ? 0.85 : 0.7;
    if (isStandardDistance) baseConfidence += 0.1;

    const confidenceScore = calculateConfidenceScore(
      'derived',
      entry.dateISO,
      !!entry.hrAvg
    ) * baseConfidence;

    derivedCandidates.push({
      id: `derived_${entry.dateISO}_${entry.km}`,
      name: `${entry.title || 'Training Run'} (${entry.km}km)`,
      dateISO: entry.dateISO,
      distanceKm: entry.km,
      timeMin: estimatedRaceTime,
      paceMinPerKm: estimatedRacePace,
      type: 'derived',
      source: 'training',
      hrAvg: entry.hrAvg,
      confidenceScore
    });
  }

  if (derivedCandidates.length === 0) {
    return null;
  }

  derivedCandidates.sort((a, b) => {
    const recentWeight = 0.4;
    const paceWeight = 0.3;
    const distanceWeight = 0.3;

    const aRecent = new Date(a.dateISO).getTime() / Date.now();
    const bRecent = new Date(b.dateISO).getTime() / Date.now();

    const aPaceScore = 1 / a.paceMinPerKm;
    const bPaceScore = 1 / b.paceMinPerKm;

    const aDistScore = a.distanceKm / 42.195;
    const bDistScore = b.distanceKm / 42.195;

    const aScore = aRecent * recentWeight + aPaceScore * paceWeight + aDistScore * distanceWeight;
    const bScore = bRecent * recentWeight + bPaceScore * paceWeight + bDistScore * distanceWeight;

    return bScore - aScore;
  });

  const best = derivedCandidates[0];

  return {
    ...best,
    confidenceScore: best.confidenceScore * 0.85
  };
}

export function formatBaselineDescription(baseline: BaselineRace): string {
  const dateStr = new Date(baseline.dateISO).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const paceStr = `${Math.floor(baseline.paceMinPerKm)}:${String(Math.floor((baseline.paceMinPerKm % 1) * 60)).padStart(2, '0')}/km`;
  const timeStr = formatTime(baseline.timeMin);

  if (baseline.type === 'real') {
    return `${baseline.name} • ${baseline.distanceKm}km • ${timeStr} (${paceStr}) • ${dateStr}`;
  } else {
    return `Based on ${baseline.name} • ${baseline.distanceKm}km • Est. ${timeStr} (${paceStr}) • ${dateStr}`;
  }
}

export function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export function getBaselineQualityLabel(baseline: BaselineRace): string {
  if (baseline.type === 'real' && baseline.confidenceScore >= 0.85) {
    return 'High Quality Baseline';
  } else if (baseline.type === 'real') {
    return 'Good Baseline';
  } else if (baseline.confidenceScore >= 0.65) {
    return 'Fair Baseline (Derived from Training)';
  } else {
    return 'Initial Baseline (Will Improve with Race Data)';
  }
}

export function shouldUpdateBaseline(
  current: BaselineRace | null,
  candidate: BaselineRace
): boolean {
  if (!current) return true;

  if (candidate.type === 'real' && current.type === 'derived') {
    return true;
  }

  if (candidate.confidenceScore > current.confidenceScore * 1.1) {
    return true;
  }

  const currentAge = (Date.now() - new Date(current.dateISO).getTime()) / (1000 * 60 * 60 * 24);
  const candidateAge = (Date.now() - new Date(candidate.dateISO).getTime()) / (1000 * 60 * 60 * 24);

  if (currentAge > 180 && candidateAge < 90) {
    return true;
  }

  return false;
}
