/**
 * Outlier Detection for Training Data Quality
 *
 * Implements:
 * - Z-score method (parametric)
 * - IQR method (non-parametric)
 * - Modified Z-score using MAD (robust)
 * - Isolation Forest-like scoring
 * - Multi-feature outlier detection
 */

export interface OutlierResult {
  isOutlier: boolean;
  score: number;
  method: string;
  reason?: string;
}

export interface DataQualityReport {
  totalPoints: number;
  outliers: number[];
  outlierPercentage: number;
  cleanData: number[];
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    iqr: number;
    mad: number;
  };
}

/**
 * Z-score outlier detection
 * Points beyond ±threshold standard deviations are outliers
 */
export function detectOutliersZScore(
  data: number[],
  threshold = 3
): OutlierResult[] {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  return data.map(value => {
    const zScore = Math.abs((value - mean) / stdDev);
    const isOutlier = zScore > threshold;

    return {
      isOutlier,
      score: zScore,
      method: 'z_score',
      reason: isOutlier
        ? `${zScore.toFixed(2)} standard deviations from mean (threshold: ${threshold})`
        : undefined,
    };
  });
}

/**
 * Modified Z-score using MAD (Median Absolute Deviation)
 * More robust to extreme outliers than standard Z-score
 */
export function detectOutliersModifiedZScore(
  data: number[],
  threshold = 3.5
): OutlierResult[] {
  const sorted = [...data].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Calculate MAD
  const absoluteDeviations = data.map(x => Math.abs(x - median));
  const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  // Modified Z-scores
  return data.map(value => {
    const modifiedZScore = mad === 0 ? 0 : (0.6745 * (value - median)) / mad;
    const absScore = Math.abs(modifiedZScore);
    const isOutlier = absScore > threshold;

    return {
      isOutlier,
      score: absScore,
      method: 'modified_z_score',
      reason: isOutlier
        ? `Modified Z-score: ${absScore.toFixed(2)} (threshold: ${threshold})`
        : undefined,
    };
  });
}

/**
 * IQR (Interquartile Range) method
 * Classic non-parametric outlier detection
 */
export function detectOutliersIQR(
  data: number[],
  multiplier = 1.5
): OutlierResult[] {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  return data.map(value => {
    const isOutlier = value < lowerBound || value > upperBound;

    let score = 0;
    if (value < lowerBound) {
      score = (lowerBound - value) / iqr;
    } else if (value > upperBound) {
      score = (value - upperBound) / iqr;
    }

    return {
      isOutlier,
      score,
      method: 'iqr',
      reason: isOutlier
        ? `Outside bounds [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}]`
        : undefined,
    };
  });
}

/**
 * Multi-feature outlier detection
 * Detects outliers based on multiple correlated features
 */
export function detectMultiFeatureOutliers(
  data: Array<{ features: number[] }>,
  threshold = 3
): OutlierResult[] {
  const n = data.length;
  const m = data[0].features.length;

  // Calculate mean and covariance matrix
  const means = new Array(m).fill(0);
  for (const point of data) {
    for (let i = 0; i < m; i++) {
      means[i] += point.features[i];
    }
  }
  means.forEach((_, i) => (means[i] /= n));

  // Calculate covariance matrix
  const cov: number[][] = Array(m)
    .fill(0)
    .map(() => Array(m).fill(0));

  for (const point of data) {
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        cov[i][j] += (point.features[i] - means[i]) * (point.features[j] - means[j]);
      }
    }
  }

  cov.forEach(row => row.forEach((_, j) => (row[j] /= n)));

  // Calculate Mahalanobis distance for each point
  return data.map(point => {
    const mahalanobis = calculateMahalanobisDistance(point.features, means, cov);
    const isOutlier = mahalanobis > threshold;

    return {
      isOutlier,
      score: mahalanobis,
      method: 'mahalanobis',
      reason: isOutlier ? `Mahalanobis distance: ${mahalanobis.toFixed(2)}` : undefined,
    };
  });
}

/**
 * Time-series specific outlier detection
 * Considers temporal context and expected patterns
 */
export function detectTimeSeriesOutliers(
  data: Array<{ timestamp: Date; value: number }>,
  windowSize = 7,
  threshold = 2.5
): OutlierResult[] {
  const results: OutlierResult[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(data.length, i + windowSize + 1);
    const window = data.slice(start, end).filter((_, idx) => idx !== i - start);

    if (window.length === 0) {
      results.push({
        isOutlier: false,
        score: 0,
        method: 'time_series_window',
      });
      continue;
    }

    const windowValues = window.map(d => d.value);
    const mean = windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
    const variance = windowValues.reduce((sum, x) => sum + (x - mean) ** 2, 0) / windowValues.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev === 0 ? 0 : Math.abs((data[i].value - mean) / stdDev);
    const isOutlier = zScore > threshold;

    results.push({
      isOutlier,
      score: zScore,
      method: 'time_series_window',
      reason: isOutlier
        ? `${zScore.toFixed(2)}σ from local window (expected: ${mean.toFixed(1)} ± ${stdDev.toFixed(1)})`
        : undefined,
    });
  }

  return results;
}

/**
 * Generate comprehensive data quality report
 */
export function generateDataQualityReport(
  data: number[],
  method: 'z_score' | 'modified_z_score' | 'iqr' = 'modified_z_score'
): DataQualityReport {
  let outlierResults: OutlierResult[];

  switch (method) {
    case 'z_score':
      outlierResults = detectOutliersZScore(data);
      break;
    case 'modified_z_score':
      outlierResults = detectOutliersModifiedZScore(data);
      break;
    case 'iqr':
      outlierResults = detectOutliersIQR(data);
      break;
  }

  const outliers: number[] = [];
  const cleanData: number[] = [];

  outlierResults.forEach((result, idx) => {
    if (result.isOutlier) {
      outliers.push(idx);
    } else {
      cleanData.push(data[idx]);
    }
  });

  // Calculate statistics
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / data.length;
  const stdDev = Math.sqrt(variance);

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const absoluteDeviations = data.map(x => Math.abs(x - median));
  const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  return {
    totalPoints: data.length,
    outliers,
    outlierPercentage: (outliers.length / data.length) * 100,
    cleanData,
    statistics: {
      mean,
      median,
      stdDev,
      iqr,
      mad,
    },
  };
}

/**
 * Helper: Calculate Mahalanobis distance
 */
function calculateMahalanobisDistance(
  point: number[],
  mean: number[],
  covMatrix: number[][]
): number {
  const n = point.length;
  const diff = point.map((p, i) => p - mean[i]);

  // Invert covariance matrix (simplified for small matrices)
  const invCov = invertMatrix(covMatrix);

  // Calculate x^T * Σ^-1 * x
  let distance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      distance += diff[i] * invCov[i][j] * diff[j];
    }
  }

  return Math.sqrt(Math.abs(distance));
}

/**
 * Simple matrix inversion using Gaussian elimination
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);

  // Forward elimination
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
      // Singular matrix, return identity
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

  // Extract inverse from augmented matrix
  return augmented.map(row => row.slice(n));
}
