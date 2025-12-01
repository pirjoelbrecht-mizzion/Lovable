// src/hooks/useDailyPlan.ts
import { useEffect, useState } from "react";
import { save, load } from "@/utils/storage";
import { generateDailyPlan, type DailyPlan } from "@/lib/adapt";
import { calculateReadinessScore } from "@/utils/readiness";

export function useDailyPlan() {
  const [plan, setPlan] = useState<DailyPlan | null>(load("dailyPlan", null));

  useEffect(() => {
    async function refreshPlan() {
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = load("dailyPlanDate", "");
      if (today !== lastDate) {
        try {
          const readinessScore = await calculateReadinessScore(today);
          const newPlan = generateDailyPlan(readinessScore);
          save("dailyPlan", newPlan);
          save("dailyPlanDate", today);
          setPlan(newPlan);
        } catch (error) {
          console.error('Failed to calculate readiness for daily plan:', error);
          const newPlan = generateDailyPlan();
          save("dailyPlan", newPlan);
          save("dailyPlanDate", today);
          setPlan(newPlan);
        }
      } else {
        setPlan(load("dailyPlan", null));
      }
    }

    refreshPlan();
  }, []);

  return plan;
}
