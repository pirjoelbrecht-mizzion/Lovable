// src/utils/backup.ts
export type BackupShape = {
  version: string;
  exportedAt: string;
  data: Record<string, unknown>;
};

// Centralize the localStorage keys we use in the app
export const APP_KEYS = [
  "units",
  "lang",
  "streak",
  "health",
  "raceWeeks",
  "weights",
  "recentActivities",
  "weekPlan",
  "logEntries",
] as const;

export function dumpAll(): BackupShape {
  const data: Record<string, unknown> = {};
  for (const k of APP_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      data[k] = raw ? JSON.parse(raw) : null;
    } catch {
      data[k] = null;
    }
  }
  return {
    version: "mizzion-starter-1",
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function restoreAll(json: unknown): { ok: boolean; message: string } {
  try {
    const parsed = json as BackupShape;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
      return { ok: false, message: "Invalid backup format." };
    }
    const data = (parsed as BackupShape).data || {};
    let count = 0;
    for (const k of APP_KEYS) {
      const v = (data as any)[k];
      if (v !== undefined) {
        localStorage.setItem(k, JSON.stringify(v));
        count++;
      }
    }
    return { ok: true, message: `Restored ${count} keys. Reload the page.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Could not restore backup." };
  }
}
