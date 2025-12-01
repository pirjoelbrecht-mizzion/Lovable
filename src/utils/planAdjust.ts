// src/utils/planAdjust.ts
import { reasonWeekly, DEFAULT_WEIGHTS, type Activity, type HealthState } from "@/ai/brain";

export type DayPlan = { day: string; type: string; title?: string; km?: number; note?: string };

export function autoAdjustWeek(
  week: DayPlan[],
  recent: Activity[],
  health: HealthState,
  raceWeeks: number,
  last4WeeksKm: number[] = [40, 46, 52, 48],
  thisWeekPlannedKm?: number
): { adjusted: DayPlan[]; summary: string } {
  const planned = thisWeekPlannedKm ?? Math.max(1, Math.round(week.reduce((a, d) => a + (d.km || 0), 0)));
  const ai = reasonWeekly({
    recentActivities: recent,
    health,
    weights: DEFAULT_WEIGHTS,
    raceProximityWeeks: raceWeeks,
    last4WeeksKm,
    thisWeekPlannedKm: planned,
  });

  let factor = 1;
  if ("volumeCutPct" in ai.adjustments) factor *= (1 - (ai.adjustments as any).volumeCutPct / 100);
  if ("volumeBoostPct" in ai.adjustments) factor *= (1 + (ai.adjustments as any).volumeBoostPct / 100);

  const adjusted = week.map((d) => {
    if (!d.km) return d;
    let km = Math.max(0, Math.round(d.km * factor));
    if (ai.fatigueScore > 0.7 && d.type === "quality") {
      return { ...d, type: "easy", title: "Easy swap", km, note: "Auto-reduced intensity" };
    }
    if (ai.fatigueScore < 0.3 && d.type === "easy" && km >= 6) {
      return { ...d, type: "quality", title: "Controlled tempo", km, note: "Auto-added specificity" };
    }
    return { ...d, km };
  });

  const summary =
    ai.fatigueScore > 0.7
      ? "High fatigue → reduced volume & eased quality."
      : ai.fatigueScore < 0.3
      ? "Good readiness → small specificity bump."
      : "Balanced → minor tweaks only.";

  return { adjusted, summary };
}
