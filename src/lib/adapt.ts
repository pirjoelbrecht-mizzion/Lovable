// src/lib/adapt.ts
import { reasonWeekly, type Activity, DEFAULT_WEIGHTS } from "@/ai/brain";
import { load } from "@/utils/storage";
import type { ReadinessScore } from "@/utils/readiness";

export type DailyPlan = {
  message: string;
  emoji: string;
  recKm: number;
  note?: string;
};

export function generateDailyPlan(readinessScore?: ReadinessScore): DailyPlan {
  const recent = load<Activity[]>("recentActivities", []);
  const weights = load("weights", DEFAULT_WEIGHTS);
  const health = load("health", "ok");
  const raceWeeks = load("raceWeeks", 8);

  const ai = reasonWeekly({
    recentActivities: recent,
    health,
    weights,
    raceProximityWeeks: raceWeeks,
    last4WeeksKm: [40, 46, 52, 48],
    thisWeekPlannedKm: 50,
  });

  if (readinessScore) {
    if (readinessScore.category === 'low') {
      const sleepLow = readinessScore.components.sleep < 0.7;
      const hrvLow = readinessScore.components.hrv < 0.85;

      let note = "Low readiness detected.";
      if (sleepLow) note += " Prioritize sleep tonight.";
      if (hrvLow) note += " HRV suggests autonomic stress.";

      return {
        message: "Recovery day — rest or gentle movement only.",
        emoji: "💤",
        recKm: 0,
        note,
      };
    }

    if (readinessScore.category === 'moderate' && ai.fatigueScore > 0.6) {
      return {
        message: "Easy aerobic run — keep it conversational.",
        emoji: "🌤️",
        recKm: 6,
        note: "Moderate readiness. Focus on form, not pace.",
      };
    }

    if (readinessScore.category === 'high' && ai.fatigueScore < 0.4) {
      return {
        message: "Perfect day for quality work! Hills or tempo.",
        emoji: "🔥",
        recKm: 12,
        note: "High readiness detected. Seize this training window.",
      };
    }
  }

  if (ai.fatigueScore > 0.7)
    return {
      message: "Rest or short Z2 jog today — recovery first.",
      emoji: "💤",
      recKm: 4,
      note: "Elevated fatigue detected — hydrate, nap, and stretch lightly.",
    };
  if (ai.fatigueScore < 0.3)
    return {
      message: "Go for a focused workout! Try hills or strides.",
      emoji: "🔥",
      recKm: 10,
      note: "Readiness looks strong — controlled effort.",
    };
  return {
    message: "Keep it steady with an easy aerobic run.",
    emoji: "🌤️",
    recKm: 7,
  };
}
