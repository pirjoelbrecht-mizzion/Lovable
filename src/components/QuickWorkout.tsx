// src/components/QuickWorkout.tsx
import { useState } from "react";
import Modal from "./Modal";

export type QuickWorkoutResult = {
  dateISO: string;
  km: number;
  rpe: number;
  sleepHours?: number;
  hrv?: number;
  zone?: 1 | 2 | 3 | 4 | 5;
};

export default function QuickWorkout({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (w: QuickWorkoutResult) => void;
}) {
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState<number>(6);
  const [rpe, setRpe] = useState<number>(5);
  const [zone, setZone] = useState<1 | 2 | 3 | 4 | 5>(2);

  function save() {
    onSave({
      dateISO,
      km: Math.max(0, Number(km)),
      rpe: Math.min(10, Math.max(1, Number(rpe))),
      zone,
    });
  }

  return (
    <Modal title="Quick Workout Builder" onClose={onCancel}>
      <div className="grid" style={{ gap: 10 }}>
        <label className="small">Date</label>
        <input
          type="date"
          value={dateISO}
          onChange={(e) => setDateISO(e.target.value)}
        />

        <label className="small" style={{ marginTop: 6 }}>Distance (km)</label>
        <input
          type="number"
          min={0} step={0.5}
          value={km}
          onChange={(e) => setKm(Number(e.target.value))}
        />

        <label className="small" style={{ marginTop: 6 }}>RPE (1–10)</label>
        <input
          type="number"
          min={1} max={10}
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
        />

        <label className="small" style={{ marginTop: 6 }}>Main Zone</label>
        <select value={zone} onChange={(e) => setZone(Number(e.target.value) as any)}>
          <option value={1}>Z1 (Recovery)</option>
          <option value={2}>Z2 (Easy)</option>
          <option value={3}>Z3 (Tempo)</option>
          <option value={4}>Z4 (Threshold)</option>
          <option value={5}>Z5 (VO2)</option>
        </select>

        <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={save}>Save to Log</button>
        </div>
      </div>
    </Modal>
  );
}
