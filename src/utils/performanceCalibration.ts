import type { BaselineRace } from './computeBaseline';

export type PerformanceModel = {
  id?: string;
  userId?: string;
  baselineId: string | null;
  baselineType: 'real' | 'derived';
  baselineDistanceKm: number | null;
  baselineTimeMin: number | null;
  baselineDate: string | null;
  performanceDecay: number;
  calibrationCount: number;
  lastCalibrationDate: string | null;
  confidenceScore: number;
  metadata: Record<string, any>;
};

export type CalibrationInput = {
  raceId: string;
  raceName: string;
  raceDistanceKm: number;
  predictedTimeMin: number;
  actualTimeMin: number;
  baselineDistanceKm: number;
};

export type CalibrationResult = {
  updatedModel: PerformanceModel;
  calibrationRecord: {
    raceId: string;
    raceName: string;
    raceDistanceKm: number;
    predictedTimeMin: number;
    actualTimeMin: number;
    timeDeltaMin: number;
    oldDecay: number;
    newDecay: number;
    decayDelta: number;
    improvementPct: number;
    calibrationQuality: number;
    notes?: string;
  };
};

const MIN_DECAY = 1.03;
const MAX_DECAY = 1.12;
const DEFAULT_DECAY = 1.06;

function clampDecay(decay: number): number {
  return Math.max(MIN_DECAY, Math.min(MAX_DECAY, decay));
}

function calculateCalibrationQuality(
  timeDeltaPct: number,
  raceDistanceKm: number,
  calibrationCount: number
): number {
  let quality = 0.8;

  if (Math.abs(timeDeltaPct) < 5) {
    quality = 0.95;
  } else if (Math.abs(timeDeltaPct) < 10) {
    quality = 0.85;
  } else if (Math.abs(timeDeltaPct) < 15) {
    quality = 0.75;
  } else {
    quality = 0.6;
  }

  if (raceDistanceKm >= 42.195) {
    quality = Math.min(1.0, quality * 1.1);
  } else if (raceDistanceKm < 10) {
    quality *= 0.9;
  }

  if (calibrationCount === 0) {
    quality *= 0.9;
  }

  return Math.max(0.5, Math.min(1.0, quality));
}

export function updateCalibration(
  currentModel: PerformanceModel,
  calibrationInput: CalibrationInput
): CalibrationResult {
  const {
    raceId,
    raceName,
    raceDistanceKm,
    predictedTimeMin,
    actualTimeMin,
    baselineDistanceKm
  } = calibrationInput;

  const timeDeltaMin = actualTimeMin - predictedTimeMin;
  const timeDeltaPct = (timeDeltaMin / predictedTimeMin) * 100;

  const distanceRatio = raceDistanceKm / baselineDistanceKm;

  const actualDecay = Math.log(actualTimeMin / (predictedTimeMin /
    Math.pow(distanceRatio, currentModel.performanceDecay))) / Math.log(distanceRatio);

  const alpha = Math.min(0.4, 1 / (currentModel.calibrationCount + 2));

  const rawNewDecay = (1 - alpha) * currentModel.performanceDecay + alpha * actualDecay;

  const newDecay = clampDecay(rawNewDecay);

  const decayDelta = newDecay - currentModel.performanceDecay;

  const improvementPct = Math.abs(decayDelta / currentModel.performanceDecay) * 100;

  const calibrationQuality = calculateCalibrationQuality(
    timeDeltaPct,
    raceDistanceKm,
    currentModel.calibrationCount
  );

  let notes = '';
  if (timeDeltaPct < -10) {
    notes = 'Significantly faster than predicted - excellent performance';
  } else if (timeDeltaPct < -5) {
    notes = 'Faster than predicted - strong performance';
  } else if (timeDeltaPct > 10) {
    notes = 'Slower than predicted - possible fatigue or adverse conditions';
  } else if (timeDeltaPct > 5) {
    notes = 'Slower than predicted - consider recovery status';
  } else {
    notes = 'Close to prediction - model is well calibrated';
  }

  if (Math.abs(decayDelta) > 0.02) {
    notes += '. Significant model adjustment made.';
  }

  const updatedModel: PerformanceModel = {
    ...currentModel,
    performanceDecay: newDecay,
    calibrationCount: currentModel.calibrationCount + 1,
    lastCalibrationDate: new Date().toISOString(),
    confidenceScore: Math.min(1.0, currentModel.confidenceScore + 0.05),
    metadata: {
      ...currentModel.metadata,
      lastCalibrationDistance: raceDistanceKm,
      lastCalibrationDelta: timeDeltaMin,
      calibrationHistory: [
        ...(currentModel.metadata.calibrationHistory || []).slice(-9),
        {
          date: new Date().toISOString(),
          raceId,
          decay: newDecay,
          quality: calibrationQuality
        }
      ]
    }
  };

  const calibrationRecord = {
    raceId,
    raceName,
    raceDistanceKm,
    predictedTimeMin,
    actualTimeMin,
    timeDeltaMin,
    oldDecay: currentModel.performanceDecay,
    newDecay,
    decayDelta,
    improvementPct,
    calibrationQuality,
    notes
  };

  return {
    updatedModel,
    calibrationRecord
  };
}

export function initializePerformanceModel(baseline?: BaselineRace): PerformanceModel {
  return {
    baselineId: baseline?.id || null,
    baselineType: baseline?.type || 'derived',
    baselineDistanceKm: baseline?.distanceKm || null,
    baselineTimeMin: baseline?.timeMin || null,
    baselineDate: baseline?.dateISO || null,
    performanceDecay: DEFAULT_DECAY,
    calibrationCount: 0,
    lastCalibrationDate: null,
    confidenceScore: baseline?.confidenceScore || 0.5,
    metadata: {
      initialized: new Date().toISOString(),
      baselineSource: baseline?.source || 'none',
      calibrationHistory: []
    }
  };
}

export function updateBaselineInModel(
  model: PerformanceModel,
  newBaseline: BaselineRace
): PerformanceModel {
  const isUpgrade = newBaseline.type === 'real' && model.baselineType === 'derived';

  return {
    ...model,
    baselineId: newBaseline.id,
    baselineType: newBaseline.type,
    baselineDistanceKm: newBaseline.distanceKm,
    baselineTimeMin: newBaseline.timeMin,
    baselineDate: newBaseline.dateISO,
    confidenceScore: Math.max(model.confidenceScore, newBaseline.confidenceScore),
    metadata: {
      ...model.metadata,
      baselineUpdated: new Date().toISOString(),
      baselineUpgraded: isUpgrade,
      previousBaselineId: model.baselineId
    }
  };
}

export function shouldCalibrate(
  model: PerformanceModel,
  raceDistanceKm: number,
  actualTimeMin: number,
  predictedTimeMin: number
): { shouldCalibrate: boolean; reason: string } {
  if (!model.baselineDistanceKm) {
    return {
      shouldCalibrate: false,
      reason: 'No baseline available'
    };
  }

  if (raceDistanceKm < 5) {
    return {
      shouldCalibrate: false,
      reason: 'Race distance too short for calibration'
    };
  }

  const timeDeltaPct = Math.abs(((actualTimeMin - predictedTimeMin) / predictedTimeMin) * 100);

  if (timeDeltaPct > 50) {
    return {
      shouldCalibrate: false,
      reason: 'Time deviation too large - possible data error'
    };
  }

  return {
    shouldCalibrate: true,
    reason: 'Ready for calibration'
  };
}

export function getDecayDescription(decay: number): string {
  if (decay < 1.055) {
    return 'Excellent endurance - pace holds well at longer distances';
  } else if (decay < 1.065) {
    return 'Strong endurance - good pace sustainability';
  } else if (decay < 1.075) {
    return 'Good endurance - typical pace decline at distance';
  } else if (decay < 1.085) {
    return 'Building endurance - focus on long runs';
  } else {
    return 'Developing endurance - increase weekly volume gradually';
  }
}

export function getDecayTrend(currentDecay: number, previousDecay: number): {
  direction: 'improving' | 'declining' | 'stable';
  message: string;
} {
  const delta = currentDecay - previousDecay;

  if (Math.abs(delta) < 0.005) {
    return {
      direction: 'stable',
      message: 'Endurance profile stable'
    };
  }

  if (delta < 0) {
    const improvement = Math.abs((delta / previousDecay) * 100);
    return {
      direction: 'improving',
      message: `Endurance improving - decay reduced by ${improvement.toFixed(1)}%`
    };
  } else {
    const decline = (delta / previousDecay) * 100;
    return {
      direction: 'declining',
      message: `Endurance declining - decay increased by ${decline.toFixed(1)}%`
    };
  }
}

export function predictTimeWithModel(
  model: PerformanceModel,
  targetDistanceKm: number
): number | null {
  if (!model.baselineDistanceKm || !model.baselineTimeMin) {
    return null;
  }

  const distanceRatio = targetDistanceKm / model.baselineDistanceKm;
  const predictedTime = model.baselineTimeMin * Math.pow(distanceRatio, model.performanceDecay);

  return predictedTime;
}

export function getModelQualityScore(model: PerformanceModel): {
  score: number;
  category: 'excellent' | 'good' | 'fair' | 'initial';
  description: string;
} {
  let score = 0;

  if (model.baselineType === 'real') {
    score += 40;
  } else {
    score += 20;
  }

  score += Math.min(30, model.calibrationCount * 10);

  score += model.confidenceScore * 30;

  if (model.calibrationCount >= 3 && model.baselineType === 'real') {
    return {
      score,
      category: 'excellent',
      description: 'High confidence predictions based on multiple race calibrations'
    };
  } else if (model.calibrationCount >= 1 && model.baselineType === 'real') {
    return {
      score,
      category: 'good',
      description: 'Reliable predictions from real race data'
    };
  } else if (model.baselineType === 'derived') {
    return {
      score,
      category: 'fair',
      description: 'Fair predictions from training data - will improve with race results'
    };
  } else {
    return {
      score,
      category: 'initial',
      description: 'Initial model - predictions will improve as you log races'
    };
  }
}
