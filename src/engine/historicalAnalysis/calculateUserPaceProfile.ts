/**
 * Pace Profile Calculator
 *
 * Calculates personalized pace profiles from historical terrain analysis data.
 * Implements grade-bucketed calculation with recency weighting.
 */

import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import type { GradeBucketKey, TerrainType, TerrainSegment } from './analyzeActivityTerrain';
import { GRADE_BUCKETS, classifyTerrainType } from './analyzeActivityTerrain';

// Configuration based on user requirements
const RECENCY_CONFIG = {
  RECENT_DAYS: 30,
  RECENT_WEIGHT: 2.0,
  MEDIUM_DAYS: 90,
  MEDIUM_WEIGHT: 1.0,
  // Activities older than MEDIUM_DAYS are ignored
};

const MIN_DATA_REQUIREMENTS = {
  MIN_ACTIVITIES: 3,
  MIN_SEGMENTS_PER_TYPE: 5,
};

// Flat pace mode configuration
export type FlatPaceMode = 'accurate' | 'conservative' | 'fast';

const FLAT_PACE_PERCENTILES: Record<FlatPaceMode, number> = {
  accurate: 0.30,      // 30th percentile - race-capable speed
  conservative: 0.50,  // 50th percentile - median pace
  fast: 0.20,          // 20th percentile - aggressive predictions
};

// Pace calculation configuration
// Use configurable percentile for flat pace (better represents race output)
// Use 50th percentile (median) for uphill/downhill (represents typical effort)
const PACE_PERCENTILES = {
  UPHILL: 0.5,     // 50th percentile - median effort
  DOWNHILL: 0.5,   // 50th percentile - median effort
};

export interface GradeBucketPace {
  bucket: GradeBucketKey;
  paceMinKm: number;
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PaceProfile {
  userId: string;
  baseFlatPaceMinKm: number;
  uphillAdjustmentFactor: number;
  downhillAdjustmentFactor: number;
  gradeBucketPaces: Record<string, GradeBucketPace>;
  segmentCounts: {
    uphill: number;
    downhill: number;
    flat: number;
  };
  sampleSize: number;
  lastCalculatedAt: string;
  calculationPeriodDays: number;
  hasMinimumData: boolean;
  dataQuality: 'excellent' | 'good' | 'fair' | 'insufficient';
}

interface WeightedSegment extends TerrainSegment {
  weight: number;
  daysOld: number;
}

/**
 * Calculate recency weight based on activity age
 */
function calculateRecencyWeight(activityDate: string): { weight: number; daysOld: number } {
  const today = new Date();
  const actDate = new Date(activityDate);
  const daysOld = Math.floor((today.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24));

  let weight = 0;
  if (daysOld <= RECENCY_CONFIG.RECENT_DAYS) {
    weight = RECENCY_CONFIG.RECENT_WEIGHT;
  } else if (daysOld <= RECENCY_CONFIG.MEDIUM_DAYS) {
    weight = RECENCY_CONFIG.MEDIUM_WEIGHT;
  }
  // Activities older than 90 days get weight 0 (ignored)

  return { weight, daysOld };
}

/**
 * Filter outliers using IQR method
 * Returns segments with pace values within reasonable bounds
 */
function filterOutliers(segments: WeightedSegment[]): WeightedSegment[] {
  if (segments.length < 4) return segments; // Need at least 4 points for IQR

  // Extract pace values and sort
  const paces = segments.map(s => s.paceMinKm).sort((a, b) => a - b);

  // Calculate quartiles
  const q1Index = Math.floor(paces.length * 0.25);
  const q3Index = Math.floor(paces.length * 0.75);
  const q1 = paces[q1Index];
  const q3 = paces[q3Index];
  const iqr = q3 - q1;

  // Define outlier bounds (using 1.5 * IQR, standard statistical approach)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Filter segments
  const filtered = segments.filter(s => s.paceMinKm >= lowerBound && s.paceMinKm <= upperBound);

  // Log if we filtered any outliers
  if (filtered.length < segments.length) {
    console.log(`[filterOutliers] Filtered ${segments.length - filtered.length} outliers (bounds: ${lowerBound.toFixed(2)}-${upperBound.toFixed(2)} min/km)`);
  }

  return filtered;
}

/**
 * Calculate weighted percentile pace from segments
 * @param segments - Array of weighted segments
 * @param percentile - Target percentile (0.0 to 1.0), default 0.5 (median)
 */
function calculateWeightedPercentile(segments: WeightedSegment[], percentile: number = 0.5): number {
  if (segments.length === 0) return 0;

  // Sort by pace
  const sorted = [...segments].sort((a, b) => a.paceMinKm - b.paceMinKm);

  // Calculate total weight
  const totalWeight = sorted.reduce((sum, seg) => sum + seg.weight, 0);

  // Find weighted percentile
  let cumulativeWeight = 0;
  const targetWeight = totalWeight * percentile;

  for (const seg of sorted) {
    cumulativeWeight += seg.weight;
    if (cumulativeWeight >= targetWeight) {
      return seg.paceMinKm;
    }
  }

  // Fallback to simple percentile
  const index = Math.floor(sorted.length * percentile);
  return sorted[Math.min(index, sorted.length - 1)].paceMinKm;
}

/**
 * Calculate weighted median pace from segments (backward compatibility)
 */
function calculateWeightedMedian(segments: WeightedSegment[]): number {
  return calculateWeightedPercentile(segments, 0.5);
}

/**
 * Determine confidence level based on sample size
 */
function determineConfidence(sampleSize: number): 'high' | 'medium' | 'low' {
  if (sampleSize >= 15) return 'high';
  if (sampleSize >= 8) return 'medium';
  return 'low';
}

/**
 * Calculate pace profile from historical terrain analysis data
 * @param userId - User ID (optional, defaults to current user)
 * @param flatPaceMode - Mode for calculating flat pace percentile (default: 'accurate')
 */
export async function calculatePaceProfile(
  userId?: string,
  flatPaceMode: FlatPaceMode = 'accurate'
): Promise<PaceProfile | null> {
  try {
    const supabase = getSupabase();
    const uid = userId || await getCurrentUserId();

    if (!uid) {
      console.error('No user ID available');
      return null;
    }

    // Fetch all terrain analysis data within the calculation period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RECENCY_CONFIG.MEDIUM_DAYS);

    const { data: analyses, error } = await supabase
      .from('activity_terrain_analysis')
      .select('*')
      .eq('user_id', uid)
      .gte('activity_date', cutoffDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: false });

    if (error) {
      console.error('Error fetching terrain analyses:', error);
      return null;
    }

    if (!analyses || analyses.length < MIN_DATA_REQUIREMENTS.MIN_ACTIVITIES) {
      console.log('Insufficient data for pace profile calculation');
      return null;
    }

    // Collect all segments with recency weights
    const allWeightedSegments: WeightedSegment[] = [];

    for (const analysis of analyses) {
      const { weight, daysOld } = calculateRecencyWeight(analysis.activity_date);

      if (weight === 0) continue; // Skip activities older than 90 days

      const segments = analysis.segments_data as TerrainSegment[];

      for (const segment of segments) {
        allWeightedSegments.push({
          ...segment,
          weight,
          daysOld,
        });
      }
    }

    if (allWeightedSegments.length === 0) {
      console.log('No segments found after filtering');
      return null;
    }

    // Group segments by terrain type
    const segmentsByType: Record<TerrainType, WeightedSegment[]> = {
      uphill: [],
      downhill: [],
      flat: [],
    };

    for (const segment of allWeightedSegments) {
      segmentsByType[segment.type].push(segment);
    }

    // Check minimum segment requirements
    const hasMinimumData =
      segmentsByType.uphill.length >= MIN_DATA_REQUIREMENTS.MIN_SEGMENTS_PER_TYPE &&
      segmentsByType.downhill.length >= MIN_DATA_REQUIREMENTS.MIN_SEGMENTS_PER_TYPE &&
      segmentsByType.flat.length >= MIN_DATA_REQUIREMENTS.MIN_SEGMENTS_PER_TYPE;

    // Group segments by grade bucket
    const segmentsByBucket: Record<string, WeightedSegment[]> = {};

    console.log(`[DEBUG] Total weighted segments: ${allWeightedSegments.length}`);
    console.log(`[DEBUG] Sample segments:`, allWeightedSegments.slice(0, 5));

    for (const segment of allWeightedSegments) {
      const bucketKey = segment.gradeBucket;
      if (!segmentsByBucket[bucketKey]) {
        segmentsByBucket[bucketKey] = [];
      }
      segmentsByBucket[bucketKey].push(segment);
    }

    console.log(`[DEBUG] Segments by bucket:`, Object.keys(segmentsByBucket).map(key => `${key}: ${segmentsByBucket[key].length}`));

    // Calculate pace for each grade bucket
    const gradeBucketPaces: Record<string, GradeBucketPace> = {};

    for (const [bucketKey, segments] of Object.entries(segmentsByBucket)) {
      if (segments.length >= 3) {
        // Only calculate if we have at least 3 segments

        // Debug: show sample pace values before filtering
        const samplePaces = segments.slice(0, 10).map(s => s.paceMinKm.toFixed(2));
        const sortedPaces = [...segments].sort((a, b) => a.paceMinKm - b.paceMinKm);
        const min = sortedPaces[0]?.paceMinKm.toFixed(2);
        const max = sortedPaces[sortedPaces.length - 1]?.paceMinKm.toFixed(2);
        console.log(`[DEBUG] Bucket ${bucketKey}: Range ${min}-${max} min/km, sample paces:`, samplePaces.join(', '));

        // Filter outliers before calculating pace
        const filteredSegments = filterOutliers(segments);

        if (filteredSegments.length >= 3) {
          // Use configurable percentile for flat terrain, median for uphill/downhill
          const flatPercentile = FLAT_PACE_PERCENTILES[flatPaceMode];
          const percentile = bucketKey === 'flat' ? flatPercentile : PACE_PERCENTILES.UPHILL;
          const bucketPace = calculateWeightedPercentile(filteredSegments, percentile);

          const percentileLabel = bucketKey === 'flat'
            ? `${Math.round(percentile * 100)}th percentile (${flatPaceMode})`
            : 'median';
          console.log(`[DEBUG] Bucket ${bucketKey}: ${filteredSegments.length}/${segments.length} segments after outlier filtering, ${percentileLabel} pace: ${bucketPace.toFixed(2)}`);

          gradeBucketPaces[bucketKey] = {
            bucket: bucketKey as GradeBucketKey,
            paceMinKm: parseFloat(bucketPace.toFixed(2)),
            sampleSize: filteredSegments.length,
            confidence: determineConfidence(filteredSegments.length),
          };
        } else {
          console.log(`[DEBUG] Bucket ${bucketKey}: Only ${filteredSegments.length} segments after filtering (need 3+), skipping`);
        }
      } else {
        console.log(`[DEBUG] Bucket ${bucketKey}: Only ${segments.length} segments (need 3+), skipping`);
      }
    }

    console.log(`[DEBUG] Final gradeBucketPaces:`, gradeBucketPaces);

    // Calculate overall terrain type paces (fallback) with outlier filtering
    const uphillPace = segmentsByType.uphill.length > 0
      ? calculateWeightedMedian(filterOutliers(segmentsByType.uphill))
      : 0;

    const downhillPace = segmentsByType.downhill.length > 0
      ? calculateWeightedMedian(filterOutliers(segmentsByType.downhill))
      : 0;

    const flatPercentile = FLAT_PACE_PERCENTILES[flatPaceMode];
    const flatPace = segmentsByType.flat.length > 0
      ? calculateWeightedPercentile(filterOutliers(segmentsByType.flat), flatPercentile)
      : 0;

    // Log comparison of percentiles for flat pace
    if (segmentsByType.flat.length > 0) {
      const flatMedian = calculateWeightedMedian(filterOutliers(segmentsByType.flat));
      console.log(`[DEBUG] Flat pace comparison: ${Math.round(flatPercentile * 100)}th percentile (${flatPaceMode})=${flatPace.toFixed(2)}, median=${flatMedian.toFixed(2)} (using ${Math.round(flatPercentile * 100)}th for predictions)`);
    }

    // Use flat pace as base, or fallback to overall average if no flat segments
    let baseFlatPace = flatPace;
    if (baseFlatPace === 0 && allWeightedSegments.length > 0) {
      baseFlatPace = calculateWeightedMedian(allWeightedSegments);
    }

    // Calculate adjustment factors relative to flat pace
    const uphillAdjustmentFactor = baseFlatPace > 0 && uphillPace > 0
      ? uphillPace / baseFlatPace
      : 1.3; // Default fallback

    const downhillAdjustmentFactor = baseFlatPace > 0 && downhillPace > 0
      ? downhillPace / baseFlatPace
      : 0.85; // Default fallback

    // Determine data quality
    let dataQuality: 'excellent' | 'good' | 'fair' | 'insufficient';
    if (hasMinimumData && analyses.length >= 10) {
      dataQuality = 'excellent';
    } else if (hasMinimumData) {
      dataQuality = 'good';
    } else if (analyses.length >= MIN_DATA_REQUIREMENTS.MIN_ACTIVITIES) {
      dataQuality = 'fair';
    } else {
      dataQuality = 'insufficient';
    }

    const profile: PaceProfile = {
      userId: uid,
      baseFlatPaceMinKm: parseFloat(baseFlatPace.toFixed(2)),
      uphillAdjustmentFactor: parseFloat(uphillAdjustmentFactor.toFixed(3)),
      downhillAdjustmentFactor: parseFloat(downhillAdjustmentFactor.toFixed(3)),
      gradeBucketPaces,
      segmentCounts: {
        uphill: segmentsByType.uphill.length,
        downhill: segmentsByType.downhill.length,
        flat: segmentsByType.flat.length,
      },
      sampleSize: analyses.length,
      lastCalculatedAt: new Date().toISOString(),
      calculationPeriodDays: RECENCY_CONFIG.MEDIUM_DAYS,
      hasMinimumData,
      dataQuality,
    };

    return profile;
  } catch (err) {
    console.error('Failed to calculate pace profile:', err);
    return null;
  }
}

/**
 * Save pace profile to database
 */
export async function savePaceProfile(profile: PaceProfile): Promise<boolean> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('user_pace_profiles')
      .upsert({
        user_id: profile.userId,
        base_flat_pace_min_km: profile.baseFlatPaceMinKm,
        uphill_pace_adjustment_factor: profile.uphillAdjustmentFactor,
        downhill_pace_adjustment_factor: profile.downhillAdjustmentFactor,
        grade_bucket_paces: profile.gradeBucketPaces,
        sample_size: profile.sampleSize,
        min_segments_per_type: profile.segmentCounts,
        last_calculated_at: profile.lastCalculatedAt,
        calculation_period_days: profile.calculationPeriodDays,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving pace profile:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save pace profile:', err);
    return false;
  }
}

/**
 * Get pace profile from database
 */
export async function getPaceProfile(userId?: string): Promise<PaceProfile | null> {
  try {
    const supabase = getSupabase();
    const uid = userId || await getCurrentUserId();

    if (!uid) return null;

    const { data, error } = await supabase
      .from('user_pace_profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('Error fetching pace profile:', error);
      return null;
    }

    if (!data) return null;

    // Check if profile is stale (older than 7 days)
    const lastCalc = new Date(data.last_calculated_at);
    const daysSinceCalc = Math.floor((Date.now() - lastCalc.getTime()) / (1000 * 60 * 60 * 24));
    const isStale = daysSinceCalc > 7;

    // Convert database format to PaceProfile
    const profile: PaceProfile = {
      userId: data.user_id,
      baseFlatPaceMinKm: parseFloat(data.base_flat_pace_min_km),
      uphillAdjustmentFactor: parseFloat(data.uphill_pace_adjustment_factor),
      downhillAdjustmentFactor: parseFloat(data.downhill_pace_adjustment_factor),
      gradeBucketPaces: data.grade_bucket_paces as Record<string, GradeBucketPace>,
      segmentCounts: data.min_segments_per_type as any,
      sampleSize: data.sample_size,
      lastCalculatedAt: data.last_calculated_at,
      calculationPeriodDays: data.calculation_period_days,
      hasMinimumData: true, // Assume true if profile exists
      dataQuality: 'good', // Default
    };

    // If profile is stale, trigger background recalculation
    if (isStale) {
      console.log('Pace profile is stale, triggering recalculation');
      recalculatePaceProfileBackground(uid);
    }

    return profile;
  } catch (err) {
    console.error('Failed to get pace profile:', err);
    return null;
  }
}

/**
 * Recalculate and save pace profile (foreground)
 * @param userId - User ID (optional)
 * @param flatPaceMode - Mode for calculating flat pace percentile (optional, will fetch from settings if not provided)
 */
export async function recalculatePaceProfile(
  userId?: string,
  flatPaceMode?: FlatPaceMode
): Promise<PaceProfile | null> {
  // Fetch flat pace mode from user settings if not provided
  let mode = flatPaceMode;
  if (!mode) {
    try {
      const { getUserSettings } = await import('@/lib/userSettings');
      const settings = await getUserSettings();
      mode = (settings.flat_pace_mode as FlatPaceMode) || 'accurate';
    } catch (err) {
      console.error('Failed to fetch flat pace mode from settings, using default:', err);
      mode = 'accurate';
    }
  }

  const profile = await calculatePaceProfile(userId, mode);

  if (profile) {
    await savePaceProfile(profile);
  }

  return profile;
}

/**
 * Trigger background recalculation (non-blocking)
 */
export function recalculatePaceProfileBackground(userId: string): void {
  // Fire and forget
  recalculatePaceProfile(userId).catch(err => {
    console.error('Background pace profile recalculation failed:', err);
  });
}

/**
 * Get or calculate pace profile
 *
 * This is the main entry point for getting a user's pace profile.
 * It will return cached profile if available and fresh, otherwise recalculate.
 * @param userId - User ID (optional)
 * @param flatPaceMode - Mode for calculating flat pace percentile (optional, will fetch from settings if not provided)
 */
export async function getOrCalculatePaceProfile(
  userId?: string,
  flatPaceMode?: FlatPaceMode
): Promise<PaceProfile | null> {
  // Try to get existing profile
  const existing = await getPaceProfile(userId);

  if (existing) {
    const daysSinceCalc = Math.floor(
      (Date.now() - new Date(existing.lastCalculatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Use cached if less than 7 days old
    if (daysSinceCalc <= 7) {
      return existing;
    }
  }

  // Otherwise recalculate
  return await recalculatePaceProfile(userId, flatPaceMode);
}
