/**
 * Bayesian Updating for Coefficient Refinement
 *
 * Implements:
 * - Bayesian linear regression with conjugate priors
 * - Sequential updating as new data arrives
 * - Uncertainty quantification
 * - Prior belief integration
 * - Credible interval calculation
 */

export interface BayesianPrior {
  mean: number[];
  precision: number[][];
  alpha: number;
  beta: number;
}

export interface BayesianPosterior {
  mean: number[];
  precision: number[][];
  alpha: number;
  beta: number;
  credibleIntervals: Array<{ lower: number; upper: number }>;
  uncertainty: number[];
}

export interface BayesianModel {
  prior: BayesianPrior;
  posterior: BayesianPosterior;
  observations: number;
  lastUpdated: Date;
}

/**
 * Initialize Bayesian linear regression with weak prior
 */
export function initializeBayesianModel(
  featureCount: number,
  priorMean?: number[],
  priorVariance = 1000
): BayesianModel {
  const mean = priorMean || new Array(featureCount).fill(0);

  // Weak prior: large variance = low confidence
  const precision = Array(featureCount)
    .fill(0)
    .map((_, i) => Array(featureCount).fill(0).map((_, j) => (i === j ? 1 / priorVariance : 0)));

  const prior: BayesianPrior = {
    mean,
    precision,
    alpha: 1.0, // Shape parameter for noise precision
    beta: 1.0, // Rate parameter for noise precision
  };

  return {
    prior,
    posterior: {
      ...prior,
      credibleIntervals: mean.map(() => ({
        lower: -Infinity,
        upper: Infinity,
      })),
      uncertainty: new Array(featureCount).fill(1.0),
    },
    observations: 0,
    lastUpdated: new Date(),
  };
}

/**
 * Update Bayesian model with new observation
 * Uses conjugate prior (Normal-Gamma) for analytical solution
 */
export function updateBayesianModel(
  model: BayesianModel,
  features: number[],
  target: number,
  weight = 1.0
): BayesianModel {
  const n = features.length;
  const { posterior } = model;

  // Design matrix for single observation
  const X = [features];
  const y = [target];

  // Update posterior precision: Λ_new = Λ_old + w * X^T X
  const XtX = matrixMultiply(transpose(X), X);
  const weightedXtX = XtX.map(row => row.map(val => val * weight));
  const newPrecision = matrixAdd(posterior.precision, weightedXtX);

  // Update posterior mean: μ_new = (Λ_new)^-1 (Λ_old μ_old + w * X^T y)
  const precisionMean = matrixVectorMultiply(posterior.precision, posterior.mean);
  const XtY = matrixVectorMultiply(transpose(X), y);
  const weightedXtY = XtY.map(val => val * weight);
  const sumVector = vectorAdd(precisionMean, weightedXtY);

  const invNewPrecision = invertMatrix(newPrecision);
  const newMean = matrixVectorMultiply(invNewPrecision, sumVector);

  // Update noise precision parameters (alpha, beta)
  const prediction = dotProduct(features, posterior.mean);
  const error = target - prediction;

  const newAlpha = posterior.alpha + 0.5 * weight;
  const newBeta = posterior.beta + 0.5 * weight * error * error;

  // Calculate uncertainty (diagonal of covariance matrix)
  const expectedNoisePrecision = newAlpha / newBeta;
  const covariance = invNewPrecision.map(row => row.map(val => val / expectedNoisePrecision));
  const uncertainty = covariance.map((row, i) => Math.sqrt(Math.abs(row[i])));

  // Calculate 95% credible intervals
  const tValue = 1.96; // Approximate for large samples
  const credibleIntervals = newMean.map((mean, i) => ({
    lower: mean - tValue * uncertainty[i],
    upper: mean + tValue * uncertainty[i],
  }));

  return {
    prior: model.prior,
    posterior: {
      mean: newMean,
      precision: newPrecision,
      alpha: newAlpha,
      beta: newBeta,
      credibleIntervals,
      uncertainty,
    },
    observations: model.observations + 1,
    lastUpdated: new Date(),
  };
}

/**
 * Batch update with multiple observations
 */
export function batchUpdateBayesianModel(
  model: BayesianModel,
  data: Array<{ features: number[]; target: number; weight?: number }>
): BayesianModel {
  let updatedModel = model;

  for (const observation of data) {
    updatedModel = updateBayesianModel(
      updatedModel,
      observation.features,
      observation.target,
      observation.weight || 1.0
    );
  }

  return updatedModel;
}

/**
 * Predict with uncertainty quantification
 */
export function bayesianPredict(
  model: BayesianModel,
  features: number[]
): {
  mean: number;
  variance: number;
  credibleInterval: { lower: number; upper: number };
} {
  const { posterior } = model;

  // Point prediction
  const mean = dotProduct(features, posterior.mean);

  // Predictive variance = σ² + x^T Σ x
  const noiseVariance = posterior.beta / (posterior.alpha - 1);
  const invPrecision = invertMatrix(posterior.precision);

  let modelVariance = 0;
  for (let i = 0; i < features.length; i++) {
    for (let j = 0; j < features.length; j++) {
      modelVariance += features[i] * invPrecision[i][j] * features[j];
    }
  }

  const variance = noiseVariance + modelVariance;
  const stdDev = Math.sqrt(variance);

  const credibleInterval = {
    lower: mean - 1.96 * stdDev,
    upper: mean + 1.96 * stdDev,
  };

  return { mean, variance, credibleInterval };
}

/**
 * Calculate model confidence based on observations and uncertainty
 */
export function calculateModelConfidence(model: BayesianModel): number {
  const { observations, posterior } = model;

  // Confidence increases with observations (saturates at ~100)
  const observationConfidence = Math.min(observations / 100, 1.0);

  // Confidence decreases with high uncertainty
  const avgUncertainty = posterior.uncertainty.reduce((a, b) => a + b, 0) / posterior.uncertainty.length;
  const uncertaintyConfidence = 1 / (1 + avgUncertainty);

  // Combined confidence
  return observationConfidence * uncertaintyConfidence;
}

/**
 * Detect when model needs recalibration
 */
export function detectModelDrift(
  model: BayesianModel,
  recentErrors: number[],
  threshold = 2.0
): {
  hasDrift: boolean;
  severity: number;
  recommendation: string;
} {
  if (recentErrors.length < 5) {
    return {
      hasDrift: false,
      severity: 0,
      recommendation: 'Insufficient data for drift detection',
    };
  }

  // Calculate expected variance from model
  const expectedNoise = model.posterior.beta / model.posterior.alpha;

  // Calculate actual variance from recent errors
  const mean = recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length;
  const actualVariance = recentErrors.reduce((sum, e) => sum + (e - mean) ** 2, 0) / recentErrors.length;

  // Drift severity
  const severity = actualVariance / expectedNoise;
  const hasDrift = severity > threshold;

  let recommendation = '';
  if (hasDrift) {
    if (severity > 5) {
      recommendation = 'Critical drift detected - recommend full model reset with recent data';
    } else if (severity > 3) {
      recommendation = 'Significant drift - increase learning rate or add more recent observations';
    } else {
      recommendation = 'Mild drift - continue monitoring';
    }
  } else {
    recommendation = 'Model performing well - no drift detected';
  }

  return { hasDrift, severity, recommendation };
}

/**
 * Matrix and vector operations
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < B.length; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

function matrixVectorMultiply(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

function matrixAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

function vectorAdd(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) {
      return Array(n)
        .fill(0)
        .map((_, i) => Array(n).fill(0).map((_, j) => (i === j ? 1 : 0)));
    }

    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  return augmented.map(row => row.slice(n));
}
