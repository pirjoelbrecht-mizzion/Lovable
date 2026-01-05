// src/utils/inbox.ts
import { load, save } from "@/utils/storage";

export type InboxSession = { title: string; km?: number; notes?: string };

const KEY = "inbox:suggestions";

export function getSuggestions(): InboxSession[] {
  return load<InboxSession[]>(KEY, []);
}
export function addSuggestion(s: InboxSession | InboxSession[]) {
  const cur = getSuggestions();
  const arr = Array.isArray(s) ? s : [s];
  save(KEY, [...cur, ...arr]);
  try { window.dispatchEvent(new CustomEvent("inbox:updated")); } catch {}
}
export function popSuggestion(): InboxSession | null {
  const cur = getSuggestions();
  const s = cur.shift() ?? null;
  save(KEY, cur);
  try { window.dispatchEvent(new CustomEvent("inbox:updated")); } catch {}
  return s;
}
export function clearSuggestions() {
  save(KEY, []);
  try { window.dispatchEvent(new CustomEvent("inbox:updated")); } catch {}
}
