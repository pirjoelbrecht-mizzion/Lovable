import type {
  TimeFramePreset,
  TimeFrameConfig,
  DateRangeResult,
  RecentCustomRange,
  PRESET_LABELS,
} from "@/types/timeframe";
import { load, save } from "./storage";

export function calculateDateRange(config: TimeFrameConfig): DateRangeResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (config.type === "custom") {
    const daysDiff = Math.floor(
      (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const resolution =
      daysDiff <= 14 ? "daily" : daysDiff <= 120 ? "weekly" : "monthly";

    return {
      startDate: config.startDate,
      endDate: config.endDate,
      label: config.label || `${config.startDate} to ${config.endDate}`,
      resolution,
    };
  }

  const { preset } = config;
  let daysBack = 7;
  let resolution: "daily" | "weekly" | "monthly" = "daily";

  switch (preset) {
    case "7d":
      daysBack = 7;
      resolution = "daily";
      break;
    case "4w":
      daysBack = 28;
      resolution = "weekly";
      break;
    case "3m":
      daysBack = 90;
      resolution = "weekly";
      break;
    case "12m":
      daysBack = 365;
      resolution = "monthly";
      break;
  }

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    label: getPresetLabel(preset),
    resolution,
  };
}

export function getPresetLabel(preset: TimeFramePreset): string {
  const labels: Record<TimeFramePreset, string> = {
    "7d": "Last 7 days",
    "4w": "Last 4 weeks",
    "3m": "Last 3 months",
    "12m": "Last 12 months",
  };
  return labels[preset];
}

export function calculateCustomRangeFromDays(days: number): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
  };
}

export function saveRecentCustomRange(range: Omit<RecentCustomRange, "timestamp">) {
  const recent = load<RecentCustomRange[]>("insights:recentRanges", []);

  const exists = recent.find(
    (r) => r.startDate === range.startDate && r.endDate === range.endDate
  );

  if (exists) {
    exists.timestamp = Date.now();
    save("insights:recentRanges", recent);
    return;
  }

  const newRange: RecentCustomRange = {
    ...range,
    timestamp: Date.now(),
  };

  recent.unshift(newRange);
  const limited = recent.slice(0, 5);
  save("insights:recentRanges", limited);
}

export function getRecentCustomRanges(): RecentCustomRange[] {
  return load<RecentCustomRange[]>("insights:recentRanges", []);
}

export function persistTimeFrame(config: TimeFrameConfig) {
  save("insights:timeFrame", config);
}

export function loadPersistedTimeFrame(): TimeFrameConfig {
  return load<TimeFrameConfig>("insights:timeFrame", {
    type: "preset",
    preset: "4w",
  });
}

export function getTimeFrameWeeksCount(config: TimeFrameConfig): number {
  const range = calculateDateRange(config);
  const daysDiff = Math.floor(
    (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return Math.ceil(daysDiff / 7);
}

export function formatDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return `${formatDate(start)} - ${formatDate(end)}`;
}
