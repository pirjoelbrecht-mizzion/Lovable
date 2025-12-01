// src/ai/brain.ts
import { getNextRace } from "@/utils/races";
import { applyRaceLessonsToPlan, getLessons } from "@/ai/experience";
import { getAllRunFeedback } from "@/ai/runFeedback"; // FIXED

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */
export type HealthState = "ok" | "sick" | "returning";

export type Weights = {
  sleep: number;
  hrv: number;
  rpe: number;
  raceProximity: number;
};

export type Activity = {
  dateISO: string;
  km?: number;
  rpe?: number;
  sleepHours?: number;
  hrv?: number;
};

export type Reasoning = {
  fatigueScore: number;
  adjustments: Record<string, unknown>;
  reason: string;
  updatedWeights: Weights;
  _debug?: {
    sleepAvg: number;
    hrvAvg: number;
    rpeAvg: number;
    acwr: number;
    raceWeeks: number | null;
    lessons: string[];
    taperNote?: string;
  };
};

export const DEFAULT_WEIGHTS: Weights = {
  sleep: 0.8,
  hrv: 0.7,
  rpe: 0.6,
  raceProximity: 0.9,
};

/* ------------------------------------------------------------------ */
/* Helper maths                                                       */
/* ------------------------------------------------------------------ */
export function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function calculateACWR(last4WeeksKm: number[], thisWeekKm: number) {
  const chronic = average(last4WeeksKm) || 1;
  return Number((thisWeekKm / chronic).toFixed(2));
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ------------------------------------------------------------------ */
/* Weight learning from past outcomes                                 */
/* ------------------------------------------------------------------ */
export function updateWeights(w: Weights, outcomeScore: number) {
  const prior = 0.9,
    upd = 0.1;
  const bump = (old: number) => clamp((old * prior) + (outcomeScore * upd), 0.2, 1.0);
  w.sleep = bump(w.sleep);
  w.hrv = bump(w.hrv);
  w.rpe = bump(w.rpe);
  w.raceProximity = bump(w.raceProximity);
}

/* ------------------------------------------------------------------ */
/* Run feedback bias                                                  */
/* ------------------------------------------------------------------ */
function recentFeedbackBias() {
  const all = getAllRunFeedback();
  const last7 = all.filter(f => {
    const t = new Date(f.dateISO).getTime();
    return Date.now() - t <= 7 * 24 * 3600 * 1000;
  });
  if (last7.length === 0) return { fatigueBump: 0, qualityCap: undefined as number | undefined };

  const avgRPE = last7.reduce((a, b) => a + (b.rpe || 0), 0) / last7.length;
  const avgSoreness = last7.reduce((a, b) => a + (b.soreness || 0), 0) / last7.length;

  const fatigueBump = Math.min(
    0.15,
    Math.max(0, avgRPE - 6) * 0.02 + Math.max(0, avgSoreness - 5) * 0.02
  );
  const qualityCap = (avgRPE >= 7 || avgSoreness >= 6) ? 1 : undefined;

  return { fatigueBump, qualityCap };
}

/* ------------------------------------------------------------------ */
/* MAIN REASONING – weekly plan bias                                  */
/* ------------------------------------------------------------------ */
export function reasonWeekly({
  recentActivities,
  health,
  weights = DEFAULT_WEIGHTS,
  raceProximityWeeks = 8,
  last4WeeksKm,
  thisWeekPlannedKm,
  activeRace,
}: {
  recentActivities: Activity[];
  health: HealthState;
  weights?: typeof DEFAULT_WEIGHTS;
  raceProximityWeeks?: number;
  last4WeeksKm: number[];
  thisWeekPlannedKm: number;
  activeRace?: {
    name: string;
    priority: "A" | "B" | "C";
    weeksTo: number;
  } | null;
}): Reasoning {
  const next = getNextRace();
  const race = activeRace || (next ? {
    name: next.name || "Race",
    priority: (next.priority || "B") as "A" | "B" | "C",
    weeksTo: raceProximityWeeks,
  } : null);
  const rw = race ? Math.max(0, race.weeksTo) : raceProximityWeeks;

  /* ----------------- aggregate recent data ----------------- */
  const sleepAvg = average(recentActivities.map(a => a.sleepHours ?? 7));
  const hrvAvg = average(recentActivities.map(a => a.hrv ?? 60));
  const rpeAvg = average(recentActivities.map(a => a.rpe ?? 5));
  const acwr = calculateACWR(last4WeeksKm, thisWeekPlannedKm);
  const sicknessImpact = health === "sick" ? 1.0 : health === "returning" ? 0.5 : 0;
  const raceFactor = Math.max(0, 1 - rw / 12);

  /* ----------------- raw fatigue score ----------------- */
  const fatigueScoreRaw =
    ((sleepAvg < 7 ? 1 : 0) * weights.sleep) +
    ((hrvAvg < 50 ? 1 : 0) * weights.hrv) +
    ((rpeAvg > 6 ? 1 : 0) * weights.rpe) +
    ((acwr > 1.2 ? 1 : 0) * 0.5) +
    (sicknessImpact * 1.0) +
    (raceFactor * weights.raceProximity);

  let fatigueScore = clamp(fatigueScoreRaw / 4, 0, 1);

  /* ----------------- RUN FEEDBACK BIAS ----------------- */
  const fb = recentFeedbackBias();
  fatigueScore = clamp(fatigueScore + fb.fatigueBump, 0, 1);

  /* ----------------- base adjustments ----------------- */
  let adjustments: Record<string, unknown> = {};
  let reason = "";

  if (fatigueScore > 0.7) {
    adjustments = { volumeCutPct: 20, intensityDown: true, addRestDay: true };
    reason = "High fatigue detected (sleep/HRV/RPE signals). Reducing volume to protect adaptation.";
  } else if (fatigueScore < 0.3) {
    adjustments = { volumeBoostPct: 10, addHillSession: true };
    reason = "Strong readiness (recovery looks good). Safe to add specificity.";
  } else {
    adjustments = {};
    reason = "Balanced state; maintain plan and bias toward specificity near race.";
  }

  /* ----------------- RACE-LESSON BIAS ----------------- */
  let knobs = {
    taperCutPct: undefined as number | undefined,
    qualitySessions: 2,
    heatPrep: false,
    fuelingRehearsal: false,
    hillsSpecificity: false,
  };

  knobs = applyRaceLessonsToPlan(knobs);

  if (fb.qualityCap != null) {
    knobs.qualitySessions = Math.min(knobs.qualitySessions, fb.qualityCap);
  }

  if (knobs.taperCutPct != null) {
    adjustments.volumeCutPct = (adjustments.volumeCutPct || 0) + knobs.taperCutPct * 100;
  }
  if ((knobs as any).addRestDay) adjustments.addRestDay = true;
  if (knobs.hillsSpecificity) adjustments.hillsSpecificity = true;
  if (knobs.fuelingRehearsal) adjustments.fuelingRehearsal = true;
  if (knobs.heatPrep) adjustments.heatPrep = true;

  /* ----------------- OUTCOME SCORE → WEIGHT UPDATE ----------------- */
  const completion = average(
    recentActivities.map(a => (a.km ? (a.km > 0 ? 1 : 0.3) : 0.7))
  );
  const perceivedOK = (10 - (rpeAvg || 5)) / 10;
  const outcomeScore = clamp((completion * 0.6 + perceivedOK * 0.4) * 2 - 1, -1, 1);

  const w = { ...weights };
  updateWeights(w, outcomeScore);

  return {
    fatigueScore,
    adjustments,
    reason,
    updatedWeights: w,
    _debug: {
      sleepAvg,
      hrvAvg,
      rpeAvg,
      acwr,
      raceWeeks: race ? rw : null,
      lessons: getLessons().map(l => l.summary),
    },
  };
}

/* ------------------------------------------------------------------ */
/* AI ROUTE RECOMMENDATION SYSTEM                                     */
/* ------------------------------------------------------------------ */

export type Route = {
  id?: string;
  name: string;
  distance_km: number;
  elevation_gain_m?: number;
  surface_type?: string;
  scenic_score?: number;
  popularity_score?: number;
  start_lat?: number;
  start_lon?: number;
};

export type TrainingTarget = {
  distance_km: number;
  elevation_gain_m?: number;
  terrain?: string;
  weatherAware?: boolean;
  userLat?: number;
  userLon?: number;
};

export type RouteRecommendation = {
  route: Route;
  score: number;
  breakdown?: {
    distanceScore: number;
    elevationScore: number;
    surfaceScore: number;
    popularityScore: number;
    scenicScore: number;
    weatherPenalty: number;
  };
};

/**
 * Calculate recommendation score for routes based on training target.
 * Scoring weights:
 * - Distance match: 40%
 * - Elevation match: 30%
 * - Surface match: 20%
 * - Popularity: 5%
 * - Scenic: 5%
 * - Weather penalty: up to -10%
 */
export async function suggestRoutesForTraining(
  routes: Route[],
  target: TrainingTarget
): Promise<RouteRecommendation[]> {
  const { getWeatherForLocation } = await import("@/utils/weather");

  const scored: RouteRecommendation[] = [];

  for (const route of routes) {
    if (!route.distance_km || route.distance_km <= 0) continue;

    const distanceScore = clamp(
      1 - Math.abs(route.distance_km - target.distance_km) / target.distance_km,
      0,
      1
    );

    let elevationScore = 1;
    if (target.elevation_gain_m && route.elevation_gain_m) {
      elevationScore = clamp(
        1 - Math.abs(route.elevation_gain_m - target.elevation_gain_m) / Math.max(target.elevation_gain_m, 1),
        0,
        1
      );
    }

    const surfaceScore =
      target.terrain && route.surface_type
        ? route.surface_type === target.terrain ? 1 : 0.8
        : 0.9;

    const popularityScore = (route.popularity_score ?? 0) / 10;
    const scenicScore = (route.scenic_score ?? 5) / 10;

    let weatherPenalty = 0;
    if (target.weatherAware && target.userLat && target.userLon) {
      try {
        const weather = await getWeatherForLocation(target.userLat, target.userLon);
        if (weather.temp > 28) {
          weatherPenalty = Math.min(0.1, (weather.temp - 28) * 0.02);
        }
      } catch (err) {
        console.warn("Weather fetch failed, skipping penalty:", err);
      }
    }

    const compositeScore = clamp(
      distanceScore * 0.4 +
      elevationScore * 0.3 +
      surfaceScore * 0.2 +
      popularityScore * 0.05 +
      scenicScore * 0.05 -
      weatherPenalty,
      0,
      1
    );

    scored.push({
      route,
      score: compositeScore,
      breakdown: {
        distanceScore,
        elevationScore,
        surfaceScore,
        popularityScore,
        scenicScore,
        weatherPenalty,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3);
}