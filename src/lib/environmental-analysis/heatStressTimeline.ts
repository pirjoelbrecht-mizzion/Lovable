/**
 * Heat Stress Timeline Generation
 *
 * Generates chart-ready heat stress timeline data for visualization
 */

/**
 * Timeline data point for visualization
 */
export interface HeatStressTimelinePoint {
  km: number;
  heatStress: number; // 0-100 composite score
}

/**
 * Generates heat stress timeline for chart visualization
 *
 * @param adjustedWeather - Point-by-point weather data with elevation correction
 * @param distanceStream - Distance array in meters
 * @param sampleInterval - Sampling interval in kilometers (default 0.5km)
 * @returns Array of timeline points for chart
 */
export function generateHeatStressTimeline(
  adjustedWeather: any[],
  distanceStream: number[],
  sampleInterval: number = 0.5
): HeatStressTimelinePoint[] {
  if (!adjustedWeather.length || !distanceStream.length) {
    return [];
  }

  const timeline: HeatStressTimelinePoint[] = [];
  const totalKm = (distanceStream[distanceStream.length - 1] || 0) / 1000;

  // Determine actual interval based on activity distance
  // For short activities, use smaller intervals for better resolution
  const effectiveInterval = totalKm < 10 ? 0.25 : sampleInterval;

  // Sample at regular kilometer intervals
  for (let km = 0; km <= totalKm; km += effectiveInterval) {
    // Find nearest point in distance stream
    const targetDistance = km * 1000;
    const nearestIndex = findNearestIndex(distanceStream, targetDistance);

    if (nearestIndex >= 0 && nearestIndex < adjustedWeather.length) {
      const weather = adjustedWeather[nearestIndex];
      const heatStress = calculateHeatStressScore(weather);

      timeline.push({
        km: Math.round(km * 10) / 10, // Round to 1 decimal
        heatStress: Math.round(heatStress)
      });
    }
  }

  // Apply smoothing to reduce noise
  return applySmoothingFilter(timeline);
}

/**
 * Calculates composite heat stress score (0-100) for a single point
 *
 * Factors:
 * - Heat Index (primary)
 * - Humidity level (amplifies stress)
 * - Temperature absolute value
 *
 * @param weather - Weather data point
 * @returns Heat stress score 0-100
 */
function calculateHeatStressScore(weather: any): number {
  const heatIndexC = weather.heat_index_c || weather.temperature_c;
  const temperatureC = weather.temperature_c;
  const humidity = weather.humidity_percent;

  // Base score from heat index
  // Heat Index scale: <27C = comfortable, 27-32C = caution, 32-41C = extreme caution, 41C+ = danger
  let score = 0;

  if (heatIndexC < 20) {
    score = 0; // Cool, no heat stress
  } else if (heatIndexC < 27) {
    score = mapRange(heatIndexC, 20, 27, 0, 20); // Comfortable
  } else if (heatIndexC < 32) {
    score = mapRange(heatIndexC, 27, 32, 20, 40); // Caution
  } else if (heatIndexC < 41) {
    score = mapRange(heatIndexC, 32, 41, 40, 70); // Extreme caution
  } else if (heatIndexC < 54) {
    score = mapRange(heatIndexC, 41, 54, 70, 90); // Danger
  } else {
    score = 95; // Extreme danger
  }

  // Humidity amplification (high humidity reduces cooling efficiency)
  if (humidity > 80) {
    score += 5; // Additional stress from very high humidity
  } else if (humidity > 70) {
    score += 2;
  }

  // Temperature absolute value consideration
  if (temperatureC > 35) {
    score += 5; // Additional stress from extreme temperature
  }

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Applies moving average smoothing to reduce noise in timeline
 *
 * @param timeline - Raw timeline data
 * @param windowSize - Moving average window size (default 5)
 * @returns Smoothed timeline
 */
function applySmoothingFilter(
  timeline: HeatStressTimelinePoint[],
  windowSize: number = 5
): HeatStressTimelinePoint[] {
  if (timeline.length < windowSize) {
    return timeline; // Not enough data for smoothing
  }

  const smoothed: HeatStressTimelinePoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < timeline.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(timeline.length, i + halfWindow + 1);
    const window = timeline.slice(start, end);

    const avgStress = window.reduce((sum, pt) => sum + pt.heatStress, 0) / window.length;

    smoothed.push({
      km: timeline[i].km,
      heatStress: Math.round(avgStress)
    });
  }

  return smoothed;
}

/**
 * Finds the nearest index in an array to a target value
 */
function findNearestIndex(arr: number[], target: number): number {
  if (!arr.length) return -1;

  let minDiff = Math.abs(arr[0] - target);
  let nearestIndex = 0;

  for (let i = 1; i < arr.length; i++) {
    const diff = Math.abs(arr[i] - target);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * Maps a value from one range to another
 */
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
