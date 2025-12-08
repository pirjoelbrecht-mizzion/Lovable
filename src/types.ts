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
  elevationLoss?: number; // Total elevation loss in meters
  elevationLow?: number;  // Lowest elevation point in meters
  elevationStream?: number[]; // Elevation data points in meters
  distanceStream?: number[]; // Distance data points in meters
  temperature?: number; // Temperature in Celsius
  weather?: string;    // Weather conditions
  location?: string;   // Location name
  humidity?: number;   // Humidity percentage
  // Rich Strava data fields
  sportType?: string;  // Activity type from Strava (Run, Trail Run, Ride, etc.)
  description?: string; // Activity description
  deviceName?: string; // Device used for recording
  gearId?: string;     // Reference to gear used
  hasPhotos?: boolean; // Quick flag for photo availability
  hasSegments?: boolean; // Quick flag for segment data
};

// ---- Rich Strava Data Types ----
export type ActivityPhoto = {
  id?: string;
  logEntryId: string;
  urlFull: string;
  urlThumbnail: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  displayOrder: number;
};

export type ActivitySegment = {
  id?: string;
  logEntryId: string;
  segmentId: string;
  segmentName: string;
  distance: number;
  avgGrade?: number;
  elapsedTime: number;
  movingTime: number;
  startIndex?: number;
  endIndex?: number;
  isPR: boolean;
  prRank?: number;
  komRank?: number;
  achievementType?: string; // 'pr', '2nd', '3rd', 'top10', etc.
};

export type ActivityBestEffort = {
  id?: string;
  logEntryId: string;
  effortName: string;
  distance: number;
  elapsedTime: number;
  movingTime: number;
  startIndex?: number;
  endIndex?: number;
  isPR: boolean;
  prRank?: number;
};

export type ActivityWeatherDetailed = {
  id?: string;
  logEntryId: string;
  tempC?: number;
  feelsLikeC?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  conditions?: string;
  icon?: string;
  sunrise?: string;
  sunset?: string;
};

export type AthleteGear = {
  id?: string;
  gearId: string;
  name: string;
  brand?: string;
  model?: string;
  gearType: string; // 'shoes', 'bike', etc.
  distanceKm: number;
  photoUrl?: string;
  isPrimary: boolean;
  retired: boolean;
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