# Statistical Learning Engine

Advanced machine learning system for adaptive training load prediction with uncertainty quantification.

## Overview

This system implements a complete statistical learning loop that goes far beyond simple averaging:

1. **Data Cleaning**: Outlier detection using IQR, Z-scores, and MAD
2. **Feature Engineering**: Automatic feature extraction from raw training data
3. **Multiple Models**: Regression, time-series, and Bayesian approaches
4. **Ensemble Learning**: Combines models with adaptive weighting
5. **Uncertainty Quantification**: Provides prediction intervals and confidence scores
6. **Continuous Adaptation**: Bayesian updating as new data arrives

## Components

### 1. Regression Models (`regression.ts`)

Implements multiple regression approaches:

- **Linear Regression**: Classic least-squares for baseline predictions
- **Ridge Regression**: L2 regularization prevents overfitting with limited data
- **Time-Weighted Regression**: Recent observations weighted more heavily (exponential decay)
- **Polynomial Regression**: Captures non-linear patterns

**Example:**
```typescript
import { fitTimeWeightedRegression, predictWithModel } from './regression';

const data = [
  { features: [10, 60, 500], target: 8.5, timestamp: new Date('2025-01-01') },
  { features: [12, 65, 550], target: 9.2, timestamp: new Date('2025-01-08') },
  // ... more data
];

const model = fitTimeWeightedRegression(data, 30); // 30-day half-life

console.log('R² Score:', model.r2Score);
console.log('MAE:', model.mae);

// Make prediction
const prediction = predictWithModel(model, [11, 62, 525]);
```

### 2. Time-Series Analysis (`time-series.ts`)

Statistical tests and forecasting:

- **Mann-Kendall Trend Test**: Detects significant upward/downward trends with p-values
- **Triple Exponential Smoothing** (Holt-Winters): Captures level, trend, and seasonality
- **Adaptive Moving Average**: Automatically selects optimal window size
- **Autocorrelation**: Identifies periodic patterns

**Example:**
```typescript
import { detectTrend, tripleExponentialSmoothing } from './time-series';

const timeSeriesData = [
  { timestamp: new Date('2025-01-01'), value: 40 },
  { timestamp: new Date('2025-01-08'), value: 42 },
  { timestamp: new Date('2025-01-15'), value: 45 },
  // ... more weekly data
];

// Detect statistically significant trends
const trend = detectTrend(timeSeriesData);
console.log('Trend:', trend.direction); // 'increasing', 'decreasing', or 'stable'
console.log('Confidence:', trend.confidence); // 0-1
console.log('p-value:', trend.pValue); // Statistical significance
console.log('Slope:', trend.slope, 'km/day');

// Forecast next 7 days
const forecast = tripleExponentialSmoothing(timeSeriesData, 0.3, 0.1, 7);
console.log('Next week predictions:', forecast.predictions);
console.log('95% confidence interval:', forecast.lowerBound, '-', forecast.upperBound);
```

### 3. Outlier Detection (`outliers.ts`)

Robust data quality assessment:

- **Z-Score Method**: Parametric outlier detection (assumes normal distribution)
- **Modified Z-Score (MAD)**: Robust to extreme outliers
- **IQR Method**: Non-parametric, classic boxplot approach
- **Time-Series Outliers**: Considers temporal context
- **Multi-Feature Detection**: Mahalanobis distance for correlated features

**Example:**
```typescript
import { generateDataQualityReport, detectTimeSeriesOutliers } from './outliers';

const distances = [40, 42, 38, 45, 150, 41, 43]; // 150 is an outlier

const report = generateDataQualityReport(distances, 'modified_z_score');
console.log('Outliers:', report.outliers); // [4]
console.log('Clean data points:', report.cleanData);
console.log('Data quality:', 100 - report.outlierPercentage, '%');

// Time-series aware detection
const tsData = distances.map((v, i) => ({
  timestamp: new Date(2025, 0, i + 1),
  value: v
}));

const results = detectTimeSeriesOutliers(tsData, 7);
results.forEach((r, i) => {
  if (r.isOutlier) {
    console.log(`Day ${i}: Outlier detected -`, r.reason);
  }
});
```

### 4. Bayesian Updating (`bayesian.ts`)

Principled uncertainty quantification:

- **Conjugate Priors**: Analytical Bayesian updates (no MCMC needed)
- **Sequential Learning**: Updates incrementally as new data arrives
- **Credible Intervals**: 95% confidence intervals for each coefficient
- **Drift Detection**: Identifies when model needs recalibration

**Example:**
```typescript
import {
  initializeBayesianModel,
  updateBayesianModel,
  bayesianPredict,
  calculateModelConfidence
} from './bayesian';

// Initialize with weak prior
let model = initializeBayesianModel(3); // 3 features

// Update with observations
const observations = [
  { features: [10, 60, 500], target: 8.5 },
  { features: [12, 65, 550], target: 9.2 },
  { features: [11, 62, 525], target: 8.9 },
];

for (const obs of observations) {
  model = updateBayesianModel(model, obs.features, obs.target);
}

// Make prediction with uncertainty
const prediction = bayesianPredict(model, [11.5, 63, 530]);
console.log('Predicted:', prediction.mean);
console.log('Uncertainty:', Math.sqrt(prediction.variance));
console.log('95% CI:', prediction.credibleInterval);

// Check model confidence
console.log('Model confidence:', calculateModelConfidence(model));
```

### 5. Ensemble Learning (`ensemble.ts`)

Combines multiple models for robust predictions:

- **Weighted Average**: Combines models weighted by performance
- **Median Ensemble**: Robust to outlier models
- **Adaptive Weighting**: Updates weights based on recent accuracy
- **Model Selection**: Chooses best model for data characteristics

**Example:**
```typescript
import { createEnsemble, ensemblePredict } from './ensemble';

const members = [
  {
    id: 'regression',
    name: 'Ridge Regression',
    type: 'regression' as const,
    weight: 1.0,
    performance: { mae: 0.5, mse: 0.4, r2: 0.85, recentAccuracy: 0.9 },
    predictions: [8.7],
    confidence: 0.85
  },
  {
    id: 'bayesian',
    name: 'Bayesian Model',
    type: 'bayesian' as const,
    weight: 1.0,
    performance: { mae: 0.6, mse: 0.5, r2: 0.82, recentAccuracy: 0.88 },
    predictions: [8.5],
    confidence: 0.92
  },
  {
    id: 'time_series',
    name: 'Exponential Smoothing',
    type: 'time_series' as const,
    weight: 0.8,
    performance: { mae: 0.7, mse: 0.6, r2: 0.78, recentAccuracy: 0.85 },
    predictions: [8.9],
    confidence: 0.78
  }
];

const ensemble = createEnsemble(members, {
  method: 'adaptive',
  minModels: 2,
  confidenceThreshold: 0.5
});

const prediction = ensemblePredict(ensemble);
console.log('Ensemble prediction:', prediction.value);
console.log('Confidence:', prediction.confidence);
console.log('Uncertainty:', prediction.uncertainty);
console.log('95% interval:', prediction.interval);
console.log('Model contributions:', prediction.modelContributions);
```

### 6. Learning Loop (`learning-loop.ts`)

Complete orchestration of the learning cycle:

**Example:**
```typescript
import { runLearningLoop } from './learning-loop';

const trainingData = [
  {
    timestamp: new Date('2025-01-01'),
    distance: 10,
    duration: 60,
    elevation: 500,
    avgHR: 145,
    perceivedEffort: 6,
    sleepQuality: 8,
    readiness: 80
  },
  // ... more training sessions
];

const result = await runLearningLoop(trainingData, 'distance');

console.log('Next session prediction:', result.prediction.value, 'km');
console.log('Confidence:', result.prediction.confidence);
console.log('Uncertainty:', result.prediction.uncertainty);

console.log('\nInsights:');
result.insights.forEach(insight => console.log('-', insight));

console.log('\nRecommendations:');
result.recommendations.forEach(rec => console.log('-', rec));

console.log('\nModel Performance:');
console.log('- R² Score:', result.state.performance.r2);
console.log('- MAE:', result.state.performance.mae);
console.log('- Data Quality:', 100 - result.state.dataQuality.outlierPercentage, '%');
console.log('- Trend:', result.state.trendAnalysis.direction);
```

## Visualization

Use the `StatisticalLearningDashboard` component to visualize learning results:

```typescript
import { StatisticalLearningDashboard } from '@/components/StatisticalLearningDashboard';

<StatisticalLearningDashboard
  learningResult={result}
  historicalData={historicalData}
/>
```

The dashboard displays:
- Model performance metrics (R², MAE, confidence)
- Trend detection with statistical significance
- Predictions with uncertainty bands
- Outlier highlighting
- Ensemble model contributions
- Bayesian coefficient uncertainty
- Actionable insights and recommendations

## Key Advantages Over Simple Averaging

1. **Statistical Rigor**: Uses Mann-Kendall for trend detection, not eyeballing
2. **Handles Outliers**: Automatically identifies and removes anomalous data
3. **Uncertainty Quantification**: Provides confidence intervals, not just point estimates
4. **Recency Weighting**: Recent data weighted more heavily (exponential decay)
5. **Ensemble Robustness**: Combines multiple models to reduce prediction variance
6. **Adaptive Learning**: Bayesian updating continuously refines coefficients
7. **Drift Detection**: Identifies when model needs recalibration
8. **Feature Engineering**: Extracts meaningful patterns from raw data

## Database Integration

The system integrates with existing tables:
- `athlete_learning_state`: Stores model coefficients and baselines
- `derived_metrics_weekly`: Pre-computed features for fast queries
- `metric_computation_log`: Audit trail of learning updates
- `performance_models`: Bayesian model parameters
- `performance_calibrations`: Model evolution history

## Performance

- Training on 100 samples: ~50ms
- Prediction: <1ms
- Ensemble with 5 models: ~5ms
- Suitable for real-time updates

## Future Enhancements

- ARIMA for advanced time-series forecasting
- Gaussian Process Regression for smooth uncertainty
- Online learning with SGD for massive datasets
- Multi-output models (predict distance, fatigue, readiness simultaneously)
- Causal inference to understand "why" not just "what"
