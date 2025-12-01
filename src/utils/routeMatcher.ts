import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import type { GPXSegmentAnalysis } from './gpxParser';

export interface RouteMatch {
  logEntryId: string;
  logEntryTitle: string;
  logEntryDate: string;
  segmentIndex: number;
  similarityScore: number;
  elevationCorrelation: number;
  distanceMatchPct: number;
  actualTime: number;
  actualPace: number;
  conditions: {
    date: string;
    temperature?: number;
    weather?: string;
    humidity?: number;
    fitnessLevel: number;
  };
}

function calculateCorrelation(arr1: number[], arr2: number[]): number {
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const minLength = Math.min(arr1.length, arr2.length);
  const x = arr1.slice(0, minLength);
  const y = arr2.slice(0, minLength);

  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < x.length; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  if (denomX === 0 || denomY === 0) return 0;

  return numerator / Math.sqrt(denomX * denomY);
}

function extractSegmentElevationProfile(
  fullElevationStream: number[],
  fullDistanceStream: number[],
  startDist: number,
  endDist: number
): number[] {
  if (!fullElevationStream || !fullDistanceStream) return [];

  const segmentElevation: number[] = [];

  for (let i = 0; i < fullDistanceStream.length; i++) {
    const dist = fullDistanceStream[i];
    if (dist >= startDist && dist <= endDist) {
      segmentElevation.push(fullElevationStream[i]);
    }
  }

  return segmentElevation;
}

function normalizeElevationProfile(elevation: number[], targetPoints: number = 50): number[] {
  if (elevation.length === 0) return [];
  if (elevation.length <= targetPoints) return elevation;

  const normalized: number[] = [];
  const step = elevation.length / targetPoints;

  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.floor(i * step);
    normalized.push(elevation[idx]);
  }

  return normalized;
}

export function calculateSegmentSimilarity(
  targetSegment: GPXSegmentAnalysis,
  targetElevationProfile: number[],
  historicalSegment: {
    distanceKm: number;
    elevationGainM: number;
    elevationLossM: number;
    elevationProfile: number[];
  }
): number {
  const distanceRatio = Math.min(
    targetSegment.distanceKm / historicalSegment.distanceKm,
    historicalSegment.distanceKm / targetSegment.distanceKm
  );

  const elevGainRatio = targetSegment.elevationGainM > 0 && historicalSegment.elevationGainM > 0
    ? Math.min(
        targetSegment.elevationGainM / historicalSegment.elevationGainM,
        historicalSegment.elevationGainM / targetSegment.elevationGainM
      )
    : 1.0;

  const normalizedTarget = normalizeElevationProfile(targetElevationProfile);
  const normalizedHistorical = normalizeElevationProfile(historicalSegment.elevationProfile);

  const correlation = calculateCorrelation(normalizedTarget, normalizedHistorical);
  const normalizedCorrelation = (correlation + 1) / 2;

  const similarityScore = (
    distanceRatio * 0.3 +
    elevGainRatio * 0.3 +
    normalizedCorrelation * 0.4
  ) * 100;

  return Math.min(100, Math.max(0, similarityScore));
}

export async function findSimilarSegments(
  targetSegment: GPXSegmentAnalysis,
  targetElevationProfile: number[],
  userId: string,
  topN: number = 5
): Promise<RouteMatch[]> {
  const supabase = getSupabase();

  const distanceTolerance = targetSegment.distanceKm * 0.3;
  const minDistance = targetSegment.distanceKm - distanceTolerance;
  const maxDistance = targetSegment.distanceKm + distanceTolerance;

  const { data: logEntries, error } = await supabase
    .from('log_entries')
    .select('id, title, date, km, duration_min, elevation_gain, elevation_stream, distance_stream, temperature, weather_conditions, humidity')
    .eq('user_id', userId)
    .gte('km', minDistance)
    .lte('km', maxDistance)
    .not('elevation_stream', 'is', null)
    .not('distance_stream', 'is', null)
    .order('date', { ascending: false })
    .limit(50);

  if (error || !logEntries) {
    console.error('Error fetching log entries:', error);
    return [];
  }

  const matches: RouteMatch[] = [];

  for (const entry of logEntries) {
    const elevationStream = entry.elevation_stream as number[];
    const distanceStream = entry.distance_stream as number[];

    if (!elevationStream || !distanceStream || elevationStream.length === 0) continue;

    const totalDistance = distanceStream[distanceStream.length - 1] || entry.km;

    let cumulativeDistance = 0;
    let cumulativeElevationGain = 0;
    let cumulativeElevationLoss = 0;

    for (let i = 0; i < distanceStream.length; i++) {
      const segmentStartDist = cumulativeDistance;
      const segmentEndDist = Math.min(cumulativeDistance + targetSegment.distanceKm, totalDistance);

      const segmentElevation = extractSegmentElevationProfile(
        elevationStream,
        distanceStream,
        segmentStartDist,
        segmentEndDist
      );

      if (segmentElevation.length < 10) {
        cumulativeDistance += 0.5;
        continue;
      }

      let segElevGain = 0;
      let segElevLoss = 0;
      for (let j = 1; j < segmentElevation.length; j++) {
        const diff = segmentElevation[j] - segmentElevation[j - 1];
        if (diff > 0) segElevGain += diff;
        else segElevLoss += Math.abs(diff);
      }

      const historicalSegment = {
        distanceKm: segmentEndDist - segmentStartDist,
        elevationGainM: segElevGain,
        elevationLossM: segElevLoss,
        elevationProfile: segmentElevation,
      };

      const similarity = calculateSegmentSimilarity(
        targetSegment,
        targetElevationProfile,
        historicalSegment
      );

      if (similarity >= 60) {
        const segmentDuration = entry.duration_min
          ? (entry.duration_min / entry.km) * historicalSegment.distanceKm
          : 0;

        const segmentPace = segmentDuration > 0
          ? segmentDuration / historicalSegment.distanceKm
          : 0;

        const correlation = calculateCorrelation(
          normalizeElevationProfile(targetElevationProfile),
          normalizeElevationProfile(segmentElevation)
        );

        matches.push({
          logEntryId: entry.id,
          logEntryTitle: entry.title,
          logEntryDate: entry.date,
          segmentIndex: i,
          similarityScore: parseFloat(similarity.toFixed(1)),
          elevationCorrelation: parseFloat(((correlation + 1) / 2 * 100).toFixed(1)),
          distanceMatchPct: parseFloat((Math.min(
            historicalSegment.distanceKm / targetSegment.distanceKm,
            targetSegment.distanceKm / historicalSegment.distanceKm
          ) * 100).toFixed(1)),
          actualTime: parseFloat(segmentDuration.toFixed(2)),
          actualPace: parseFloat(segmentPace.toFixed(2)),
          conditions: {
            date: entry.date,
            temperature: entry.temperature || undefined,
            weather: entry.weather_conditions || undefined,
            humidity: entry.humidity || undefined,
            fitnessLevel: 1.0,
          },
        });
      }

      cumulativeDistance += 0.5;

      if (cumulativeDistance >= totalDistance) break;
    }
  }

  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  return matches.slice(0, topN);
}

export async function saveRouteComparisons(
  eventId: string,
  segmentIndex: number,
  matches: RouteMatch[]
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const records = matches.map(match => ({
    event_id: eventId,
    log_entry_id: match.logEntryId,
    segment_index: segmentIndex,
    similarity_score: match.similarityScore,
    elevation_correlation: match.elevationCorrelation,
    distance_match_pct: match.distanceMatchPct,
    actual_time_seconds: Math.round(match.actualTime * 60),
    actual_pace_min_km: match.actualPace,
    conditions: match.conditions,
  }));

  const { error } = await supabase
    .from('route_comparisons')
    .insert(records);

  if (error) {
    console.error('Error saving route comparisons:', error);
  }
}

export async function getRouteComparisons(
  eventId: string,
  segmentIndex?: number
): Promise<RouteMatch[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  let query = supabase
    .from('route_comparisons')
    .select(`
      *,
      log_entries (
        title,
        date
      )
    `)
    .eq('event_id', eventId);

  if (segmentIndex !== undefined) {
    query = query.eq('segment_index', segmentIndex);
  }

  query = query.order('similarity_score', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching route comparisons:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    logEntryId: row.log_entry_id,
    logEntryTitle: row.log_entries?.title || 'Unknown',
    logEntryDate: row.log_entries?.date || '',
    segmentIndex: row.segment_index,
    similarityScore: row.similarity_score,
    elevationCorrelation: row.elevation_correlation,
    distanceMatchPct: row.distance_match_pct,
    actualTime: row.actual_time_seconds / 60,
    actualPace: row.actual_pace_min_km,
    conditions: row.conditions || {},
  }));
}
