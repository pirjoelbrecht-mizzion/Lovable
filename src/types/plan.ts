// src/types/plan.ts
export type Focus =
  | "Rest"
  | "Easy"
  | "Tempo"
  | "Intervals"
  | "Hills"
  | "Long"
  | "Race";

export type PlanDay = {
  day: string;     // "Mon", "Tue", ...
  km: number;      // planned kilometers
  focus: Focus;    // type of session
};

export type Plan = {
  startISO: string; // week start date (optional helper)
  days: PlanDay[];  // 7 entries
};

// Helper: sum planned kilometers in a week
export function computeWeeklyKm(plan: Plan) {
  return plan.days.reduce((sum, d) => sum + (Number.isFinite(d.km) ? d.km : 0), 0);
}

// A sensible default to get going
export const DEFAULT_PLAN: Plan = {
  startISO: new Date().toISOString().slice(0, 10),
  days: [
    { day: "Mon", km: 6,  focus: "Easy" },
    { day: "Tue", km: 8,  focus: "Intervals" },
    { day: "Wed", km: 6,  focus: "Easy" },
    { day: "Thu", km: 8,  focus: "Tempo" },
    { day: "Fri", km: 0,  focus: "Rest" },
    { day: "Sat", km: 14, focus: "Long" },
    { day: "Sun", km: 6,  focus: "Easy" },
  ],
};
