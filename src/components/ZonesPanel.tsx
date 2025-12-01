// src/components/ZonesPanel.tsx
import { useMemo, useState } from "react";
import { zoneInfoAtHR, type ZonesInput } from "@/utils/zones";

function Bar({ fatPct, carbPct }: { fatPct: number; carbPct: number }) {
  const fatW = Math.round(fatPct * 100);
  const carbW = 100 - fatW;
  return (
    <div style={{ display: "flex", gap: 0, height: 12, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
      <div style={{ width: `${fatW}%`, background: "#10b981" }} title={`Fat ~${fatW}%`} />
      <div style={{ width: `${carbW}%`, background: "#f59e0b" }} title={`Carbs ~${carbW}%`} />
    </div>
  );
}

export default function ZonesPanel() {
  // Basic inputs (you can later move these to Settings + localStorage)
  const [restingHR, setRestingHR] = useState(55);
  const [maxHR, setMaxHR] = useState(190);
  const [currentHR, setCurrentHR] = useState(140);
  const [weight, setWeight] = useState(70); // kg

  const z: ZonesInput = { restingHR, maxHR };

  const info = useMemo(() => zoneInfoAtHR(currentHR, z), [currentHR, restingHR, maxHR]);

  // kcal/min estimate = METs * 3.5 * kg / 200 (ACSM)
  const kcalPerMin = useMemo(() => Math.round(info.mets * 3.5 * weight / 200 * 10) / 10, [info.mets, weight]);
  const fatKcal = Math.round(kcalPerMin * info.fatPct * 10) / 10;
  const carbKcal = Math.round(kcalPerMin * info.carbPct * 10) / 10;

  return (
    <div className="card">
      <h2 className="h2">Zones & Fuel</h2>

      <div className="grid cols-3" style={{ gap: 12 }}>
        <div>
          <label className="small">Resting HR</label>
          <input type="number" min={30} max={120} value={restingHR}
                 onChange={(e) => setRestingHR(Number(e.target.value))} />
        </div>
        <div>
          <label className="small">Max HR</label>
          <input type="number" min={120} max={230} value={maxHR}
                 onChange={(e) => setMaxHR(Number(e.target.value))} />
        </div>
        <div>
          <label className="small">Weight (kg)</label>
          <input type="number" min={30} max={200} value={weight}
                 onChange={(e) => setWeight(Number(e.target.value))} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="small">Current HR: <b>{currentHR} bpm</b></label>
        <input type="range" min={restingHR} max={maxHR} value={currentHR}
               onChange={(e) => setCurrentHR(Number(e.target.value))} />
      </div>

      <div className="kv" style={{ marginTop: 8 }}>
        <span>Zone</span><b>{info.zone} ({Math.round(info.pctHRR * 100)}% HRR)</b>
      </div>
      <div className="kv">
        <span>Estimated intensity</span><b>{Math.round(info.estPctVO2 * 100)}% VO₂max</b>
      </div>
      <div style={{ marginTop: 8 }}>
        <Bar fatPct={info.fatPct} carbPct={info.carbPct} />
        <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
          <span className="small">Fat ~ {Math.round(info.fatPct * 100)}%</span>
          <span className="small">Carbs ~ {Math.round(info.carbPct * 100)}%</span>
        </div>
      </div>

      <div className="kv" style={{ marginTop: 8 }}>
        <span>Energy use</span><b>{kcalPerMin} kcal/min</b>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <span className="tag">Fat: ~{fatKcal} kcal/min</span>
        <span className="tag">Carbs: ~{carbKcal} kcal/min</span>
      </div>

      <p className="small" style={{ marginTop: 10 }}>
        This is an educational estimate (not medical advice). For precise guidance, use a lab test or validated wearables and consult a coach.
      </p>
    </div>
  );
}
