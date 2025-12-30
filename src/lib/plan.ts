// src/lib/plan.ts
import { load, save } from "@/utils/storage";
import { loadWeek, saveWeek, normalizeWeek, makeEmptyWeek, type PlanWeek, type PlanDay, type Session as PlanSession } from "@/utils/plan";
import { logSessionCountWarning } from "@/lib/telemetry/trainingTelemetry";
import { MAX_SESSIONS_PER_DAY } from "@/types/training";

export type Session = PlanSession & {
  id?: string;
  source?: "coach" | "user";
};

export type Day = PlanDay & {
  label?: string;
  sessions: Session[];
};

export interface WeekPlanMetadata {
  planSource?: 'adaptive' | 'user' | 'imported' | 'default';
  planAppliedAt?: number;
}

export type WeekPlan = (Day & WeekPlanMetadata)[];

const KEY = "planner:week";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function canOverwritePlan(currentPlan: WeekPlan | null, incomingPlan: WeekPlan): boolean {
  if (!currentPlan || currentPlan.length === 0) {
    return true;
  }

  const currentSource = currentPlan[0]?.planSource;
  const incomingSource = incomingPlan[0]?.planSource;
  const currentTime = currentPlan[0]?.planAppliedAt || 0;
  const incomingTime = incomingPlan[0]?.planAppliedAt || 0;

  if (currentSource === 'adaptive' && incomingSource !== 'adaptive') {
    console.debug('[WeekPlan Guard] Blocking overwrite: adaptive plan cannot be overwritten by non-adaptive', {
      currentSource,
      incomingSource,
    });
    return false;
  }

  if (currentSource === 'adaptive' && incomingSource === 'adaptive' && incomingTime <= currentTime) {
    console.debug('[WeekPlan Guard] Blocking overwrite: newer adaptive plan required', {
      currentTime,
      incomingTime,
    });
    return false;
  }

  return true;
}

function isoOfOffset(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset);
  return start.toISOString().slice(0, 10);
}

export function defaultWeek(): WeekPlan {
  return DOW.map((d, i) => ({
    label: d,
    dateISO: isoOfOffset(i),
    sessions: [],
    planSource: 'default' as const,
    planAppliedAt: Date.now(),
  }));
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
    planSource: d.planSource || 'hydrated' as const,
    planAppliedAt: d.planAppliedAt || 0,
  }));
}

export function setWeekPlan(plan: WeekPlan, options: { skipGuard?: boolean } = {}) {
  const currentPlan = getWeekPlan();

  // Normalize plan schema to ensure sessions are properly populated
  const normalizedPlan = normalizeAdaptivePlan(plan);

  if (!options.skipGuard && !canOverwritePlan(currentPlan, normalizedPlan)) {
    console.debug('[WeekPlan] Overwrite blocked by guard', {
      source: normalizedPlan[0]?.planSource,
      timestamp: normalizedPlan[0]?.planAppliedAt,
      hasRestDays: normalizedPlan.some(d => !d.sessions || d.sessions.length === 0),
    });
    return;
  }

  console.debug('[WeekPlan Apply]', {
    source: normalizedPlan[0]?.planSource || 'unknown',
    timestamp: normalizedPlan[0]?.planAppliedAt,
    dayCount: normalizedPlan.length,
    hasRestDays: normalizedPlan.some(d => !d.sessions || d.sessions.length === 0),
  });

  save(KEY, normalizedPlan);
  window.dispatchEvent(new CustomEvent("plan:updated"));
  window.dispatchEvent(new CustomEvent("planner:updated"));
}

export function saveWeekPlan(plan: WeekPlan, options: { skipGuard?: boolean } = {}) {
  const currentPlan = getWeekPlan();

  // Normalize plan schema to ensure sessions are properly populated
  const normalizedPlan = normalizeAdaptivePlan(plan);

  if (!options.skipGuard && !canOverwritePlan(currentPlan, normalizedPlan)) {
    console.debug('[WeekPlan] Overwrite blocked by guard', {
      source: normalizedPlan[0]?.planSource,
      timestamp: normalizedPlan[0]?.planAppliedAt,
      hasRestDays: normalizedPlan.some(d => !d.sessions || d.sessions.length === 0),
    });
    return;
  }

  console.debug('[WeekPlan Apply]', {
    source: normalizedPlan[0]?.planSource || 'unknown',
    timestamp: normalizedPlan[0]?.planAppliedAt,
    dayCount: normalizedPlan.length,
    hasRestDays: normalizedPlan.some(d => !d.sessions || d.sessions.length === 0),
  });

  save(KEY, normalizedPlan);
  window.dispatchEvent(new CustomEvent("plan:updated"));
  window.dispatchEvent(new CustomEvent("planner:updated"));
}

export function applyUserEditedPlan(plan: WeekPlan) {
  const planWithMetadata = plan.map((day, idx) => ({
    ...day,
    planSource: 'user' as const,
    planAppliedAt: Date.now(),
  }));

  console.debug('[WeekPlan User Edit] Applying plan with user source');
  saveWeekPlan(planWithMetadata);
}

export function applyFallbackPlan() {
  const fallback = defaultWeek();
  console.debug('[WeekPlan Fallback] Applying fallback plan');
  const currentPlan = getWeekPlan();

  if (currentPlan[0]?.planSource === 'adaptive') {
    console.debug('[WeekPlan Fallback] Blocked - adaptive plan already applied');
    return;
  }

  saveWeekPlan(fallback, { skipGuard: true });
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

// User sessions are NEVER deleted by adaptive logic.
// Only minimal load/timing adaptations are allowed. Please proceed to step 8
export function addUserSession(dayIndex: number, sessionData: Partial<Session>) {
  console.log('[STEP 7] Adding user session:', { dayIndex, sessionData });
  const plan = getWeekPlan();
  const idx = Math.max(0, Math.min(6, dayIndex));

  const newSession: Session = {
    id: "s_" + Math.random().toString(36).slice(2),
    title: sessionData.title || "New Session",
    notes: sessionData.notes || "",
    km: sessionData.km,
    source: "user",
    origin: "user",
    locked: false,
    ...sessionData,
  };

  console.log('[STEP 7] Created session with origin:', newSession.origin);
  plan[idx].sessions.push(newSession);

  const dayDate = new Date();
  dayDate.setDate(dayDate.getDate() - dayDate.getDay() + 1 + idx);
  const dateStr = dayDate.toISOString().split('T')[0];

  logSessionCountWarning(dateStr, plan[idx].sessions.length, MAX_SESSIONS_PER_DAY);

  setWeekPlan(plan);

  return newSession.id;
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

/**
 * Normalize adaptive plan to UI schema
 * CRITICAL: Ensures both sessions AND workouts fields are populated
 * Maps: day.sessions → day.workouts (for UI rendering)
 * The UI exclusively renders from day.workouts
 * This is the compatibility bridge between adaptive engine and UI layer
 */
export function normalizeAdaptivePlan(plan: WeekPlan): WeekPlan {
  if (!plan || !Array.isArray(plan)) {
    console.warn('[Normalize] Invalid plan passed, returning empty week');
    return defaultWeek();
  }

  const normalized = plan.map((day, idx) => {
    // Ensure sessions is always an array, even for rest days
    const sessions = Array.isArray(day.sessions) ? day.sessions : [];

    // CRITICAL: UI renders from workouts, not sessions
    // Populate workouts from sessions if not already set
    const workouts = (day as any).workouts ?? sessions;

    return {
      ...day,
      sessions,
      workouts,
      label: day.label || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx],
    } as any;
  });

  // Log normalization details for debugging
  console.log('[Normalize] Adaptive plan normalized:', {
    daysProcessed: normalized.length,
    restDays: normalized.filter(d => d.sessions.length === 0).length,
    trainingDays: normalized.filter(d => d.sessions.length > 0).length,
    totalSessions: normalized.reduce((sum, d) => sum + d.sessions.length, 0),
    totalWorkouts: normalized.reduce((sum, d) => sum + ((d as any).workouts?.length || 0), 0),
  });

  return normalized;
}
