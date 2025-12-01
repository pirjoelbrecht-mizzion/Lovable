// src/components/SyncPanel.tsx
import { useState } from "react";

type Provider = "apple" | "strava" | "garmin";

const DISPLAY = {
  apple:  " Apple Health (mock)",
  strava: "Strava (mock)",
  garmin: "Garmin (mock)",
};

export default function SyncPanel() {
  const [last, setLast] = useState<Record<Provider, string>>({
    apple: "Never",
    strava: "Never",
    garmin: "Never",
  });

  function sync(p: Provider) {
    // pretend to sync
    setTimeout(() => {
      setLast((prev) => ({ ...prev, [p]: new Date().toLocaleString() }));
    }, 450);
  }

  return (
    <div className="card">
      <h2 className="h2">Connections</h2>
      <div className="grid" style={{ gap: 8 }}>
        {(["apple", "strava", "garmin"] as Provider[]).map((p) => (
          <div key={p} className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div><b>{DISPLAY[p]}</b></div>
              <div className="small">Last sync: {last[p]}</div>
            </div>
            <button className="btn" onClick={() => sync(p)}>Sync</button>
          </div>
        ))}
      </div>
      <p className="small" style={{ marginTop: 8 }}>
        These are mock connections for demo. Real OAuth can be added later.
      </p>
    </div>
  );
}
