# Self-Learning Insights Dashboard Implementation

## Overview

The Insights dashboard has been upgraded with self-learning capabilities that adapt to each athlete's unique training patterns and physiological responses. The system computes personalized baselines, detects deviations from normal patterns, and provides AI-powered coaching insights.

## Architecture

### Backend: Supabase Edge Functions
- **compute-learning-state**: Calculates athlete-specific baselines from historical training data
- **derive-weekly-metrics**: Aggregates log entries into weekly summaries with computed metrics

### Frontend: React Hooks + Components
- **useAthleteBaselines**: Fetches and manages learning state data
- **useWeeklyMetrics**: Retrieves derived weekly metrics with date range filtering
- **AIInsight**: Contextual coaching component with risk assessment

### Database Schema
- **athlete_learning_state**: Stores personalized baselines and learned coefficients
- **derived_metrics_weekly**: Pre-computed weekly training metrics
- **metric_computation_log**: Tracks computation history and debugging

## Key Features Implemented

### 1. Personalized Baselines

Each athlete gets their own learned parameters:

- **Baseline HR**: Average heart rate from easy-paced runs
- **Baseline Pace**: Median comfortable pace
- **Baseline Efficiency**: HR-to-pace ratio baseline
- **ACWR Mean & Std Dev**: Personal average and variability in workload ratio
- **Efficiency Trend Slope**: Linear regression of efficiency over time
- **Fatigue Threshold**: 90th percentile of historical fatigue scores
- **Data Quality Score**: 0-1 score based on completeness and recency

### 2. Adaptive Safe Zones

Instead of static thresholds, the system uses:

- **ACWR Safe Zone**: Personal mean ± standard deviation
- **Fatigue Threshold**: Learned from athlete's historical highs
- **Efficiency Baseline**: Individual HR-pace relationship

### 3. AI Coaching Insights

Context-aware messages appear below each chart:

- **Risk Level Indicators**: Low (✓), Moderate (⚡), High (⚠️)
- **Deviation Analysis**: Shows percentage change from baseline
- **Actionable Recommendations**: Specific guidance based on current state
- **Trend Detection**: Identifies improving or declining patterns

### 4. Visual Enhancements

- **Reference Areas**: Shaded safe zones on ACWR chart
- **Trend Indicators**: Shows if efficiency is improving or declining
- **Personalized Labels**: Dynamic text based on athlete's baselines
- **Responsive Details**: Grid layout for metric breakdowns

## How It Works

### Computation Flow

1. **User clicks "Refresh Baselines"** → Triggers Edge Function
2. **Edge Function fetches all log entries** → Analyzes historical data
3. **Statistical calculations run**:
   - Linear regression for efficiency trends
   - Percentile calculations for thresholds
   - Rolling averages for ACWR
   - Standard deviation for safe zones
4. **Results saved to database** → Learning state persists
5. **Frontend hooks fetch updated data** → Dashboard re-renders

### Weekly Metrics Derivation

1. **Edge Function groups log entries by week** → ISO week boundaries (Monday-Sunday)
2. **Aggregates per week**:
   - Total distance and duration
   - Average HR and pace
   - Long run distance
   - ACWR calculation (acute:chronic ratio)
   - Fatigue index (multi-factor score)
   - Monotony and strain
3. **Saves to derived_metrics_weekly** → Fast dashboard queries

### AI Insight Generation

For each metric type (ACWR, Fatigue, Efficiency, Weekly Load):

1. **Fetch latest weekly metric**
2. **Compare to athlete's baseline**
3. **Calculate deviation percentage**
4. **Categorize risk level** (low/moderate/high)
5. **Generate contextual message** with specific guidance
6. **Display with visual styling** (color-coded borders)

## Analytics Utilities

### Core Statistical Functions

- `calculateLinearRegression`: Least-squares regression for trend analysis
- `calculateStatistics`: Mean, median, std dev, percentiles
- `calculateRollingWindowValues`: Moving averages for ACWR
- `calculateEfficiencyScore`: HR/pace ratio computation
- `calculateFatigueIndex`: Multi-factor fatigue scoring
- `calculateACWRSafeZone`: Personalized threshold bands
- `calculateDataQualityScore`: Assesses data completeness

### Insight Generation

- `generateInsightMessage`: Creates contextual coaching text
- `categorizeRiskLevel`: Determines low/moderate/high status
- `predictNextValue`: Forecasts future metric values

## Database Schema Details

### athlete_learning_state

```sql
CREATE TABLE athlete_learning_state (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL,
  baseline_hr numeric DEFAULT 140,
  baseline_pace numeric DEFAULT 6.0,
  baseline_efficiency numeric DEFAULT 23.3,
  acwr_mean numeric DEFAULT 1.0,
  acwr_std_dev numeric DEFAULT 0.2,
  efficiency_trend_slope numeric DEFAULT 0,
  fatigue_threshold numeric DEFAULT 70,
  hr_drift_baseline numeric DEFAULT 5.0,
  cadence_stability numeric DEFAULT 0.9,
  injury_risk_factors jsonb DEFAULT '{}',
  computation_metadata jsonb DEFAULT '{}',
  last_computed_at timestamptz DEFAULT now(),
  data_quality_score numeric DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**RLS Policies**: Users can only access their own learning state

### derived_metrics_weekly

```sql
CREATE TABLE derived_metrics_weekly (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  total_distance_km numeric DEFAULT 0,
  total_duration_min numeric DEFAULT 0,
  avg_hr numeric,
  avg_pace numeric,
  long_run_km numeric DEFAULT 0,
  acute_load numeric DEFAULT 0,
  chronic_load numeric,
  acwr numeric,
  efficiency_score numeric,
  fatigue_index numeric,
  hr_drift_pct numeric,
  cadence_avg numeric,
  monotony numeric,
  strain numeric,
  elevation_gain_m numeric DEFAULT 0,
  run_count integer DEFAULT 0,
  quality_sessions integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date)
);
```

**Indexes**: Composite index on (user_id, week_start_date) for fast queries

### metric_computation_log

Tracks when baselines were computed, how long it took, and any errors.

## User Experience Flow

### Initial Setup

1. User logs 10+ runs with HR data
2. System detects sufficient data for baseline computation
3. User clicks "Refresh Baselines" button
4. Edge Function computes personalized parameters (5-10 seconds)
5. Dashboard updates with adaptive safe zones

### Ongoing Usage

1. User imports new runs from Strava/Garmin
2. Weekly metrics auto-compute in background
3. AI insights update to reflect current state
4. ACWR chart shows personalized safe zone
5. Efficiency tab displays trend indicator
6. User sees if they're above/below their normal patterns

### When Baselines Go Stale

- System detects if last_computed_at > 7 days old
- Yellow warning appears next to last updated date
- User can manually trigger recompute
- Future: Scheduled daily batch job (3 AM UTC)

## Technical Implementation Notes

### Why Edge Functions Instead of Client-Side?

1. **Performance**: Heavy statistical calculations off the main thread
2. **Consistency**: Same computation logic for all users
3. **Scalability**: Can add scheduled batch processing later
4. **Security**: Uses service role key for batch operations

### Why Derived Metrics Table?

1. **Speed**: Pre-computed weekly data loads instantly
2. **Consistency**: ACWR calculations don't vary by client
3. **Historical Tracking**: Can compare week-over-week changes
4. **Cache Invalidation**: Simple upsert on new data import

### Why Separate Learning State?

1. **Single Source of Truth**: One record per athlete
2. **Easy Updates**: Upsert by user_id
3. **Auditing**: Tracks when baselines were last computed
4. **Metadata**: Stores computation details for debugging

## Future Enhancements

### Phase 2: Advanced Analytics

- [ ] Population-level cohort comparisons (opt-in)
- [ ] Injury risk prediction models
- [ ] Cadence stability tracking
- [ ] HR drift detection from long runs
- [ ] Shoe mileage fatigue correlation

### Phase 3: Real-Time Updates

- [ ] Supabase Realtime subscriptions for instant updates
- [ ] Websocket connections for live baseline recomputation
- [ ] Optimistic UI updates while computing
- [ ] Background sync on data import

### Phase 4: Machine Learning Integration

- [ ] Neural network for race time prediction
- [ ] Anomaly detection for unusual patterns
- [ ] Personalized training plan recommendations
- [ ] Recovery time prediction based on load

## Deployment Checklist

### Supabase Setup

- [x] Run migration: `20251112200000_create_learning_state_tables.sql`
- [x] Deploy Edge Function: `compute-learning-state`
- [x] Deploy Edge Function: `derive-weekly-metrics`
- [ ] Set up scheduled job (future): Daily at 3 AM UTC
- [ ] Configure monitoring for Edge Function errors

### Frontend Deployment

- [x] Build passes without errors
- [x] All hooks properly integrated
- [x] AIInsight component styled correctly
- [x] Responsive design on mobile
- [ ] Test with real athlete data

### Testing

- [ ] Unit tests for analytics utilities
- [ ] Integration tests for Edge Functions
- [ ] E2E tests for Insights dashboard flow
- [ ] Performance testing with large datasets (1000+ runs)
- [ ] Load testing for concurrent baseline computations

## Maintenance

### Monitoring

Track these metrics in Supabase:

- Edge Function success/failure rates
- Average computation duration
- Data quality scores distribution
- Number of stale baselines

### Debugging

Check `metric_computation_log` table for:

- Failed computations (status = 'failed')
- Slow computations (duration_ms > 10000)
- Partial results (status = 'partial')

### Performance Optimization

If baseline computation becomes slow:

1. Add database indexes on log_entries.date
2. Limit historical data to last 12 months
3. Implement incremental updates (delta computation)
4. Cache intermediate results in computation_metadata

## Conclusion

The self-learning Insights dashboard transforms static analytics into personalized, adaptive coaching. Each athlete gets insights tailored to their unique physiology, training patterns, and goals. The system learns from every run logged, continuously refining its understanding to provide increasingly accurate guidance.

The architecture maintains compatibility with existing code while adding powerful new capabilities. All computation happens server-side for consistency and performance, while the frontend remains lightweight and responsive. Future enhancements will build on this foundation to add population-level insights, real-time updates, and advanced machine learning models.
