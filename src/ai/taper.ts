import type { RacePriority, RaceSurface } from "@/utils/races";

export type Session = { title: string; km?: number; notes?: string };
export type PlanDay = { dateISO: string; sessions: Session[] };
export type PlanWeek = PlanDay[];

export type TaperInputs = {
  // Signals
  fatigueScore: number;         // 0..1 from reasonWeekly
  chronicKm: number;            // 4-week average
  thisWeekPlanKmBase: number;   // nominal planned km before taper/scaling (e.g., 50)

  // Race context
  weeksToRace: number | null;   // 0 = race week; 1 = week before; etc.
  priority: RacePriority;       // A, B, C
  surface: RaceSurface;         // influences small extra trim for trail
};

const TAPER: Record<RacePriority, Record<number, number>> = {
  // multiplicative factor to apply to the “base” plan in that week
  A: { 3: 0.85, 2: 0.80, 1: 0.70, 0: 0.55 },
  B: { 2: 0.85, 1: 0.75, 0: 0.60 },
  C: { 1: 0.90, 0: 0.70 },
};

function taperFactor(wk: number | null, prio: RacePriority): number {
  if (wk == null || wk > 6) return 1.0;
  const table = TAPER[prio];
  const keys = Object.keys(table).map(Number).sort((a,b)=>b-a);
  for (const k of keys) if (wk <= k) return table[k as keyof typeof table];
  return 1.0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Compute target km for the week with:
 * - Base plan
 * - Fatigue scaling
 * - Taper by race priority + weeksToRace
 * - Trail trim
 * - Safety caps vs chronic
 */
export function computeTargetKm(inp: TaperInputs) {
  const { fatigueScore, chronicKm, thisWeekPlanKmBase, weeksToRace, priority, surface } = inp;

  // 1) fatigue scale (gentle)
  const fatigueScale =
    fatigueScore > 0.75 ? 0.80 :
    fatigueScore > 0.60 ? 0.90 :
    fatigueScore < 0.25 ? 1.10 :
    1.00;

  // 2) taper
  const taper = taperFactor(weeksToRace, priority);

  // 3) trail small trim
  const trailTrim = surface === "trail" ? 0.96 : 1.0;

  // 4) compose
  let km = Math.round(thisWeekPlanKmBase * fatigueScale * taper * trailTrim);

  // 5) safety caps vs chronic (except very sick; you can widen if needed)
  // default limits: 45%..125% of chronic
  if (chronicKm > 0) {
    const minCap = Math.round(chronicKm * 0.45);
    const maxCap = Math.round(chronicKm * 1.25);
    km = clamp(km, Math.max(20, minCap), Math.max(minCap + 10, maxCap));
  }

  return km;
}

/**
 * Distributes the week into sessions with intensity rules:
 * - Keep a short quality “touch” in week -1 (strides / short race-pace)
 * - Long run cap scales with weeksToRace
 * - If fatigue high, quality becomes moderate or is removed
 */
export function buildWeekSkeleton(targetKm: number, fatigueScore: number, weeksToRace: number | null): { longKm: number; midKm: number; ezKm: number; keepQuality: boolean } {
  // Long-run cap by taper week
  const longCap =
    weeksToRace == null ? 1.00 :
    weeksToRace <= 0 ? 0.40 :
    weeksToRace === 1 ? 0.60 :
    weeksToRace === 2 ? 0.75 :
    weeksToRace === 3 ? 0.85 :
    1.00;

  const keepQuality = fatigueScore <= 0.70 && (weeksToRace == null || weeksToRace > 0);

  // baseline splits
  const long0 = Math.round(targetKm * 0.28);
  const longKm = Math.max(10, Math.round(long0 * longCap));

  const midKm = Math.max(6, Math.round(targetKm * (keepQuality ? 0.16 : 0.14)));
  const ezTotal = Math.max(0, targetKm - longKm - midKm);

  // ez distributed across 4–5 easy days
  const ezDays = 4;
  const ezKm = Math.max(4, Math.round(ezTotal / ezDays));

  return { longKm, midKm, ezKm, keepQuality };
}

export function makeEmptyWeek(dateISOOfIndex: (i:number)=>string): PlanWeek {
  return Array.from({ length: 7 }, (_, i) => ({ dateISO: dateISOOfIndex(i), sessions: [] }));
}

/**
 * Final plan assembly (Su..Sa)
 */
export function buildPlanWeek(dateISOOfIndex: (i:number)=>string, targetKm: number, fatigueScore: number, weeksToRace: number | null): PlanWeek {
  const base = makeEmptyWeek(dateISOOfIndex);
  const sk = buildWeekSkeleton(targetKm, fatigueScore, weeksToRace);

  // Su
  base[0].sessions.push({ title: "Easy", km: sk.ezKm, notes: "Z2. Strides optional." });

  // Mo
  if (fatigueScore > 0.7) {
    base[1].sessions.push({ title: "Rest / Mobility", notes: "Light walk + mobility 15–20’" });
  } else {
    base[1].sessions.push({ title: "Easy", km: sk.ezKm, notes: "Z2. Optional strides." });
  }

  // Tu (Quality / Easy)
  if (sk.keepQuality) {
    base[2].sessions.push({
      title: "Quality",
      km: sk.midKm,
      notes: weeksToRace === 1
        ? "Short race-pace touches: 5–6 × 30–60″ with full recovery. WU/CD."
        : "Controlled tempo or short hill reps. RPE ≤ 7/10. WU/CD.",
    });
  } else {
    base[2].sessions.push({ title: "Easy", km: sk.ezKm, notes: "Z2 only." });
  }

  // We
  base[3].sessions.push({ title: "Easy", km: sk.ezKm, notes: "Z2. Cadence & form focus." });

  // Th (Moderate or Easy)
  base[4].sessions.push({
    title: sk.keepQuality ? "Moderate" : "Easy",
    km: sk.keepQuality ? sk.midKm : sk.ezKm,
    notes: sk.keepQuality ? "Progression to steady. Don’t force." : "Keep easy.",
  });

  // Fr (Rest/Shake)
  base[5].sessions.push({
    title: fatigueScore > 0.7 ? "Rest" : "Shake-out",
    km: fatigueScore > 0.7 ? undefined : 4,
    notes: fatigueScore > 0.7 ? "Extra recovery day." : "Very easy with 4 × 20″ strides.",
  });

  // Sa (Long)
  base[6].sessions.push({
    title: "Long Run",
    km: sk.longKm,
    notes:
      weeksToRace != null && weeksToRace <= 3
        ? weeksToRace <= 1
          ? "Shortened taper long-run. Relaxed. Fuel as on race day."
          : "Taper long-run. Keep it easy. Rehearse fueling."
        : "Time-on-feet. Add climbs if trail specific.",
  });

  return base;
}
