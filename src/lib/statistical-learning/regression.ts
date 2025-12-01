/**
 * Advanced Regression Models for Training Load Prediction
 *
 * Implements:
 * - Linear regression with multiple features
 * - Polynomial regression for non-linear patterns
 * - Ridge regression (L2 regularization) for stability
 * - Time-weighted regression (recent data matters more)
 */

export interface RegressionModel {
  coefficients: number[];
  intercept: number;
  r2Score: number;
  mse: number;
  mae: number;
  features: string[];
  sampleCount: number;
  modelType: 'linear' | 'polynomial' | 'ridge' | 'time_weighted';
  createdAt: Date;
}

export interface DataPoint {
  features: number[];
  target: number;
  weight?: number;
  timestamp?: Date;
}

/**
 * Simple linear regression with multiple features
 */
export function fitLinearRegression(data: DataPoint[]): RegressionModel {
  const n = data.length;
  const m = data[0].features.length;

  // Build design matrix X and target vector y
  const X: number[][] = data.map(d => [1, ...d.features]); // Add intercept column
  const y: number[] = data.map(d => d.target);

  // Solve normal equation: β = (X'X)^-1 X'y
  const XtX = matrixMultiply(transpose(X), X);
  const Xty = matrixVectorMultiply(transpose(X), y);
  const beta = solveLinearSystem(XtX, Xty);

  const intercept = beta[0];
  const coefficients = beta.slice(1);

  // Calculate predictions and metrics
  const predictions = data.map(d => predict([1, ...d.features], beta));
  const metrics = calculateMetrics(y, predictions);

  return {
    coefficients,
    intercept,
    ...metrics,
    features: data[0].features.map((_, i) => `x${i}`),
    sampleCount: n,
    modelType: 'linear',
    createdAt: new Date(),
  };
}

/**
 * Ridge regression (L2 regularization) - prevents overfitting
 */
export function fitRidgeRegression(data: DataPoint[], lambda = 0.1): RegressionModel {
  const n = data.length;
  const m = data[0].features.length;

  const X: number[][] = data.map(d => [1, ...d.features]);
  const y: number[] = data.map(d => d.target);

  // Solve ridge equation: β = (X'X + λI)^-1 X'y
  const XtX = matrixMultiply(transpose(X), X);

  // Add λ to diagonal (except intercept)
  for (let i = 1; i < XtX.length; i++) {
    XtX[i][i] += lambda;
  }

  const Xty = matrixVectorMultiply(transpose(X), y);
  const beta = solveLinearSystem(XtX, Xty);

  const intercept = beta[0];
  const coefficients = beta.slice(1);

  const predictions = data.map(d => predict([1, ...d.features], beta));
  const metrics = calculateMetrics(y, predictions);

  return {
    coefficients,
    intercept,
    ...metrics,
    features: data[0].features.map((_, i) => `x${i}`),
    sampleCount: n,
    modelType: 'ridge',
    createdAt: new Date(),
  };
}

/**
 * Time-weighted regression - recent observations weighted more heavily
 */
export function fitTimeWeightedRegression(data: DataPoint[], halfLife = 30): RegressionModel {
  // Calculate time weights using exponential decay
  const now = new Date();
  const weightedData = data.map(d => {
    if (!d.timestamp) return { ...d, weight: 1 };

    const daysAgo = (now.getTime() - d.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-Math.log(2) * daysAgo / halfLife);

    return { ...d, weight };
  });

  // Weighted least squares
  const X: number[][] = weightedData.map(d => [1, ...d.features]);
  const y: number[] = weightedData.map(d => d.target);
  const W: number[] = weightedData.map(d => d.weight || 1);

  // Solve: β = (X'WX)^-1 X'Wy
  const XtW = transpose(X).map(row => row.map((val, i) => val * W[i]));
  const XtWX = matrixMultiply(XtW, X);
  const XtWy = matrixVectorMultiply(XtW, y);

  const beta = solveLinearSystem(XtWX, XtWy);

  const intercept = beta[0];
  const coefficients = beta.slice(1);

  const predictions = data.map(d => predict([1, ...d.features], beta));
  const metrics = calculateMetrics(y, predictions);

  return {
    coefficients,
    intercept,
    ...metrics,
    features: data[0].features.map((_, i) => `x${i}`),
    sampleCount: data.length,
    modelType: 'time_weighted',
    createdAt: new Date(),
  };
}

/**
 * Polynomial regression - capture non-linear patterns
 */
export function fitPolynomialRegression(
  data: DataPoint[],
  degree = 2
): RegressionModel {
  // Transform features to polynomial features
  const polyData = data.map(d => ({
    ...d,
    features: createPolynomialFeatures(d.features, degree),
  }));

  return {
    ...fitRidgeRegression(polyData, 0.01), // Use ridge to prevent overfitting
    modelType: 'polynomial',
  };
}

/**
 * Matrix operations
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

/**
 * Solve linear system Ax = b using Gaussian elimination
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}

function predict(features: number[], beta: number[]): number {
  return features.reduce((sum, f, i) => sum + f * beta[i], 0);
}

function calculateMetrics(actual: number[], predicted: number[]) {
  const n = actual.length;
  const mean = actual.reduce((a, b) => a + b, 0) / n;

  let ssRes = 0;
  let ssTot = 0;
  let sumAbsError = 0;

  for (let i = 0; i < n; i++) {
    const error = actual[i] - predicted[i];
    ssRes += error * error;
    ssTot += (actual[i] - mean) * (actual[i] - mean);
    sumAbsError += Math.abs(error);
  }

  const r2Score = 1 - ssRes / ssTot;
  const mse = ssRes / n;
  const mae = sumAbsError / n;

  return { r2Score, mse, mae };
}

function createPolynomialFeatures(features: number[], degree: number): number[] {
  const poly: number[] = [...features];

  // Add squared terms
  if (degree >= 2) {
    for (let i = 0; i < features.length; i++) {
      poly.push(features[i] * features[i]);
    }
  }

  // Add interaction terms
  if (degree >= 2) {
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        poly.push(features[i] * features[j]);
      }
    }
  }

  // Add cubic terms
  if (degree >= 3) {
    for (let i = 0; i < features.length; i++) {
      poly.push(features[i] * features[i] * features[i]);
    }
  }

  return poly;
}

/**
 * Predict using trained model
 */
export function predictWithModel(model: RegressionModel, features: number[]): number {
  let prediction = model.intercept;

  for (let i = 0; i < model.coefficients.length; i++) {
    prediction += model.coefficients[i] * features[i];
  }

  return prediction;
}
