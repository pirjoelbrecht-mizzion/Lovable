import type { PacingSegment } from '@/types/pacing';
import type { Race } from '@/utils/races';
import type { SimulationFactors } from '@/utils/raceSimulation';

export interface PacingGenerationOptions {
  race: Race;
  readinessScore: number;
  factors: SimulationFactors;
  basePace: number;
  segmentLengthKm?: number;
}

export function generateAutoPacing(options: PacingGenerationOptions): PacingSegment[] {
  const {
    race,
    readinessScore,
    factors,
    basePace,
    segmentLengthKm = 5,
  } = options;

  const distanceKm = race.distanceKm || 10;
  const segments: PacingSegment[] = [];

  const numSegments = Math.ceil(distanceKm / segmentLengthKm);

  for (let i = 0; i < numSegments; i++) {
    const segmentStart = i * segmentLengthKm;
    const segmentEnd = Math.min((i + 1) * segmentLengthKm, distanceKm);
    const progress = segmentEnd / distanceKm;

    const terrainAdjustment = factors.terrainFactor || 1.0;
    const elevationAdjustment = factors.elevationFactor || 1.0;
    const climateAdjustment = factors.climateFactor || 1.0;

    let fatigueMultiplier = 1.0;
    if (distanceKm > 42) {
      fatigueMultiplier = 1 + Math.pow(progress, 1.5) * 0.3;
    } else if (distanceKm > 21) {
      fatigueMultiplier = 1 + Math.pow(progress, 1.3) * 0.2;
    } else {
      fatigueMultiplier = 1 + Math.pow(progress, 1.2) * 0.15;
    }

    let startStrategy = 1.0;
    if (progress < 0.2) {
      startStrategy = 0.97;
    } else if (progress < 0.4) {
      startStrategy = 1.0;
    } else if (progress > 0.8) {
      startStrategy = 1.02;
    }

    const readinessAdjustment = 1 + (100 - readinessScore) / 400;

    let targetPace = basePace *
                     terrainAdjustment *
                     elevationAdjustment *
                     climateAdjustment *
                     fatigueMultiplier *
                     startStrategy *
                     readinessAdjustment;

    targetPace = Math.max(3.0, Math.min(15.0, targetPace));

    const baseHR = 140;
    const hrIncrease = progress * 15;
    const targetHR = Math.round(Math.min(180, baseHR + hrIncrease));

    let notes = '';
    if (progress < 0.2) {
      notes = 'Conservative start - hold back';
    } else if (progress < 0.5) {
      notes = 'Settle into rhythm';
    } else if (progress < 0.8) {
      notes = 'Maintain steady effort';
    } else {
      notes = 'Push to finish';
    }

    if (race.elevationM && race.elevationM > 500 && progress > 0.3 && progress < 0.7) {
      notes += ' - expect climbing';
    }

    segments.push({
      distanceKm: segmentEnd,
      targetPace,
      targetHR,
      notes,
    });
  }

  return segments;
}

export function adjustPacingForConditions(
  segments: PacingSegment[],
  temperatureDelta: number,
  elevationDelta: number
): PacingSegment[] {
  const tempAdjustment = 1 + (temperatureDelta / 100) * 0.02;
  const elevAdjustment = 1 + (elevationDelta / 1000) * 0.01;

  return segments.map(segment => ({
    ...segment,
    targetPace: segment.targetPace * tempAdjustment * elevAdjustment,
  }));
}

export function calculateSegmentTime(segments: PacingSegment[]): number {
  let totalTime = 0;

  for (let i = 0; i < segments.length; i++) {
    const prevDistance = i === 0 ? 0 : segments[i - 1].distanceKm;
    const segmentDistance = segments[i].distanceKm - prevDistance;
    const segmentTime = segmentDistance * segments[i].targetPace;
    totalTime += segmentTime;
  }

  return totalTime;
}

export function splitPacingStrategy(
  segments: PacingSegment[],
  splitDistanceKm: number
): PacingSegment[] {
  const newSegments: PacingSegment[] = [];
  let currentSplitDistance = splitDistanceKm;

  for (const segment of segments) {
    const prevDistance = newSegments.length === 0 ? 0 : newSegments[newSegments.length - 1].distanceKm;

    while (currentSplitDistance <= segment.distanceKm) {
      newSegments.push({
        distanceKm: currentSplitDistance,
        targetPace: segment.targetPace,
        targetHR: segment.targetHR,
        notes: segment.notes,
      });
      currentSplitDistance += splitDistanceKm;
    }
  }

  const lastSegment = segments[segments.length - 1];
  if (newSegments.length === 0 || newSegments[newSegments.length - 1].distanceKm < lastSegment.distanceKm) {
    newSegments.push(lastSegment);
  }

  return newSegments;
}
