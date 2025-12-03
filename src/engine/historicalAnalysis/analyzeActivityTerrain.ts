/**
 * Terrain Analysis Engine
 *
 * Analyzes historical activities with elevation data to extract terrain-specific pace information.
 * Supports grade-bucketed pace calculation with recency weighting.
 */

import type { LogEntry } from '@/types';
import { getSupabase, getCurrentUserId } from '@/lib/supabase';

// Grade bucket definitions (in percentage)
// More granular buckets for 0-20% range where most running happens
export const GRADE_BUCKETS = {
  // Uphill buckets (ordered by steepness)
  gentle_uphill: { min: 2, max: 4, label: 'Gentle Uphill (2-4%)' },
  easy_uphill: { min: 4, max: 6, label: 'Easy Uphill (4-6%)' },
  moderate_uphill: { min: 6, max: 8, label: 'Moderate Uphill (6-8%)' },
  hard_uphill: { min: 8, max: 10, label: 'Hard Uphill (8-10%)' },
  steep_uphill: { min: 10, max: 12, label: 'Steep Uphill (10-12%)' },
  very_steep_uphill: { min: 12, max: 15, label: 'Very Steep Uphill (12-15%)' },
  extreme_uphill: { min: 15, max: 20, label: 'Extreme Uphill (15-20%)' },
  climbing: { min: 20, max: 100, label: 'Climbing (20%+)' },

  // Flat
  flat: { min: -2, max: 2, label: 'Flat (±2%)' },

  // Downhill buckets (ordered by steepness)
  gentle_downhill: { min: -4, max: -2, label: 'Gentle Downhill (-2 to -4%)' },
  easy_downhill: { min: -6, max: -4, label: 'Easy Downhill (-4 to -6%)' },
  moderate_downhill: { min: -8, max: -6, label: 'Moderate Downhill (-6 to -8%)' },
  hard_downhill: { min: -10, max: -8, label: 'Hard Downhill (-8 to -10%)' },
  steep_downhill: { min: -12, max: -10, label: 'Steep Downhill (-10 to -12%)' },
  very_steep_downhill: { min: -15, max: -12, label: 'Very Steep Downhill (-12 to -15%)' },
  extreme_downhill: { min: -20, max: -15, label: 'Extreme Downhill (-15 to -20%)' },
  technical_descent: { min: -100, max: -20, label: 'Technical Descent (-20%+)' },
} as const;

export type GradeBucketKey = keyof typeof GRADE_BUCKETS;
export type TerrainType = 'uphill' | 'downhill' | 'flat';

export interface TerrainSegment {
  type: TerrainType;
  gradeBucket: GradeBucketKey;
  distanceKm: number;
  durationMin: number;
  paceMinKm: number;
  gradeAvgPct: number;
  elevationGainM: number;
  elevationLossM: number;
}

export interface ActivityTerrainAnalysis {
  logEntryId: string;
  userId: string;
  activityDate: string;
  uphillDistanceKm: number;
  downhillDistanceKm: number;
  flatDistanceKm: number;
  uphillPaceMinKm: number | null;
  downhillPaceMinKm: number | null;
  flatPaceMinKm: number | null;
  avgGradePct: number;
  segments: TerrainSegment[];
}

/**
 * Classify grade into a terrain type
 */
export function classifyTerrainType(gradePct: number): TerrainType {
  if (gradePct > 2) return 'uphill';
  if (gradePct < -2) return 'downhill';
  return 'flat';
}

/**
 * Classify grade into a specific bucket
 */
export function classifyGradeBucket(gradePct: number): GradeBucketKey {
  // Check buckets in order from most extreme to least extreme
  // This ensures proper classification at boundaries

  // Extreme grades
  if (gradePct >= 20) return 'climbing';
  if (gradePct <= -20) return 'technical_descent';

  // Uphill buckets
  if (gradePct >= 15 && gradePct < 20) return 'extreme_uphill';
  if (gradePct >= 12 && gradePct < 15) return 'very_steep_uphill';
  if (gradePct >= 10 && gradePct < 12) return 'steep_uphill';
  if (gradePct >= 8 && gradePct < 10) return 'hard_uphill';
  if (gradePct >= 6 && gradePct < 8) return 'moderate_uphill';
  if (gradePct >= 4 && gradePct < 6) return 'easy_uphill';
  if (gradePct >= 2 && gradePct < 4) return 'gentle_uphill';

  // Downhill buckets
  if (gradePct <= -15 && gradePct > -20) return 'extreme_downhill';
  if (gradePct <= -12 && gradePct > -15) return 'very_steep_downhill';
  if (gradePct <= -10 && gradePct > -12) return 'steep_downhill';
  if (gradePct <= -8 && gradePct > -10) return 'hard_downhill';
  if (gradePct <= -6 && gradePct > -8) return 'moderate_downhill';
  if (gradePct <= -4 && gradePct > -6) return 'easy_downhill';
  if (gradePct <= -2 && gradePct > -4) return 'gentle_downhill';

  // Flat
  return 'flat';
}

/**
 * Calculate pace for a segment given distance and duration
 */
function calculatePace(distanceKm: number, durationMin: number): number | null {
  if (distanceKm <= 0 || durationMin <= 0) return null;
  const paceMinKm = durationMin / distanceKm;

  // Filter unrealistic paces
  // Allow up to 30 min/km for steep uphill terrain (common in ultra/trail running)
  if (paceMinKm < 2.5 || paceMinKm > 30) return null;

  return paceMinKm;
}

/**
 * Analyze a single activity's terrain
 *
 * Takes an activity with elevation and distance streams and breaks it down
 * into terrain segments with calculated paces for each grade bucket.
 */
export function analyzeActivityTerrain(
  logEntry: LogEntry,
  logEntryId: string,
  userId: string
): ActivityTerrainAnalysis | null {
  // Require elevation stream, distance stream, and duration
  if (!logEntry.elevationStream || !logEntry.distanceStream || !logEntry.durationMin) {
    return null;
  }

  const elevStream = logEntry.elevationStream;
  const distStream = logEntry.distanceStream;
  const totalDurationMin = logEntry.durationMin;
  const totalDistanceKm = logEntry.km;

  // Minimal logging - only warn if data looks wrong
  if (distStream[0] !== 0) {
    console.warn('[analyzeActivityTerrain] Warning: first distance is not 0:', distStream[0]);
  }

  // Need at least 2 points to calculate grades
  if (elevStream.length < 2 || distStream.length < 2 || elevStream.length !== distStream.length) {
    return null;
  }

  // Calculate total elevation gain/loss to filter flat activities
  const minElev = Math.min(...elevStream);
  const maxElev = Math.max(...elevStream);
  const elevationRange = maxElev - minElev;

  // Skip activities with insufficient elevation variation (likely flat or bad data)
  // Require at least 10m per km (1% average grade variation)
  const minElevationRange = Math.max(10, totalDistanceKm * 10);
  if (elevationRange < minElevationRange) {
    return null;
  }

  // Helper to estimate pace adjustment factor based on grade
  function getPaceAdjustmentFactor(gradePct: number): number {
    // Base pace factor (1.0 = flat pace)
    // Uphill: slower (higher factor)
    // Downhill: faster (lower factor) but not too fast on steep descents

    if (gradePct >= 20) return 2.5;  // Extreme climbing
    if (gradePct >= 15) return 2.2;
    if (gradePct >= 12) return 1.9;
    if (gradePct >= 10) return 1.7;
    if (gradePct >= 8) return 1.5;
    if (gradePct >= 6) return 1.3;
    if (gradePct >= 4) return 1.15;
    if (gradePct >= 2) return 1.05;

    if (gradePct <= -15) return 1.3;  // Very steep descent - need to slow down
    if (gradePct <= -12) return 1.2;
    if (gradePct <= -10) return 1.1;
    if (gradePct <= -8) return 0.95;
    if (gradePct <= -6) return 0.9;
    if (gradePct <= -4) return 0.88;
    if (gradePct <= -2) return 0.92;

    return 1.0; // Flat
  }

  // First pass: collect segments with terrain-adjusted "effort"
  interface SegmentData {
    type: TerrainType;
    gradeBucket: GradeBucketKey;
    distanceKm: number;
    gradeAvgPct: number;
    elevationGainM: number;
    elevationLossM: number;
    adjustmentFactor: number;
    effort: number; // distance * adjustment factor
  }

  const segmentData: SegmentData[] = [];
  let currentSegmentType: TerrainType | null = null;
  let currentGradeBucket: GradeBucketKey | null = null;
  let segmentStartIdx = 0;
  let segmentElevGain = 0;
  let segmentElevLoss = 0;

  // Process each point
  for (let i = 1; i < elevStream.length; i++) {
    const prevElev = elevStream[i - 1];
    const currElev = elevStream[i];
    const prevDist = distStream[i - 1];
    const currDist = distStream[i];

    const elevDiff = currElev - prevElev;
    const distDiff = currDist - prevDist;

    if (distDiff <= 0) continue;

    const gradePct = (elevDiff / distDiff) * 100;
    const terrainType = classifyTerrainType(gradePct);
    const gradeBucket = classifyGradeBucket(gradePct);

    // Track elevation changes
    if (elevDiff > 0) {
      segmentElevGain += elevDiff;
    } else {
      segmentElevLoss += Math.abs(elevDiff);
    }

    const segmentChanged =
      currentSegmentType !== terrainType ||
      currentGradeBucket !== gradeBucket;

    const isLastPoint = i === elevStream.length - 1;

    if (segmentChanged || isLastPoint) {
      // Close current segment
      if (currentSegmentType !== null && currentGradeBucket !== null) {
        const endIdx = isLastPoint ? i : i - 1;
        const segmentDistMeters = distStream[endIdx] - distStream[segmentStartIdx];
        const segmentDistKm = segmentDistMeters / 1000;

        if (segmentDistKm > 0) {
          const gradeAvgPct = (elevStream[endIdx] - elevStream[segmentStartIdx]) / segmentDistMeters * 100;
          const adjustmentFactor = getPaceAdjustmentFactor(gradeAvgPct);
          const effort = segmentDistKm * adjustmentFactor;

          segmentData.push({
            type: currentSegmentType,
            gradeBucket: currentGradeBucket,
            distanceKm: segmentDistKm,
            gradeAvgPct: parseFloat(gradeAvgPct.toFixed(2)),
            elevationGainM: Math.round(segmentElevGain),
            elevationLossM: Math.round(segmentElevLoss),
            adjustmentFactor,
            effort,
          });
        }
      }

      // Start new segment
      if (segmentChanged && !isLastPoint) {
        segmentStartIdx = i;
        currentSegmentType = terrainType;
        currentGradeBucket = gradeBucket;
        segmentElevGain = 0;
        segmentElevLoss = 0;
      }
    }
  }

  // Second pass: allocate time based on effort, then create final segments
  const totalEffort = segmentData.reduce((sum, seg) => sum + seg.effort, 0);

  const segments: TerrainSegment[] = [];
  let totalUphillDist = 0;
  let totalDownhillDist = 0;
  let totalFlatDist = 0;
  let totalUphillTime = 0;
  let totalDownhillTime = 0;
  let totalFlatTime = 0;

  for (const seg of segmentData) {
    // Allocate time proportional to effort
    const segmentDurationMin = (seg.effort / totalEffort) * totalDurationMin;
    const segmentPace = calculatePace(seg.distanceKm, segmentDurationMin);

    if (segmentPace !== null) {
      segments.push({
        type: seg.type,
        gradeBucket: seg.gradeBucket,
        distanceKm: seg.distanceKm,
        durationMin: segmentDurationMin,
        paceMinKm: segmentPace,
        gradeAvgPct: seg.gradeAvgPct,
        elevationGainM: seg.elevationGainM,
        elevationLossM: seg.elevationLossM,
      });

      // Update summary stats
      if (seg.type === 'uphill') {
        totalUphillDist += seg.distanceKm;
        totalUphillTime += segmentDurationMin;
      } else if (seg.type === 'downhill') {
        totalDownhillDist += seg.distanceKm;
        totalDownhillTime += segmentDurationMin;
      } else {
        totalFlatDist += seg.distanceKm;
        totalFlatTime += segmentDurationMin;
      }
    }
  }

  // Calculate average paces for each terrain type
  const uphillPace = totalUphillDist > 0 ? totalUphillTime / totalUphillDist : null;
  const downhillPace = totalDownhillDist > 0 ? totalDownhillTime / totalDownhillDist : null;
  const flatPace = totalFlatDist > 0 ? totalFlatTime / totalFlatDist : null;

  // Calculate average grade across entire activity
  const totalElevChange = elevStream[elevStream.length - 1] - elevStream[0];
  const avgGradePct = (totalElevChange / (totalDistanceKm * 1000)) * 100;

  return {
    logEntryId,
    userId,
    activityDate: logEntry.dateISO,
    uphillDistanceKm: parseFloat(totalUphillDist.toFixed(2)),
    downhillDistanceKm: parseFloat(totalDownhillDist.toFixed(2)),
    flatDistanceKm: parseFloat(totalFlatDist.toFixed(2)),
    uphillPaceMinKm: uphillPace,
    downhillPaceMinKm: downhillPace,
    flatPaceMinKm: flatPace,
    avgGradePct: parseFloat(avgGradePct.toFixed(2)),
    segments,
  };
}

/**
 * Save terrain analysis to database
 */
export async function saveTerrainAnalysis(analysis: ActivityTerrainAnalysis): Promise<boolean> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('activity_terrain_analysis')
      .upsert({
        log_entry_id: analysis.logEntryId,
        user_id: analysis.userId,
        uphill_distance_km: analysis.uphillDistanceKm,
        downhill_distance_km: analysis.downhillDistanceKm,
        flat_distance_km: analysis.flatDistanceKm,
        uphill_pace_min_km: analysis.uphillPaceMinKm,
        downhill_pace_min_km: analysis.downhillPaceMinKm,
        flat_pace_min_km: analysis.flatPaceMinKm,
        avg_grade_pct: analysis.avgGradePct,
        segments_data: analysis.segments,
        activity_date: analysis.activityDate,
      }, {
        onConflict: 'log_entry_id'
      });

    if (error) {
      console.error('Error saving terrain analysis:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save terrain analysis:', err);
    return false;
  }
}

/**
 * Analyze all activities for a user that haven't been analyzed yet
 */
export async function analyzeUserActivities(userId?: string, forceReanalyze: boolean = false): Promise<number> {
  try {
    const supabase = getSupabase();
    const uid = userId || await getCurrentUserId();

    if (!uid) {
      console.error('No user ID available');
      return 0;
    }

    // If force re-analyze, delete all existing analyses for this user
    if (forceReanalyze) {
      console.log('[analyzeUserActivities] Force re-analyzing - deleting existing data...');
      const { error: deleteError } = await supabase
        .from('activity_terrain_analysis')
        .delete()
        .eq('user_id', uid);

      if (deleteError) {
        console.error('Error deleting existing analyses:', deleteError);
      }
    }

    // Get all log entries with elevation data that haven't been analyzed
    const { data: entries, error: fetchError } = await supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', uid)
      .not('elevation_stream', 'is', null)
      .not('distance_stream', 'is', null)
      .not('duration_min', 'is', null);

    if (fetchError) {
      console.error('Error fetching log entries:', fetchError);
      return 0;
    }

    if (!entries || entries.length === 0) {
      return 0;
    }

    let entriesToAnalyze = entries;

    // If not force re-analyze, filter out already analyzed entries
    if (!forceReanalyze) {
      // Get already analyzed entries
      const { data: analyzed, error: analyzedError } = await supabase
        .from('activity_terrain_analysis')
        .select('log_entry_id')
        .eq('user_id', uid);

      if (analyzedError) {
        console.error('Error fetching analyzed entries:', analyzedError);
        return 0;
      }

      const analyzedIds = new Set((analyzed || []).map(a => a.log_entry_id));

      // Filter to only unanalyzed entries
      entriesToAnalyze = entries.filter(e => !analyzedIds.has(e.id));
    }

    console.log(`[analyzeUserActivities] Analyzing ${entriesToAnalyze.length} activities...`);

    let successCount = 0;

    for (let idx = 0; idx < entriesToAnalyze.length; idx++) {
      const entry = entriesToAnalyze[idx];

      // Progress every 20 activities
      if (idx % 20 === 0) {
        console.log(`Progress: ${idx}/${entriesToAnalyze.length}`);
      }
      const logEntry: LogEntry = {
        title: entry.title,
        dateISO: entry.date,
        km: entry.km,
        durationMin: entry.duration_min,
        hrAvg: entry.hr_avg,
        source: entry.source,
        elevationGain: entry.elevation_gain,
        elevationStream: entry.elevation_stream,
        distanceStream: entry.distance_stream,
      };

      const analysis = analyzeActivityTerrain(logEntry, entry.id, uid);

      if (analysis) {
        const saved = await saveTerrainAnalysis(analysis);
        if (saved) {
          successCount++;
        }
      }
    }

    console.log(`[analyzeUserActivities] Successfully analyzed ${successCount} activities`);

    return successCount;
  } catch (err) {
    console.error('Failed to analyze user activities:', err);
    return 0;
  }
}
