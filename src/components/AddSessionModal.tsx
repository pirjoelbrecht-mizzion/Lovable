import { useState } from "react";
import { X } from "lucide-react";
import "./AddSessionModal.css";

type SessionType = "run" | "strength" | "core" | "rest";

interface AddSessionModalProps {
  dayLabel: string;
  dayIndex: number;
  onAdd: (sessionData: {
    title: string;
    notes?: string;
    km?: number;
    type?: string;
  }) => void;
  onClose: () => void;
}

export function AddSessionModal({ dayLabel, dayIndex, onAdd, onClose }: AddSessionModalProps) {
  const [sessionType, setSessionType] = useState<SessionType>("run");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [distance, setDistance] = useState("");

  const sessionTypeOptions: { type: SessionType; label: string; emoji: string }[] = [
    { type: "run", label: "Run", emoji: "🏃" },
    { type: "strength", label: "Strength", emoji: "💪" },
    { type: "core", label: "Core", emoji: "🧘" },
    { type: "rest", label: "Rest", emoji: "😌" },
  ];

  const handleSubmit = () => {
    if (!title.trim()) return;

    const sessionData: any = {
      title: title.trim(),
      notes: notes.trim(),
      type: sessionType,
    };

    if (sessionType === "run" && distance) {
      sessionData.km = parseFloat(distance);
    }

    console.log('[STEP 7] AddSessionModal submitting:', sessionData);
    onAdd(sessionData);
    onClose();
  };

  const handleTypeChange = (type: SessionType) => {
    setSessionType(type);
    if (type === "run" && !title) {
      setTitle("Easy Run");
    } else if (type === "strength" && !title) {
      setTitle("Strength Training");
    } else if (type === "core" && !title) {
      setTitle("Core Training");
    } else if (type === "rest" && !title) {
      setTitle("Rest Day");
    }
  };

  return (
    <div className="add-session-modal-backdrop" onClick={onClose}>
      <div className="add-session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-session-modal-header">
          <h3>Add Session to {dayLabel}</h3>
          <button className="add-session-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="add-session-modal-body">
          <div className="add-session-field">
            <label>Session Type</label>
            <div className="add-session-type-grid">
              {sessionTypeOptions.map((opt) => (
                <button
                  key={opt.type}
                  className={`add-session-type-btn ${sessionType === opt.type ? "active" : ""}`}
                  onClick={() => handleTypeChange(opt.type)}
                >
                  <span className="add-session-type-emoji">{opt.emoji}</span>
                  <span className="add-session-type-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="add-session-field">
            <label>Title</label>
            <input
              type="text"
              className="add-session-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Easy Run, Tempo, Hill Repeats"
              autoFocus
            />
          </div>

          {sessionType === "run" && (
            <div className="add-session-field">
              <label>Distance (km) - Optional</label>
              <input
                type="number"
                className="add-session-input"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g., 10"
                step="0.1"
                min="0"
              />
            </div>
          )}

          <div className="add-session-field">
            <label>Notes - Optional</label>
            <textarea
              className="add-session-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this session..."
              rows={3}
            />
          </div>
        </div>

        <div className="add-session-modal-footer">
          <button className="add-session-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="add-session-btn-add"
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            Add Session
          </button>
        </div>
      </div>
    </div>
  );
}
