/**
 * Stream Helpers
 * Utilities for fetching and working with Strava activity streams
 */

import { stravaRichDataService } from '../../services/stravaRichDataService';
import { supabase } from '../supabase';
import type { LogEntry } from '../../types';

export interface ActivityStreams {
  elevation: number[];
  time: Date[];
  distance: number[];
  latlng?: Array<[number, number]>;
  heartrate?: number[];
  velocity?: number[];
  cadence?: number[];
  grade?: number[];
}

/**
 * Fetch activity streams from Strava database
 * Uses real GPS, altitude, time, distance, HR, etc. from Strava activity streams
 */
export async function fetchActivityStreams(logEntryId: string): Promise<ActivityStreams> {
  // Get all streams from database
  const allStreams = await stravaRichDataService.getActivityStreams(logEntryId);

  if (!allStreams) {
    // Fallback to synthetic data if no streams available
    console.warn(`[Streams] No Strava streams found for ${logEntryId}, using fallback data`);

    // Get log entry to generate fallback
    const { data: logEntry } = await supabase
      .from('log_entries')
      .select('*')
      .eq('id', logEntryId)
      .maybeSingle();

    if (!logEntry) {
      throw new Error('Log entry not found');
    }

    return generateFallbackStreams(logEntry);
  }

  console.log(`[Streams] Using Strava streams:`, Object.keys(allStreams).join(', '));

  // Get activity start time
  const { data: logEntry } = await supabase
    .from('log_entries')
    .select('date')
    .eq('id', logEntryId)
    .maybeSingle();

  if (!logEntry) {
    throw new Error('Log entry not found');
  }

  const baseTime = new Date(logEntry.date);

  // Extract streams with proper typing
  const timeSeconds = allStreams.time || [];
  const time = timeSeconds.map((seconds: number) =>
    new Date(baseTime.getTime() + seconds * 1000)
  );

  const elevation = allStreams.altitude || [];
  const distance = allStreams.distance || [];
  const latlng = allStreams.latlng as Array<[number, number]> | undefined;
  const heartrate = allStreams.heartrate;
  const velocity = allStreams.velocity_smooth;
  const cadence = allStreams.cadence;
  const grade = allStreams.grade_smooth;

  return {
    elevation,
    time,
    distance,
    latlng,
    heartrate,
    velocity,
    cadence,
    grade
  };
}

/**
 * Generate fallback streams if no Strava data available
 */
function generateFallbackStreams(logEntry: any): ActivityStreams {
  const baseTime = new Date(logEntry.date);

  // Parse elevation data from legacy fields
  let elevation: number[] = [];
  if (logEntry.elevation_stream) {
    try {
      elevation = JSON.parse(logEntry.elevation_stream);
    } catch (e) {
      elevation = generateSyntheticElevation(logEntry);
    }
  } else {
    elevation = generateSyntheticElevation(logEntry);
  }

  // Generate time stream
  const totalSeconds = logEntry.duration_min ? logEntry.duration_min * 60 : 3600;
  const pointCount = elevation.length;
  const time = Array.from({ length: pointCount }, (_, i) => {
    const seconds = (i / pointCount) * totalSeconds;
    return new Date(baseTime.getTime() + seconds * 1000);
  });

  // Generate distance stream
  const totalDistance = (logEntry.km || 10) * 1000; // Convert to meters
  const distance = Array.from({ length: pointCount }, (_, i) =>
    (i / pointCount) * totalDistance
  );

  return {
    elevation,
    time,
    distance
  };
}

/**
 * Generates synthetic elevation if not available
 */
function generateSyntheticElevation(logEntry: any): number[] {
  const elevationGain = logEntry.elevation_gain || 100;
  const pointCount = 200;
  const baseElevation = 500;

  return Array.from({ length: pointCount }, (_, i) => {
    const progress = i / pointCount;
    return baseElevation + elevationGain * Math.sin(progress * Math.PI * 2);
  });
}

/**
 * Get GPS coordinates at a specific index
 */
export function getCoordinateAtIndex(
  latlng: Array<[number, number]> | undefined,
  index: number
): { lat: number; lon: number } | null {
  if (!latlng || index >= latlng.length) {
    return null;
  }

  const [lat, lon] = latlng[index];
  return { lat, lon };
}

/**
 * Get GPS coordinate at midpoint of activity
 */
export function getMidpointCoordinate(
  latlng: Array<[number, number]> | undefined
): { lat: number; lon: number } | null {
  if (!latlng || latlng.length === 0) {
    return null;
  }

  const midIndex = Math.floor(latlng.length / 2);
  return getCoordinateAtIndex(latlng, midIndex);
}
