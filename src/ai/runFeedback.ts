// src/ai/runFeedback.ts
import { load, save } from "@/utils/storage";

/* ------------------------------------------------------------------ */
/* Lightweight local DB for per-run feedback                           */
/* ------------------------------------------------------------------ */
export type PainSpot = "knee" | "shin" | "hip" | "foot" | "back" | "achilles";
export type TerrainTag = "road" | "trail" | "hills" | "track" | "mixed";

export type RunFeedback = {
  dateISO: string;          // ties to a log entry (YYYY-MM-DD)
  title: string;            // "Run" etc.
  km?: number;
  beforeMood?: "amazing" | "good" | "okay" | "tough";
  afterMood?: "amazing" | "good" | "okay" | "tough";
  rpe: number;              // 1–10
  soreness: number;         // 0–10
  energy: number;           // 0–10
  pain?: PainSpot[];        // multi-select
  terrain?: TerrainTag[];   // multi-select
  notes?: string;
  savedAt: string;          // ISO timestamp
};

type DB = { version: 1; runs: RunFeedback[] };
const KEY = "runFeedbackDB";

function getDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, runs: [] };
    const parsed = JSON.parse(raw) as DB;
    if (!parsed || !Array.isArray(parsed.runs)) return { version: 1, runs: [] };
    return { version: 1, runs: parsed.runs };
  } catch {
    return { version: 1, runs: [] };
  }
}

function setDB(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
export function saveRunFeedback(fb: RunFeedback) {
  const db = getDB();
  const id = `${fb.dateISO}|${fb.title}|${fb.km ?? ""}`;
  const idx = db.runs.findIndex(
    r => `${r.dateISO}|${r.title}|${r.km ?? ""}` === id
  );
  const stamped = { ...fb, savedAt: new Date().toISOString() };
  if (idx >= 0) db.runs[idx] = stamped;
  else db.runs.push(stamped);
  setDB(db);
}

export function getRunFeedback(dateISO: string, title: string, km?: number): RunFeedback | undefined {
  const id = `${dateISO}|${title}|${km ?? ""}`;
  return getDB().runs.find(r => `${r.dateISO}|${r.title}|${r.km ?? ""}` === id);
}

export function getAllRunFeedback(): RunFeedback[] {
  return getDB().runs.slice().sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}