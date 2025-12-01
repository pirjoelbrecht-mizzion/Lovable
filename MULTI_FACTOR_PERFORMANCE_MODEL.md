# Multi-Factor Race Performance Model

## Overview

The Race Mode Simulation now includes a sophisticated multi-factor performance prediction engine that accounts for seven key performance factors beyond basic distance and elevation. This provides more accurate and personalized race time predictions.

## Performance Factors

### 1. Fitness Factor (25% weight)
- **Source**: Calculated from readiness score and training load
- **Impact**: 0.95-1.05x (optimal at fitness score ~85)
- **Description**: Measures current fitness level based on CTL, ATL, and readiness metrics
- **UI Display**: Shows as "Strong fitness level" or "Building fitness" with fitness score

### 2. Consistency Factor (10% weight)
- **Source**: Training data analysis over 8 weeks
- **Impact**: 1.0-1.06x (better consistency = lower factor)
- **Calculation**: Based on standard deviation of weekly mileage
- **Description**: Rewards consistent training patterns, penalizes erratic volume changes
- **UI Display**: Shows consistency percentage and weeks analyzed

### 3. Long Run Factor (10% weight)
- **Source**: Analysis of recent long runs vs race distance
- **Impact**: 0.98-1.08x (depends on longest run / race distance ratio)
- **Thresholds**:
  - ≥70% race distance: 0.98x (optimal)
  - 60-70%: 1.0x (good)
  - 50-60%: 1.02x (acceptable)
  - 40-50%: 1.05x (risky)
  - <40%: 1.08x (undertrained)
- **UI Display**: Shows longest run and percentage of race distance

### 4. Taper Factor (15% weight)
- **Source**: Load decline analysis in final 14 days before race
- **Impact**: 0.95-1.01x (optimal taper = 0.95x boost)
- **Quality Metrics**:
  - 1-7 days out: 40-60% load decline = optimal
  - 8-14 days out: 20-40% load decline = optimal
  - Outside taper window: neutral (1.0x)
- **UI Display**: Shows days to race and taper quality percentage

### 5. Weather Factor (15% weight)
- **Source**: Live forecast API or historical estimates
- **Components**:
  - Heat penalty: Based on heat index (temp + humidity)
  - Wind penalty: >15kph adds 2% per 10kph
  - Precipitation penalty: >5mm adds 1-3%
- **Impact**: 0.97-1.10x (ideal conditions vs extreme heat)
- **UI Display**: Shows temperature, humidity, and weather description

### 6. Course Factor (15% weight)
- **Source**: Elevation gain per kilometer
- **Impact**: 1.0-1.15x based on elevation profile
- **Calculation**: +2% per 10m elevation gain per km
- **UI Display**: Shows total elevation gain

### 7. Altitude Factor (10% weight)
- **Source**: Race altitude and training altitude
- **Impact**: 1.0-1.10x (sea level to high altitude)
- **Calculation**: +3% per 1000m altitude, reduced by acclimatization
- **UI Display**: Shows race altitude

## UI Components

### FactorChip
Interactive chip displaying each factor with:
- Factor icon
- Factor name
- Impact percentage (+/- or neutral)
- Color coding (green/yellow/orange)
- Hover tooltip with detailed explanation
- Data source indicator (forecast/calculated/training/manual)
- Confidence level (high/medium/low)

### FactorBreakdown
Organized display of all factors grouped by impact:
- **Favorable Factors** (green): Factors helping performance
- **Neutral Factors** (gray): Minimal impact
- **Challenging Factors** (orange): Factors that may slow performance

## Weather Integration

The system automatically fetches weather forecasts for race day:

1. **Location Detection**: Extracts coordinates from race location or uses known city database
2. **Forecast API**: Uses Open-Meteo API for 7-day weather forecasts
3. **Fallback Logic**: If no location, estimates based on race name/date/season
4. **Heat Index Calculation**: Combines temperature and humidity using Rothfusz regression
5. **Caching**: Weather data cached for 6 hours to reduce API calls

### Weather Impact Categories
- **Low Risk**: Heat index <27°C, no adjustment
- **Caution**: 27-32°C, +3% pace adjustment
- **Warning**: 32-41°C, +6% pace adjustment
- **Danger**: >41°C, +10% pace adjustment

## Training Analysis

### Consistency Calculation
```typescript
// Analyzes last 8 weeks of training
weeklyMileage = [50, 48, 52, 49, 51, 47, 53, 50]
meanMileage = 50km
stdDev = 2.1km
coefficientOfVariation = 2.1 / 50 = 0.042 (4.2%)
consistencyScore = 95.8%
consistencyFactor = 1.0 (excellent consistency)
```

### Long Run Analysis
```typescript
// For 100km race
recentLongRuns = [55, 52, 48, 45, 42]
maxLongRun = 55km
raceDistanceRatio = 55 / 100 = 0.55 (55%)
longRunFactor = 1.02 (acceptable preparation)
```

### Taper Quality
```typescript
// 7 days before race
peakLoadWeek = 65km (3-4 weeks ago)
currentLoad = 28km (this week)
loadDecline = (65 - 28) / 65 = 0.57 (57% reduction)
taperQuality = 100% (optimal 40-60% range)
taperFactor = 0.95 (5% boost from good taper)
```

## Example Calculation

**Thailand 100km Ultra Trail**
- Base prediction: 600 minutes (10h00m)
- Fitness (85): 0.97x
- Consistency (good): 1.00x
- Long runs (55% of distance): 1.03x
- Taper (optimal): 0.95x
- Weather (32°C, 75% humidity): 1.07x
- Course (3500m elevation): 1.07x
- Altitude (200m): 1.00x

**Total Factor**: 0.97 × 1.00 × 1.03 × 0.95 × 1.07 × 1.07 × 1.00 = 1.12

**Final Prediction**: 600 × 1.12 = 672 minutes (11h12m)

**Impact Breakdown**:
- Favorable: Fitness (-3%), Taper (-5%)
- Neutral: Consistency (0%), Altitude (0%)
- Challenging: Long runs (+3%), Weather (+7%), Course (+7%)

## Database Schema

### race_simulation_factors
Stores factor breakdown for each simulation:
- Individual factor values (fitness, consistency, long_run, taper, weather, course, altitude)
- Total combined factor
- Predicted time vs base time
- Confidence level
- Weather conditions (JSONB)

### weather_forecasts
Caches weather data:
- Location (lat/lon)
- Date and hour
- Temperature, humidity, wind, precipitation
- Heat index calculation
- 6-hour TTL

### training_consistency_metrics
Historical consistency tracking:
- Weekly mileage totals
- Mean and standard deviation
- Consistency score over time
- Used for trend analysis

### performance_factor_weights
Configurable factor weights:
- Default research-based weights
- User-specific overrides
- Allows personalization and tuning

## What-If Simulator Extensions

The What-If simulator now supports:
- Wind speed adjustments
- Precipitation scenarios
- Altitude acclimatization
- Training consistency overrides
- Long run preparation scenarios
- Taper quality adjustments

## Best Practices

1. **Data Quality**: More training data = higher confidence predictions
2. **Weather Updates**: Check 48 hours before race for latest forecast
3. **Long Run Focus**: Aim for longest run ≥60% of race distance
4. **Consistent Training**: Keep weekly mileage variation <20%
5. **Optimal Taper**: Reduce load 40-60% in final week
6. **Heat Acclimatization**: Train in heat if racing in hot conditions
7. **Altitude Preparation**: Arrive 2-3 days early for high altitude races

## Future Enhancements

- Machine learning weight optimization based on actual race results
- Terrain difficulty analysis beyond simple elevation
- Course profile simulation (uphills vs downhills)
- Nutrition strategy factor
- Sleep quality integration from wearables
- Social pacing factor (solo vs group racing)
- Historical accuracy tracking and auto-calibration
