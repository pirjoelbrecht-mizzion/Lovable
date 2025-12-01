export type TimeFramePreset = "7d" | "4w" | "3m" | "12m";

export type CustomDateRange = {
  type: "custom";
  startDate: string;
  endDate: string;
  label?: string;
};

export type PresetTimeFrame = {
  type: "preset";
  preset: TimeFramePreset;
};

export type TimeFrameConfig = PresetTimeFrame | CustomDateRange;

export type DateRangeResult = {
  startDate: string;
  endDate: string;
  label: string;
  resolution: "daily" | "weekly" | "monthly";
};

export type RecentCustomRange = {
  startDate: string;
  endDate: string;
  label: string;
  timestamp: number;
};

export type BinnedDataPoint = {
  key: string;
  date: string;
  value: number;
  count?: number;
  vertical?: number;
};

export const PRESET_LABELS: Record<TimeFramePreset, string> = {
  "7d": "Last 7 days",
  "4w": "Last 4 weeks",
  "3m": "Last 3 months",
  "12m": "Last 12 months",
};

export const PRESET_TOOLTIPS: Record<TimeFramePreset, string> = {
  "7d": "Microcycle check — Did I recover well this week?",
  "4w": "Mesocycle overview — Is ACWR stable and volume trending up?",
  "3m": "Training phase — How did my base build affect HR efficiency?",
  "12m": "Macro trend — How am I progressing toward my goals?",
};
