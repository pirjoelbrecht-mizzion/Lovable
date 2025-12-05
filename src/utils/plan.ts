// src/utils/plan.ts
import { load, save } from "@/utils/storage";

// Keep local copies so this file is standalone
export type Session = {
  title: string;
  km?: number;
  notes?: string;
  durationMin?: number;
  elevationGain?: number;
  type?: string;
  distanceKm?: number;
  zones?: any[];
  source?: "coach" | "user";
};
export type PlanDay = { dateISO: string; sessions: Session[] };
export type PlanWeek = PlanDay[];

// Sunday = 0
function isoOfOffset(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset);
  return start.toISOString().slice(0, 10);
}

export function makeEmptyWeek(): PlanWeek {
  return Array.from({ length: 7 }, (_, i) => ({ dateISO: isoOfOffset(i), sessions: [] }));
}

function isSession(x: any): x is Session {
  return x && typeof x === "object" && typeof x.title === "string";
}
function isPlanDay(x: any): x is PlanDay {
  return x && typeof x === "object" && typeof x.dateISO === "string" && Array.isArray(x.sessions);
}

export function normalizeWeek(maybe: any): PlanWeek {
  if (!Array.isArray(maybe) || maybe.length !== 7) return makeEmptyWeek();
  const week = maybe.map((d, i) => {
    if (!isPlanDay(d)) return { dateISO: isoOfOffset(i), sessions: [] };
    const sessions = Array.isArray(d.sessions)
      ? d.sessions
          .filter(isSession)
          .map((s) => ({
            title: String(s.title),
            km:
              s.km == null
                ? undefined
                : typeof s.km === "number"
                ? s.km
                : Number(s.km) || undefined,
            notes: s.notes == null ? undefined : String(s.notes),
          }))
      : [];
    const dateISO =
      typeof d.dateISO === "string" && d.dateISO.length >= 10
        ? d.dateISO.slice(0, 10)
        : isoOfOffset(i);
    return { dateISO, sessions };
  });
  return week.length === 7 ? week : makeEmptyWeek();
}

export function loadWeek(): PlanWeek {
  return normalizeWeek(load<any>("planner:week", makeEmptyWeek()));
}
export function saveWeek(week: PlanWeek) {
  save("planner:week", week);
  // let anyone interested know
  try {
    window.dispatchEvent(new CustomEvent("planner:updated"));
  } catch {}
}

/** Insert a session into dayIndex (0..6), returns the updated week */
export function insertSession(dayIndex: number, s: Session): PlanWeek {
  const wk = loadWeek().map((d) => ({ ...d, sessions: d.sessions.slice() }));
  if (!wk[dayIndex]) return wk;
  wk[dayIndex].sessions.push(s);
  saveWeek(wk);
  return wk;
}

/** Insert multiple sessions into one day */
export function insertMany(dayIndex: number, arr: Session[]): PlanWeek {
  const wk = loadWeek().map((d) => ({ ...d, sessions: d.sessions.slice() }));
  if (!wk[dayIndex]) return wk;
  wk[dayIndex].sessions.push(...arr);
  saveWeek(wk);
  return wk;
}

/** Convenience – human weekday labels for current week (Sun..Sat) */
export function weekLabels(): string[] {
  const start = new Date(isoOfOffset(0));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  });
}
