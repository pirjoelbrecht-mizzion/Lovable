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
B) Planner Inbox banner UI
src/components/PlannerInbox.tsx
// src/components/PlannerInbox.tsx
import { useEffect, useState } from "react";
import { getSuggestions, popSuggestion, clearSuggestions, type InboxSession } from "@/utils/inbox";
import { insertSession, weekLabels } from "@/utils/plan";
import { toast } from "@/components/ToastHost";

export default function PlannerInbox() {
  const [items, setItems] = useState<InboxSession[]>(getSuggestions());
  const labels = weekLabels();

  useEffect(() => {
    const onUpd = () => setItems(getSuggestions());
    window.addEventListener("inbox:updated", onUpd);
    return () => window.removeEventListener("inbox:updated", onUpd);
  }, []);

  if (items.length === 0) return null;
  const first = items[0];

  function insert(day: number) {
    insertSession(day, first);
    popSuggestion();
    toast("Added coach suggestion to plan.", "success");
  }

  return (
    <div className="card" style={{ border: "1px dashed var(--line)", background: "var(--card)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>Coach suggestion inbox</h3>
        <button className="btn" onClick={() => { clearSuggestions(); toast("Inbox cleared.", "success"); }}>
          Dismiss all
        </button>
      </div>
      <div className="small" style={{ marginTop: 6 }}>
        <b>Suggestion:</b> {first.title}{first.km ? ` — ${first.km} km` : ""}{first.notes ? ` • ${first.notes}` : ""}
      </div>
      <div className="grid cols-4" style={{ gap: 6, marginTop: 10 }}>
        {labels.map((lab, i) => (
          <button key={i} className="btn" onClick={() => insert(i)}>
            D{i + 1} — {lab}
          </button>
        ))}
      </div>
      {items.length > 1 && (
        <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
          {items.length - 1} more suggestion{items.length - 1 === 1 ? "" : "s"} in queue
        </div>
      )}
    </div>
  );
}
