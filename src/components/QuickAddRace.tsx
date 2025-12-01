// src/components/QuickAddRace.tsx
import { useEffect, useMemo, useState } from "react";
import { searchSeedRaces, type SeedRace, type RacePriority, type RaceSurface } from "@/data/races";
import { saveEvent, type DbEvent } from "@/lib/database";

export type UserRace = {
  id: string;
  name: string;
  dateISO: string;
  distanceKm?: number;
  elevM?: number;
  surface: RaceSurface;
  location?: string;
  priority: RacePriority;
  goal?: string;
  notes?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded?: (race: UserRace) => void;
};

const STORAGE_KEY = "races:list";

export default function QuickAddRace({ open, onClose, onAdded }: Props) {
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<SeedRace | null>(null);
  const [name, setName] = useState("");
  const [dateISO, setDateISO] = useState("");
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [elevM, setElevM] = useState<string>("");
  const [surface, setSurface] = useState<RaceSurface>("road");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<RacePriority>("B");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");

  const candidates = useMemo(() => searchSeedRaces(q), [q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setPick(null);
    setName("");
    setDateISO("");
    setDistanceKm("");
    setElevM("");
    setSurface("road");
    setLocation("");
    setPriority("B");
    setGoal("");
    setNotes("");
  }, [open]);

  function choose(r: SeedRace) {
    setPick(r);
    setName(r.name);
    setSurface(r.surface);
    setLocation(r.location || "");
    setDistanceKm(r.distanceKm != null ? String(r.distanceKm) : "");
    setElevM(r.surface === "trail" && r.elevM != null ? String(r.elevM) : "");
  }

  async function saveRace() {
    if (!name.trim()) {
      alert('Please enter a race name');
      return;
    }

    if (!dateISO) {
      alert('Please select a race date');
      return;
    }

    if (!distanceKm || Number(distanceKm) <= 0) {
      alert('Please enter a valid race distance (km)');
      return;
    }

    const eventType = surface === 'road' ? 'street' : surface === 'trail' ? 'trail' : 'other';

    const event: DbEvent = {
      name: name.trim(),
      type: eventType as 'street' | 'trail' | 'other',
      date: dateISO,
      distance_km: Number(distanceKm),
      elevation_gain: surface === "trail" && elevM ? Number(elevM) : undefined,
      location: location || pick?.location,
      priority,
      goal: goal.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const success = await saveEvent(event);

    if (success) {
      const userRace: UserRace = {
        id: `race_${Date.now()}`,
        name: event.name,
        dateISO: event.date,
        distanceKm: event.distance_km,
        elevM: event.elevation_gain,
        surface,
        location: event.location,
        priority: event.priority!,
        goal: event.goal,
        notes: event.notes,
      };
      onAdded?.(userRace);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80, display: "grid", placeItems: "center" }}
      aria-modal
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxWidth: "94%", background: "var(--card)" }}
      >
        <h2 className="h2">Quick add race</h2>
        <div className="row" style={{ gap: 8 }}>
          <input
            placeholder="Search seed database (e.g., UTMB, Valencia)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={() => { setPick(null); setName(q); }}>
            Create custom
          </button>
        </div>
        <div className="grid cols-2" style={{ marginTop: 8, gap: 8 }}>
          <div className="card" style={{ maxHeight: 240, overflow: "auto" }}>
            {candidates.length === 0 ? (
              <div className="small" style={{ color: "var(--muted)" }}>No matches.</div>
            ) : (
              candidates.map((r) => (
                <div
                  key={r.id}
                  className="row"
                  style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <div className="small">
                    <b>{r.name}</b>
                    <div style={{ color: "var(--muted)" }}>
                      {r.location || "—"} • {r.surface}
                      {r.surface === "trail" && r.elevM ? ` • ${r.elevM} m+` : ""}
                      {r.distanceKm ? ` • ${r.distanceKm} km` : ""}
                    </div>
                  </div>
                  <button className="btn" onClick={() => choose(r)}>Use</button>
                </div>
              ))
            )}
          </div>
          <div className="card">
            <label className="small">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Race name" />
            <label className="small" style={{ marginTop: 6 }}>Date</label>
            <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
            <div className="grid" style={{ gap: 8, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="small" style={{ marginTop: 6 }}>Surface</label>
                <select value={surface} onChange={(e) => setSurface(e.target.value as RaceSurface)}>
                  <option value="road">Road</option>
                  <option value="trail">Trail</option>
                  <option value="track">Track</option>
                </select>
              </div>
              <div>
                <label className="small" style={{ marginTop: 6 }}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as RacePriority)}>
                  <option value="A">A — Peak goal</option>
                  <option value="B">B — Tune-up</option>
                  <option value="C">C — Training/Social</option>
                </select>
              </div>
            </div>
            <div className="grid" style={{ gap: 8, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="small" style={{ marginTop: 6 }}>
                  Distance (km) <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  required
                  placeholder="e.g. 42.2"
                />
              </div>
              {surface === "trail" && (
                <div>
                  <label className="small" style={{ marginTop: 6 }}>Elevation gain (m+)</label>
                  <input type="number" step="10" value={elevM} onChange={(e) => setElevM(e.target.value)} />
                </div>
              )}
            </div>
            <label className="small" style={{ marginTop: 6 }}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / Region / Country" />
            <label className="small" style={{ marginTop: 6 }}>Goal</label>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder='e.g. "Finish < 24h" or "PB 3:05"' />
            <label className="small" style={{ marginTop: 6 }}>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything important…" />
            <div className="small" style={{ marginTop: 8, color: "var(--muted)" }}>
              <b>How to pick A / B / C?</b> A = your main target (full taper, peak). B = tune-up / rehearsal (partial taper).
              C = training or social race (no taper, keep volume).
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={saveRace}>Add race</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}