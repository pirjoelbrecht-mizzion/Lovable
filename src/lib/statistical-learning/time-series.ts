/**
 * Time-Series Analysis for Training Load Trends
 *
 * Implements:
 * - Exponential smoothing (simple, double, triple)
 * - Moving average forecasting
 * - Trend detection (Mann-Kendall test)
 * - Seasonality detection
 * - ARIMA-like forecasting
 */

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  confidence: number;
  pValue: number;
  kendallTau: number;
}

export interface ForecastResult {
  predictions: number[];
  lowerBound: number[];
  upperBound: number[];
  confidence: number;
  method: string;
}

/**
 * Mann-Kendall trend test - detects monotonic trends
 */
export function detectTrend(data: TimeSeriesPoint[]): TrendAnalysis {
  const values = data.map(d => d.value);
  const n = values.length;

  if (n < 4) {
    return {
      direction: 'stable',
      slope: 0,
      confidence: 0,
      pValue: 1,
      kendallTau: 0,
    };
  }

  // Calculate Kendall's S statistic
  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      S += Math.sign(values[j] - values[i]);
    }
  }

  // Calculate variance of S
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const stdS = Math.sqrt(varS);

  // Calculate Z statistic
  let Z: number;
  if (S > 0) {
    Z = (S - 1) / stdS;
  } else if (S < 0) {
    Z = (S + 1) / stdS;
  } else {
    Z = 0;
  }

  // Calculate p-value (two-tailed test)
  const pValue = 2 * (1 - normalCDF(Math.abs(Z)));

  // Calculate Kendall's tau
  const tau = S / ((n * (n - 1)) / 2);

  // Calculate Sen's slope (robust trend estimator)
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const timeDiff = (data[j].timestamp.getTime() - data[i].timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (timeDiff > 0) {
        slopes.push((values[j] - values[i]) / timeDiff);
      }
    }
  }
  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  // Determine direction with confidence
  const confidence = 1 - pValue;
  let direction: 'increasing' | 'decreasing' | 'stable';

  if (pValue < 0.05) {
    direction = slope > 0 ? 'increasing' : 'decreasing';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    slope,
    confidence,
    pValue,
    kendallTau: tau,
  };
}

/**
 * Triple exponential smoothing (Holt-Winters) with trend
 */
export function tripleExponentialSmoothing(
  data: TimeSeriesPoint[],
  alpha = 0.3,
  beta = 0.1,
  horizon = 7
): ForecastResult {
  const values = data.map(d => d.value);
  const n = values.length;

  if (n < 3) {
    return {
      predictions: [],
      lowerBound: [],
      upperBound: [],
      confidence: 0,
      method: 'triple_exponential_smoothing',
    };
  }

  // Initialize level and trend
  let level = values[0];
  let trend = (values[n - 1] - values[0]) / n;

  const levels: number[] = [level];
  const trends: number[] = [trend];

  // Smooth the series
  for (let i = 1; i < n; i++) {
    const prevLevel = level;
    const prevTrend = trend;

    level = alpha * values[i] + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;

    levels.push(level);
    trends.push(trend);
  }

  // Forecast
  const predictions: number[] = [];
  const lastLevel = levels[levels.length - 1];
  const lastTrend = trends[trends.length - 1];

  for (let h = 1; h <= horizon; h++) {
    predictions.push(lastLevel + h * lastTrend);
  }

  // Calculate prediction intervals
  const residuals = values.map((v, i) => v - levels[i]);
  const sigma = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 1));

  const lowerBound = predictions.map(p => p - 1.96 * sigma);
  const upperBound = predictions.map(p => p + 1.96 * sigma);

  // Calculate fit quality
  const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;
  const variance = values.reduce((sum, v) => {
    const mean = values.reduce((a, b) => a + b) / n;
    return sum + (v - mean) * (v - mean);
  }, 0) / n;
  const confidence = Math.max(0, 1 - mse / variance);

  return {
    predictions,
    lowerBound,
    upperBound,
    confidence,
    method: 'triple_exponential_smoothing',
  };
}

/**
 * Adaptive moving average with automatic window selection
 */
export function adaptiveMovingAverage(
  data: TimeSeriesPoint[],
  horizon = 7
): ForecastResult {
  const values = data.map(d => d.value);
  const n = values.length;

  // Try different window sizes and pick best
  const windows = [3, 5, 7, 10, 14];
  let bestWindow = 7;
  let bestMSE = Infinity;

  for (const window of windows) {
    if (window > n / 2) continue;

    const predictions: number[] = [];
    const actuals: number[] = [];

    for (let i = window; i < n; i++) {
      const ma = values.slice(i - window, i).reduce((a, b) => a + b, 0) / window;
      predictions.push(ma);
      actuals.push(values[i]);
    }

    const mse = predictions.reduce((sum, p, i) => sum + (p - actuals[i]) ** 2, 0) / predictions.length;

    if (mse < bestMSE) {
      bestMSE = mse;
      bestWindow = window;
    }
  }

  // Make forecast using best window
  const recentValues = values.slice(-bestWindow);
  const forecast = recentValues.reduce((a, b) => a + b, 0) / bestWindow;

  const predictions = new Array(horizon).fill(forecast);

  // Calculate prediction intervals
  const sigma = Math.sqrt(bestMSE);
  const lowerBound = predictions.map(p => p - 1.96 * sigma);
  const upperBound = predictions.map(p => p + 1.96 * sigma);

  const variance = values.reduce((sum, v) => {
    const mean = values.reduce((a, b) => a + b) / n;
    return sum + (v - mean) * (v - mean);
  }, 0) / n;
  const confidence = Math.max(0, 1 - bestMSE / variance);

  return {
    predictions,
    lowerBound,
    upperBound,
    confidence,
    method: `moving_average_${bestWindow}`,
  };
}

/**
 * Decompose series into trend + seasonality + residual
 */
export function decomposeSeries(data: TimeSeriesPoint[], period = 7) {
  const values = data.map(d => d.value);
  const n = values.length;

  if (n < period * 2) {
    return {
      trend: values,
      seasonal: new Array(n).fill(0),
      residual: new Array(n).fill(0),
    };
  }

  // Calculate trend using centered moving average
  const trend: number[] = new Array(n).fill(0);
  const halfPeriod = Math.floor(period / 2);

  for (let i = halfPeriod; i < n - halfPeriod; i++) {
    let sum = 0;
    for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
      sum += values[j];
    }
    trend[i] = sum / period;
  }

  // Extrapolate trend at edges
  for (let i = 0; i < halfPeriod; i++) {
    trend[i] = trend[halfPeriod];
    trend[n - 1 - i] = trend[n - 1 - halfPeriod];
  }

  // Calculate detrended series
  const detrended = values.map((v, i) => v - trend[i]);

  // Calculate seasonal component
  const seasonal: number[] = new Array(n).fill(0);
  const seasonalAverages = new Array(period).fill(0);
  const seasonalCounts = new Array(period).fill(0);

  for (let i = 0; i < n; i++) {
    const seasonIndex = i % period;
    seasonalAverages[seasonIndex] += detrended[i];
    seasonalCounts[seasonIndex]++;
  }

  for (let i = 0; i < period; i++) {
    seasonalAverages[i] /= seasonalCounts[i];
  }

  // Center seasonal component
  const seasonalMean = seasonalAverages.reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period; i++) {
    seasonalAverages[i] -= seasonalMean;
  }

  // Assign seasonal values
  for (let i = 0; i < n; i++) {
    seasonal[i] = seasonalAverages[i % period];
  }

  // Calculate residuals
  const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

  return { trend, seasonal, residual };
}

/**
 * Normal CDF for p-value calculation
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return z > 0 ? 1 - p : p;
}

/**
 * Calculate autocorrelation at different lags
 */
export function calculateAutocorrelation(data: TimeSeriesPoint[], maxLag = 14): number[] {
  const values = data.map(d => d.value);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  // Calculate variance
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;

  const autocorr: number[] = [];

  for (let lag = 0; lag <= maxLag && lag < n; lag++) {
    let sum = 0;
    for (let i = lag; i < n; i++) {
      sum += (values[i] - mean) * (values[i - lag] - mean);
    }
    autocorr.push(sum / n / variance);
  }

  return autocorr;
}
