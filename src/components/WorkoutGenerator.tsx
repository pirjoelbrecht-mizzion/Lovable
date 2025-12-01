import { useState } from "react";
import { generateWorkout, workoutTypeLabels, type WorkoutType } from "@/utils/workoutGenerator";

interface WorkoutGeneratorProps {
  onSelect?: (workout: ReturnType<typeof generateWorkout>) => void;
}

export default function WorkoutGenerator({ onSelect }: WorkoutGeneratorProps) {
  const [selectedType, setSelectedType] = useState<WorkoutType>("easy");
  const [showPreview, setShowPreview] = useState(false);

  const workout = generateWorkout(selectedType);

  const workoutTypes: WorkoutType[] = ["recovery", "easy", "tempo", "intervals", "long", "fartlek", "hill"];

  const handleGenerate = () => {
    setShowPreview(true);
  };

  const handleUse = () => {
    if (onSelect) {
      onSelect(workout);
    }
    setShowPreview(false);
  };

  const zoneColors: Record<string, string> = {
    "Zone 1": "#22c55e",
    "Zone 2": "#06b6d4",
    "Zone 3": "#f59e0b",
    "Zone 4": "#f97316",
    "Zone 5": "#ef4444",
    "Zone 2–4": "#06b6d4",
    "Zone 4–5": "#f97316"
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Generate Workout</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {workoutTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              background: selectedType === type ? "var(--accent)" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: selectedType === type ? 600 : 400
            }}
          >
            {workoutTypeLabels[type]}
          </button>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        style={{
          padding: "8px 16px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14
        }}
      >
        Generate {workoutTypeLabels[selectedType]}
      </button>

      {showPreview && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#2a2a2a",
            borderRadius: 8,
            border: "2px solid var(--accent)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{workout.title}</h4>
              <p style={{ fontSize: 13, opacity: 0.7 }}>{workout.description}</p>
            </div>
            <div
              style={{
                padding: "4px 10px",
                background: zoneColors[workout.zone] || "#06b6d4",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                color: "#000"
              }}
            >
              {workout.zone}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Duration</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{workout.duration}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Distance</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>~{workout.estimatedKm} km</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Pace</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{workout.paceRange}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Heart Rate</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{workout.hrRange}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "#1a1a1a", borderRadius: 6 }}>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>Workout Details</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>{workout.details}</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={handleUse}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14
              }}
            >
              Add to Plan
            </button>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                padding: "8px 16px",
                background: "#333",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
