/**
 * Terrain Analysis Engine
 *
 * Analyzes activity streams to extract trail-specific performance metrics:
 * - Grade-binned statistics (pace, HR, cadence per terrain type)
 * - Downhill braking detection
 * - Terrain technicality scoring
 * - VAM (Vertical Ascent Meters) calculation
 * - Climbing/descending efficiency
 */

import { supabase } from '@/lib/supabase';

// =====================================================================
//  TYPE DEFINITIONS
// =====================================================================

export interface ActivityStreams {
  timeSeries: number[] | null;
  distanceSeries: number[] | null;
  altitudeSeries: number[] | null;
  gradeSeries: number[] | null;
  velocitySeries: number[] | null;
  heartrateSeries: number[] | null;
  cadenceSeries: number[] | null;
  streamLength: number;
  dataQuality: number;
}

export interface TerrainClassification {
  flat: number[];           // indices where grade is -2% to +2%
  rolling: number[];        // 3% to 8%
  steepUphill: number[];    // 9% to 20%
  verySteepUphill: number[]; // 20%+
  runnableDownhill: number[]; // -5% to -12%
  technicalDownhill: number[]; // < -12%
}

export interface GradeBinnedStats {
  flat?: { pace: number; hr: number; cadence: number; timeSeconds: number };
  rolling?: { pace: number; hr: number; cadence: number; timeSeconds: number };
  steepUphill?: { pace: number; hr: number; cadence: number; timeSeconds: number };
  verySteepUphill?: { pace: number; hr: number; cadence: number; timeSeconds: number };
  runnableDownhill?: { pace: number; hr: number; cadence: number; timeSeconds: number };
  technicalDownhill?: { pace: number; hr: number; cadence: number; timeSeconds: number };
}

export interface BrakingEvent {
  index: number;
  grade: number;
  actualPace: number;
  expectedPace: number;
  cadenceDrop: boolean;
  severity: number;
}

export interface TerrainAnalysis {
  gradeBins: GradeBinnedStats;
  vam: number | null;
  downhillBrakingScore: number | null;
  technicalityScore: number | null;
  timeFlat: number;
  timeRolling: number;
  timeSteepUphill: number;
  timeVerySteepUphill: number;
  timeRunnableDownhill: number;
  timeTechnicalDownhill: number;
  paceFlat: number | null;
  paceRolling: number | null;
  paceSteepUphill: number | null;
  paceVerySteepUphill: number | null;
  paceRunnableDownhill: number | null;
  paceTechnicalDownhill: number | null;
  hrFlat: number | null;
  hrRolling: number | null;
  hrSteepUphill: number | null;
  hrVerySteepUphill: number | null;
  hrRunnableDownhill: number | null;
  hrTechnicalDownhill: number | null;
  cadenceFlat: number | null;
  cadenceRolling: number | null;
  cadenceSteepUphill: number | null;
  cadenceVerySteepUphill: number | null;
  cadenceRunnableDownhill: number | null;
  cadenceTechnicalDownhill: number | null;
}

// =====================================================================
//  TERRAIN CLASSIFICATION
// =====================================================================

/**
 * Classify each point in the activity into terrain types based on grade
 */
export function classifyTerrain(gradeSeries: number[]): TerrainClassification {
  const classification: TerrainClassification = {
    flat: [],
    rolling: [],
    steepUphill: [],
    verySteepUphill: [],
    runnableDownhill: [],
    technicalDownhill: []
  };

  gradeSeries.forEach((grade, index) => {
    if (grade >= -2 && grade <= 2) {
      classification.flat.push(index);
    } else if (grade > 2 && grade <= 8) {
      classification.rolling.push(index);
    } else if (grade > 8 && grade <= 20) {
      classification.steepUphill.push(index);
    } else if (grade > 20) {
      classification.verySteepUphill.push(index);
    } else if (grade < -2 && grade >= -12) {
      classification.runnableDownhill.push(index);
    } else if (grade < -12) {
      classification.technicalDownhill.push(index);
    }
  });

  return classification;
}

// =====================================================================
//  GRADE-BINNED STATISTICS
// =====================================================================

/**
 * Calculate average pace, HR, and cadence for each terrain type
 */
export function computeGradeBinnedStats(
  classification: TerrainClassification,
  streams: ActivityStreams
): GradeBinnedStats {
  const stats: GradeBinnedStats = {};

  const computeStatsForBin = (indices: number[], name: string) => {
    if (indices.length === 0) return null;

    const paces: number[] = [];
    const hrs: number[] = [];
    const cadences: number[] = [];
    let totalTime = 0;

    indices.forEach(i => {
      // Calculate pace from velocity (m/s to min/km)
      if (streams.velocitySeries && streams.velocitySeries[i] > 0) {
        const pace = (1000 / 60) / streams.velocitySeries[i]; // min/km
        if (pace > 0 && pace < 30) { // Filter outliers
          paces.push(pace);
        }
      }

      if (streams.heartrateSeries && streams.heartrateSeries[i]) {
        hrs.push(streams.heartrateSeries[i]);
      }

      if (streams.cadenceSeries && streams.cadenceSeries[i]) {
        cadences.push(streams.cadenceSeries[i]);
      }

      // Calculate time spent (use time series if available)
      if (streams.timeSeries && i < streams.timeSeries.length - 1) {
        totalTime += (streams.timeSeries[i + 1] - streams.timeSeries[i]);
      }
    });

    if (paces.length === 0) return null;

    return {
      pace: median(paces),
      hr: hrs.length > 0 ? Math.round(average(hrs)) : 0,
      cadence: cadences.length > 0 ? Math.round(average(cadences)) : 0,
      timeSeconds: Math.round(totalTime)
    };
  };

  const flatStats = computeStatsForBin(classification.flat, 'flat');
  const rollingStats = computeStatsForBin(classification.rolling, 'rolling');
  const steepUphillStats = computeStatsForBin(classification.steepUphill, 'steepUphill');
  const verySteepUphillStats = computeStatsForBin(classification.verySteepUphill, 'verySteepUphill');
  const runnableDownhillStats = computeStatsForBin(classification.runnableDownhill, 'runnableDownhill');
  const technicalDownhillStats = computeStatsForBin(classification.technicalDownhill, 'technicalDownhill');

  if (flatStats) stats.flat = flatStats;
  if (rollingStats) stats.rolling = rollingStats;
  if (steepUphillStats) stats.steepUphill = steepUphillStats;
  if (verySteepUphillStats) stats.verySteepUphill = verySteepUphillStats;
  if (runnableDownhillStats) stats.runnableDownhill = runnableDownhillStats;
  if (technicalDownhillStats) stats.technicalDownhill = technicalDownhillStats;

  return stats;
}

// =====================================================================
//  DOWNHILL BRAKING DETECTION
// =====================================================================

/**
 * Detect downhill braking patterns
 * Returns a score from 0 (no braking) to 1 (severe braking)
 */
export function computeDownhillBraking(
  gradeSeries: number[],
  velocitySeries: number[],
  cadenceSeries: number[] | null
): { score: number; events: BrakingEvent[] } {
  const brakingEvents: BrakingEvent[] = [];

  // Calculate rolling average cadence for comparison
  const cadenceAvg = cadenceSeries ? rollingAverage(cadenceSeries, 20) : [];

  for (let i = 1; i < gradeSeries.length - 1; i++) {
    const grade = gradeSeries[i];

    // Only consider downhill segments steep enough for acceleration
    if (grade < -5) {
      const velocity = velocitySeries[i];
      if (velocity === 0) continue;

      const actualPace = (1000 / 60) / velocity; // min/km
      const expectedPace = expectedDownhillPace(grade);

      // Detect braking: actual pace is 25% slower than expected
      if (actualPace > expectedPace * 1.25) {
        // Check cadence drop as additional braking indicator
        const cadenceDrop = cadenceSeries && cadenceAvg[i]
          ? cadenceSeries[i] < cadenceAvg[i] * 0.9
          : false;

        const severity = (actualPace / expectedPace) - 1.0;

        brakingEvents.push({
          index: i,
          grade,
          actualPace,
          expectedPace,
          cadenceDrop,
          severity: severity + (cadenceDrop ? 0.1 : 0)
        });
      }
    }
  }

  if (brakingEvents.length === 0) {
    return { score: 0, events: [] };
  }

  // Calculate overall braking score
  const totalSeverity = brakingEvents.reduce((sum, e) => sum + e.severity, 0);
  const brakingScore = Math.min(1.0, totalSeverity / 50); // Normalize to 0-1

  return { score: brakingScore, events: brakingEvents };
}

/**
 * Expected downhill pace based on grade (empirical curve)
 * Returns min/km
 */
function expectedDownhillPace(grade: number): number {
  // Empirical model: optimal downhill pace gets faster until -12%, then slows
  if (grade >= -5) return 5.0;
  if (grade >= -8) return 4.5;
  if (grade >= -12) return 4.0;
  if (grade >= -15) return 4.5; // Steeper = need to slow down
  return 5.5; // Very steep = much slower
}

// =====================================================================
//  TERRAIN TECHNICALITY SCORING
// =====================================================================

/**
 * Compute terrain technicality score (0-1)
 * Based on pace variance, cadence instability, and micro-stops
 */
export function computeTechnicalityScore(
  gradeSeries: number[],
  velocitySeries: number[],
  cadenceSeries: number[] | null
): number {
  // 1. Pace variance within same grade bins
  const gradeBins: { [key: string]: number[] } = {};

  gradeSeries.forEach((grade, i) => {
    const bin = Math.floor(grade / 5) * 5; // 5% bins
    if (!gradeBins[bin]) gradeBins[bin] = [];

    const velocity = velocitySeries[i];
    if (velocity > 0) {
      const pace = (1000 / 60) / velocity;
      if (pace > 0 && pace < 30) {
        gradeBins[bin].push(pace);
      }
    }
  });

  const paceVariances: number[] = [];
  Object.values(gradeBins).forEach(paces => {
    if (paces.length > 5) {
      const variance = standardDeviation(paces) / average(paces); // Coefficient of variation
      paceVariances.push(variance);
    }
  });

  const paceComponent = paceVariances.length > 0
    ? Math.min(1.0, average(paceVariances) / 0.3) // Normalize
    : 0;

  // 2. Cadence variance (technical terrain causes uneven steps)
  let cadenceComponent = 0;
  if (cadenceSeries && cadenceSeries.length > 0) {
    const validCadence = cadenceSeries.filter(c => c > 0);
    if (validCadence.length > 0) {
      const cadenceVar = standardDeviation(validCadence) / average(validCadence);
      cadenceComponent = Math.min(1.0, cadenceVar / 0.2);
    }
  }

  // 3. Micro-stops (near-zero pace indicating obstacles)
  const microStops = velocitySeries.filter(v => v > 0 && v < 0.5).length;
  const stopComponent = Math.min(1.0, microStops / velocitySeries.length / 0.1);

  // Weighted fusion
  const techScore = (
    0.6 * paceComponent +
    0.25 * cadenceComponent +
    0.15 * stopComponent
  );

  return Math.min(1.0, techScore);
}

// =====================================================================
//  VAM CALCULATION
// =====================================================================

/**
 * Calculate Vertical Ascent Meters per hour
 */
export function computeVAM(
  altitudeSeries: number[],
  timeSeries: number[],
  gradeSeries: number[]
): number | null {
  if (!altitudeSeries || !timeSeries || altitudeSeries.length < 2) {
    return null;
  }

  let totalClimbing = 0;
  let climbingTime = 0;

  for (let i = 1; i < altitudeSeries.length; i++) {
    const grade = gradeSeries[i];

    // Only count meaningful climbing (grade > 3%)
    if (grade > 3) {
      const elevGain = altitudeSeries[i] - altitudeSeries[i - 1];
      if (elevGain > 0) {
        totalClimbing += elevGain;
        climbingTime += (timeSeries[i] - timeSeries[i - 1]);
      }
    }
  }

  if (climbingTime === 0) return null;

  // Convert to meters per hour
  const vam = (totalClimbing / climbingTime) * 3600;
  return Math.round(vam);
}

// =====================================================================
//  MAIN ANALYSIS FUNCTION
// =====================================================================

/**
 * Perform complete terrain analysis on activity streams
 */
export async function analyzeActivityTerrain(
  logEntryId: string,
  streams: ActivityStreams
): Promise<TerrainAnalysis | null> {
  if (!streams.gradeSeries || !streams.velocitySeries || streams.gradeSeries.length === 0) {
    console.log('Insufficient stream data for terrain analysis');
    return null;
  }

  // 1. Classify terrain
  const classification = classifyTerrain(streams.gradeSeries);

  // 2. Compute grade-binned statistics
  const gradeBins = computeGradeBinnedStats(classification, streams);

  // 3. Compute VAM
  const vam = streams.altitudeSeries && streams.timeSeries
    ? computeVAM(streams.altitudeSeries, streams.timeSeries, streams.gradeSeries)
    : null;

  // 4. Compute downhill braking
  const braking = computeDownhillBraking(
    streams.gradeSeries,
    streams.velocitySeries,
    streams.cadenceSeries
  );

  // 5. Compute technicality score
  const technicalityScore = computeTechnicalityScore(
    streams.gradeSeries,
    streams.velocitySeries,
    streams.cadenceSeries
  );

  // Build complete analysis object
  const analysis: TerrainAnalysis = {
    gradeBins,
    vam,
    downhillBrakingScore: braking.score,
    technicalityScore,
    timeFlat: gradeBins.flat?.timeSeconds || 0,
    timeRolling: gradeBins.rolling?.timeSeconds || 0,
    timeSteepUphill: gradeBins.steepUphill?.timeSeconds || 0,
    timeVerySteepUphill: gradeBins.verySteepUphill?.timeSeconds || 0,
    timeRunnableDownhill: gradeBins.runnableDownhill?.timeSeconds || 0,
    timeTechnicalDownhill: gradeBins.technicalDownhill?.timeSeconds || 0,
    paceFlat: gradeBins.flat?.pace || null,
    paceRolling: gradeBins.rolling?.pace || null,
    paceSteepUphill: gradeBins.steepUphill?.pace || null,
    paceVerySteepUphill: gradeBins.verySteepUphill?.pace || null,
    paceRunnableDownhill: gradeBins.runnableDownhill?.pace || null,
    paceTechnicalDownhill: gradeBins.technicalDownhill?.pace || null,
    hrFlat: gradeBins.flat?.hr || null,
    hrRolling: gradeBins.rolling?.hr || null,
    hrSteepUphill: gradeBins.steepUphill?.hr || null,
    hrVerySteepUphill: gradeBins.verySteepUphill?.hr || null,
    hrRunnableDownhill: gradeBins.runnableDownhill?.hr || null,
    hrTechnicalDownhill: gradeBins.technicalDownhill?.hr || null,
    cadenceFlat: gradeBins.flat?.cadence || null,
    cadenceRolling: gradeBins.rolling?.cadence || null,
    cadenceSteepUphill: gradeBins.steepUphill?.cadence || null,
    cadenceVerySteepUphill: gradeBins.verySteepUphill?.cadence || null,
    cadenceRunnableDownhill: gradeBins.runnableDownhill?.cadence || null,
    cadenceTechnicalDownhill: gradeBins.technicalDownhill?.cadence || null,
  };

  // Store analysis in database
  await storeTerrainAnalysis(logEntryId, analysis);

  return analysis;
}

/**
 * Store terrain analysis in database
 */
async function storeTerrainAnalysis(
  logEntryId: string,
  analysis: TerrainAnalysis
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('activity_terrain_analysis')
    .upsert({
      user_id: user.id,
      log_entry_id: logEntryId,
      grade_bins: analysis.gradeBins as any,
      vam: analysis.vam,
      downhill_braking_score: analysis.downhillBrakingScore,
      technicality_score: analysis.technicalityScore,
      time_flat: analysis.timeFlat,
      time_rolling: analysis.timeRolling,
      time_steep_uphill: analysis.timeSteepUphill,
      time_very_steep_uphill: analysis.timeVerySteepUphill,
      time_runnable_downhill: analysis.timeRunnableDownhill,
      time_technical_downhill: analysis.timeTechnicalDownhill,
      pace_flat: analysis.paceFlat,
      pace_rolling: analysis.paceRolling,
      pace_steep_uphill: analysis.paceSteepUphill,
      pace_very_steep_uphill: analysis.paceVerySteepUphill,
      pace_runnable_downhill: analysis.paceRunnableDownhill,
      pace_technical_downhill: analysis.paceTechnicalDownhill,
      hr_flat: analysis.hrFlat,
      hr_rolling: analysis.hrRolling,
      hr_steep_uphill: analysis.hrSteepUphill,
      hr_very_steep_uphill: analysis.hrVerySteepUphill,
      hr_runnable_downhill: analysis.hrRunnableDownhill,
      hr_technical_downhill: analysis.hrTechnicalDownhill,
      cadence_flat: analysis.cadenceFlat,
      cadence_rolling: analysis.cadenceRolling,
      cadence_steep_uphill: analysis.cadenceSteepUphill,
      cadence_very_steep_uphill: analysis.cadenceVerySteepUphill,
      cadence_runnable_downhill: analysis.cadenceRunnableDownhill,
      cadence_technical_downhill: analysis.cadenceTechnicalDownhill,
      analysis_version: '1.0',
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'log_entry_id'
    });

  if (error) {
    console.error('Error storing terrain analysis:', error);
  } else {
    console.log('Terrain analysis stored successfully');
  }
}

// =====================================================================
//  UTILITY FUNCTIONS
// =====================================================================

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function standardDeviation(arr: number[]): number {
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

function rollingAverage(arr: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(arr.length, i + Math.floor(windowSize / 2) + 1);
    const window = arr.slice(start, end);
    result.push(average(window));
  }
  return result;
}
