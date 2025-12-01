// src/components/SessionEditor.tsx
import { useEffect, useState } from "react";

export type EditSession = {
  title: string;
  km?: number;
  notes?: string;
};

export default function SessionEditor({
  open,
  initial,
  onSave,
  onCancel,
  onDelete,
  title = "Edit session",
}: {
  open: boolean;
  initial: EditSession;
  onSave: (next: EditSession) => void;
  onCancel: () => void;
  onDelete?: () => void;
  title?: string;
}) {
  const [draft, setDraft] = useState<EditSession>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "92%",
          background: "var(--card)",
        }}
      >
        <h2 className="h2" style={{ marginBottom: 6 }}>{title}</h2>

        <label className="small">Title</label>
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Easy / Moderate / Hills / Long Run"
        />

        <label className="small" style={{ marginTop: 10 }}>Distance (km)</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="e.g., 8"
          value={draft.km ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              km: e.target.value === "" ? undefined : Number(e.target.value),
            }))
          }
        />

        <label className="small" style={{ marginTop: 10 }}>Notes</label>
        <textarea
          rows={4}
          placeholder="Z2. Strides optional."
          value={draft.notes ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          {onDelete && (
            <button className="btn" onClick={onDelete}>Delete</button>
          )}
          <button
            className="btn primary"
            onClick={() => onSave({ title: draft.title.trim(), km: draft.km, notes: draft.notes?.trim() })}
            style={{ marginLeft: "auto" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}