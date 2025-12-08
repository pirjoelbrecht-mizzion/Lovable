/**
 * Trail-Specific Terrain Analysis Engine
 * Analyzes elevation streams to generate terrain breakdowns and performance metrics
 */

export interface TerrainSegment {
  type: 'flat' | 'rolling' | 'hilly' | 'steep' | 'downhill';
  distanceKm: number;
  avgGrade: number;
  paceMinPerKm?: number;
}

export interface ClimbSegment {
  climbNumber: number;
  startDistanceM: number;
  endDistanceM: number;
  elevationGainM: number;
  durationMin?: number;
  vam?: number; // Meters per hour
  averageGradePct: number;
  distanceKm: number;
  category: 'easy' | 'moderate' | 'hard' | 'extreme';
}

export interface TerrainAnalysis {
  flatKm: number;
  rollingKm: number;
  hillyKm: number;
  steepKm: number;
  downhillKm: number;
  downhillBrakingScore: number; // 0-1, higher = more cautious
  technicalityScore: number; // 0-1, higher = more technical
  gradeDistribution: { [key: string]: number };

  // New climb-based VAM metrics
  climbs: ClimbSegment[];
  peakVam?: number;
  averageClimbVam?: number;
  vamFirstClimb?: number;
  vamLastClimb?: number;
  vamFatigueSlopePct?: number;
  vamFirstToLastDropoffPct?: number;
  totalClimbingTimeMin?: number;
  totalClimbingDistanceKm?: number;
  significantClimbsCount: number;
}

export interface PerformanceAnalysis {
  aerobicDecoupling?: number; // Percentage drift
  hrDriftOnClimbs?: number;
  heatStrainIndex?: number;
  efficiencyScore: number; // 0-100
  paceVsBaseline?: { [key: string]: number };
  recommendations: string[];
}

/**
 * Smooth elevation data using moving average to reduce GPS noise
 */
function smoothElevation(elevationStream: number[], windowSize: number = 5): number[] {
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < elevationStream.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(elevationStream.length - 1, i + halfWindow); j++) {
      sum += elevationStream[j];
      count++;
    }

    smoothed.push(sum / count);
  }

  return smoothed;
}

/**
 * Identify significant climb segments in elevation profile
 * Only returns climbs meeting significance threshold (>80m gain, >400m distance)
 */
function identifyClimbSegments(
  distanceStream: number[],
  smoothedElevation: number[],
  targetWindowMeters: number = 150
): Array<{ startIndex: number; endIndex: number; elevationGainM: number; distanceM: number; avgGrade: number }> {
  const rawClimbs: Array<{
    startIndex: number;
    endIndex: number;
    elevationGainM: number;
    distanceM: number;
    avgGrade: number;
  }> = [];

  let inClimb = false;
  let climbStartIndex = 0;
  let climbStartElevation = 0;

  for (let i = 0; i < distanceStream.length - 1; i++) {
    let windowEnd = i + 1;
    let windowDistance = distanceStream[windowEnd] - distanceStream[i];

    while (windowEnd < distanceStream.length - 1 && windowDistance < targetWindowMeters) {
      windowEnd++;
      windowDistance = distanceStream[windowEnd] - distanceStream[i];
    }

    if (windowDistance < 10) continue;

    const elevChange = smoothedElevation[windowEnd] - smoothedElevation[i];
    const grade = (elevChange / windowDistance) * 100;

    if (grade > 3 && !inClimb) {
      inClimb = true;
      climbStartIndex = i;
      climbStartElevation = smoothedElevation[i];
    } else if (grade <= 3 && inClimb) {
      const climbDistance = distanceStream[i] - distanceStream[climbStartIndex];
      const climbGain = smoothedElevation[i] - climbStartElevation;

      if (climbDistance > 50 && climbGain > 0) {
        const avgGrade = (climbGain / climbDistance) * 100;
        rawClimbs.push({
          startIndex: climbStartIndex,
          endIndex: i,
          elevationGainM: climbGain,
          distanceM: climbDistance,
          avgGrade
        });
      }
      inClimb = false;
    }
  }

  if (inClimb) {
    const lastIndex = distanceStream.length - 1;
    const climbDistance = distanceStream[lastIndex] - distanceStream[climbStartIndex];
    const climbGain = smoothedElevation[lastIndex] - climbStartElevation;
    if (climbDistance > 50 && climbGain > 0) {
      const avgGrade = (climbGain / climbDistance) * 100;
      rawClimbs.push({
        startIndex: climbStartIndex,
        endIndex: lastIndex,
        elevationGainM: climbGain,
        distanceM: climbDistance,
        avgGrade
      });
    }
  }

  const mergedClimbs: typeof rawClimbs = [];
  for (let i = 0; i < rawClimbs.length; i++) {
    const current = rawClimbs[i];
    const next = rawClimbs[i + 1];

    if (next && (distanceStream[next.startIndex] - distanceStream[current.endIndex]) < 50) {
      const combinedGain = current.elevationGainM + next.elevationGainM;
      const combinedDistance = distanceStream[next.endIndex] - distanceStream[current.startIndex];
      mergedClimbs.push({
        startIndex: current.startIndex,
        endIndex: next.endIndex,
        elevationGainM: combinedGain,
        distanceM: combinedDistance,
        avgGrade: (combinedGain / combinedDistance) * 100
      });
      i++;
    } else {
      mergedClimbs.push(current);
    }
  }

  return mergedClimbs.filter(c => c.elevationGainM >= 80 && c.distanceM >= 400);
}

/**
 * Calculate VAM for each climb segment using effort-based time allocation
 */
function calculateClimbVAM(
  climbs: Array<{ startIndex: number; endIndex: number; elevationGainM: number; distanceM: number; avgGrade: number }>,
  distanceStream: number[],
  durationMin?: number
): ClimbSegment[] {
  if (!durationMin || durationMin <= 0 || climbs.length === 0) {
    return climbs.map((climb, index) => ({
      climbNumber: index + 1,
      startDistanceM: distanceStream[climb.startIndex],
      endDistanceM: distanceStream[climb.endIndex],
      elevationGainM: climb.elevationGainM,
      averageGradePct: climb.avgGrade,
      distanceKm: climb.distanceM / 1000,
      category: categorizeClimb(climb.avgGrade, climb.elevationGainM)
    }));
  }

  const totalDistance = distanceStream[distanceStream.length - 1];
  const totalSeconds = durationMin * 60;

  let totalEffort = 0;
  const climbEfforts = climbs.map(climb => {
    const gradeMultiplier = 1 + (climb.avgGrade / 100) * 3;
    const effort = climb.distanceM * gradeMultiplier;
    totalEffort += effort;
    return effort;
  });

  const remainingDistance = totalDistance - climbs.reduce((sum, c) => sum + c.distanceM, 0);
  totalEffort += remainingDistance;

  return climbs.map((climb, index) => {
    const climbEffort = climbEfforts[index];
    const climbSeconds = (climbEffort / totalEffort) * totalSeconds;
    const climbMinutes = climbSeconds / 60;
    const vam = (climb.elevationGainM / (climbMinutes / 60));

    return {
      climbNumber: index + 1,
      startDistanceM: distanceStream[climb.startIndex],
      endDistanceM: distanceStream[climb.endIndex],
      elevationGainM: climb.elevationGainM,
      durationMin: climbMinutes,
      vam,
      averageGradePct: climb.avgGrade,
      distanceKm: climb.distanceM / 1000,
      category: categorizeClimb(climb.avgGrade, climb.elevationGainM)
    };
  });
}

/**
 * Categorize climb difficulty based on grade and elevation gain
 */
function categorizeClimb(avgGrade: number, elevationGainM: number): 'easy' | 'moderate' | 'hard' | 'extreme' {
  const difficultyScore = (avgGrade * 2) + (elevationGainM / 100);

  if (difficultyScore > 40) return 'extreme';
  if (difficultyScore > 25) return 'hard';
  if (difficultyScore > 15) return 'moderate';
  return 'easy';
}

/**
 * Calculate fatigue metrics from climb VAM progression
 */
function calculateFatigueMetrics(climbs: ClimbSegment[]): {
  peakVam?: number;
  averageClimbVam?: number;
  vamFirstClimb?: number;
  vamLastClimb?: number;
  vamFatigueSlopePct?: number;
  vamFirstToLastDropoffPct?: number;
} {
  const climbsWithVAM = climbs.filter(c => c.vam && c.vam > 0);

  if (climbsWithVAM.length === 0) {
    return {};
  }

  const vamValues = climbsWithVAM.map(c => c.vam!);
  const peakVam = Math.max(...vamValues);
  const averageClimbVam = vamValues.reduce((sum, v) => sum + v, 0) / vamValues.length;
  const vamFirstClimb = climbsWithVAM[0].vam;
  const vamLastClimb = climbsWithVAM[climbsWithVAM.length - 1].vam;

  let vamFatigueSlopePct: number | undefined;
  let vamFirstToLastDropoffPct: number | undefined;

  if (climbsWithVAM.length >= 2) {
    vamFirstToLastDropoffPct = ((vamLastClimb! - vamFirstClimb!) / vamFirstClimb!) * 100;

    if (climbsWithVAM.length >= 3) {
      const n = climbsWithVAM.length;
      const weights = climbsWithVAM.map(c => c.elevationGainM);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        const x = i + 1;
        const y = vamValues[i];
        const w = weights[i] / totalWeight;
        sumX += x * w;
        sumY += y * w;
        sumXY += x * y * w;
        sumX2 += x * x * w;
      }

      const slope = (sumXY - sumX * sumY) / (sumX2 - sumX * sumX);
      vamFatigueSlopePct = (slope / averageClimbVam) * 100;
    }
  }

  return {
    peakVam,
    averageClimbVam,
    vamFirstClimb,
    vamLastClimb,
    vamFatigueSlopePct,
    vamFirstToLastDropoffPct
  };
}

/**
 * Analyze terrain from elevation and distance streams using rolling window
 */
export function analyzeTerrainFromStreams(
  distanceStream: number[], // meters
  elevationStream: number[], // meters
  durationMin?: number,
  elevationGain?: number
): TerrainAnalysis {
  if (!distanceStream || !elevationStream || distanceStream.length < 2) {
    return {
      flatKm: 0,
      rollingKm: 0,
      hillyKm: 0,
      steepKm: 0,
      downhillKm: 0,
      downhillBrakingScore: 0,
      technicalityScore: 0,
      gradeDistribution: {},
      climbs: [],
      significantClimbsCount: 0
    };
  }

  // Smooth elevation data to reduce GPS noise
  const smoothedElevation = smoothElevation(elevationStream);

  let flatKm = 0;
  let rollingKm = 0;
  let hillyKm = 0;
  let steepKm = 0;
  let downhillKm = 0;
  let totalClimbTime = 0;
  let climbingElevation = 0;

  const gradeDistribution: { [key: string]: number } = {};

  // Calculate velocity stream from distance and duration
  const velocityStream: number[] = [];
  if (durationMin && durationMin > 0) {
    const totalSeconds = durationMin * 60;
    const timePerPoint = totalSeconds / distanceStream.length;

    velocityStream.push(0); // First point has no velocity
    for (let i = 1; i < distanceStream.length; i++) {
      const distDelta = distanceStream[i] - distanceStream[i - 1];
      const velocity = distDelta / timePerPoint; // m/s
      velocityStream.push(Math.max(0, velocity)); // Avoid negative velocities
    }
  }

  // Use rolling window for grade calculation (aim for ~100-200m segments)
  const targetWindowMeters = 150;

  for (let i = 0; i < distanceStream.length - 1; i++) {
    // Find window end point that's approximately targetWindowMeters ahead
    let windowEnd = i + 1;
    let windowDistance = distanceStream[windowEnd] - distanceStream[i];

    while (windowEnd < distanceStream.length - 1 && windowDistance < targetWindowMeters) {
      windowEnd++;
      windowDistance = distanceStream[windowEnd] - distanceStream[i];
    }

    if (windowDistance < 10) continue; // Skip very short segments

    const distKm = windowDistance / 1000;
    const elevChange = smoothedElevation[windowEnd] - smoothedElevation[i];
    const grade = (elevChange / windowDistance) * 100;

    // Classify terrain based on grade
    if (grade >= 10) {
      steepKm += distKm;
    } else if (grade >= 6) {
      hillyKm += distKm;
    } else if (grade >= 3) {
      rollingKm += distKm;
    } else if (grade > -3) {
      flatKm += distKm;
    } else {
      downhillKm += distKm;
    }

    // Grade distribution
    const gradeBucket = Math.floor(grade / 2) * 2; // 2% buckets
    gradeDistribution[gradeBucket] = (gradeDistribution[gradeBucket] || 0) + distKm;

    // Track climbing for VAM
    if (elevChange > 0) {
      climbingElevation += elevChange;
    }

    // Skip ahead to avoid double-counting
    i = windowEnd - 1;
  }

  // Calculate downhill braking score from velocity data
  let downhillBrakingScore = 0;

  if (velocityStream.length > 0) {
    const downhillSegments: { grade: number; velocity: number }[] = [];

    // Collect downhill segments (grade < -5%) with their velocities
    for (let i = 0; i < distanceStream.length - 1; i++) {
      const windowEnd = Math.min(i + 20, distanceStream.length - 1);
      const distKm = (distanceStream[windowEnd] - distanceStream[i]) / 1000;
      const elevChange = smoothedElevation[windowEnd] - smoothedElevation[i];

      if (distKm < 0.05) continue; // Skip tiny segments

      const grade = (elevChange / (distKm * 1000)) * 100;

      if (grade < -5 && velocityStream[i] > 0) {
        downhillSegments.push({
          grade,
          velocity: velocityStream[i]
        });
      }
    }

    if (downhillSegments.length > 5) {
      let brakingCount = 0;

      for (const segment of downhillSegments) {
        const actualPace = (1000 / 60) / segment.velocity; // min/km

        // Expected downhill pace based on grade
        let expectedPace = 5.0; // min/km
        if (segment.grade >= -8) expectedPace = 4.5;
        else if (segment.grade >= -12) expectedPace = 4.0;
        else if (segment.grade >= -15) expectedPace = 4.5;
        else expectedPace = 5.5;

        // Braking if running 30% slower than expected
        if (actualPace > expectedPace * 1.3) {
          brakingCount++;
        }
      }

      // Score = percentage of segments where braking detected
      downhillBrakingScore = brakingCount / downhillSegments.length;
    }
  }

  // Calculate technicality score based on grade variability
  const gradeValues = Object.keys(gradeDistribution).map(Number);
  const gradeVariance = gradeValues.length > 0
    ? Math.sqrt(gradeValues.reduce((sum, g) => sum + Math.pow(g, 2), 0) / gradeValues.length)
    : 0;
  const technicalityScore = Math.min(1, gradeVariance / 15); // Normalize to 0-1

  // New climb-based VAM calculation
  const rawClimbs = identifyClimbSegments(distanceStream, smoothedElevation);
  const climbs = calculateClimbVAM(rawClimbs, distanceStream, durationMin);
  const fatigueMetrics = calculateFatigueMetrics(climbs);

  // Calculate total climbing time and distance
  const totalClimbingTimeMin = climbs.reduce((sum, c) => sum + (c.durationMin || 0), 0);
  const totalClimbingDistanceKm = climbs.reduce((sum, c) => sum + c.distanceKm, 0);

  return {
    flatKm,
    rollingKm,
    hillyKm,
    steepKm,
    downhillKm,
    downhillBrakingScore,
    technicalityScore,
    gradeDistribution,

    // Climb-based VAM metrics
    climbs,
    significantClimbsCount: climbs.length,
    totalClimbingTimeMin,
    totalClimbingDistanceKm,
    ...fatigueMetrics
  };
}

/**
 * Analyze performance metrics for trail running
 */
export function analyzePerformance(
  distanceStream: number[],
  hrStream: number[],
  durationMin: number,
  temperature?: number,
  humidity?: number,
  terrainAnalysis?: TerrainAnalysis
): PerformanceAnalysis {
  const recommendations: string[] = [];
  let efficiencyScore = 75; // Default

  // Aerobic decoupling (HR/pace drift between first and second half)
  let aerobicDecoupling: number | undefined;
  if (hrStream && hrStream.length > 10) {
    const midpoint = Math.floor(hrStream.length / 2);
    const firstHalfHR = hrStream.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfHR = hrStream.slice(midpoint).reduce((a, b) => a + b, 0) / (hrStream.length - midpoint);

    if (firstHalfHR > 0) {
      aerobicDecoupling = ((secondHalfHR - firstHalfHR) / firstHalfHR) * 100;

      if (aerobicDecoupling > 10) {
        recommendations.push('Significant aerobic decoupling detected. Consider reducing intensity or improving pacing strategy.');
        efficiencyScore -= 15;
      } else if (aerobicDecoupling > 5) {
        recommendations.push('Moderate aerobic decoupling. Your pacing was solid but could be more even.');
        efficiencyScore -= 5;
      }
    }
  }

  // Heat strain index
  let heatStrainIndex: number | undefined;
  if (temperature !== undefined && humidity !== undefined) {
    heatStrainIndex = temperature + (humidity * 0.4);

    if (heatStrainIndex > 35) {
      recommendations.push('High heat strain conditions. Ensure adequate hydration and consider early morning runs.');
      efficiencyScore -= 10;
    } else if (heatStrainIndex > 28) {
      recommendations.push('Moderate heat stress. Monitor hydration and adjust pace as needed.');
      efficiencyScore -= 5;
    }
  }

  // HR drift on climbs
  let hrDriftOnClimbs: number | undefined;
  if (hrStream && hrStream.length > 1 && terrainAnalysis && (terrainAnalysis.hillyKm + terrainAnalysis.steepKm) > 0) {
    // Calculate HR variability during climbing sections
    const hrVariance = hrStream.reduce((sum, hr, i) => {
      if (i === 0) return 0;
      return sum + Math.abs(hr - hrStream[i - 1]);
    }, 0) / (hrStream.length - 1);

    hrDriftOnClimbs = hrVariance;

    if (hrDriftOnClimbs > 15) {
      recommendations.push('High HR variability on climbs. Practice maintaining steady effort on hills.');
      efficiencyScore -= 10;
    }
  }

  // Downhill efficiency
  if (terrainAnalysis && terrainAnalysis.downhillBrakingScore > 0.6) {
    recommendations.push('You\'re braking heavily on downhills. Practice downhill running technique to improve speed and reduce impact.');
    efficiencyScore -= 10;
  } else if (terrainAnalysis && terrainAnalysis.downhillBrakingScore > 0.4) {
    recommendations.push('Good downhill control. Consider pushing pace slightly on less technical descents.');
  }

  // Technicality assessment
  if (terrainAnalysis && terrainAnalysis.technicalityScore > 0.7) {
    recommendations.push('Highly technical terrain. Great job navigating challenging conditions!');
  }

  // VAM assessment
  if (terrainAnalysis?.vam) {
    if (terrainAnalysis.vam < 300) {
      recommendations.push('VAM suggests easy climbing pace. Good for recovery or base building.');
    } else if (terrainAnalysis.vam > 800) {
      recommendations.push('Excellent climbing power! VAM above 800 m/hr indicates strong uphill fitness.');
      efficiencyScore += 10;
    }
  }

  // Ensure score stays in range
  efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

  return {
    aerobicDecoupling,
    hrDriftOnClimbs,
    heatStrainIndex,
    efficiencyScore,
    recommendations
  };
}
