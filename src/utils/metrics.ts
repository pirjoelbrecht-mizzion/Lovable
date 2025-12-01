// src/utils/metrics.ts
import type { Activity } from "@/ai/brain";
import { average } from "@/ai/brain";

/** ---------------- Types & defaults ---------------- */
export type ZoneSource = "rpe" | "hr";
export type ZoneOptions = {
  source: ZoneSource;
  hrMax: number;            // used only if source === "hr"
  paceMinPerKm: number;     // used to estimate minutes when duration unknown
};

export const DEFAULT_ZONE_OPTIONS: ZoneOptions = {
  source: "rpe",
  hrMax: 190,
  paceMinPerKm: 6,
};

export function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

/** ---------------- ISO Week helpers ---------------- */
function weekKey(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00");
  const year = d.getUTCFullYear();
  const dt = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((dt.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  const ww = String(week).padStart(2, "0");
  return `${year}-W${ww}`;
}

/** ---------------- Weekly series + ACWR ---------------- */
export function weeklyKmSeries(acts: Activity[], weeksBack = 10) {
  const byWeek = new Map<string, number>();
  acts.forEach((a) => {
    if (!a.dateISO) return;
    const wk = weekKey(a.dateISO);
    byWeek.set(wk, (byWeek.get(wk) || 0) + (a.km || 0));
  });

  const now = new Date();
  const keys: string[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    keys.push(weekKey(d.toISOString().slice(0, 10)));
  }
  return keys.map((k) => ({ key: k, km: +(byWeek.get(k) || 0).toFixed(1) }));
}

export function acwrFromWeekly(weekly: { key: string; km: number }[]) {
  return weekly.map((w, i) => {
    const prev = weekly.slice(Math.max(0, i - 4), i).map((d) => d.km);
    const chronic = average(prev) || 1;
    return { key: w.key, acwr: +(w.km / chronic).toFixed(2) };
  });
}

/** ---------------- Duration estimates ---------------- */
export function estimateDurationMin(a: Activity, paceMinPerKm: number): number {
  const hasKm = typeof a.km === "number" && a.km! > 0;
  if (hasKm) return a.km! * paceMinPerKm;
  return 30; // fallback when nothing else is known
}

/** ---------------- Zone classification ----------------
 * If source === "hr" and a.avgHr exists, use %HRmax:
 *   Z1 <60%, Z2 60–70%, Z3 70–80%, Z4 80–90%, Z5 ≥90%
 * Otherwise fallback to RPE:
 *   1-2 → Z1, 3-4 → Z2, 5-6 → Z3, 7-8 → Z4, 9-10 → Z5
 *
 * Note: Activity may optionally have `avgHr?: number`.
 */
export function activityZone(
  a: Activity & { avgHr?: number },
  opts: ZoneOptions
): 1 | 2 | 3 | 4 | 5 {
  if (opts.source === "hr" && typeof a.avgHr === "number" && opts.hrMax > 100) {
    const pct = a.avgHr / opts.hrMax;
    if (pct < 0.6) return 1;
    if (pct < 0.7) return 2;
    if (pct < 0.8) return 3;
    if (pct < 0.9) return 4;
    return 5;
  }
  const rpe = a.rpe ?? 5;
  if (rpe <= 2) return 1;
  if (rpe <= 4) return 2;
  if (rpe <= 6) return 3;
  if (rpe <= 8) return 4;
  return 5;
}

/** Total minutes per zone across all activities */
export function zoneMinutes(
  acts: (Activity & { avgHr?: number })[],
  opts: ZoneOptions = DEFAULT_ZONE_OPTIONS
) {
  const z = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  acts.forEach((a) => {
    const mins = estimateDurationMin(a, opts.paceMinPerKm);
    const zone = activityZone(a, opts);
    if (zone === 1) z.z1 += mins;
    else if (zone === 2) z.z2 += mins;
    else if (zone === 3) z.z3 += mins;
    else if (zone === 4) z.z4 += mins;
    else z.z5 += mins;
  });
  return z;
}

/** Rough fuel split by zone (weighted by minutes) */
export function fatCarbBreakdown(
  acts: (Activity & { avgHr?: number })[],
  opts: ZoneOptions = DEFAULT_ZONE_OPTIONS
) {
  const z = zoneMinutes(acts, opts);
  const total = z.z1 + z.z2 + z.z3 + z.z4 + z.z5 || 1;
  const w = {
    z1: z.z1 / total,
    z2: z.z2 / total,
    z3: z.z3 / total,
    z4: z.z4 / total,
    z5: z.z5 / total,
  };
  const fat = 0.8 * w.z1 + 0.6 * w.z2 + 0.35 * w.z3 + 0.2 * w.z4 + 0.1 * w.z5;
  const carb = 0.2 * w.z1 + 0.4 * w.z2 + 0.65 * w.z3 + 0.8 * w.z4 + 0.9 * w.z5;
  return { fat: +(fat * 100).toFixed(0), carb: +(carb * 100).toFixed(0), totalMin: total };
}

/** ---------------- Anomaly detection ---------------- */
export type Anomaly = { type: "sleep" | "hrv" | "acwr"; dateOrWeek: string; note: string };

export function detectAnomalies(
  acts: Activity[],
  weekly: { key: string; km: number }[],
  acwr: { key: string; acwr: number }[]
) {
  const anomalies: Anomaly[] = [];

  // Sleep dips: < 6h
  acts.forEach((a) => {
    if (typeof a.sleepHours === "number" && a.sleepHours < 6) {
      anomalies.push({ type: "sleep", dateOrWeek: a.dateISO, note: `Low sleep ${a.sleepHours}h` });
    }
  });

  // HRV dips: < 50 or >15% below rolling 7-day avg
  const sorted = [...acts].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const hrvWindow: number[] = [];
  sorted.forEach((a) => {
    if (typeof a.hrv !== "number") return;
    const avg7 = hrvWindow.length ? average(hrvWindow) : a.hrv;
    if (a.hrv < 50 || a.hrv < avg7 * 0.85) {
      anomalies.push({ type: "hrv", dateOrWeek: a.dateISO, note: `Low HRV ${a.hrv}` });
    }
    hrvWindow.push(a.hrv);
    if (hrvWindow.length > 7) hrvWindow.shift();
  });

  // ACWR spikes: > 1.5
  acwr.forEach((w) => {
    if (w.acwr > 1.5) anomalies.push({ type: "acwr", dateOrWeek: w.key, note: `High ACWR ${w.acwr}` });
  });

  return anomalies;
}
