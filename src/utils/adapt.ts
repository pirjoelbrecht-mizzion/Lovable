// src/utils/adapt.ts
import { load, save } from "@/utils/storage";

export type Session = { title: string; km?: number; notes?: string };
export type PlanDay = { dateISO: string; sessions: Session[] };
export type PlanWeek = PlanDay[];

/** Very defensive normalize -> always return a 7-day array with valid shapes */
function normalizeWeek(maybe: any): PlanWeek {
  const now = new Date();
  const start = new Date(now);
  // align to Sunday=0
  start.setDate(now.getDate() - now.getDay());

  const isoOfOffset = (off: number) => {
    const d = new Date(start);
    d.setDate(start.getDate() + off);
    return d.toISOString().slice(0, 10);
  };

  if (!Array.isArray(maybe) || maybe.length !== 7) {
    return Array.from({ length: 7 }, (_, i) => ({ dateISO: isoOfOffset(i), sessions: [] }));
  }
  const week = maybe.map((d: any, i: number): PlanDay => {
    const dateISO =
      d && typeof d.dateISO === "string" && d.dateISO.length >= 10
        ? d.dateISO.slice(0, 10)
        : isoOfOffset(i);
    const sessions = Array.isArray(d?.sessions)
      ? d.sessions
          .filter((s: any) => s && typeof s.title === "string")
          .map((s: any): Session => ({
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
    return { dateISO, sessions };
  });
  return week.length === 7 ? week : Array.from({ length: 7 }, (_, i) => ({ dateISO: isoOfOffset(i), sessions: [] }));
}

export type LogEntry = {
  dateISO: string; // "YYYY-MM-DD"
  title?: string;
  km?: number;
  durationMin?: number;
  hrAvg?: number;
  source?: string;
};

function sumKm(entries: LogEntry[], fromDate: Date, toDate: Date) {
  const from = fromDate.getTime();
  const to = toDate.getTime();
  return entries.reduce((acc, e) => {
    if (!e?.dateISO || typeof e.km !== "number") return acc;
    const t = new Date(e.dateISO).getTime();
    return t >= from && t <= to ? acc + Math.max(0, e.km) : acc;
  }, 0);
}

function isoToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Heuristic:
 * - Look at last 3 days logged KM. If heavy (>= 25km total), cut remaining week volume by 15%.
 * - Else if moderate (>= 15km), cut by 8%.
 * - We adjust **future** sessions only (today and later).
 * - We annotate notes with "auto-adjusted -X%".
 */
export function adaptAfterLog(entries: LogEntry[]): { changed: boolean; percent: number; affectedDays: number } {
  // window (last 3 days)
  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(today.getDate() - 2);
  const last3 = sumKm(entries, d1, today);

  let percent = 0;
  if (last3 >= 25) percent = 15;
  else if (last3 >= 15) percent = 8;

  if (percent === 0) return { changed: false, percent: 0, affectedDays: 0 };

  const raw = load<any>("planner:week", null);
  const week = normalizeWeek(raw);
  const todayISO = isoToday();

  let affected = 0;
  week.forEach((d) => {
    if (d.dateISO < todayISO) return; // past unchanged
    let touchedThisDay = false;
    d.sessions = d.sessions.map((s) => {
      if (typeof s.km !== "number" || s.km <= 0) return s;
      const newKm = Math.max(1, Math.round(s.km * (1 - percent / 100)));
      const noteMark = `auto-adjusted -${percent}%`;
      const notes = s.notes ? (s.notes.includes("auto-adjusted") ? s.notes : `${s.notes} • ${noteMark}`) : noteMark;
      touchedThisDay = true;
      return { ...s, km: newKm, notes };
    });
    if (touchedThisDay) affected++;
  });

  if (affected > 0) save("planner:week", week);
  return { changed: affected > 0, percent, affectedDays: affected };
}
