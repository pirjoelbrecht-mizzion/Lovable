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

export interface TerrainAnalysis {
  flatKm: number;
  rollingKm: number;
  hillyKm: number;
  steepKm: number;
  downhillKm: number;
  downhillBrakingScore: number; // 0-1, higher = more cautious
  technicalityScore: number; // 0-1, higher = more technical
  vam?: number; // Vertical meters per hour
  gradeDistribution: { [key: string]: number };
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
      gradeDistribution: {}
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
  const downhillSpeeds: number[] = [];

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
      // Track downhill speeds for braking analysis
      if (durationMin) {
        const segmentSpeed = distKm / (durationMin / 60);
        downhillSpeeds.push(segmentSpeed);
      }
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

  // Calculate downhill braking score (0 = confident, 1 = very cautious)
  let downhillBrakingScore = 0;
  if (downhillSpeeds.length > 0) {
    const avgDownhillSpeed = downhillSpeeds.reduce((a, b) => a + b, 0) / downhillSpeeds.length;
    // Typical trail downhill: 8-12 km/h, confident: >12 km/h, cautious: <8 km/h
    downhillBrakingScore = Math.max(0, Math.min(1, (12 - avgDownhillSpeed) / 8));
  }

  // Calculate technicality score based on grade variability
  const gradeValues = Object.keys(gradeDistribution).map(Number);
  const gradeVariance = gradeValues.length > 0
    ? Math.sqrt(gradeValues.reduce((sum, g) => sum + Math.pow(g, 2), 0) / gradeValues.length)
    : 0;
  const technicalityScore = Math.min(1, gradeVariance / 15); // Normalize to 0-1

  // Calculate VAM (Vertical meters per hour)
  let vam: number | undefined;
  if (durationMin && elevationGain && durationMin > 0) {
    vam = (elevationGain / durationMin) * 60;
  }

  return {
    flatKm,
    rollingKm,
    hillyKm,
    steepKm,
    downhillKm,
    downhillBrakingScore,
    technicalityScore,
    vam,
    gradeDistribution
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
