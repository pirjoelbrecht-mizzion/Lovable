/**
 * ======================================================================
 *  ROUTE SIMILARITY & COMPARISON ENGINE
 *  Statistical Learning Module
 * ======================================================================
 *
 * Compares GPS routes to determine:
 * - Path similarity (overlap percentage)
 * - Technical difficulty differences
 * - Expected pace multipliers
 * - Time difference predictions
 *
 * Uses haversine distance for GPS coordinate comparison
 */

export interface GPXRoute {
  totalDistance: number;      // meters
  totalAscent: number;         // meters
  totalDescent: number;        // meters
  points: Array<{
    lat: number;
    lon: number;
    ele?: number;
  }>;
  gradeVariance: number;       // 0-1 scale
  turnDensity: number;         // turns per km
  verticalOsc: number;         // vertical oscillation factor
}

export interface RouteSimilarity {
  similarity_score: number;     // 0-1 (1 = identical)
  distance_diff_m: number;
  elevation_diff_m: number;
  overlap_percent: number;      // 0-1
  technical_diff: number;       // 0-1 (0 = same difficulty)
  expected_pace_multiplier: number;  // 1.0 = same pace expected
  estimated_time_diff_sec: number;
}

/**
 * Haversine distance between two GPS points (in meters)
 */
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate path overlap percentage between two routes
 * Checks how many points from route A are within 20m of route B
 */
function computeOverlap(
  pointsA: GPXRoute['points'],
  pointsB: GPXRoute['points']
): number {
  if (pointsA.length === 0 || pointsB.length === 0) return 0;

  let matches = 0;
  const threshold = 20; // meters

  pointsA.forEach((p1) => {
    const hasMatch = pointsB.some((p2) =>
      haversine(p1.lat, p1.lon, p2.lat, p2.lon) < threshold
    );
    if (hasMatch) matches++;
  });

  return matches / pointsA.length;
}

/**
 * Calculate technical difficulty difference
 * Considers grade variance, turn density, and vertical oscillation
 */
function computeTechnicalDifference(r1: GPXRoute, r2: GPXRoute): number {
  const gradeVar = Math.abs(r1.gradeVariance - r2.gradeVariance);
  const turnDensity = Math.abs(r1.turnDensity - r2.turnDensity);
  const verticalOsc = Math.abs(r1.verticalOsc - r2.verticalOsc);

  const technicalDiff =
    gradeVar * 0.5 + turnDensity * 0.3 + verticalOsc * 0.2;

  return Math.max(0, Math.min(1, technicalDiff));
}

/**
 * Main route comparison function
 */
export function computeRouteSimilarity(
  r1: GPXRoute,
  r2: GPXRoute,
  userBasePaceSec: number = 360 // 6:00 min/km default
): RouteSimilarity {
  const distanceDiff = Math.abs(r1.totalDistance - r2.totalDistance);
  const elevationDiff =
    Math.abs(r1.totalAscent - r2.totalAscent) +
    Math.abs(r1.totalDescent - r2.totalDescent);

  const overlap = computeOverlap(r1.points, r2.points);
  const technicalDiff = computeTechnicalDifference(r1, r2);

  // Overall similarity score
  const similarity =
    0.45 * overlap +
    0.25 * (1 - Math.min(distanceDiff / 2000, 1)) +
    0.30 * (1 - technicalDiff);

  // Pace multiplier based on technical and elevation differences
  const paceMultiplier =
    1 + technicalDiff * 0.2 + elevationDiff * 0.0005;

  // Time difference estimate
  const distanceKm = r1.totalDistance / 1000;
  const estimatedTimeDiff =
    userBasePaceSec * distanceKm * (paceMultiplier - 1);

  return {
    similarity_score: Math.max(0, Math.min(1, similarity)),
    distance_diff_m: Math.round(distanceDiff),
    elevation_diff_m: Math.round(elevationDiff),
    overlap_percent: Math.round(overlap * 100) / 100,
    technical_diff: Math.round(technicalDiff * 100) / 100,
    expected_pace_multiplier: Math.round(paceMultiplier * 100) / 100,
    estimated_time_diff_sec: Math.round(estimatedTimeDiff),
  };
}

/**
 * Find most similar routes from a list
 */
export function findSimilarRoutes(
  targetRoute: GPXRoute,
  candidateRoutes: Array<{ id: string; route: GPXRoute }>,
  userBasePaceSec: number = 360,
  limit: number = 5
): Array<{ id: string; similarity: RouteSimilarity }> {
  const results = candidateRoutes.map((candidate) => ({
    id: candidate.id,
    similarity: computeRouteSimilarity(
      targetRoute,
      candidate.route,
      userBasePaceSec
    ),
  }));

  return results
    .sort((a, b) => b.similarity.similarity_score - a.similarity.similarity_score)
    .slice(0, limit);
}
