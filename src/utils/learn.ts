// src/utils/learn.ts
import { load, save } from "@/utils/storage";

export type RaceFeedback = {
  raceId: string;
  dateISO: string;
  result: "finished" | "dnf";
  fatigue: 1 | 2 | 3 | 4 | 5;           // how cooked in race week / finish
  pacing: "too_slow" | "ok" | "too_fast";
  fueling: "ok" | "issues";
  heat: boolean;
  altitude: boolean;
  notes?: string;
};

export type AIProfile = {
  // Multiplies taper % from the default model (per priority)
  taperAggressiveness: { A: number; B: number; C: number };
  // Nudges total volume decisions (-1…+1 where + means more conservative)
  riskTolerance: number;
  // Optional hints; not used in math yet, but handy later
  prefersCooler?: boolean;
  strugglesAtAltitude?: boolean;
};

const PROFILE_KEY = "ai:profile";
const FEEDBACK_KEY = "ai:raceFeedback";

export function getProfile(): AIProfile {
  return load<AIProfile>(PROFILE_KEY, {
    taperAggressiveness: { A: 1.0, B: 1.0, C: 1.0 },
    riskTolerance: 0, // 0 = neutral, + means cut volume more readily
  });
}

export function saveProfile(p: AIProfile) {
  save(PROFILE_KEY, p);
}

export function listFeedback(): RaceFeedback[] {
  return load<RaceFeedback[]>(FEEDBACK_KEY, []);
}

export function saveFeedback(fb: RaceFeedback) {
  const all = listFeedback().filter(x => x.raceId !== fb.raceId);
  all.push(fb);
  save(FEEDBACK_KEY, all);
}

/**
 * Update profile heuristics from a single feedback.
 * Very small, bounded nudges so it stays stable.
 */
export function updateProfileFromFeedback(fb: RaceFeedback, priority: "A"|"B"|"C") {
  const p = getProfile();

  // 1) If fatigue was high (≥4) or DNF, increase taper aggressiveness for that priority a bit.
  const baseAgg = p.taperAggressiveness[priority];
  let deltaAgg = 0;
  if (fb.result === "dnf") deltaAgg += 0.15;
  if (fb.fatigue >= 4)    deltaAgg += 0.10;
  if (fb.pacing === "too_fast") deltaAgg += 0.05; // often overcooked approach
  if (fb.pacing === "too_slow") deltaAgg -= 0.05; // could probably taper a bit less
  const nextAgg = clamp(baseAgg + deltaAgg, 0.6, 1.6);

  p.taperAggressiveness = { ...p.taperAggressiveness, [priority]: nextAgg };

  // 2) Risk tolerance: if multiple signals of trouble, move conservative (+)
  let tol = p.riskTolerance;
  if (fb.result === "dnf") tol += 0.2;
  if (fb.fueling === "issues") tol += 0.1;
  if (fb.fatigue >= 4) tol += 0.1;
  if (fb.pacing === "too_slow") tol -= 0.05; // suggests more margin left
  p.riskTolerance = clamp(tol, -0.5, 0.8);

  // 3) Context flags
  if (fb.heat) p.prefersCooler = true;
  if (fb.altitude) p.strugglesAtAltitude = true;

  saveProfile(p);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
