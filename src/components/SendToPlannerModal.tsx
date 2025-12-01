// src/components/SendToPlannerModal.tsx
import { useMemo, useState } from "react";
import { insertSession, weekLabels } from "@/utils/plan";
import { toast } from "@/components/ToastHost";

export type PlannerSession = { title: string; km?: number; notes?: string };

export default function SendToPlannerModal({
  open,
  onClose,
  sessions,
}: {
  open: boolean;
  onClose: () => void;
  sessions: PlannerSession[]; // one or many
}) {
  const [busy, setBusy] = useState(false);
  const labels = useMemo(() => weekLabels(), []);
  if (!open) return null;

  async function send(dayIndex: number) {
    setBusy(true);
    try {
      if (sessions.length === 1) {
        insertSession(dayIndex, sessions[0]);
      } else {
        // small batching to keep UI responsive
        for (let i = 0; i < sessions.length; i++) {
          insertSession(dayIndex, sessions[i]);
        }
      }
      toast(
        sessions.length === 1
          ? "Added to this week."
          : `Added ${sessions.length} sessions to this week.`,
        "success"
      );
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 70,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 520, maxWidth: "92%", background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="h2">Send to Planner</h2>
        <p className="small" style={{ marginTop: 6 }}>
          Choose the day for{" "}
          <b>
            {sessions.length === 1
              ? (sessions[0].title || "Session")
              : `${sessions.length} sessions`}
          </b>
          .
        </p>
        <div className="grid cols-4" style={{ gap: 8, marginTop: 10 }}>
          {labels.map((label, i) => (
            <button key={i} className="btn" disabled={busy} onClick={() => send(i)}>
              D{i + 1} — {label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
