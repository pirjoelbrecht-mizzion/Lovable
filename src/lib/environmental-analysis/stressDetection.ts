/**
 * Physiological Stress Detection System
 *
 * Detects HR drift, pace degradation, VAM decline, and cadence drops
 * that correlate with environmental heat stress
 */

export interface HRDrift {
  detected: boolean;
  magnitude_bpm: number;
  start_km: number;
  start_index: number;
  baseline_hr: number;
  peak_hr: number;
  sustained: boolean; // True if drift persists, not just temporary spike
}

export interface PaceDegradation {
  detected: boolean;
  degradation_percent: number;
  start_km: number;
  start_index: number;
  baseline_pace_min_km: number;
  degraded_pace_min_km: number;
  controlled_for_grade: boolean;
}

export interface VAMDecline {
  detected: boolean;
  decline_percent: number;
  early_vam: number;
  late_vam: number;
  climb_segments_analyzed: number;
}

export interface CadenceDrop {
  detected: boolean;
  drop_percent: number;
  start_km: number;
  baseline_cadence: number;
  dropped_cadence: number;
}

export interface PhysiologicalStress {
  hr_drift: HRDrift;
  pace_degradation: PaceDegradation;
  vam_decline: VAMDecline;
  cadence_drop: CadenceDrop;
  overall_stress_detected: boolean;
}

const HR_DRIFT_THRESHOLD_BPM = 10;
const PACE_DEGRADATION_THRESHOLD = 0.15; // 15%
const VAM_DECLINE_THRESHOLD = 0.20; // 20%
const CADENCE_DROP_THRESHOLD = 0.08; // 8%

/**
 * Detects heart rate drift over the course of activity
 */
export function detectHRDrift(
  heartRateStream: number[],
  distanceStream: number[],
  baselineMinutes: number = 60
): HRDrift {
  if (heartRateStream.length < 100 || heartRateStream.length !== distanceStream.length) {
    return {
      detected: false,
      magnitude_bpm: 0,
      start_km: 0,
      start_index: 0,
      baseline_hr: 0,
      peak_hr: 0,
      sustained: false
    };
  }

  // Calculate baseline from first hour (excluding initial warm-up spike)
  const baselineStartIndex = Math.min(Math.floor(heartRateStream.length * 0.1), 50);
  const baselineEndIndex = Math.min(Math.floor(heartRateStream.length * 0.3), baselineStartIndex + 100);

  const baselineSegment = heartRateStream.slice(baselineStartIndex, baselineEndIndex);
  const baselineHR = baselineSegment.reduce((a, b) => a + b, 0) / baselineSegment.length;

  // Look for sustained elevation in later segments
  let maxDrift = 0;
  let driftStartIndex = 0;
  let peakHR = baselineHR;

  // Analyze 20-minute rolling windows
  const windowSize = Math.min(20, Math.floor(heartRateStream.length * 0.1));

  for (let i = baselineEndIndex; i < heartRateStream.length - windowSize; i += windowSize) {
    const segment = heartRateStream.slice(i, i + windowSize);
    const segmentAvg = segment.reduce((a, b) => a + b, 0) / segment.length;
    const drift = segmentAvg - baselineHR;

    if (drift > maxDrift) {
      maxDrift = drift;
      driftStartIndex = i;
      peakHR = segmentAvg;
    }
  }

  // Check if drift is sustained (not just a temporary spike)
  let sustained = false;
  if (maxDrift > HR_DRIFT_THRESHOLD_BPM && driftStartIndex > 0) {
    const postDriftSegment = heartRateStream.slice(driftStartIndex, Math.min(driftStartIndex + windowSize * 3, heartRateStream.length));
    const postDriftAvg = postDriftSegment.reduce((a, b) => a + b, 0) / postDriftSegment.length;
    sustained = (postDriftAvg - baselineHR) > (HR_DRIFT_THRESHOLD_BPM * 0.7);
  }

  return {
    detected: maxDrift > HR_DRIFT_THRESHOLD_BPM,
    magnitude_bpm: maxDrift,
    start_km: driftStartIndex > 0 ? distanceStream[driftStartIndex] / 1000 : 0,
    start_index: driftStartIndex,
    baseline_hr: baselineHR,
    peak_hr: peakHR,
    sustained
  };
}

/**
 * Detects pace degradation independent of terrain
 */
export function detectPaceDegradation(
  velocityStream: number[], // m/s
  distanceStream: number[],
  gradeStream?: number[]
): PaceDegradation {
  if (velocityStream.length < 100 || velocityStream.length !== distanceStream.length) {
    return {
      detected: false,
      degradation_percent: 0,
      start_km: 0,
      start_index: 0,
      baseline_pace_min_km: 0,
      degraded_pace_min_km: 0,
      controlled_for_grade: false
    };
  }

  // Calculate baseline pace from first 30% (stable running)
  const baselineEndIndex = Math.floor(velocityStream.length * 0.3);
  const baselineSegment = velocityStream.slice(0, baselineEndIndex);

  // Filter out very slow points (walking, aid stations)
  const validBaselinePaces = baselineSegment.filter(v => v > 0.5); // > 2km/h
  if (validBaselinePaces.length === 0) {
    return {
      detected: false,
      degradation_percent: 0,
      start_km: 0,
      start_index: 0,
      baseline_pace_min_km: 0,
      degraded_pace_min_km: 0,
      controlled_for_grade: false
    };
  }

  const baselineVelocity = validBaselinePaces.reduce((a, b) => a + b, 0) / validBaselinePaces.length;
  const baselinePaceMinKm = 1000 / (baselineVelocity * 60); // Convert to min/km

  // Analyze later segments for degradation
  const windowSize = Math.min(20, Math.floor(velocityStream.length * 0.1));
  let maxDegradation = 0;
  let degradationStartIndex = 0;
  let degradedPace = baselinePaceMinKm;

  for (let i = baselineEndIndex; i < velocityStream.length - windowSize; i += windowSize) {
    const segment = velocityStream.slice(i, i + windowSize);
    const validPaces = segment.filter(v => v > 0.5);

    if (validPaces.length < windowSize * 0.5) continue; // Skip if too much walking

    const segmentVelocity = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;

    // If we have grade data, only compare similar grade sections
    let gradeAdjusted = true;
    if (gradeStream && gradeStream.length === velocityStream.length) {
      const baselineGrade = gradeStream.slice(0, baselineEndIndex).reduce((a, b) => a + b, 0) / baselineEndIndex;
      const segmentGrade = gradeStream.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;

      // Only compare if grades are similar (within 3%)
      if (Math.abs(segmentGrade - baselineGrade) > 0.03) {
        gradeAdjusted = false;
        continue;
      }
    }

    const degradation = (baselineVelocity - segmentVelocity) / baselineVelocity;

    if (degradation > maxDegradation) {
      maxDegradation = degradation;
      degradationStartIndex = i;
      degradedPace = 1000 / (segmentVelocity * 60);
    }
  }

  return {
    detected: maxDegradation > PACE_DEGRADATION_THRESHOLD,
    degradation_percent: maxDegradation * 100,
    start_km: degradationStartIndex > 0 ? distanceStream[degradationStartIndex] / 1000 : 0,
    start_index: degradationStartIndex,
    baseline_pace_min_km: baselinePaceMinKm,
    degraded_pace_min_km: degradedPace,
    controlled_for_grade: gradeStream !== undefined
  };
}

/**
 * Detects VAM (Vertical Ascent per Minute) decline
 */
export function detectVAMDecline(
  elevationStream: number[],
  timeStream: Date[],
  distanceStream: number[]
): VAMDecline {
  if (elevationStream.length !== timeStream.length || elevationStream.length < 100) {
    return {
      detected: false,
      decline_percent: 0,
      early_vam: 0,
      late_vam: 0,
      climb_segments_analyzed: 0
    };
  }

  interface ClimbSegment {
    start_index: number;
    end_index: number;
    elevation_gain: number;
    duration_minutes: number;
    vam: number;
  }

  const climbSegments: ClimbSegment[] = [];

  // Identify climb segments (sustained elevation gain > 50m)
  let climbStart: number | null = null;
  let climbStartElevation = 0;

  for (let i = 1; i < elevationStream.length; i++) {
    const elevationGain = elevationStream[i] - elevationStream[i - 1];

    if (elevationGain > 3 && !climbStart) {
      climbStart = i;
      climbStartElevation = elevationStream[i];
    }

    if (climbStart && (elevationGain < 1 || i === elevationStream.length - 1)) {
      const totalGain = elevationStream[i] - climbStartElevation;
      const duration = (timeStream[i].getTime() - timeStream[climbStart].getTime()) / (1000 * 60);

      if (totalGain > 50 && duration > 5) {
        const vam = totalGain / duration;
        climbSegments.push({
          start_index: climbStart,
          end_index: i,
          elevation_gain: totalGain,
          duration_minutes: duration,
          vam
        });
      }

      climbStart = null;
    }
  }

  if (climbSegments.length < 2) {
    return {
      detected: false,
      decline_percent: 0,
      early_vam: 0,
      late_vam: 0,
      climb_segments_analyzed: climbSegments.length
    };
  }

  // Compare early vs late climbs
  const earlyClimbs = climbSegments.slice(0, Math.ceil(climbSegments.length / 2));
  const lateClimbs = climbSegments.slice(Math.floor(climbSegments.length / 2));

  const earlyVAM = earlyClimbs.reduce((sum, c) => sum + c.vam, 0) / earlyClimbs.length;
  const lateVAM = lateClimbs.reduce((sum, c) => sum + c.vam, 0) / lateClimbs.length;

  const decline = (earlyVAM - lateVAM) / earlyVAM;

  return {
    detected: decline > VAM_DECLINE_THRESHOLD,
    decline_percent: decline * 100,
    early_vam: earlyVAM,
    late_vam: lateVAM,
    climb_segments_analyzed: climbSegments.length
  };
}

/**
 * Detects cadence drop patterns
 */
export function detectCadenceDrop(
  cadenceStream: number[],
  distanceStream: number[],
  gradeStream?: number[]
): CadenceDrop {
  if (cadenceStream.length < 100 || cadenceStream.length !== distanceStream.length) {
    return {
      detected: false,
      drop_percent: 0,
      start_km: 0,
      baseline_cadence: 0,
      dropped_cadence: 0
    };
  }

  // Calculate baseline from first 30%
  const baselineEndIndex = Math.floor(cadenceStream.length * 0.3);
  const baselineSegment = cadenceStream.slice(0, baselineEndIndex).filter(c => c > 100); // Valid running cadence

  if (baselineSegment.length === 0) {
    return {
      detected: false,
      drop_percent: 0,
      start_km: 0,
      baseline_cadence: 0,
      dropped_cadence: 0
    };
  }

  const baselineCadence = baselineSegment.reduce((a, b) => a + b, 0) / baselineSegment.length;

  // Analyze later segments
  const windowSize = Math.min(20, Math.floor(cadenceStream.length * 0.1));
  let maxDrop = 0;
  let dropStartIndex = 0;
  let droppedCadence = baselineCadence;

  for (let i = baselineEndIndex; i < cadenceStream.length - windowSize; i += windowSize) {
    const segment = cadenceStream.slice(i, i + windowSize).filter(c => c > 100);

    if (segment.length < windowSize * 0.5) continue;

    // If grade available, only compare similar grades
    if (gradeStream && gradeStream.length === cadenceStream.length) {
      const baselineGrade = gradeStream.slice(0, baselineEndIndex).reduce((a, b) => a + b, 0) / baselineEndIndex;
      const segmentGrade = gradeStream.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;

      if (Math.abs(segmentGrade - baselineGrade) > 0.03) continue;
    }

    const segmentCadence = segment.reduce((a, b) => a + b, 0) / segment.length;
    const drop = (baselineCadence - segmentCadence) / baselineCadence;

    if (drop > maxDrop) {
      maxDrop = drop;
      dropStartIndex = i;
      droppedCadence = segmentCadence;
    }
  }

  return {
    detected: maxDrop > CADENCE_DROP_THRESHOLD,
    drop_percent: maxDrop * 100,
    start_km: dropStartIndex > 0 ? distanceStream[dropStartIndex] / 1000 : 0,
    baseline_cadence: baselineCadence,
    dropped_cadence: droppedCadence
  };
}

/**
 * Analyzes all physiological stress indicators
 */
export function analyzePhysiologicalStress(
  heartRateStream: number[] | undefined,
  velocityStream: number[] | undefined,
  elevationStream: number[] | undefined,
  cadenceStream: number[] | undefined,
  timeStream: Date[] | undefined,
  distanceStream: number[],
  gradeStream?: number[]
): PhysiologicalStress {
  const hr_drift = heartRateStream
    ? detectHRDrift(heartRateStream, distanceStream)
    : {
        detected: false,
        magnitude_bpm: 0,
        start_km: 0,
        start_index: 0,
        baseline_hr: 0,
        peak_hr: 0,
        sustained: false
      };

  const pace_degradation = velocityStream
    ? detectPaceDegradation(velocityStream, distanceStream, gradeStream)
    : {
        detected: false,
        degradation_percent: 0,
        start_km: 0,
        start_index: 0,
        baseline_pace_min_km: 0,
        degraded_pace_min_km: 0,
        controlled_for_grade: false
      };

  const vam_decline =
    elevationStream && timeStream
      ? detectVAMDecline(elevationStream, timeStream, distanceStream)
      : {
          detected: false,
          decline_percent: 0,
          early_vam: 0,
          late_vam: 0,
          climb_segments_analyzed: 0
        };

  const cadence_drop = cadenceStream
    ? detectCadenceDrop(cadenceStream, distanceStream, gradeStream)
    : {
        detected: false,
        drop_percent: 0,
        start_km: 0,
        baseline_cadence: 0,
        dropped_cadence: 0
      };

  const overall_stress_detected =
    hr_drift.detected || pace_degradation.detected || vam_decline.detected || cadence_drop.detected;

  return {
    hr_drift,
    pace_degradation,
    vam_decline,
    cadence_drop,
    overall_stress_detected
  };
}
