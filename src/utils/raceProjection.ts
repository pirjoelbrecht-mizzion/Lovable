import { load, save } from "@/utils/storage";
import { getSupabase, getCurrentUserId } from "@/lib/supabase";
import type { LogEntry } from "@/types";
import { listRaces, type Race } from "@/utils/races";
import { getLogEntries } from "@/lib/database";

export type RaceResult = {
  id: string;
  name: string;
  dateISO: string;
  distanceKm: number;
  timeMin: number;
  hrAvg?: number;
  paceMinPerKm?: number;
};

export type RaceProjection = {
  id: string;
  userId?: string;
  baselineRaceId: string;
  baselineDistanceKm: number;
  baselineTimeMin: number;
  targetDistanceKm: number;
  predictedTimeMin: number;
  confidenceScore: number;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BaselineRace = {
  id: string;
  name: string;
  dateISO: string;
  distanceKm: number;
  timeMin: number;
  hrAvg?: number;
  paceMinPerKm: number;
  source: 'race' | 'log' | 'manual';
  confidenceScore?: number;
};

const STANDARD_DISTANCES = [5, 10, 15, 21.0975, 42.195];

export function calculateProjectedTime(
  baseDistanceKm: number,
  baseTimeMin: number,
  targetDistanceKm: number
): number {
  return baseTimeMin * Math.pow(targetDistanceKm / baseDistanceKm, 1.06);
}

export function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm % 1) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function calculateConfidence(baselineDate: string): number {
  const daysAgo = (Date.now() - new Date(baselineDate).getTime()) / (1000 * 60 * 60 * 24);

  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 60) return 0.95;
  if (daysAgo <= 90) return 0.85;
  if (daysAgo <= 180) return 0.75;
  return 0.6;
}

export async function findBestBaselineRace(): Promise<BaselineRace | null> {
  const races = await listRaces();
  const logEntries = await getLogEntries(500);

  console.log('[findBestBaselineRace] Races found:', races.length);
  console.log('[findBestBaselineRace] Log entries found:', logEntries.length);

  const candidates: BaselineRace[] = [];

  for (const race of races) {
    if (!race.dateISO || !race.distanceKm) continue;

    const distKm = Number(race.distanceKm);
    if (distKm < 3 || distKm > 200) continue;

    let timeMin: number | undefined;

    const raceLog = logEntries.find(
      e => e.dateISO === race.dateISO &&
      Math.abs((e.km || 0) - distKm) < 0.5
    );

    if (raceLog?.durationMin) {
      timeMin = raceLog.durationMin;
    }

    if (!timeMin) continue;

    const paceMinPerKm = timeMin / distKm;

    candidates.push({
      id: race.id,
      name: race.name,
      dateISO: race.dateISO,
      distanceKm: distKm,
      timeMin,
      hrAvg: raceLog?.hrAvg,
      paceMinPerKm,
      source: 'race'
    });
  }

  console.log('[findBestBaselineRace] Race candidates:', candidates.length);

  for (const entry of logEntries) {
    if (!entry.dateISO || !entry.km || !entry.durationMin) continue;
    if (entry.km < 5 || entry.km > 200) continue;

    const paceMinPerKm = entry.durationMin / entry.km;
    if (paceMinPerKm < 3 || paceMinPerKm > 10) continue;

    const alreadyHasRace = candidates.some(
      c => c.dateISO === entry.dateISO && Math.abs(c.distanceKm - entry.km) < 0.5
    );

    if (alreadyHasRace) continue;

    const isLongRaceEffort = entry.km >= 20;
    const isStandardDistance = STANDARD_DISTANCES.some(
      d => Math.abs(entry.km - d) < 0.5
    );
    const isSignificantEffort = entry.km >= 10 && entry.durationMin >= 45;

    if (!isLongRaceEffort && !isStandardDistance && !isSignificantEffort) {
      continue;
    }

    candidates.push({
      id: `log_${entry.dateISO}_${entry.km}`,
      name: `${entry.title || 'Run'} - ${entry.km}km`,
      dateISO: entry.dateISO,
      distanceKm: entry.km,
      timeMin: entry.durationMin,
      hrAvg: entry.hrAvg,
      paceMinPerKm,
      source: 'log'
    });
  }

  console.log('[findBestBaselineRace] Total candidates after log analysis:', candidates.length);
  if (candidates.length > 0) {
    console.log('[findBestBaselineRace] Sample candidates:', candidates.slice(0, 3));
  }

  if (candidates.length === 0) {
    console.log('[findBestBaselineRace] NO CANDIDATES FOUND!');
    return null;
  }

  candidates.sort((a, b) => {
    const aRecent = new Date(a.dateISO).getTime();
    const bRecent = new Date(b.dateISO).getTime();
    const recencyWeight = 0.6;
    const paceWeight = 0.4;

    const aScore = (aRecent / Date.now()) * recencyWeight +
                   (1 / a.paceMinPerKm) * paceWeight;
    const bScore = (bRecent / Date.now()) * recencyWeight +
                   (1 / b.paceMinPerKm) * paceWeight;

    return bScore - aScore;
  });

  const best = candidates[0];
  best.confidenceScore = calculateConfidence(best.dateISO);

  console.log('[findBestBaselineRace] Best baseline selected:', best);

  return best;
}

export function generateProjections(baseline: BaselineRace): RaceProjection[] {
  const projections: RaceProjection[] = [];
  const confidence = calculateConfidence(baseline.dateISO);

  for (const targetDist of STANDARD_DISTANCES) {
    if (Math.abs(targetDist - baseline.distanceKm) < 0.5) continue;

    const predictedTimeMin = calculateProjectedTime(
      baseline.distanceKm,
      baseline.timeMin,
      targetDist
    );

    projections.push({
      id: `proj_${baseline.id}_${targetDist}`,
      baselineRaceId: baseline.id,
      baselineDistanceKm: baseline.distanceKm,
      baselineTimeMin: baseline.timeMin,
      targetDistanceKm: targetDist,
      predictedTimeMin,
      confidenceScore: confidence,
      isManualOverride: baseline.source === 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return projections;
}

export async function syncProjectionsToSupabase(projections: RaceProjection[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const { data: existing } = await supabase
      .from('race_projections')
      .select('baseline_race_id')
      .eq('user_id', userId);

    const existingIds = new Set(existing?.map(e => e.baseline_race_id) || []);

    for (const proj of projections) {
      if (existingIds.has(proj.baselineRaceId)) {
        await supabase
          .from('race_projections')
          .update({
            baseline_distance_km: proj.baselineDistanceKm,
            baseline_time_min: proj.baselineTimeMin,
            target_distance_km: proj.targetDistanceKm,
            predicted_time_min: proj.predictedTimeMin,
            confidence_score: proj.confidenceScore,
            is_manual_override: proj.isManualOverride,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('baseline_race_id', proj.baselineRaceId)
          .eq('target_distance_km', proj.targetDistanceKm);
      } else {
        await supabase
          .from('race_projections')
          .insert({
            user_id: userId,
            baseline_race_id: proj.baselineRaceId,
            baseline_distance_km: proj.baselineDistanceKm,
            baseline_time_min: proj.baselineTimeMin,
            target_distance_km: proj.targetDistanceKm,
            predicted_time_min: proj.predictedTimeMin,
            confidence_score: proj.confidenceScore,
            is_manual_override: proj.isManualOverride
          });
      }
    }
  } catch (err) {
    console.error('Failed to sync projections:', err);
  }
}

export async function loadProjectionsFromSupabase(): Promise<RaceProjection[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('race_projections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      baselineRaceId: d.baseline_race_id,
      baselineDistanceKm: d.baseline_distance_km,
      baselineTimeMin: d.baseline_time_min,
      targetDistanceKm: d.target_distance_km,
      predictedTimeMin: d.predicted_time_min,
      confidenceScore: d.confidence_score,
      isManualOverride: d.is_manual_override,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));
  } catch (err) {
    console.error('Failed to load projections:', err);
    return [];
  }
}

export function saveProjectionsLocal(projections: RaceProjection[]): void {
  save('race:projections', projections);
}

export function loadProjectionsLocal(): RaceProjection[] {
  return load<RaceProjection[]>('race:projections', []);
}

export function getDistanceName(km: number): string {
  if (Math.abs(km - 5) < 0.1) return '5K';
  if (Math.abs(km - 10) < 0.1) return '10K';
  if (Math.abs(km - 15) < 0.1) return '15K';
  if (Math.abs(km - 21.0975) < 0.1) return 'Half Marathon';
  if (Math.abs(km - 42.195) < 0.1) return 'Marathon';
  return `${km.toFixed(1)}km`;
}
