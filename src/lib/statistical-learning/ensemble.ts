/**
 * Ensemble Learning - Combine Multiple Models
 *
 * Implements:
 * - Weighted averaging based on model performance
 * - Stacking (meta-learner combines base models)
 * - Adaptive weight updates based on recent accuracy
 * - Model selection based on data characteristics
 * - Confidence-weighted predictions
 */

import type { RegressionModel } from './regression';
import type { ForecastResult } from './time-series';
import type { BayesianModel } from './bayesian';

export interface EnsembleMember {
  id: string;
  name: string;
  type: 'regression' | 'time_series' | 'bayesian' | 'custom';
  weight: number;
  performance: {
    mae: number;
    mse: number;
    r2: number;
    recentAccuracy: number;
  };
  predictions: number[];
  confidence?: number;
}

export interface EnsembleConfig {
  method: 'weighted_average' | 'median' | 'stacking' | 'adaptive';
  minModels: number;
  adaptiveWindow: number;
  confidenceThreshold: number;
}

export interface EnsemblePrediction {
  value: number;
  confidence: number;
  uncertainty: number;
  interval: { lower: number; upper: number };
  modelContributions: Array<{
    modelId: string;
    prediction: number;
    weight: number;
  }>;
  method: string;
}

/**
 * Create ensemble from multiple models
 */
export function createEnsemble(
  models: EnsembleMember[],
  config: Partial<EnsembleConfig> = {}
): EnsembleConfig & { models: EnsembleMember[] } {
  const defaultConfig: EnsembleConfig = {
    method: 'adaptive',
    minModels: 2,
    adaptiveWindow: 10,
    confidenceThreshold: 0.5,
    ...config,
  };

  return {
    ...defaultConfig,
    models,
  };
}

/**
 * Weighted average prediction
 */
export function weightedAveragePrediction(
  members: EnsembleMember[]
): EnsemblePrediction {
  const validMembers = members.filter(m => m.weight > 0);

  if (validMembers.length === 0) {
    return {
      value: 0,
      confidence: 0,
      uncertainty: Infinity,
      interval: { lower: -Infinity, upper: Infinity },
      modelContributions: [],
      method: 'weighted_average',
    };
  }

  // Normalize weights
  const totalWeight = validMembers.reduce((sum, m) => sum + m.weight, 0);
  const normalizedMembers = validMembers.map(m => ({
    ...m,
    normalizedWeight: m.weight / totalWeight,
  }));

  // Weighted prediction
  const value = normalizedMembers.reduce(
    (sum, m) => sum + m.predictions[0] * m.normalizedWeight,
    0
  );

  // Weighted confidence
  const confidence = normalizedMembers.reduce((sum, m) => {
    const memberConfidence = m.confidence !== undefined ? m.confidence : m.performance.r2;
    return sum + memberConfidence * m.normalizedWeight;
  }, 0);

  // Calculate uncertainty from prediction variance
  const predictionVariance = normalizedMembers.reduce((sum, m) => {
    const diff = m.predictions[0] - value;
    return sum + m.normalizedWeight * diff * diff;
  }, 0);

  const uncertainty = Math.sqrt(predictionVariance);

  // Calculate prediction interval
  const interval = {
    lower: value - 1.96 * uncertainty,
    upper: value + 1.96 * uncertainty,
  };

  const modelContributions = normalizedMembers.map(m => ({
    modelId: m.id,
    prediction: m.predictions[0],
    weight: m.normalizedWeight,
  }));

  return {
    value,
    confidence,
    uncertainty,
    interval,
    modelContributions,
    method: 'weighted_average',
  };
}

/**
 * Median ensemble - robust to outlier models
 */
export function medianPrediction(members: EnsembleMember[]): EnsemblePrediction {
  const predictions = members.flatMap(m => m.predictions);

  if (predictions.length === 0) {
    return {
      value: 0,
      confidence: 0,
      uncertainty: Infinity,
      interval: { lower: -Infinity, upper: Infinity },
      modelContributions: [],
      method: 'median',
    };
  }

  const sorted = [...predictions].sort((a, b) => a - b);
  const value = sorted[Math.floor(sorted.length / 2)];

  // MAD (Median Absolute Deviation) for robust uncertainty
  const absoluteDeviations = predictions.map(p => Math.abs(p - value));
  const mad = [...absoluteDeviations].sort((a, b) => a - b)[
    Math.floor(absoluteDeviations.length / 2)
  ];

  const uncertainty = 1.4826 * mad; // Scale factor for normal distribution

  // Average confidence
  const confidence =
    members.reduce((sum, m) => {
      const c = m.confidence !== undefined ? m.confidence : m.performance.r2;
      return sum + c;
    }, 0) / members.length;

  const interval = {
    lower: value - 1.96 * uncertainty,
    upper: value + 1.96 * uncertainty,
  };

  const modelContributions = members.map(m => ({
    modelId: m.id,
    prediction: m.predictions[0],
    weight: 1 / members.length,
  }));

  return {
    value,
    confidence,
    uncertainty,
    interval,
    modelContributions,
    method: 'median',
  };
}

/**
 * Adaptive weighting based on recent performance
 */
export function adaptivePrediction(
  members: EnsembleMember[],
  recentErrors: Map<string, number[]>
): EnsemblePrediction {
  // Calculate adaptive weights based on recent MAE
  const adaptiveMembers = members.map(m => {
    const errors = recentErrors.get(m.id) || [];

    if (errors.length === 0) {
      return { ...m, adaptiveWeight: m.weight };
    }

    // Inverse MAE weighting (better = higher weight)
    const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
    const inverseError = 1 / (mae + 0.01); // Add small constant to avoid division by zero

    return { ...m, adaptiveWeight: inverseError };
  });

  // Normalize adaptive weights
  const totalWeight = adaptiveMembers.reduce((sum, m) => sum + m.adaptiveWeight, 0);
  const normalizedMembers = adaptiveMembers.map(m => ({
    ...m,
    normalizedWeight: m.adaptiveWeight / totalWeight,
  }));

  // Weighted prediction
  const value = normalizedMembers.reduce(
    (sum, m) => sum + m.predictions[0] * m.normalizedWeight,
    0
  );

  // Weighted confidence
  const confidence = normalizedMembers.reduce((sum, m) => {
    const memberConfidence = m.confidence !== undefined ? m.confidence : m.performance.r2;
    return sum + memberConfidence * m.normalizedWeight;
  }, 0);

  // Uncertainty from variance
  const predictionVariance = normalizedMembers.reduce((sum, m) => {
    const diff = m.predictions[0] - value;
    return sum + m.normalizedWeight * diff * diff;
  }, 0);

  const uncertainty = Math.sqrt(predictionVariance);

  const interval = {
    lower: value - 1.96 * uncertainty,
    upper: value + 1.96 * uncertainty,
  };

  const modelContributions = normalizedMembers.map(m => ({
    modelId: m.id,
    prediction: m.predictions[0],
    weight: m.normalizedWeight,
  }));

  return {
    value,
    confidence,
    uncertainty,
    interval,
    modelContributions,
    method: 'adaptive',
  };
}

/**
 * Update model weights based on performance
 */
export function updateModelWeights(
  members: EnsembleMember[],
  actual: number,
  predicted: number
): EnsembleMember[] {
  return members.map(m => {
    const error = Math.abs(m.predictions[0] - actual);
    const ensembleError = Math.abs(predicted - actual);

    // Increase weight if model performed better than ensemble
    // Decrease weight if model performed worse
    const performanceRatio = ensembleError / (error + 0.01);

    // Gentle update to avoid instability
    const learningRate = 0.1;
    const newWeight = m.weight * (1 + learningRate * (performanceRatio - 1));

    // Clamp weights
    const clampedWeight = Math.max(0.1, Math.min(5.0, newWeight));

    return {
      ...m,
      weight: clampedWeight,
    };
  });
}

/**
 * Select best model based on data characteristics
 */
export function selectBestModel(
  members: EnsembleMember[],
  dataCharacteristics: {
    hasOutliers: boolean;
    isTrending: boolean;
    isVolatile: boolean;
    sampleSize: number;
  }
): EnsembleMember {
  let bestModel = members[0];
  let bestScore = 0;

  for (const model of members) {
    let score = model.performance.r2;

    // Boost score for Bayesian models with small sample sizes
    if (model.type === 'bayesian' && dataCharacteristics.sampleSize < 20) {
      score *= 1.3;
    }

    // Boost robust models when there are outliers
    if (dataCharacteristics.hasOutliers && model.type === 'regression') {
      score *= 1.2;
    }

    // Boost time-series models when data is trending
    if (dataCharacteristics.isTrending && model.type === 'time_series') {
      score *= 1.4;
    }

    // Penalize volatile models in volatile conditions
    if (dataCharacteristics.isVolatile && model.performance.mse > 1.5 * bestModel.performance.mse) {
      score *= 0.8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestModel = model;
    }
  }

  return bestModel;
}

/**
 * Make ensemble prediction with automatic method selection
 */
export function ensemblePredict(
  ensemble: EnsembleConfig & { models: EnsembleMember[] },
  recentErrors?: Map<string, number[]>
): EnsemblePrediction {
  const { models, method } = ensemble;

  if (models.length < ensemble.minModels) {
    return {
      value: 0,
      confidence: 0,
      uncertainty: Infinity,
      interval: { lower: -Infinity, upper: Infinity },
      modelContributions: [],
      method: 'insufficient_models',
    };
  }

  switch (method) {
    case 'weighted_average':
      return weightedAveragePrediction(models);

    case 'median':
      return medianPrediction(models);

    case 'adaptive':
      return recentErrors
        ? adaptivePrediction(models, recentErrors)
        : weightedAveragePrediction(models);

    default:
      return weightedAveragePrediction(models);
  }
}

/**
 * Calculate ensemble diversity (higher = better for robustness)
 */
export function calculateEnsembleDiversity(members: EnsembleMember[]): number {
  if (members.length < 2) return 0;

  let totalDisagreement = 0;
  let comparisons = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const diff = Math.abs(members[i].predictions[0] - members[j].predictions[0]);
      totalDisagreement += diff;
      comparisons++;
    }
  }

  return totalDisagreement / comparisons;
}
