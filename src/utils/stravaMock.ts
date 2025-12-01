import { save, load } from "@/utils/storage";

export type MockActivity = {
  id: string;
  dateISO: string;
  title: string;
  km: number;
  rpe?: number;
  sleepHours?: number;
  hrv?: number;          // simple proxy
  intensity?: "EZ" | "Z2" | "TH" | "VO2" | "HILLS";
  notes?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// generate the last N days with mixed runs/rests
export function buildMockStravaWeek(startOffsetDays = 0): MockActivity[] {
  const today = new Date();
  const days = 7;
  const out: MockActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i - startOffsetDays);

    // alternate rest and run patterns
    const rest = Math.random() < 0.25;
    if (rest) {
      // store a "rest" day by logging only recovery metrics (good for Insights)
      out.push({
        id: uid(),
        dateISO: d.toISOString(),
        title: "Rest / Mobility",
        km: 0,
        rpe: 3,
        sleepHours: 7 + Math.random(),
        hrv: 52 + Math.round(Math.random() * 8),
        intensity: "EZ",
        notes: "Recovery, mobility, and good sleep.",
      });
    } else {
      const km = [5, 7, 8, 10, 12][Math.floor(Math.random() * 5)];
      const intens = (["EZ", "Z2", "TH", "HILLS"] as const)[Math.floor(Math.random() * 4)];
      out.push({
        id: uid(),
        dateISO: d.toISOString(),
        title: intens === "TH" ? "Tempo run" : intens === "HILLS" ? "Hilly run" : "Easy run",
        km,
        rpe: intens === "TH" ? 7 : intens === "HILLS" ? 6 : 5,
        sleepHours: 6.5 + Math.random() * 1.5,
        hrv: 50 + Math.round(Math.random() * 10),
        intensity: intens,
        notes:
          intens === "TH"
            ? "2×10 min @ threshold"
            : intens === "HILLS"
            ? "Steady hills, strong form."
            : "Keep it comfortable, nasal breathing.",
      });
    }
  }
  return out;
}

/**
 * Writes mock activities to localStorage:
 * - Appends to Log (as completed)
 * - Updates "recentActivities" used by AI/Insights
 * Returns count imported.
 */
export function importStravaMock(): number {
  const week = buildMockStravaWeek();
  const existingLog = load<any[]>("logEntries", []);
  const mergedLog = [...week.map(a => ({
    id: a.id,
    dateISO: a.dateISO,
    title: a.title,
    km: a.km,
    intensity: a.intensity,
    notes: a.notes,
  })), ...existingLog];
  save("logEntries", mergedLog);

  // refresh recent activities (last 7 days)
  const recent = week.map(a => ({
    dateISO: a.dateISO,
    km: a.km,
    rpe: a.rpe,
    sleepHours: a.sleepHours,
    hrv: a.hrv,
  }));
  save("recentActivities", recent);

  return week.length;
}
