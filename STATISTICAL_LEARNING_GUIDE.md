# Statistical Learning Dashboard - Quick Guide

## 🎯 Where to See It

Navigate to: **`http://localhost:5173/learning`** (or your deployment URL + `/learning`)

## 📊 What You'll See

### 1. **Performance Metrics Cards** (Top Row)
- **Model R² Score**: 0-100% - How well models fit your data
  - >70% = Excellent fit
  - 50-70% = Good fit
  - <50% = Fair fit
- **MAE**: Mean Absolute Error in km
- **Confidence**: Ensemble model confidence (0-100%)
- **Data Quality**: Clean data percentage (100% - outlier%)

### 2. **Trend Detection Banner** (Blue Box)
Shows Mann-Kendall statistical test results:
- **Badge**: 📈 Increasing / 📉 Decreasing / ➡️ Stable
- **Slope**: km/week change rate
- **Confidence**: Statistical confidence (0-100%)
- **p-value**: Statistical significance (< 0.05 = significant)

### 3. **Predictions Chart** (Main Graph)
- **Blue shaded area**: 95% confidence interval
- **Blue line**: Model predictions
- **Green dots**: Clean training data
- **Red dots**: Outliers (automatically detected and removed)

### 4. **Ensemble Contributions** (Bar Chart)
Shows how much each model contributed:
- Time-Weighted Regression
- Bayesian Adaptive Model
- Exponential Smoothing
- Adaptive Moving Average

### 5. **Bayesian Uncertainty** (Horizontal Bars)
Shows uncertainty for each feature coefficient:
- Shorter bars = More certain
- Longer bars = Less certain

### 6. **Model Insights** (Purple Box)
- Number of training sessions analyzed
- R² score interpretation
- Bayesian confidence level
- Trend detection results
- Most important predictive features

### 7. **Recommendations** (Green Box)
- Actionable advice based on analysis
- Warnings about trends
- Data quality issues
- Prediction uncertainty alerts

### 8. **Next Session Prediction** (Bottom Cards)
- **Predicted Value**: What the model thinks you'll do
- **Confidence**: How sure the model is
- **95% Interval**: Range where actual value likely falls

## 🎮 Interactive Features

### Target Variable Selector (Top Right)
Switch between:
- **Distance**: Predicts next run distance
- **Fatigue**: Predicts fatigue level
- **Readiness**: Predicts readiness score

## 🔢 Key Metrics Explained

### R² Score (R-squared)
- Ranges from 0 to 1 (shown as 0-100%)
- Measures how well model explains variance in data
- 1.0 (100%) = Perfect fit
- 0.5 (50%) = Model explains half the variance
- 0.0 (0%) = Model is no better than average

### Outlier Percentage
- Shows % of data points that are statistically anomalous
- Uses Modified Z-score (MAD) - robust to extreme values
- Outliers are:
  - Very long runs after rest weeks
  - Injury days with unusually low distance
  - Race days with high intensity
- **Normal**: 5-10% outliers
- **High**: >15% outliers (check data quality)

### MAE (Mean Absolute Error)
- Average prediction error in km
- Lower = Better predictions
- Example: MAE of 2.0 means predictions are off by 2km on average

### Confidence
- Ensemble model's confidence in prediction
- Weighted by individual model performance
- Higher = More reliable prediction
- Affected by:
  - Data consistency
  - Number of training samples
  - Model agreement

## 📈 Trend Detection

Uses **Mann-Kendall Test** - a non-parametric statistical test:

### What It Detects
- **Monotonic trends**: Consistent up or down pattern
- **Statistical significance**: Not just random variation

### Interpretation
- **p-value < 0.05**: Significant trend detected
- **p-value > 0.05**: No significant trend (could be random)
- **Confidence > 70%**: Strong trend
- **Confidence < 50%**: Weak or no trend

### Example Results
```
📈 Increasing
Slope: +1.2 km/week
Confidence: 85.3%
p-value: 0.012
```
**Meaning**: Training load is significantly increasing by 1.2 km/week with 85% confidence

## 🧪 Mock Data

If you have no training data, the demo generates realistic mock data:
- 90 days of training
- Weekly patterns (weekend long runs)
- Natural variation
- Some outliers (5%)
- Upward trend (+0.5 km/week)

## 🎯 Real Data Integration

When you log real training data:
1. Go to `/log` and add sessions
2. Return to `/learning`
3. System automatically:
   - Loads your data
   - Detects outliers
   - Trains models
   - Shows predictions

## 🔧 Technical Details

The system uses:
- **Linear Regression**: Baseline predictions
- **Ridge Regression**: Prevents overfitting
- **Time-Weighted Regression**: Recent data weighted more
- **Triple Exponential Smoothing**: Trend + seasonality
- **Bayesian Updates**: Continuous learning
- **Ensemble Methods**: Combines all models

All calculations happen in real-time in your browser!

## 🚀 Next Steps

1. Visit `/learning` to see the demo
2. Add real training data via `/log`
3. Refresh `/learning` to see personalized analysis
4. Monitor your trends and predictions weekly
5. Follow recommendations to optimize training

## 💡 Tips

- Need **at least 5 data points** for predictions
- **10+ data points** for good R² scores
- **30+ data points** for excellent trend detection
- Log consistently for best results
- Outliers are automatically handled - don't worry!
