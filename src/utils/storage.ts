// src/utils/storage.ts
// ---------- core helpers ----------
export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// kept for older code paths that called `clear(key?)`
export function clear(key?: string) {
  if (key) remove(key);
  else clearAll();
}

export function clearAll() {
  try {
    localStorage.clear();
  } catch {}
}

// ---------- backup / restore ----------
export const STATE_KEYS = [
  // Home / AI
  "streak",
  "health",
  "raceWeeks",
  "weights",
  "recentActivities",
  "dailyPlan",
  "dailyPlanDate",
  // Insights
  "insights:acwr",
  "insights:weeklyKm",
  // Planner
  "planner:week",
  "planner:lastSuggested",
  // Connections & settings
  "connections",
  "units",
  "lang",
  // Gamification
  "coins",
  // Races
  "races",           // if you store your race list here
  "raceExperience",  // <-- added: now included in backup/restore
] as const;

type KeyUnion = (typeof STATE_KEYS)[number];

type BackupBlob = Partial<Record<KeyUnion, unknown>> & {
  _meta?: { app: "mizzion"; version: string; exportedAt: string };
};

export function exportAll(): BackupBlob {
  const out: BackupBlob = {};
  for (const key of STATE_KEYS) {
    const val = load<any>(key, undefined as any);
    if (val !== undefined) (out as any)[key] = val;
  }
  out._meta = {
    app: "mizzion",
    version: "1",
    exportedAt: new Date().toISOString(),
  };
  return out;
}

export function importAll(blob: unknown): { ok: boolean; applied: number; msg?: string } {
  if (!blob || typeof blob !== "object") {
    return { ok: false, applied: 0, msg: "Invalid file format" };
  }
  const data = blob as Record<string, unknown>;
  let applied = 0;
  for (const key of STATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      save(key, (data as any)[key]);
      applied++;
    }
  }
  return { ok: true, applied };
}

// small helper to trigger a file download
export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- tiny counters ----------
export function increment(key: string, by = 1) {
  const cur = load<number>(key, 0);
  const next = cur + by;
  save(key, next);
  return next;
}