// src/lib/sync.ts
import { load, save } from "@/utils/storage";
import type { Activity } from "@/ai/brain";

export type SyncResult = { added: number; skipped: number };

// Merge mock activities into recentActivities if newer/not present
export async function syncMockStrava(toast?: (m: string) => void): Promise<SyncResult> {
  try {
    // In Vite, files under /public are served from the root at runtime
    const res = await fetch("/mock/strava.json", { cache: "no-store" });
    if (!res.ok) return { added: 0, skipped: 0 };

    const incoming = (await res.json()) as Activity[];
    const current = load<Activity[]>("recentActivities", []);
    const existingDates = new Set(current.map((a) => a.dateISO));

    let added = 0;
    for (const a of incoming) {
      if (!existingDates.has(a.dateISO)) {
        current.push(a);
        added++;
      }
    }
    current.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    save("recentActivities", current);

    if (added && toast) toast(`✅ Synced ${added} new run${added > 1 ? "s" : ""} (mock Strava)`);
    return { added, skipped: incoming.length - added };
  } catch {
    return { added: 0, skipped: 0 };
  }
}
