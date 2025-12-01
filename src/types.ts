// src/types.ts

// ---- Race type ----
export type Race = {
  id: string;
  name: string;
  dateISO: string;     // YYYY-MM-DD
  distanceKm: number;  // e.g. 42.195
  goalTimeMin?: number;
  location?: string;
  notes?: string;
  elevationM?: number; // Total elevation gain in meters
  elevationGain?: number; // Alias for elevationM (for backward compatibility)
};

// ---- Log entries (from your app) ----
export type LogEntry = {
  id?: string;         // UUID from database
  title: string;
  dateISO: string;     // YYYY-MM-DD
  km: number;          // kilometers
  durationMin?: number;
  hrAvg?: number;
  source?: "Strava" | "Garmin" | "Apple Health" | "Manual"; // known sources
  externalId?: string; // External activity ID from source (Strava ID, Garmin ID, etc.)
  mapPolyline?: string; // Encoded polyline for route visualization
  mapSummaryPolyline?: string; // Lower resolution polyline for preview
  elevationGain?: number; // Total elevation gain in meters
  elevationLoss?: number; // Total elevation loss in meters - NEW FIELD
  elevationLow?: number;  // Lowest elevation point in meters - NEW FIELD
  elevationStream?: number[]; // Elevation data points in meters
  distanceStream?: number[]; // Distance data points in meters
  temperature?: number; // Temperature in Celsius
  weather?: string;    // Weather conditions
  location?: string;   // Location name
  humidity?: number;   // Humidity percentage
};

// ---- Planner shared types ----
export type Session = {
  title: string;
  km?: number;
  notes?: string;
};

export type PlanDay = {
  dateISO: string;     // YYYY-MM-DD
  sessions: Session[];
};

export type PlanWeek = PlanDay[];

// ---- Optional: Legacy DayPlan (if used elsewhere) ----
export type DayPlan = {
  dateISO: string;
  title: string;
  km?: number;
  notes?: string;
};