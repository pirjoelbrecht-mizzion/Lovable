import { useState } from "react";

type BubbleProps = {
  title: string;
  sub: string;
  color: string;
  badge?: string;
  weather?: string;
  icon?: string; // emoji or icon path
  details?: {
    bestTime: string;
    pace: string;
    heartRate: string;
    instructions: string;
  };
};

export default function TrainingBubble({
  title,
  sub,
  color,
  badge,
  weather,
  icon,
  details,
}: BubbleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="bubble"
        style={{ background: color, cursor: "pointer" }}
        onClick={() => setOpen(true)}
      >
        <div className="bubble-top">
          <span className="badge-now">{badge}</span>
          {weather && (
            <span className="chip-weather" style={{ fontSize: 14 }}>
              {weather}
            </span>
          )}
        </div>

        <div className="bubble-mid">
          <div style={{ fontSize: 36, marginBottom: 4 }}>{icon}</div>
          <div className="title" style={{ fontSize: 15 }}>{title}</div>
          <div className="sub" style={{ fontSize: 12 }}>{sub}</div>
        </div>

        <svg className="ring" viewBox="0 0 50 50">
          <circle className="track" cx="25" cy="25" r="18" />
          <circle className="prog" cx="25" cy="25" r="18" />
        </svg>
      </div>

      {open && details && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{title}</h3>
              <button className="btn" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><b>Best time:</b> {details.bestTime}</p>
              <p><b>Recommended pace:</b> {details.pace}</p>
              <p><b>Heart rate:</b> {details.heartRate}</p>
              <p>{details.instructions}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
