// src/lib/scheduler.ts
import { load, save } from "@/utils/storage";
import { reasonWeekly, DEFAULT_WEIGHTS } from "@/ai/brain";
import { toast } from "@/components/ToastHost";

/**
 * Called once per app open or device sync (simulate “daily check-in”)
 */
export function runDailyAdaptation() {
  const lastRun = load<string>("ai:lastRun", "");
  const today = new Date().toISOString().slice(0, 10);
  if (lastRun === today) return; // already ran today

  const recent = load("recentActivities", []);
  const health = load("health", "ok");
  const weights = load("weights", DEFAULT_WEIGHTS);
  const raceWeeks = load("raceWeeks", 8);

  const ai = reasonWeekly({
    recentActivities: recent,
    health,
    weights,
    raceProximityWeeks: raceWeeks,
    last4WeeksKm: [40, 46, 52, 48],
    thisWeekPlannedKm: 50,
  });

  save("weights", ai.updatedWeights);
  save("ai:lastRun", today);

  if (ai.adjustments.volumeCutPct)
    toast("📉 Reduced plan volume for recovery", "info");
  if (ai.adjustments.volumeBoostPct)
    toast("📈 Added quality work this week", "success");
}
Then in src/App.tsx, call it once when the app mounts:
import { useEffect } from "react";
import { runDailyAdaptation } from "@/lib/scheduler";

export default function App() {
  useEffect(() => {
    runDailyAdaptation();
  }, []);
  ...
}
