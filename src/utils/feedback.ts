// src/utils/feedback.ts
import {
  saveRunFeedback,
  getRunFeedback,
  getAllRunFeedback as getAllRunFeedbackRaw,
  type RunFeedback,
  type PainSpot,
  type TerrainTag,
} from "@/ai/runFeedback";

/** Re-export main types & fns so the app can import from utils/feedback */
export type { RunFeedback, PainSpot, TerrainTag };
export { saveRunFeedback, getRunFeedback };

/** Sorted newest->oldest */
export function getAllRunFeedback(): RunFeedback[] {
  return getAllRunFeedbackRaw().slice().sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

/** Recent-window helpers (safe defaults) */
export function avgRecentRPE(days = 7): number | null {
  const since = Date.now() - days * 864e5;
  const rows = getAllRunFeedback().filter(r => new Date(r.dateISO).getTime() >= since && r.rpe != null);
  if (!rows.length) return null;
  return +(rows.reduce((a, r) => a + (r.rpe || 0), 0) / rows.length).toFixed(2);
}
export function avgRecentSoreness(days = 7): number | null {
  const since = Date.now() - days * 864e5;
  const rows = getAllRunFeedback().filter(r => new Date(r.dateISO).getTime() >= since && r.soreness != null);
  if (!rows.length) return null;
  return +(rows.reduce((a, r) => a + (r.soreness || 0), 0) / rows.length).toFixed(2);
}
