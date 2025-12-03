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
 * Calculate weighted median pace from segments
 */
function calculateWeightedMedian(segments: WeightedSegment[]): number {
  if (segments.length === 0) return 0;

  // Sort by pace
  const sorted = [...segments].sort((a, b) => a.paceMinKm - b.paceMinKm);

  // Calculate total weight
  const totalWeight = sorted.reduce((sum, seg) => sum + seg.weight, 0);

  // Find weighted median
  let cumulativeWeight = 0;
  const halfWeight = totalWeight / 2;

  for (const seg of sorted) {
    cumulativeWeight += seg.weight;
    if (cumulativeWeight >= halfWeight) {
      return seg.paceMinKm;
    }
  }

  // Fallback to simple median
  return sorted[Math.floor(sorted.length / 2)].paceMinKm;
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
 */
export async function calculatePaceProfile(userId?: string): Promise<PaceProfile | null> {
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

        // Debug: show sample pace values
        const samplePaces = segments.slice(0, 10).map(s => s.paceMinKm.toFixed(2));
        const sortedPaces = [...segments].sort((a, b) => a.paceMinKm - b.paceMinKm);
        const min = sortedPaces[0]?.paceMinKm.toFixed(2);
        const max = sortedPaces[sortedPaces.length - 1]?.paceMinKm.toFixed(2);
        console.log(`[DEBUG] Bucket ${bucketKey}: Range ${min}-${max} min/km, sample paces:`, samplePaces.join(', '));

        const medianPace = calculateWeightedMedian(segments);

        console.log(`[DEBUG] Bucket ${bucketKey}: ${segments.length} segments, median pace: ${medianPace.toFixed(2)}`);

        gradeBucketPaces[bucketKey] = {
          bucket: bucketKey as GradeBucketKey,
          paceMinKm: parseFloat(medianPace.toFixed(2)),
          sampleSize: segments.length,
          confidence: determineConfidence(segments.length),
        };
      } else {
        console.log(`[DEBUG] Bucket ${bucketKey}: Only ${segments.length} segments (need 3+), skipping`);
      }
    }

    console.log(`[DEBUG] Final gradeBucketPaces:`, gradeBucketPaces);

    // Calculate overall terrain type paces (fallback)
    const uphillPace = segmentsByType.uphill.length > 0
      ? calculateWeightedMedian(segmentsByType.uphill)
      : 0;

    const downhillPace = segmentsByType.downhill.length > 0
      ? calculateWeightedMedian(segmentsByType.downhill)
      : 0;

    const flatPace = segmentsByType.flat.length > 0
      ? calculateWeightedMedian(segmentsByType.flat)
      : 0;

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
 */
export async function recalculatePaceProfile(userId?: string): Promise<PaceProfile | null> {
  const profile = await calculatePaceProfile(userId);

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
 */
export async function getOrCalculatePaceProfile(userId?: string): Promise<PaceProfile | null> {
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
  return await recalculatePaceProfile(userId);
}
