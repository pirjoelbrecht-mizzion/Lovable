// src/lib/plan.ts
import { load, save } from "@/utils/storage";
import { loadWeek, saveWeek, normalizeWeek, makeEmptyWeek, type PlanWeek, type PlanDay, type Session as PlanSession } from "@/utils/plan";

export type Session = PlanSession & {
  id?: string;
  source?: "coach" | "user";
};

export type Day = PlanDay & {
  label?: string;
  sessions: Session[];
};

export type WeekPlan = Day[];

const KEY = "planner:week";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoOfOffset(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset);
  return start.toISOString().slice(0, 10);
}

export function defaultWeek(): WeekPlan {
  return DOW.map((d, i) => ({ label: d, dateISO: isoOfOffset(i), sessions: [] }));
}

function migrateOldFormat() {
  try {
    const oldData = load<any>("weekPlan", null);
    if (oldData && Array.isArray(oldData) && oldData.length === 7) {
      const newFormat: WeekPlan = oldData.map((day: any, i: number) => ({
        label: DOW[i],
        dateISO: isoOfOffset(i),
        sessions: Array.isArray(day.sessions) ? day.sessions : [],
      }));
      save(KEY, newFormat);
      save("weekPlan", null);
      return newFormat;
    }
  } catch {}
  return null;
}

export function getWeekPlan(): WeekPlan {
  const migrated = migrateOldFormat();
  if (migrated) return migrated;

  const data = load<any>(KEY, null);
  if (!data || !Array.isArray(data) || data.length !== 7) {
    const empty = defaultWeek();
    save(KEY, empty);
    return empty;
  }

  return data.map((d: any, i: number) => ({
    label: DOW[i],
    dateISO: d.dateISO || isoOfOffset(i),
    sessions: Array.isArray(d.sessions) ? d.sessions : [],
  }));
}

export function setWeekPlan(plan: WeekPlan) {
  save(KEY, plan);
  window.dispatchEvent(new CustomEvent("plan:updated"));
  window.dispatchEvent(new CustomEvent("planner:updated"));
}

export function saveWeekPlan(plan: WeekPlan) {
  save(KEY, plan);
  window.dispatchEvent(new CustomEvent("plan:updated"));
  window.dispatchEvent(new CustomEvent("planner:updated"));
}

export function addCoachAdviceToDay(dayIndex: number, adviceText: string) {
  const plan = getWeekPlan();
  const idx = Math.max(0, Math.min(6, dayIndex));
  const title = summarizeToTitle(adviceText);
  const session: Session = {
    id: "s_" + Math.random().toString(36).slice(2),
    title,
    notes: adviceText.trim(),
    source: "coach",
  };
  plan[idx].sessions.push(session);
  setWeekPlan(plan);
}

export function removeSession(dayIndex: number, sessionId: string) {
  const plan = getWeekPlan();
  const idx = Math.max(0, Math.min(6, dayIndex));;
  plan[idx].sessions = plan[idx].sessions.filter((s) => s.id !== sessionId);
  setWeekPlan(plan);
}

// helpers

function summarizeToTitle(text: string): string {
  // take first sentence up to ~80 chars
  const clean = text.replace(/\s+/g, " ").trim();
  let first = clean.split(/[.!?]/)[0] || clean;
  if (first.length > 80) first = first.slice(0, 77) + "…";
  // try to normalize to workout-y title when possible
  if (/cut volume|reduce/i.test(first)) return "Easy day (coach)";
  if (/tempo|quality/i.test(first)) return "Controlled tempo (coach)";
  if (/hills?/i.test(first)) return "Short hills (coach)";
  if (/z2|zone 2/i.test(first)) return "Z2 aerobic run (coach)";
  return first || "Coach note";
}

export function todayDayIndex(): number {
  // Make Monday index 0
  const js = new Date().getDay(); // 0..6 (Sun..Sat)
  // convert: Sun(0)->6, Mon(1)->0 ... Sat(6)->5
  return js === 0 ? 6 : js - 1;
}
