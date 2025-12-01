// src/fixtures/importSamples.ts
import type { LogEntry } from "@/types";

// lightweight sample runs
export const STRAVA_SAMPLES: LogEntry[] = [
  { dateISO: "2025-10-20", title: "Morning Run", km: 8.2, durationMin: 42, hrAvg: 151, source: "Strava" },
  { dateISO: "2025-10-22", title: "Intervals 6x400", km: 7.1, durationMin: 38, hrAvg: 159, source: "Strava" },
  { dateISO: "2025-10-25", title: "Long Run", km: 16.4, durationMin: 95, hrAvg: 147, source: "Strava" },
];

export const GARMIN_SAMPLES: LogEntry[] = [
  { dateISO: "2025-10-18", title: "Easy Run", km: 5.0, durationMin: 30, hrAvg: 140, source: "Garmin" },
  { dateISO: "2025-10-19", title: "Hills", km: 9.0, durationMin: 55, hrAvg: 155, source: "Garmin" },
];

export const APPLE_HEALTH_SAMPLES: LogEntry[] = [
  { dateISO: "2025-10-17", title: "Evening Jog", km: 4.3, durationMin: 24, hrAvg: 135, source: "Apple Health" },
  { dateISO: "2025-10-21", title: "Tempo", km: 8.8, durationMin: 44, hrAvg: 162, source: "Apple Health" },
];
