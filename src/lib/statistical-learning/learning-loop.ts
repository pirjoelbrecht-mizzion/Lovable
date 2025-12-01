/**
 * Statistical Learning Loop Controller
 *
 * Orchestrates the complete learning cycle:
 * 1. Data collection and cleaning (outlier detection)
 * 2. Feature engineering
 * 3. Model training (regression, time-series, Bayesian)
 * 4. Ensemble creation and prediction
 * 5. Performance evaluation
 * 6. Adaptive updates
 */

import {
  fitLinearRegression,
  fitRidgeRegression,
  fitTimeWeightedRegression,
  type RegressionModel,
  type DataPoint,
} from './regression';

import {
  detectTrend,
  tripleExponentialSmoothing,
  adaptiveMovingAverage,
  type TimeSeriesPoint,
  type TrendAnalysis,
} from './time-series';

import {
  detectOutliersModifiedZScore,
  detectTimeSeriesOutliers,
  generateDataQualityReport,
  type DataQualityReport,
} from './outliers';

import {
  initializeBayesianModel,
  updateBayesianModel,
  bayesianPredict,
  calculateModelConfidence,
  detectModelDrift,
  type BayesianModel,
} from './bayesian';

import {
  createEnsemble,
  ensemblePredict,
  updateModelWeights,
  calculateEnsembleDiversity,
  type EnsembleMember,
  type EnsemblePrediction,
} from './ensemble';

export interface TrainingData {
  timestamp: Date;
  distance: number;
  duration: number;
  elevation: number;
  avgHR?: number;
  perceivedEffort?: number;
  fatigue?: number;
  sleepQuality?: number;
  readiness?: number;
}

export interface LearningState {
  dataQuality: DataQualityReport;
  trendAnalysis: TrendAnalysis;
  regressionModel: RegressionModel | null;
  bayesianModel: BayesianModel | null;
  ensemble: (EnsembleConfig & { models: EnsembleMember[] }) | null;
  recentPredictions: Array<{
    timestamp: Date;
    predicted: number;
    actual: number | null;
    error: number | null;
  }>;
  performance: {
    mae: number;
    mse: number;
    r2: number;
    confidence: number;
  };
  lastUpdated: Date;
  observationCount: number;
}

export interface LearningLoopResult {
  state: LearningState;
  prediction: EnsemblePrediction;
  recommendations: string[];
  insights: string[];
}

/**
 * Main learning loop - processes new data and updates models
 */
export async function runLearningLoop(
  historicalData: TrainingData[],
  targetVariable: 'distance' | 'fatigue' | 'readiness' = 'distance'
): Promise<LearningLoopResult> {
  // STEP 1: Data cleaning and outlier detection
  const { cleanData, dataQuality } = preprocessData(historicalData, targetVariable);

  if (cleanData.length < 5) {
    return {
      state: createEmptyState(dataQuality),
      prediction: {
        value: 0,
        confidence: 0,
        uncertainty: Infinity,
        interval: { lower: -Infinity, upper: Infinity },
        modelContributions: [],
        method: 'insufficient_data',
      },
      recommendations: ['Need at least 5 clean data points for meaningful predictions'],
      insights: ['Continue logging training data to enable statistical learning'],
    };
  }

  // STEP 2: Feature engineering
  const features = engineerFeatures(cleanData);

  // STEP 3: Trend analysis
  const timeSeriesData: TimeSeriesPoint[] = cleanData.map(d => ({
    timestamp: d.timestamp,
    value: getTargetValue(d, targetVariable),
  }));

  const trendAnalysis = detectTrend(timeSeriesData);

  // STEP 4: Train models
  const regressionModel = fitTimeWeightedRegression(features, 30);

  // Initialize or update Bayesian model
  let bayesianModel = initializeBayesianModel(features[0].features.length);
  for (const dataPoint of features) {
    bayesianModel = updateBayesianModel(
      bayesianModel,
      dataPoint.features,
      dataPoint.target,
      dataPoint.weight
    );
  }

  // STEP 5: Create ensemble
  const ensembleMembers: EnsembleMember[] = [
    {
      id: 'regression_time_weighted',
      name: 'Time-Weighted Regression',
      type: 'regression',
      weight: 1.0,
      performance: {
        mae: regressionModel.mae,
        mse: regressionModel.mse,
        r2: regressionModel.r2Score,
        recentAccuracy: regressionModel.r2Score,
      },
      predictions: [0], // Will be filled with actual prediction
      confidence: regressionModel.r2Score,
    },
    {
      id: 'bayesian_adaptive',
      name: 'Bayesian Adaptive Model',
      type: 'bayesian',
      weight: 1.0,
      performance: {
        mae: 0,
        mse: 0,
        r2: calculateModelConfidence(bayesianModel),
        recentAccuracy: calculateModelConfidence(bayesianModel),
      },
      predictions: [0],
      confidence: calculateModelConfidence(bayesianModel),
    },
  ];

  // Add time-series models
  const smoothingForecast = tripleExponentialSmoothing(timeSeriesData, 0.3, 0.1, 1);
  const maForecast = adaptiveMovingAverage(timeSeriesData, 1);

  if (smoothingForecast.confidence > 0.3) {
    ensembleMembers.push({
      id: 'exponential_smoothing',
      name: 'Exponential Smoothing',
      type: 'time_series',
      weight: smoothingForecast.confidence,
      performance: {
        mae: 0,
        mse: 0,
        r2: smoothingForecast.confidence,
        recentAccuracy: smoothingForecast.confidence,
      },
      predictions: [smoothingForecast.predictions[0]],
      confidence: smoothingForecast.confidence,
    });
  }

  if (maForecast.confidence > 0.3) {
    ensembleMembers.push({
      id: 'moving_average',
      name: 'Adaptive Moving Average',
      type: 'time_series',
      weight: maForecast.confidence,
      performance: {
        mae: 0,
        mse: 0,
        r2: maForecast.confidence,
        recentAccuracy: maForecast.confidence,
      },
      predictions: [maForecast.predictions[0]],
      confidence: maForecast.confidence,
    });
  }

  const ensemble = createEnsemble(ensembleMembers, {
    method: 'adaptive',
    minModels: 2,
    confidenceThreshold: 0.4,
  });

  // STEP 6: Make prediction
  const latestFeatures = features[features.length - 1].features;

  // Get predictions from each model
  const regressionPred = regressionModel.intercept +
    latestFeatures.reduce((sum, f, i) => sum + f * regressionModel.coefficients[i], 0);

  const bayesianPred = bayesianPredict(bayesianModel, latestFeatures);

  ensemble.models[0].predictions = [regressionPred];
  ensemble.models[1].predictions = [bayesianPred.mean];

  const ensemblePrediction = ensemblePredict(ensemble);

  // STEP 7: Generate insights
  const recommendations = generateRecommendations(
    trendAnalysis,
    dataQuality,
    ensemblePrediction,
    bayesianModel
  );

  const insights = generateInsights(
    cleanData,
    trendAnalysis,
    dataQuality,
    regressionModel,
    bayesianModel
  );

  // STEP 8: Build state
  const state: LearningState = {
    dataQuality,
    trendAnalysis,
    regressionModel,
    bayesianModel,
    ensemble,
    recentPredictions: [],
    performance: {
      mae: regressionModel.mae,
      mse: regressionModel.mse,
      r2: regressionModel.r2Score,
      confidence: ensemblePrediction.confidence,
    },
    lastUpdated: new Date(),
    observationCount: cleanData.length,
  };

  return {
    state,
    prediction: ensemblePrediction,
    recommendations,
    insights,
  };
}

/**
 * Preprocess data with outlier detection
 */
function preprocessData(
  data: TrainingData[],
  targetVariable: string
): { cleanData: TrainingData[]; dataQuality: DataQualityReport } {
  const targets = data.map(d => getTargetValue(d, targetVariable));
  const dataQuality = generateDataQualityReport(targets, 'modified_z_score');

  const cleanData = data.filter((_, idx) => !dataQuality.outliers.includes(idx));

  return { cleanData, dataQuality };
}

/**
 * Engineer features from raw training data
 */
function engineerFeatures(data: TrainingData[]): DataPoint[] {
  return data.map((d, idx) => {
    const features: number[] = [];

    // Basic features
    features.push(d.distance || 0);
    features.push(d.duration || 0);
    features.push(d.elevation || 0);

    // Derived features
    if (d.duration > 0) {
      features.push(d.distance / (d.duration / 60)); // Pace (km/h)
    } else {
      features.push(0);
    }

    // Physiological features
    features.push(d.avgHR || 150);
    features.push(d.perceivedEffort || 5);
    features.push(d.sleepQuality || 7);
    features.push(d.readiness || 75);

    // Temporal features
    const dayOfWeek = d.timestamp.getDay();
    features.push(Math.sin((2 * Math.PI * dayOfWeek) / 7)); // Weekly cycle
    features.push(Math.cos((2 * Math.PI * dayOfWeek) / 7));

    // Rolling averages (3-day window)
    if (idx >= 2) {
      const recent3 = data.slice(idx - 2, idx + 1);
      const avgDist = recent3.reduce((sum, x) => sum + x.distance, 0) / 3;
      features.push(avgDist);
    } else {
      features.push(d.distance);
    }

    // Time-based weight (recent data more important)
    const daysAgo = (new Date().getTime() - d.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-daysAgo / 30); // 30-day half-life

    return {
      features,
      target: d.distance,
      weight,
      timestamp: d.timestamp,
    };
  });
}

function getTargetValue(data: TrainingData, targetVariable: string): number {
  switch (targetVariable) {
    case 'distance':
      return data.distance;
    case 'fatigue':
      return data.fatigue || 5;
    case 'readiness':
      return data.readiness || 75;
    default:
      return data.distance;
  }
}

function generateRecommendations(
  trend: TrendAnalysis,
  quality: DataQualityReport,
  prediction: EnsemblePrediction,
  bayesian: BayesianModel
): string[] {
  const recommendations: string[] = [];

  if (trend.direction === 'increasing' && trend.confidence > 0.7) {
    recommendations.push(
      `Training load trending upward (+${(trend.slope * 7).toFixed(1)} km/week). Monitor for overtraining signs.`
    );
  }

  if (trend.direction === 'decreasing' && trend.confidence > 0.7) {
    recommendations.push(
      `Training load decreasing (${(trend.slope * 7).toFixed(1)} km/week). Consider if this is intentional taper.`
    );
  }

  if (quality.outlierPercentage > 10) {
    recommendations.push(
      `${quality.outlierPercentage.toFixed(1)}% of data points are outliers. Review data quality or consider abnormal training days.`
    );
  }

  if (prediction.uncertainty > prediction.value * 0.3) {
    recommendations.push(
      'High prediction uncertainty detected. Models need more consistent data for accurate forecasting.'
    );
  }

  const drift = detectModelDrift(bayesian, []);
  if (drift.hasDrift) {
    recommendations.push(drift.recommendation);
  }

  return recommendations;
}

function generateInsights(
  data: TrainingData[],
  trend: TrendAnalysis,
  quality: DataQualityReport,
  regression: RegressionModel,
  bayesian: BayesianModel
): string[] {
  const insights: string[] = [];

  insights.push(
    `Model trained on ${data.length} sessions with ${quality.outliers.length} outliers removed (${quality.outlierPercentage.toFixed(1)}%).`
  );

  insights.push(
    `Regression R² score: ${(regression.r2Score * 100).toFixed(1)}% (${regression.r2Score > 0.7 ? 'excellent' : regression.r2Score > 0.5 ? 'good' : 'fair'} fit)`
  );

  insights.push(
    `Bayesian model confidence: ${(calculateModelConfidence(bayesian) * 100).toFixed(1)}% based on ${bayesian.observations} observations`
  );

  if (trend.confidence > 0.5) {
    insights.push(
      `Statistically significant ${trend.direction} trend detected (p=${trend.pValue.toFixed(3)})`
    );
  } else {
    insights.push('No significant trend detected - training load is stable');
  }

  // Identify most important features
  const topFeatures = regression.coefficients
    .map((coef, i) => ({ index: i, importance: Math.abs(coef) }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);

  insights.push(
    `Top predictive factors: ${topFeatures.map(f => `Feature ${f.index} (${f.importance.toFixed(2)})`).join(', ')}`
  );

  return insights;
}

function createEmptyState(dataQuality: DataQualityReport): LearningState {
  return {
    dataQuality,
    trendAnalysis: {
      direction: 'stable',
      slope: 0,
      confidence: 0,
      pValue: 1,
      kendallTau: 0,
    },
    regressionModel: null,
    bayesianModel: null,
    ensemble: null,
    recentPredictions: [],
    performance: {
      mae: 0,
      mse: 0,
      r2: 0,
      confidence: 0,
    },
    lastUpdated: new Date(),
    observationCount: 0,
  };
}
