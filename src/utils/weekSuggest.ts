// src/utils/weekSuggest.ts
export type DayType = "rest" | "easy" | "quality" | "long" | "recovery";
export type DayPlan = {
  day: string;          // Mon..Sun
  type: DayType;
  km: number;
  title?: string;
  note?: string;
};

const DAYS: string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function makeWorkoutTitle(type: DayPlan["type"], km: number) {
  if (type === "quality") {
    if (km <= 8)   return "6×2′ @ 5k effort (2′ easy)";
    if (km <= 10)  return "5×3′ @ 10k effort (2′ easy)";
    if (km <= 12)  return "3×8′ tempo (3′ easy)";
    return "20′ tempo + 6×30″ fast (1′ easy)";
  }
  if (type === "long") {
    if (km <= 16)  return "Long Z2; fuel every 40′";
    if (km <= 22)  return "Long Z2 + last 15′ steady";
    return "Long Z2; include rolling hills";
  }
  if (type === "recovery") return "Very easy; strides optional (4×15″)";
  if (type === "easy")     return "Easy Z2 + 4×20″ strides";
  return "Rest / mobility";
}

export function buildSuggestedWeek(opts?: {
  baseWeeklyKm?: number;
  recentWeeks?: number[];
  health?: "ok" | "returning" | "sick";
  raceWeeks?: number;
}): DayPlan[] {
  const baseKm = clamp(Math.round((opts?.baseWeeklyKm ?? 48)), 20, 120);
  const chronic =
    (opts?.recentWeeks && opts.recentWeeks.length
      ? opts.recentWeeks.reduce((a, b) => a + b, 0) / opts.recentWeeks.length
      : baseKm) || baseKm;

  let target = baseKm;
  const acwr = target / Math.max(10, chronic);
  if (acwr > 1.25) target = Math.round(chronic * 1.2);

  if (opts?.health === "sick") target = Math.round(target * 0.7);
  if (opts?.health === "returning") target = Math.round(target * 0.85);
  if ((opts?.raceWeeks ?? 8) <= 3) target = Math.round(target * 0.85);

  const ratios = [0.16, 0.20, 0.14, 0.18, 0.0, 0.26, 0.06];
  const raw = ratios.map((r) => Math.round(target * r));
  const delta = target - raw.reduce((a, b) => a + b, 0);
  if (delta !== 0) raw[5] = clamp(raw[5] + delta, 0, 200);

  let plan: DayPlan[] = [
    { day: DAYS[0], type: "easy",     km: Math.max(0, raw[0]) },
    { day: DAYS[1], type: "quality",  km: Math.max(0, raw[1]) },
    { day: DAYS[2], type: "easy",     km: Math.max(0, raw[2]) },
    { day: DAYS[3], type: "quality",  km: Math.max(0, raw[3]) },
    { day: DAYS[4], type: "rest",     km: 0, note: "Mobility + sleep" },
    { day: DAYS[5], type: "long",     km: Math.max(0, raw[5]) },
    { day: DAYS[6], type: "recovery", km: Math.max(0, raw[6]) },
  ];

  if ((opts?.raceWeeks ?? 8) <= 3) {
    plan = plan.map((d) =>
      d.type === "quality"
        ? { ...d, km: Math.round(d.km * 0.7), note: "Keep it snappy, not hard." }
        : d
    );
  }

  return plan.map((d) => ({
    ...d,
    title: makeWorkoutTitle(d.type, d.km),
    note:
      d.note ??
      (d.type === "quality"
        ? "Stay smooth; stop if form fades."
        : d.type === "long"
        ? "Fuel 30–40′; sip fluids often."
        : d.type === "recovery"
        ? "Keep HR low; breathe easy."
        : d.type === "easy"
        ? "Relax shoulders; light cadence."
        : d.note),
  }));
}
