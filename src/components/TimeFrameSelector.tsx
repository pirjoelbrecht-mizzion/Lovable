import { useState } from "react";
import type { TimeFramePreset, TimeFrameConfig } from "@/types/timeframe";
import { PRESET_TOOLTIPS } from "@/types/timeframe";

interface TimeFrameSelectorProps {
  value: TimeFrameConfig;
  onChange: (config: TimeFrameConfig) => void;
  onCustomClick: () => void;
  compact?: boolean;
}

const PRESETS: TimeFramePreset[] = ["7d", "4w", "3m", "12m"];

const PRESET_DISPLAY: Record<TimeFramePreset, string> = {
  "7d": "7d",
  "4w": "4w",
  "3m": "3m",
  "12m": "12m",
};

export default function TimeFrameSelector({
  value,
  onChange,
  onCustomClick,
  compact = false,
}: TimeFrameSelectorProps) {
  const isPresetActive = (preset: TimeFramePreset) => {
    return value.type === "preset" && value.preset === preset;
  };

  const isCustomActive = value.type === "custom";

  return (
    <div
      className="row"
      style={{
        gap: compact ? 4 : 6,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {!compact && (
        <span className="small" style={{ color: "var(--muted)", marginRight: 4 }}>
          Time:
        </span>
      )}
      {PRESETS.map((preset) => (
        <button
          key={preset}
          className={`btn ${isPresetActive(preset) ? "primary" : ""}`}
          onClick={() => onChange({ type: "preset", preset })}
          title={PRESET_TOOLTIPS[preset]}
          style={{ minWidth: compact ? 40 : 48 }}
        >
          {PRESET_DISPLAY[preset]}
        </button>
      ))}
      <button
        className={`btn ${isCustomActive ? "primary" : ""}`}
        onClick={onCustomClick}
        title="Select custom date range"
        style={{ minWidth: compact ? 56 : 64 }}
      >
        Custom
      </button>
      {isCustomActive && value.label && (
        <span className="small" style={{ color: "var(--muted)", marginLeft: 4 }}>
          ({value.label})
        </span>
      )}
    </div>
  );
}
