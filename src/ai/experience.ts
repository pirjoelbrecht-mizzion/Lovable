// src/ai/experience.ts
import { load, save } from "@/utils/storage";

export type RacePriority = "A" | "B" | "C";
export type RaceGoal = "finish" | "pb" | "podium";
export type RaceSurface = "road" | "trail" | "track" | "mixed";

export type RaceFeedback = {
  id: string;
  name: string;
  dateISO: string;
  distanceKm?: number;
  elevationM?: number;
  surface?: RaceSurface;
  priority: RacePriority;
  goal: RaceGoal;
  achieved: boolean;
  rpe?: number;
  conditions?: ("heat"|"cold"|"wind"|"hills"|"altitude"|"humidity")[];
  issues?: ("gi"|"cramps"|"blisters"|"pacing"|"fueling"|"hydration"|"sleep")[];
  notes?: string;
};

export type RaceLesson = {
  key: string;
  weight: number;
  summary: string;
};

type ExperienceStateV1 = {
  history: RaceFeedback[];
  lessons: RaceLesson[];
  version: 1;
};
type ExperienceState = ExperienceStateV1;

const KEY = "raceExperience";

function getState(): ExperienceState {
  const s = load<Partial<ExperienceState>>(KEY, { history: [], lessons: [], version: 1 });
  return {
    history: Array.isArray(s.history) ? s.history as RaceFeedback[] : [],
    lessons: Array.isArray(s.lessons) ? s.lessons as RaceLesson[] : [],
    version: 1,
  };
}
function setState(s: ExperienceState) {
  save(KEY, s);
}

export function recordRaceFeedback(fb: RaceFeedback) {
  const s = getState();
  const k = `${fb.id}:${fb.dateISO}`;
  const idx = s.history.findIndex(h => `${h.id}:${h.dateISO}` === k);
  if (idx >= 0) s.history[idx] = fb;
  else s.history.push(fb);
  s.history.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  s.lessons = deriveLessons(s.history);
  setState(s);
}

function deriveLessons(hist: RaceFeedback[]): RaceLesson[] {
  const out: RaceLesson[] = [];
  const aMiss = hist.filter(h => h.priority === "A" && !h.achieved && (h.rpe ?? 0) >= 8);
  if (aMiss.length >= 1) {
    out.push({
      key: "taper_bias_up",
      weight: Math.min(0.25 + 0.05 * (aMiss.length - 1), 0.45),
      summary: "Consider a deeper taper for A-races (protect freshness 25–45%).",
    });
  }
  const fuelingIssues = hist.filter(h => (h.issues || []).some(x => x === "fueling" || x === "gi" || x === "hydration"));
  if (fuelingIssues.length >= 1) {
    out.push({
      key: "fueling_focus",
      weight: Math.min(0.2 + 0.05 * (fuelingIssues.length - 1), 0.4),
      summary: "Rehearse fueling & hydration (carb/hr, fluids, gut training).",
    });
  }
  const heatRaces = hist.filter(h => (h.conditions || []).some(x => x === "heat" || x === "humidity"));
  if (heatRaces.length >= 1) {
    out.push({
      key: "heat_acclimation",
      weight: Math.min(0.2 + 0.05 * (heatRaces.length - 1), 0.4),
      summary: "Plan heat acclimation (sauna/overdress) + hydration for warm races.",
    });
  }
  const hillyTrails = hist.filter(h => h.surface === "trail" || (h.elevationM ?? 0) >= 1000);
  if (hillyTrails.length >= 1) {
    out.push({
      key: "hills_specificity",
      weight: Math.min(0.2 + 0.05 * (hillyTrails.length - 1), 0.4),
      summary: "Increase hill work / vert specificity before hilly trail races.",
    });
  }
  const pacingCramps = hist.filter(h => (h.issues || []).some(x => x === "pacing" || x === "cramps"));
  if (pacingCramps.length >= 1) {
    out.push({
      key: "pacing_control",
      weight: Math.min(0.15 + 0.05 * (pacingCramps.length - 1), 0.35),
      summary: "Practice conservative starts; cadence/form checks to avoid cramps.",
    });
  }
  return out;
}

export function getLessons(): RaceLesson[] {
  return getState().lessons;
}

export function getRaceHistory(): RaceFeedback[] {
  return getState().history.slice();
}

export function getProfile() {
  const s = getState();
  const last = s.history[0];
  const counts = {
    total: s.history.length,
    aRaces: s.history.filter(h => h.priority === "A").length,
    heat: s.history.filter(h => (h.conditions || []).includes("heat") || (h.conditions || []).includes("humidity")).length,
    hilly: s.history.filter(h => h.surface === "trail" || (h.elevationM ?? 0) >= 1000).length,
    fuelingIssues: s.history.filter(h => (h.issues || []).some(x => x === "fueling" || x === "gi" || x === "hydration")).length,
  };
  return {
    lastRace: last ? { name: last.name, dateISO: last.dateISO, priority: last.priority, achieved: last.achieved } : null,
    lessons: s.lessons,
    counts,
  };
}

export function applyRaceLessonsToPlan(base: {
  taperCutPct?: number;
  qualitySessions?: number;
  heatPrep?: boolean;
  fuelingRehearsal?: boolean;
  hillsSpecificity?: boolean;
}) {
  const lessons = getLessons();
  const find = (k: string) => lessons.find(l => l.key === k)?.weight || 0;
  const out = { ...base };
  const taperUp = find("taper_bias_up");
  if (taperUp > 0) {
    const extra = Math.round(100 * taperUp) / 100;
    out.taperCutPct = clamp01((out.taperCutPct ?? 0.2) + extra * 0.2);
  }
  if (find("heat_acclimation") > 0) out.heatPrep = true;
  if (find("hills_specificity") > 0) out.hillsSpecificity = true;
  if (find("fueling_focus") > 0) out.fuelingRehearsal = true;
  return out;
}
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

export function summarizeLessons(): string[] {
  return getLessons().map(l => `• ${l.summary}`);
}

export function getTaperScale(args: {
  daysToRace: number;
  priority: RacePriority;
  distanceKm?: number;
  elevationM?: number;
  surface?: RaceSurface;
}): number {
  const d = Math.max(0, Math.floor(args.daysToRace));
  const span = 21;
  const x = clamp01(1 - d / span);
  const base = (() => {
    switch (args.priority) {
      case "A": return easeOut(x) * 0.5;
      case "B": return easeOut(x) * 0.35;
      case "C": return easeOut(x) * 0.2;
    }
  })();
  const ultraish = (args.distanceKm ?? 0) >= 50 || (args.elevationM ?? 0) >= 2000 || args.surface === "trail";
  const specificityBump = ultraish ? 0.05 : 0;
  const lessons = getLessons();
  const taperLesson = lessons.find(l => l.key === "taper_bias_up")?.weight ?? 0;
  const learnedBump = taperLesson > 0 ? Math.min(0.1, taperLesson * 0.15) : 0;
  const cut = clamp01(base + specificityBump + learnedBump);
  return Math.min(cut, 0.6);
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 1.6);
}