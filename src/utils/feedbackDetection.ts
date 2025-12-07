import type { LogEntry } from '../types';
import type {
  FeedbackPromptCriteria,
  DNFDetectionResult,
  SessionImportance,
} from '../types/feedback';

const LONG_RUN_THRESHOLD_MINUTES = 60;
const HEAT_THRESHOLD_CELSIUS = 24;
const HIGH_HUMIDITY_THRESHOLD = 70;
const DNF_DISTANCE_THRESHOLD = 0.7;

export function shouldPromptFeedback(
  logEntry: LogEntry,
  plannedDistance?: number,
  plannedType?: string,
  previousDayLongRun?: boolean
): FeedbackPromptCriteria {
  const sessionImportance = classifySessionImportance(
    logEntry,
    plannedDistance,
    plannedType,
    previousDayLongRun
  );

  if (sessionImportance === 'normal') {
    return {
      shouldPrompt: false,
      reason: 'Easy run - feedback not needed',
      sessionImportance,
      modalType: 'none',
    };
  }

  const isRaceOrSimulation = plannedType === 'race' || plannedType === 'simulation';

  const modalType = isRaceOrSimulation ? 'race' : 'training';

  const reasons = [];
  if (sessionImportance === 'long_run') {
    reasons.push('Long run (>60 min)');
  }
  if (sessionImportance === 'key_workout') {
    reasons.push('Key workout');
  }
  if (sessionImportance === 'heat_session') {
    reasons.push('High heat conditions');
  }
  if (sessionImportance === 'back_to_back') {
    reasons.push('Back-to-back long run');
  }

  return {
    shouldPrompt: true,
    reason: reasons.join(', '),
    sessionImportance,
    modalType,
  };
}

export function classifySessionImportance(
  logEntry: LogEntry,
  plannedDistance?: number,
  plannedType?: string,
  previousDayLongRun?: boolean
): SessionImportance {
  const durationMin = logEntry.durationMin || 0;
  const actualKm = logEntry.km;
  const isLongRun = durationMin >= LONG_RUN_THRESHOLD_MINUTES;

  const isKeyWorkout = plannedType &&
    (plannedType.toLowerCase().includes('tempo') ||
     plannedType.toLowerCase().includes('threshold') ||
     plannedType.toLowerCase().includes('interval') ||
     plannedType.toLowerCase().includes('workout'));

  const isHeatSession = (logEntry.temperature ?? 0) >= HEAT_THRESHOLD_CELSIUS ||
    (logEntry.humidity ?? 0) >= HIGH_HUMIDITY_THRESHOLD;

  const isBackToBack = isLongRun && previousDayLongRun;

  if (isBackToBack) {
    return 'back_to_back';
  }
  if (isHeatSession && isLongRun) {
    return 'heat_session';
  }
  if (isKeyWorkout) {
    return 'key_workout';
  }
  if (isLongRun) {
    return 'long_run';
  }

  return 'normal';
}

export function detectDNF(
  logEntry: LogEntry,
  plannedDistance?: number,
  plannedType?: string
): DNFDetectionResult {
  if (!plannedDistance || plannedDistance === 0) {
    return {
      detected: false,
      confidence: 0,
      reason: 'No planned distance available',
      suggestedModal: 'none',
    };
  }

  const isRaceOrSimulation = plannedType === 'race' || plannedType === 'simulation';
  if (!isRaceOrSimulation) {
    return {
      detected: false,
      confidence: 0,
      reason: 'Not a race or simulation',
      suggestedModal: 'none',
    };
  }

  const actualKm = logEntry.km;
  const distanceRatio = actualKm / plannedDistance;

  if (distanceRatio < DNF_DISTANCE_THRESHOLD) {
    const confidence = Math.min(1.0, (DNF_DISTANCE_THRESHOLD - distanceRatio) * 2);

    return {
      detected: true,
      confidence,
      reason: `Completed only ${Math.round(distanceRatio * 100)}% of planned distance`,
      suggestedModal: 'dnf',
    };
  }

  if (distanceRatio < 0.85) {
    return {
      detected: true,
      confidence: 0.5,
      reason: `Slightly shorter than planned (${Math.round(distanceRatio * 100)}%)`,
      suggestedModal: 'race',
    };
  }

  return {
    detected: false,
    confidence: 0,
    reason: 'Activity completed as planned',
    suggestedModal: 'race',
  };
}

export function detectUnexpectedDifficulty(
  logEntry: LogEntry,
  expectedEffort?: number,
  expectedHR?: number
): boolean {
  if (!logEntry.hrAvg || !expectedHR) {
    return false;
  }

  const hrDrift = logEntry.hrAvg - expectedHR;
  const hrDriftPercent = (hrDrift / expectedHR) * 100;

  if (hrDriftPercent > 10) {
    return true;
  }

  if (logEntry.durationMin && logEntry.km) {
    const paceMinPerKm = logEntry.durationMin / logEntry.km;

    if (paceMinPerKm > 8 && (logEntry.durationMin > 30)) {
      return true;
    }
  }

  return false;
}

export function determineAppropriateModal(
  logEntry: LogEntry,
  plannedDistance?: number,
  plannedType?: string,
  feedbackAlreadyCollected?: boolean
): 'training' | 'race' | 'dnf' | 'none' {
  if (feedbackAlreadyCollected) {
    return 'none';
  }

  const dnfDetection = detectDNF(logEntry, plannedDistance, plannedType);

  if (dnfDetection.detected && dnfDetection.confidence > 0.7) {
    return 'dnf';
  }

  const isRaceOrSimulation = plannedType === 'race' || plannedType === 'simulation';
  if (isRaceOrSimulation) {
    return 'race';
  }

  const feedbackCriteria = shouldPromptFeedback(logEntry, plannedDistance, plannedType);

  if (feedbackCriteria.shouldPrompt) {
    return 'training';
  }

  return 'none';
}

export function getSessionTypeLabel(importance: SessionImportance): string {
  const labels: Record<SessionImportance, string> = {
    normal: 'Easy Run',
    key_workout: 'Key Workout',
    long_run: 'Long Run',
    heat_session: 'Heat Training',
    back_to_back: 'Back-to-Back Long Run',
  };
  return labels[importance];
}

export function calculateFeedbackPriority(
  importance: SessionImportance,
  isRace: boolean,
  isDNF: boolean
): number {
  if (isDNF) return 10;
  if (isRace) return 8;

  const importanceScores: Record<SessionImportance, number> = {
    back_to_back: 7,
    heat_session: 6,
    long_run: 5,
    key_workout: 4,
    normal: 1,
  };

  return importanceScores[importance];
}
