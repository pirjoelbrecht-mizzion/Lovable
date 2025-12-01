export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  distanceFromStart: number;
}

export interface GPXSegmentAnalysis {
  type: 'uphill' | 'downhill' | 'flat';
  startIdx: number;
  endIdx: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  startElevationM: number;
  endElevationM: number;
  gradeAvgPct: number;
  gradeMaxPct: number;
}

export interface PersonalizedPaceParams {
  baseFlatPaceMinKm: number;
  uphillAdjustmentFactor: number;
  downhillAdjustmentFactor: number;
  gradeBucketPaces?: Record<string, { paceMinKm: number; sampleSize: number }>;
}

export interface GPXRouteAnalysis {
  totalDistanceKm: number;
  totalElevationGainM: number;
  totalElevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  uphillDistanceKm: number;
  uphillTimeEstimate: number;
  downhillDistanceKm: number;
  downhillTimeEstimate: number;
  flatDistanceKm: number;
  flatTimeEstimate: number;
  totalTimeEstimate: number;
  averageGradePct: number;
  segments: GPXSegmentAnalysis[];
  elevationProfile: { distance: number; elevation: number }[];
  usingPersonalizedPace: boolean;
  paceConfidence: 'high' | 'medium' | 'low' | 'default';
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function parseGPXFile(file: File): Promise<GPXPoint[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');

  const trkpts = xmlDoc.querySelectorAll('trkpt');
  const points: GPXPoint[] = [];
  let cumulativeDistance = 0;

  trkpts.forEach((trkpt, idx) => {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');
    const eleNode = trkpt.querySelector('ele');
    const timeNode = trkpt.querySelector('time');

    const ele = eleNode ? parseFloat(eleNode.textContent || '0') : undefined;
    const time = timeNode ? timeNode.textContent || undefined : undefined;

    if (idx > 0) {
      const prevPoint = points[idx - 1];
      const distance = haversineDistance(prevPoint.lat, prevPoint.lon, lat, lon);
      cumulativeDistance += distance;
    }

    points.push({
      lat,
      lon,
      ele,
      time,
      distanceFromStart: cumulativeDistance,
    });
  });

  return points;
}

function classifySegment(gradeAvgPct: number): 'uphill' | 'downhill' | 'flat' {
  if (gradeAvgPct > 2) return 'uphill';
  if (gradeAvgPct < -2) return 'downhill';
  return 'flat';
}

function classifyGradeBucket(gradePct: number): string {
  if (gradePct >= 12) return 'very_steep_uphill';
  if (gradePct >= 8) return 'steep_uphill';
  if (gradePct >= 5) return 'moderate_uphill';
  if (gradePct >= 2) return 'easy_uphill';
  if (gradePct >= -2) return 'flat';
  if (gradePct >= -5) return 'easy_downhill';
  if (gradePct >= -8) return 'moderate_downhill';
  if (gradePct >= -12) return 'steep_downhill';
  return 'very_steep_downhill';
}

function estimateSegmentTime(
  distanceKm: number,
  elevationGainM: number,
  elevationLossM: number,
  gradeAvgPct: number,
  userBasePaceMinKm: number,
  personalizedParams?: PersonalizedPaceParams
): number {
  let segmentPace: number;

  if (personalizedParams) {
    // Try to use grade-bucketed pace first
    const gradeBucket = classifyGradeBucket(gradeAvgPct);
    const bucketPace = personalizedParams.gradeBucketPaces?.[gradeBucket];

    if (bucketPace && bucketPace.sampleSize >= 3) {
      // Use grade-bucketed pace (primary)
      segmentPace = bucketPace.paceMinKm;
    } else {
      // Fallback to terrain-type adjustment factors
      const terrainType = classifySegment(gradeAvgPct);
      const basePace = personalizedParams.baseFlatPaceMinKm;

      if (terrainType === 'uphill') {
        segmentPace = basePace * personalizedParams.uphillAdjustmentFactor;
      } else if (terrainType === 'downhill') {
        segmentPace = basePace * personalizedParams.downhillAdjustmentFactor;
      } else {
        segmentPace = basePace;
      }
    }

    // Apply soft distance blending for long segments (>3km)
    if (distanceKm > 3) {
      const flatPace = personalizedParams.baseFlatPaceMinKm;
      segmentPace = segmentPace * 0.8 + flatPace * 0.2;
    }
  } else {
    // Default formula (no personalized data)
    let adjustedPace = userBasePaceMinKm;

    if (gradeAvgPct > 0) {
      adjustedPace += gradeAvgPct * 0.5;
    } else if (gradeAvgPct < 0) {
      adjustedPace *= Math.max(0.85, 1 + gradeAvgPct * 0.02);
    }

    segmentPace = adjustedPace;
  }

  // Calculate time
  const baseTime = distanceKm * segmentPace;

  // Add minor elevation gain penalty (less aggressive with personalized paces)
  const elevationAdjustmentMin = personalizedParams
    ? (elevationGainM / 150) * 1.0
    : (elevationGainM / 100) * 1.5;

  return baseTime + elevationAdjustmentMin;
}

function smoothElevation(points: GPXPoint[], windowSize: number = 5): GPXPoint[] {
  const smoothed = [...points];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    if (points[i].ele === undefined) continue;

    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length, i + halfWindow + 1);
    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      if (points[j].ele !== undefined) {
        sum += points[j].ele!;
        count++;
      }
    }

    if (count > 0) {
      smoothed[i] = { ...points[i], ele: sum / count };
    }
  }

  return smoothed;
}

export function analyzeGPXRoute(
  points: GPXPoint[],
  userBasePaceMinKm: number = 6.0,
  personalizedParams?: PersonalizedPaceParams
): GPXRouteAnalysis {
  if (points.length < 2) {
    throw new Error('GPX file must contain at least 2 points');
  }

  // Smooth elevation data to reduce GPS noise
  const smoothedPoints = smoothElevation(points);

  const segments: GPXSegmentAnalysis[] = [];
  const elevationProfile: { distance: number; elevation: number }[] = [];

  let totalElevationGain = 0;
  let totalElevationLoss = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;

  let segmentStart = 0;
  let currentSegmentType: 'uphill' | 'downhill' | 'flat' | null = null;
  let segmentElevationGain = 0;
  let segmentElevationLoss = 0;
  let segmentMaxGrade = 0;

  // Use threshold method to calculate total elevation gain/loss
  const ELEVATION_THRESHOLD = 4; // meters
  let lastSignificantElevation: number | null = null;
  let cumulativeChange = 0;

  for (let i = 1; i < smoothedPoints.length; i++) {
    const prev = smoothedPoints[i - 1];
    const curr = smoothedPoints[i];

    if (curr.ele !== undefined) {
      maxElevation = Math.max(maxElevation, curr.ele);
      minElevation = Math.min(minElevation, curr.ele);

      elevationProfile.push({
        distance: curr.distanceFromStart,
        elevation: curr.ele,
      });

      if (prev.ele !== undefined) {
        // Initialize on first point with elevation
        if (lastSignificantElevation === null) {
          lastSignificantElevation = prev.ele;
        }

        const elevDiff = curr.ele - prev.ele;
        const distDiff = curr.distanceFromStart - prev.distanceFromStart;
        const grade = distDiff > 0 ? (elevDiff / (distDiff * 1000)) * 100 : 0;

        // Accumulate change
        cumulativeChange += elevDiff;

        // Check if we've crossed the threshold
        if (Math.abs(cumulativeChange) >= ELEVATION_THRESHOLD) {
          if (cumulativeChange > 0) {
            totalElevationGain += cumulativeChange;
          } else {
            totalElevationLoss += Math.abs(cumulativeChange);
          }
          // Reset
          cumulativeChange = 0;
          lastSignificantElevation = curr.ele;
        }

        const pointType = classifySegment(grade);

        // Initialize segment type on first point
        if (currentSegmentType === null) {
          currentSegmentType = pointType;
        }

        // Check if segment type changed or we're at the last point
        const segmentTypeChanged = pointType !== currentSegmentType;
        const isLastPoint = i === points.length - 1;

        // Accumulate elevation data for current segment
        segmentMaxGrade = Math.max(segmentMaxGrade, Math.abs(grade));
        if (elevDiff > 0) {
          segmentElevationGain += elevDiff;
        } else {
          segmentElevationLoss += Math.abs(elevDiff);
        }

        // Close segment when type changes OR at the last point
        if (segmentTypeChanged || isLastPoint) {
          // The segment always includes the current point
          const endIdx = i;
          const segmentDistance = points[endIdx].distanceFromStart - points[segmentStart].distanceFromStart;
          const segmentStartEle = points[segmentStart].ele || 0;
          const segmentEndEle = points[endIdx].ele || 0;
          const segmentGrade = segmentDistance > 0 ? ((segmentEndEle - segmentStartEle) / (segmentDistance * 1000)) * 100 : 0;

          // Only push if we have some distance
          if (segmentDistance > 0) {
            segments.push({
              type: currentSegmentType!,
              startIdx: segmentStart,
              endIdx,
              distanceKm: segmentDistance,
              elevationGainM: Math.round(segmentElevationGain),
              elevationLossM: Math.round(segmentElevationLoss),
              startElevationM: Math.round(segmentStartEle),
              endElevationM: Math.round(segmentEndEle),
              gradeAvgPct: parseFloat(segmentGrade.toFixed(2)),
              gradeMaxPct: parseFloat(segmentMaxGrade.toFixed(2)),
            });
          }

          // Start a new segment if type changed (and we're not at the last point)
          if (segmentTypeChanged && !isLastPoint) {
            // New segment starts at the current point (which was the end of the previous segment)
            segmentStart = i;
            currentSegmentType = pointType;
            // Reset accumulators (current point will be included in the next iteration)
            segmentElevationGain = 0;
            segmentElevationLoss = 0;
            segmentMaxGrade = 0;
          }
        }
      }
    }
  }

  const totalDistance = points[points.length - 1].distanceFromStart;

  // Debug logging
  console.log('=== GPX Segment Analysis ===');
  console.log('Total distance from GPX:', totalDistance.toFixed(2), 'km');
  console.log('Number of segments:', segments.length);
  let segmentDistanceSum = 0;
  segments.forEach((seg, idx) => {
    segmentDistanceSum += seg.distanceKm;
    console.log(`Segment ${idx + 1} (${seg.type}):`, {
      distance: seg.distanceKm.toFixed(2),
      startIdx: seg.startIdx,
      endIdx: seg.endIdx,
      startDist: points[seg.startIdx].distanceFromStart.toFixed(2),
      endDist: points[seg.endIdx].distanceFromStart.toFixed(2)
    });
  });
  console.log('Sum of segment distances:', segmentDistanceSum.toFixed(2), 'km');
  console.log('Gap:', (totalDistance - segmentDistanceSum).toFixed(2), 'km');

  let uphillDistance = 0;
  let downhillDistance = 0;
  let flatDistance = 0;
  let uphillTime = 0;
  let downhillTime = 0;
  let flatTime = 0;

  segments.forEach((seg) => {
    const segTime = estimateSegmentTime(
      seg.distanceKm,
      seg.elevationGainM,
      seg.elevationLossM,
      seg.gradeAvgPct,
      userBasePaceMinKm,
      personalizedParams
    );

    if (seg.type === 'uphill') {
      uphillDistance += seg.distanceKm;
      uphillTime += segTime;
    } else if (seg.type === 'downhill') {
      downhillDistance += seg.distanceKm;
      downhillTime += segTime;
    } else {
      flatDistance += seg.distanceKm;
      flatTime += segTime;
    }
  });

  // Determine pace confidence
  let paceConfidence: 'high' | 'medium' | 'low' | 'default' = 'default';
  if (personalizedParams) {
    const totalBuckets = Object.keys(personalizedParams.gradeBucketPaces || {}).length;
    if (totalBuckets >= 6) {
      paceConfidence = 'high';
    } else if (totalBuckets >= 3) {
      paceConfidence = 'medium';
    } else {
      paceConfidence = 'low';
    }
  }

  const totalTime = uphillTime + downhillTime + flatTime;

  return {
    totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
    totalElevationGainM: Math.round(totalElevationGain),
    totalElevationLossM: Math.round(totalElevationLoss),
    maxElevationM: Math.round(maxElevation),
    minElevationM: Math.round(minElevation),
    uphillDistanceKm: parseFloat(uphillDistance.toFixed(2)),
    uphillTimeEstimate: parseFloat(uphillTime.toFixed(2)),
    downhillDistanceKm: parseFloat(downhillDistance.toFixed(2)),
    downhillTimeEstimate: parseFloat(downhillTime.toFixed(2)),
    flatDistanceKm: parseFloat(flatDistance.toFixed(2)),
    flatTimeEstimate: parseFloat(flatTime.toFixed(2)),
    totalTimeEstimate: parseFloat(totalTime.toFixed(2)),
    averageGradePct: totalDistance > 0 ? parseFloat(((totalElevationGain - totalElevationLoss) / (totalDistance * 1000) * 100).toFixed(2)) : 0,
    segments,
    elevationProfile,
    usingPersonalizedPace: !!personalizedParams,
    paceConfidence,
  };
}

export function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
