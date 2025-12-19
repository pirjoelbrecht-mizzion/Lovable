// src/utils/weekPlan.ts
export type WeekItem = {
  day: string;         // Mon, Tue...
  title?: string;      // e.g., "Easy run"
  km?: number;         // distance
  notes?: string;
  type?: "easy" | "workout" | "long" | "rest";
};

export function loadWeekPlan(): WeekItem[] {
  // A sensible default plan – tweak anytime
  return [
    { day: "Mon", title: "Rest / Mobility", km: 0, type: "rest", notes: "Light mobility or walk" },
    { day: "Tue", title: "Easy run", km: 8, type: "easy", notes: "Z2, relaxed" },
    { day: "Wed", title: "Strength Training", km: 0, notes: "ME session - terrain-based strength work" },
    { day: "Thu", title: "Easy run", km: 8, type: "easy", notes: "Keep it conversational" },
    { day: "Fri", title: "Workout", km: 10, type: "workout", notes: "4×5' tempo, 2' easy" },
    { day: "Sat", title: "Long run", km: 16, type: "long", notes: "Steady Z2, fuel practice" },
    { day: "Sun", title: "Easy shakeout", km: 6, type: "easy", notes: "Soft surface if possible" },
  ];
}
