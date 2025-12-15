// src/hooks/useDailyPlan.ts
import { useEffect, useState } from "react";
import { save, load } from "@/utils/storage";
import { generateDailyPlan, type DailyPlan } from "@/lib/adapt";
import { calculateReadinessScore } from "@/utils/readiness";
import type { WeeklyPlan } from "@/lib/adaptive-coach/types";

function getDayOfWeekIndex(): number {
  // Sunday = 0, Monday = 1, etc.
  return new Date().getDay();
}

function getTodayWorkoutFromAdaptivePlan(): DailyPlan | null {
  const weeklyPlan = load<WeeklyPlan>("adaptive:weeklyPlan", null);
  const planDate = load<string>("adaptive:weeklyPlanDate", "");

  if (!weeklyPlan || !planDate) return null;

  // Check if plan is stale (older than 7 days)
  const planTime = new Date(planDate).getTime();
  const now = Date.now();
  const daysSincePlan = (now - planTime) / (1000 * 60 * 60 * 24);
  if (daysSincePlan > 7) return null;

  // Get today's workout
  const todayIndex = getDayOfWeekIndex();
  const todayWorkout = weeklyPlan.days[todayIndex];

  if (!todayWorkout || !todayWorkout.workout) return null;

  // Convert workout to DailyPlan format
  const workout = todayWorkout.workout;

  if (workout.type === 'rest') {
    return {
      message: "Complete rest",
      emoji: "💤",
      recKm: 0,
      note: workout.description || "Recovery day"
    };
  }

  const emojiMap: Record<string, string> = {
    'easy': '🌤️',
    'long': '🏃',
    'tempo': '🔥',
    'hill_repeats': '⛰️',
    'intervals': '⚡',
    'recovery': '💤'
  };

  return {
    message: workout.title || workout.type,
    emoji: emojiMap[workout.type] || '🏃',
    recKm: workout.distanceKm || 0,
    note: workout.description || workout.purpose
  };
}

export function useDailyPlan() {
  const [plan, setPlan] = useState<DailyPlan | null>(load("dailyPlan", null));

  useEffect(() => {
    async function refreshPlan() {
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = load("dailyPlanDate", "");

      // First, try to get today's workout from adaptive plan
      const adaptiveWorkout = getTodayWorkoutFromAdaptivePlan();
      if (adaptiveWorkout) {
        setPlan(adaptiveWorkout);
        save("dailyPlan", adaptiveWorkout);
        save("dailyPlanDate", today);
        return;
      }

      // Fall back to automatic daily plan generation
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
