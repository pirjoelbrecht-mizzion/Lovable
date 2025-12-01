export interface PacingSegment {
  distanceKm: number;
  targetPace: number;
  targetHR?: number;
  notes?: string;
}

export interface PacingStrategy {
  id?: string;
  user_id?: string;
  race_id: string;
  name: string;
  mode: 'manual' | 'auto';
  segments: PacingSegment[];
  created_at?: string;
  updated_at?: string;
}

export function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm % 1) * 60);
  return mins + ':' + String(secs).padStart(2, '0');
}

export function parsePace(paceStr: string): number {
  const parts = paceStr.split(':');
  if (parts.length !== 2) return 0;
  const mins = parseInt(parts[0], 10);
  const secs = parseInt(parts[1], 10);
  if (isNaN(mins) || isNaN(secs)) return 0;
  return mins + secs / 60;
}

export function validatePace(pace: number): boolean {
  return pace >= 3.0 && pace <= 15.0;
}

export function validateSegment(segment: PacingSegment, raceDistance: number): boolean {
  if (!validatePace(segment.targetPace)) return false;
  if (segment.distanceKm <= 0 || segment.distanceKm > raceDistance) return false;
  if (segment.targetHR && (segment.targetHR < 100 || segment.targetHR > 220)) return false;
  return true;
}

export function calculateAveragePace(segments: PacingSegment[]): number {
  if (segments.length === 0) return 0;

  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 0; i < segments.length; i++) {
    const prevDistance = i === 0 ? 0 : segments[i - 1].distanceKm;
    const segmentDistance = segments[i].distanceKm - prevDistance;
    const segmentTime = segmentDistance * segments[i].targetPace;

    totalDistance += segmentDistance;
    totalTime += segmentTime;
  }

  return totalDistance > 0 ? totalTime / totalDistance : 0;
}
