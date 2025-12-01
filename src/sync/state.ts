// src/sync/state.ts
import { supabase, hasSupabase } from "@/lib/supabase";

// shape we persist for one-user app state (extend as needed)
export type AppState = {
  streak: number;
  health: "ok" | "sick" | "returning";
  raceWeeks: number;
  weights: any;
  recentActivities: any[];
};

// --- localStorage helpers you already use ---
export function load<T>(k: string, def: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : def; } catch { return def; }
}
export function save<T>(k: string, v: T) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

// merge strategy: server wins by default, but keep local if server empty
export function mergeState(server: Partial<AppState> | null, local: AppState): AppState {
  if (!server || Object.keys(server).length === 0) return local;
  return {
    streak: server.streak ?? local.streak,
    health: (server.health as any) ?? local.health,
    raceWeeks: server.raceWeeks ?? local.raceWeeks,
    weights: server.weights ?? local.weights,
    recentActivities: Array.isArray(server.recentActivities) ? server.recentActivities : local.recentActivities,
  };
}

// Pull from Supabase -> localStorage
export async function pullUserState(userId: string): Promise<AppState | null> {
  if (!hasSupabase) return null;
  const { data, error } = await supabase.from("user_state").select("data").eq("user_id", userId).maybeSingle();
  if (error) return null;
  const server = (data?.data ?? {}) as Partial<AppState>;

  const local: AppState = {
    streak: load("streak", 0),
    health: load("health", "ok"),
    raceWeeks: load("raceWeeks", 8),
    weights: load("weights", {}),
    recentActivities: load("recentActivities", []),
  };
  const merged = mergeState(server, local);
  // write merged back locally
  save("streak", merged.streak);
  save("health", merged.health);
  save("raceWeeks", merged.raceWeeks);
  save("weights", merged.weights);
  save("recentActivities", merged.recentActivities);
  return merged;
}

// Push localStorage -> Supabase
export async function pushUserState(userId: string) {
  if (!hasSupabase) return;
  const body = {
    user_id: userId,
    data: {
      streak: load("streak", 0),
      health: load("health", "ok"),
      raceWeeks: load("raceWeeks", 8),
      weights: load("weights", {}),
      recentActivities: load("recentActivities", []),
    },
  };
  await supabase.from("user_state").upsert(body, { onConflict: "user_id" });
}

// Connections (placeholders)
export async function upsertConnection(userId: string, provider: "strava"|"garmin"|"apple", status: string, meta: any = {}) {
  if (!hasSupabase) return;
  await supabase.from("connections").upsert({ user_id: userId, provider, status, meta }, { onConflict: "user_id,provider" });
}
