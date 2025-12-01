import { useState } from "react";

type Conn = "apple" | "strava" | "garmin";
type Status = "disconnected" | "connected";

export default function DataConnect() {
  const [status, setStatus] = useState<Record<Conn, Status>>({
    apple: "disconnected",
    strava: "disconnected",
    garmin: "disconnected",
  });

  function toggle(c: Conn) {
    setStatus(s => {
      const nxt = s[c] === "connected" ? "disconnected" : "connected";
      return { ...s, [c]: nxt };
    });
  }

  return (
    <div className="card">
      <h2 className="h2">Data Connections</h2>
      <p className="small">Placeholders only; later we’ll wire real OAuth flows.</p>

      <div className="grid cols-3" style={{ gap: 10, marginTop: 10 }}>
        <ConnTile
          name="Apple Health"
          note="iOS device metrics"
          state={status.apple}
          onClick={() => toggle("apple")}
        />
        <ConnTile
          name="Strava"
          note="Activities & routes"
          state={status.strava}
          onClick={() => toggle("strava")}
        />
        <ConnTile
          name="Garmin"
          note="HRV / sleep / runs"
          state={status.garmin}
          onClick={() => toggle("garmin")}
        />
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        Status → Apple: <b>{status.apple}</b> • Strava: <b>{status.strava}</b> • Garmin: <b>{status.garmin}</b>
      </div>
    </div>
  );
}

function ConnTile(props: { name: string; note: string; state: "connected" | "disconnected"; onClick: () => void }) {
  const isOn = props.state === "connected";
  return (
    <button
      className="btn"
      onClick={props.onClick}
      style={{
        textAlign: "left",
        display: "grid",
        gap: 6,
        background: isOn ? "#18311f" : undefined,
        borderColor: isOn ? "#275a36" : undefined,
      }}
    >
      <div style={{ fontWeight: 600 }}>{props.name}</div>
      <div className="small">{props.note}</div>
      <div className="small" style={{ color: isOn ? "var(--ok)" : "var(--muted)" }}>
        {isOn ? "Connected ✓" : "Disconnected"}
      </div>
    </button>
  );
}
