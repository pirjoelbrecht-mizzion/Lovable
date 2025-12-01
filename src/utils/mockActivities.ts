// src/utils/mockActivities.ts
import type { Activity } from "@/ai/brain";

// helper: ISO for N days ago
function dAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Slightly noisy number
function jitter(base: number, pct = 0.15) {
  const span = base * pct;
  return base + (Math.random() * 2 - 1) * span;
}

/**
 * Generate a week of plausible runs, leaning easy with 1 quality day.
 * Distances are in km, RPE ~ 3–8, HRV ~ 48–62, sleep ~ 6.2–8.0h.
 */
export function generateStravaMock(): Activity[] {
  // last 7 days, Sun..Sat style
  const plan = [
    { km: 0,   rpe: 2.5 }, // rest
    { km: 6.5, rpe: 4.5 },
    { km: 8.0, rpe: 5.0 },
    { km: 10,  rpe: 6.0 }, // steady
    { km: 0,   rpe: 3.0 }, // rest/cross
    { km: 12,  rpe: 7.0 }, // quality
    { km: 7.5, rpe: 5.5 }
  ];

  return plan.map((p, i) => {
    const sleep = clamp(jitter(7.2, 0.12), 5.8, 8.6);
    const hrv   = Math.round(clamp(jitter(55, 0.12), 45, 65));
    const km    = Math.max(0, +jitter(p.km, 0.12).toFixed(1));
    const rpe   = Math.round(clamp(jitter(p.rpe, 0.15), 2, 9) * 10) / 10;

    return {
      dateISO: dAgo(6 - i), // oldest -> newest
      km,
      rpe,
      sleepHours: Math.round(sleep * 10) / 10,
      hrv
    } satisfies Activity;
  });
}
