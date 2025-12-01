// src/components/RunFeedbackModal.tsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ToastHost";
import {
  saveRunFeedback,
  getRunFeedback,
  type RunFeedback,
  type PainSpot,
  type TerrainTag,
} from "@/utils/feedback";

export default function RunFeedbackModal({
  open,
  onClose,
  seed,
}: {
  open: boolean;
  onClose: () => void;
  seed: { dateISO: string; title: string; km?: number };
}) {
  const preset = useMemo(
    () => (seed?.dateISO ? getRunFeedback(seed.dateISO, seed.title || "Run", seed.km) : undefined),
    [seed?.dateISO, seed?.title, seed?.km]
  );

  const [beforeMood, setBeforeMood] = useState<RunFeedback["beforeMood"]>(preset?.beforeMood);
  const [afterMood, setAfterMood] = useState<RunFeedback["afterMood"]>(preset?.afterMood);
  const [rpe, setRpe] = useState<number>(preset?.rpe ?? 6);
  const [soreness, setSoreness] = useState<number>(preset?.soreness ?? 0);
  const [energy, setEnergy] = useState<number>(preset?.energy ?? 6);
  const [pain, setPain] = useState<PainSpot[]>(preset?.pain ?? []);
  const [terrain, setTerrain] = useState<TerrainTag[]>(preset?.terrain ?? []);
  const [notes, setNotes] = useState<string>(preset?.notes ?? "");

  useEffect(() => {
    if (!open) return;
    setBeforeMood(preset?.beforeMood);
    setAfterMood(preset?.afterMood);
    setRpe(preset?.rpe ?? 6);
    setSoreness(preset?.soreness ?? 0);
    setEnergy(preset?.energy ?? 6);
    setPain(preset?.pain ?? []);
    setTerrain(preset?.terrain ?? []);
    setNotes(preset?.notes ?? "");
  }, [open, preset?.savedAt]);

  if (!open) return null;

  function toggle<T extends string>(arr: T[], v: T): T[] {
    const next = new Set(arr);
    next.has(v) ? next.delete(v) : next.add(v);
    return Array.from(next) as T[];
  }

  function save() {
    const payload: RunFeedback = {
      dateISO: seed.dateISO,
      title: seed.title || "Run",
      km: seed.km,
      beforeMood,
      afterMood,
      rpe: Math.max(1, Math.min(10, Math.round(rpe))),
      soreness: Math.max(0, Math.min(10, Math.round(soreness))),
      energy: Math.max(0, Math.min(10, Math.round(energy))),
      pain,
      terrain,
      notes: notes.trim() || undefined,
      savedAt: new Date().toISOString(),
    };
    saveRunFeedback(payload);
    toast("Thanks! Feedback saved.", "success");
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 120,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      <div
        className="card"
        style={{
          width: 560,
          maxWidth: "94%",
          maxHeight: "90vh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          background: "var(--card)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="h2">Quick Check-In</h2>
          <div className="small" style={{ color: "var(--muted)" }}>
            {seed.title || "Run"} • {seed.dateISO}{seed.km ? ` • ${seed.km} km` : ""}
          </div>
        </header>

        <div style={{ overflow: "auto", paddingRight: 2 }}>
          {/* Moods */}
          <div className="grid" style={{ gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <Field label="How did you feel before?">
              <Pills
                value={beforeMood}
                options={["amazing", "good", "okay", "tough"]}
                onChange={(v) => setBeforeMood(v as any)}
              />
            </Field>
            <Field label="How do you feel now?">
              <Pills
                value={afterMood}
                options={["amazing", "good", "okay", "tough"]}
                onChange={(v) => setAfterMood(v as any)}
              />
            </Field>
          </div>

          {/* Sliders */}
          <div className="grid" style={{ gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <Slider label="Session RPE (1–10)" min={1} max={10} value={rpe} setValue={setRpe} />
            <Slider label="Muscle soreness (0–10)" min={0} max={10} value={soreness} setValue={setSoreness} />
          </div>
          <Slider label="Energy today" min={0} max={10} value={energy} setValue={setEnergy} />

          {/* Multi-selects */}
          <Field label="Any pain spots?">
            <Multi
              options={[
                { key: "knee", label: "Knee" },
                { key: "shin", label: "Shin" },
                { key: "hip", label: "Hip" },
                { key: "foot", label: "Foot" },
                { key: "back", label: "Back" },
                { key: "achilles", label: "Achilles" },
              ]}
              value={pain}
              onToggle={(k) => setPain((p) => toggle(p, k as PainSpot))}
            />
          </Field>

          <Field label="Terrain tags">
            <Multi
              options={[
                { key: "road", label: "Road" },
                { key: "trail", label: "Trail" },
                { key: "hills", label: "Hills" },
                { key: "track", label: "Track" },
                { key: "mixed", label: "Mixed" },
              ]}
              value={terrain}
              onToggle={(k) => setTerrain((t) => toggle(t, k as TerrainTag))}
            />
          </Field>

          <label className="small" style={{ marginTop: 8 }}>What stood out? (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any thoughts on the run?"
          />
        </div>

        {/* Sticky footer */}
        <footer className="row" style={{ gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save feedback</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <label className="small">{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function Pills({
  value,
  options,
  onChange,
}: {
  value?: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o}
          className={`btn ${value === o ? "primary" : ""}`}
          onClick={() => onChange(o)}
        >
          {cap(o)}
        </button>
      ))}
    </div>
  );
}

function Multi({
  options,
  value,
  onToggle,
}: {
  options: { key: string; label: string }[];
  value: string[];
  onToggle: (k: string) => void;
}) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = value?.includes(o.key);
        return (
          <button
            key={o.key}
            className={`btn ${active ? "primary" : ""}`}
            onClick={() => onToggle(o.key)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  setValue,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  setValue: (n: number) => void;
}) {
  return (
    <div>
      <label className="small">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <div className="small" style={{ color: "var(--muted)" }}>
        {value}/{max}
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}