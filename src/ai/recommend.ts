import { reasonWeekly, DEFAULT_WEIGHTS, type Activity, type HealthState, type Weights } from "@/ai/brain";
import { getPersona, toneLine } from "@/ai/personality";

export type RecInput = {
  recent: Activity[];
  health: HealthState;
  weights?: Weights;
  raceWeeks: number;
  last4WeeksKm?: number[];
  plannedKm?: number;
};

export function getRecommendation(input: RecInput): string {
  const ai = reasonWeekly({
    recentActivities: input.recent,
    health: input.health,
    weights: input.weights ?? DEFAULT_WEIGHTS,
    raceProximityWeeks: input.raceWeeks,
    last4WeeksKm: input.last4WeeksKm ?? [40, 46, 52, 48],
    thisWeekPlannedKm: input.plannedKm ?? 50,
  });

  const persona = getPersona("home", { rpe: input.recent.at(-1)?.rpe });
  const base =
    ai.fatigueScore > 0.7
      ? `Fatigue looks elevated (${ai.fatigueScore.toFixed(2)}). Suggest ${"volumeCutPct" in ai.adjustments ? (ai.adjustments as any).volumeCutPct : 15}% volume cut and keep intensity easy.`
      : ai.fatigueScore < 0.3
      ? `Readiness is high (${ai.fatigueScore.toFixed(2)}). Consider a small ${"volumeBoostPct" in ai.adjustments ? (ai.adjustments as any).volumeBoostPct : 10}% volume boost or add strides.`
      : `Balanced signals (${ai.fatigueScore.toFixed(2)}). Hold steady and bias specificity as race nears.`;

  return toneLine(persona, base);
}
