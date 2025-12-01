// src/components/RaceFeedbackModal.tsx
import { useEffect, useState } from "react";
import { recordRaceFeedback, type RaceFeedback, type RacePriority, type RaceGoal, type RaceSurface } from "@/ai/experience";
import { toast } from "@/components/ToastHost";

export default function RaceFeedbackModal({
  open,
  defaultRace,
  onClose,
}: {
  open: boolean;
  defaultRace: { id: string; name: string; dateISO: string; distanceKm?: number; elevationM?: number; surface?: RaceSurface; priority?: RacePriority };
  onClose: () => void;
}) {
  const [priority, setPriority] = useState<RacePriority>(defaultRace.priority || "A");
  const [goal, setGoal] = useState<RaceGoal>("finish");
  const [achieved, setAchieved] = useState<boolean>(true);
  const [rpe, setRpe] = useState<number>(7);
  const [conditions, setConditions] = useState<RaceFeedback["conditions"]>([]);
  const [issues, setIssues] = useState<RaceFeedback["issues"]>([]);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setPriority(defaultRace.priority || "A");
      setGoal("finish");
      setAchieved(true);
      setRpe(7);
      setConditions([]);
      setIssues([]);
      setNotes("");
    }
  }, [open, defaultRace.priority]);

  if (!open) return null;

  function toggle<T extends string>(arr: T[] | undefined, val: T): T[] {
    const a = arr ? [...arr] : [];
    const i = a.indexOf(val);
    if (i >= 0) a.splice(i, 1);
    else a.push(val);
    return a;
  }

  function save() {
    const fb: RaceFeedback = {
      id: defaultRace.id,
      name: defaultRace.name,
      dateISO: defaultRace.dateISO,
      distanceKm: defaultRace.distanceKm,
      elevationM: defaultRace.elevationM,
      surface: defaultRace.surface,
      priority,
      goal,
      achieved,
      rpe,
      conditions,
      issues,
      notes: notes.trim() || undefined,
    };
    recordRaceFeedback(fb);
    toast("Race feedback saved. Coach updated.", "success");
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: "grid", placeItems: "center", zIndex: 80,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 560, maxWidth: "92%", background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="h2">Race Feedback</h2>
        <div className="small" style={{ color: "var(--muted)" }}>
          {defaultRace.name} — {defaultRace.dateISO}
        </div>

        <div className="grid" style={{ gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label className="small" style={{ marginTop: 8 }}>Priority</label>
            <select value={priority} onChange={(e)=>setPriority(e.target.value as RacePriority)}>
              <option value="A">A (primary)</option>
              <option value="B">B (secondary)</option>
              <option value="C">C (training)</option>
            </select>
          </div>

          <div>
            <label className="small" style={{ marginTop: 8 }}>Goal</label>
            <select value={goal} onChange={(e)=>setGoal(e.target.value as RaceGoal)}>
              <option value="finish">Finish</option>
              <option value="pb">Personal best</option>
              <option value="podium">Podium/placing</option>
            </select>
          </div>

          <div>
            <label className="small" style={{ marginTop: 8 }}>Achieved goal?</label>
            <select value={achieved ? "yes":"no"} onChange={(e)=>setAchieved(e.target.value==="yes")}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="small" style={{ marginTop: 8 }}>RPE (1–10)</label>
            <input type="number" min={1} max={10} value={rpe} onChange={(e)=>setRpe(Number(e.target.value)||7)} />
          </div>
        </div>

        <div className="grid" style={{ gap: 10, marginTop: 8 }}>
          <div>
            <label className="small">Conditions</label>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {["heat","humidity","cold","wind","hills","altitude"].map((c)=>(
                <button key={c} className={`btn ${conditions?.includes(c as any) ? "primary":""}`}
                        onClick={()=>setConditions(prev=>toggle(prev as any, c as any))}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="small">Issues</label>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {["fueling","hydration","gi","cramps","pacing","blisters","sleep"].map((c)=>(
                <button key={c} className={`btn ${issues?.includes(c as any) ? "primary":""}`}
                        onClick={()=>setIssues(prev=>toggle(prev as any, c as any))}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="small" style={{ marginTop: 8 }}>Notes</label>
        <textarea rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)}
                  placeholder="What went well? What to change next time?" />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save feedback</button>
        </div>
      </div>
    </div>
  );
}
