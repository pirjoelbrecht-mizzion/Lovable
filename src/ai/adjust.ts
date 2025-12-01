// src/ai/adjust.ts
import { clamp } from "@/ai/brain";
import { load, save } from "@/utils/storage";
import type { Activity, HealthState } from "@/ai/brain";

/** A minimal weekly plan shape the Planner can render */
export type DayKind = "rest" | "easy" | "quality" | "long";
export type PlanDay = {
  dow: number;             // 0=Mon, ... 6=Sun
  title: string;           // e.g. "Easy 8 km", "Tempo 5x3'"
  kind: DayKind;
  kmTarget: number;
  notes?: string;
};
export type WeekPlan = PlanDay[]; // length 7

const KEY = "weekPlan";

/** Seed a reasonable base week given a target weekly km */
export function seedPlan(weeklyKm = 50): WeekPlan {
  // Simple distribution: 4 easy days, 1 quality, 1 long, 1 rest
  const longKm = Math.round(weeklyKm * 0.3);   // ~30%
  const qualKm = Math.round(weeklyKm * 0.2);   // ~20%
  const easyKm = Math.round((weeklyKm - longKm - qualKm) / 4); // the rest
  // Mon..Sun
  return [
    { dow: 0, kind: "easy",    kmTarget: easyKm, title: `Easy ${easyKm} km` },
    { dow: 1, kind: "quality", kmTarget: qualKm, title: `Tempo ${qualKm} km`, notes: "Controlled; keep form" },
    { dow: 2, kind: "easy",    kmTarget: easyKm, title: `Easy ${easyKm} km` },
    { dow: 3, kind: "rest",    kmTarget: 0,      title: "Rest / Mobility" },
    { dow: 4, kind: "easy",    kmTarget: easyKm, title: `Easy ${easyKm} km + strides` },
    { dow: 5, kind: "long",    kmTarget: longKm, title: `Long ${longKm} km`, notes: "Fuel & hydrate" },
    { dow: 6, kind: "easy",    kmTarget: Math.max(5, Math.round(easyKm * 0.8)), title: `Easy ${Math.max(5, Math.round(easyKm * 0.8))} km` },
  ];
}

/** Load the current plan (or seed one if missing) */
export function getWeekPlan(): WeekPlan {
  const existing = load<WeekPlan>(KEY, null as any);
  if (existing && Array.isArray(existing) && existing.length === 7) return existing;
  const seeded = seedPlan(50);
  save(KEY, seeded);
  return seeded;
}

/** Save current plan */
export function setWeekPlan(plan: WeekPlan) {
  save(KEY, plan);
}

/** Compute a very simple readiness/fatigue score 0..1 from last 3 days */
function quickFatigue(recent: Activity[], health: HealthState): number {
  const last3 = recent.slice(-3);
  const rpeAvg = avg(last3.map((a) => a.rpe ?? 5));
  const sleepAvg = avg(last3.map((a) => a.sleepHours ?? 7));
  const hrvAvg = avg(last3.map((a) => a.hrv ?? 60));
  let score =
    (rpeAvg > 6 ? 0.4 : rpeAvg > 5 ? 0.25 : 0) +
    (sleepAvg < 7 ? 0.35 : sleepAvg < 7.5 ? 0.2 : 0) +
    (hrvAvg < 50 ? 0.35 : hrvAvg < 55 ? 0.2 : 0);
  if (health === "sick") score = Math.min(1, score + 0.5);
  if (health === "returning") score = Math.min(1, score + 0.25);
  return clamp(score, 0, 1);
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Adjust a plan in-place for the week:
 * - High fatigue: cut total vol ~20%, protect quality/long slightly, swap a quality day to easy if extreme
 * - Low fatigue & race far: add ~10% vol biases toward quality or long
 * - Race close (<= 3 w): taper bias regardless of fatigue
 */
export function adjustWeeklyPlan(opts: {
  plan?: WeekPlan;
  recent: Activity[];
  health: HealthState;
  raceWeeks: number;
}): WeekPlan {
  const plan = (opts.plan ?? getWeekPlan()).map((d) => ({ ...d })); // copy
  const fatigue = quickFatigue(opts.recent, opts.health);
  const raceW = opts.raceWeeks ?? 8;

  // If close to race: taper target
  let volMultiplier = raceW <= 1 ? 0.6 : raceW <= 2 ? 0.75 : raceW <= 3 ? 0.85 : 1.0;

  if (fatigue > 0.7) {
    volMultiplier = Math.min(volMultiplier, 0.8);
    // turn the midweek quality into easy if very fatigued
    const qualIdx = plan.findIndex((d) => d.kind === "quality");
    if (qualIdx >= 0) {
      plan[qualIdx].kind = "easy";
      plan[qualIdx].title = `Easy ${Math.max(5, Math.round(plan[qualIdx].kmTarget * 0.6))} km`;
      plan[qualIdx].kmTarget = Math.max(5, Math.round(plan[qualIdx].kmTarget * 0.6));
      plan[qualIdx].notes = "Quality postponed due to fatigue";
    }
  } else if (fatigue < 0.3 && raceW > 4) {
    volMultiplier = Math.max(volMultiplier, 1.1);
    // small bump to quality or long
    plan.forEach((d) => {
      if (d.kind === "quality") d.kmTarget = Math.round(d.kmTarget * 1.1);
      if (d.kind === "long") d.kmTarget = Math.round(d.kmTarget * 1.05);
    });
  }

  // Apply global volume multiplier, protect rest=0
  plan.forEach((d) => {
    if (d.kind === "rest") return;
    d.kmTarget = Math.max(0, Math.round(d.kmTarget * volMultiplier));
    if (d.kind === "easy") d.title = `Easy ${d.kmTarget} km`;
    if (d.kind === "long") d.title = `Long ${d.kmTarget} km`;
    if (d.kind === "quality") d.title = `Tempo ${d.kmTarget} km`;
  });

  setWeekPlan(plan);
  return plan;
}
