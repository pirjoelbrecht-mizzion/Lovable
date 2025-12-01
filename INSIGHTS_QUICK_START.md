# Self-Learning Insights - Quick Start Guide

## For Users

### First-Time Setup

1. **Log at least 10 runs with heart rate data**
   - Can be imported from Strava, Garmin, or manually entered
   - More data = better personalization (aim for 20+ runs)

2. **Navigate to Insights page**
   - Look for "Insights" in the main navigation

3. **Click "Refresh Baselines" button**
   - Located in top-right corner of Insights page
   - Computation takes 5-10 seconds
   - You'll see: "Baselines updated [today's date]"

4. **Explore your personalized insights**
   - **Weekly Load tab**: See if your volume is balanced
   - **ACWR tab**: Green safe zone shows YOUR optimal range
   - **Efficiency tab**: Trend indicator shows if you're improving

### Understanding AI Insights

Each chart has an AI Coach Insight card below it with:

- **✓ Green**: You're in good shape, keep going
- **⚡ Yellow**: Moderate risk, monitor closely
- **⚠️ Red**: High risk, adjust training immediately

### When to Refresh Baselines

- After importing 20+ new runs
- Every 2-4 weeks during training blocks
- After recovering from injury or time off
- When the system shows "(needs refresh)" warning

## For Developers

### Local Development Setup

1. **Apply database migration**
```bash
# Supabase migration will auto-apply on next sync
# Or manually run via Supabase dashboard
```

2. **Deploy Edge Functions**
```bash
# These are already created in:
# - supabase/functions/compute-learning-state/
# - supabase/functions/derive-weekly-metrics/

# Deploy them using Supabase CLI or dashboard
```

3. **Test locally**
```bash
npm run dev
# Navigate to /insights
# Click "Refresh Baselines" with test data
```

### Testing the System

**Minimum test data requirements:**
- 10+ log entries with `hr_avg` values
- At least 4 weeks of training data
- Mix of different paces and distances

**Test Edge Functions directly:**
```bash
# Get auth token from Supabase
AUTH_TOKEN="your-session-token"

# Test baseline computation
curl -X POST \
  https://your-project.supabase.co/functions/v1/compute-learning-state \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "apikey: your-anon-key"

# Test weekly metrics derivation
curl -X POST \
  https://your-project.supabase.co/functions/v1/derive-weekly-metrics \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "apikey: your-anon-key"
```

### Debugging

**Check computation logs:**
```sql
SELECT * FROM metric_computation_log
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;
```

**Verify learning state:**
```sql
SELECT
  baseline_hr,
  baseline_pace,
  acwr_mean,
  acwr_std_dev,
  efficiency_trend_slope,
  data_quality_score,
  last_computed_at
FROM athlete_learning_state
WHERE user_id = 'your-user-id';
```

**Check derived metrics:**
```sql
SELECT
  week_start_date,
  total_distance_km,
  acwr,
  fatigue_index,
  efficiency_score
FROM derived_metrics_weekly
WHERE user_id = 'your-user-id'
ORDER BY week_start_date DESC
LIMIT 12;
```

### Common Issues

**"Insufficient data" error**
- User needs at least 10 log entries
- Check: `SELECT COUNT(*) FROM log_entries WHERE user_id = ?`

**Baseline computation slow**
- Check `computation_duration_ms` in logs
- Optimize query if > 10 seconds
- Consider adding indexes on log_entries

**ACWR chart shows no safe zone**
- Baselines not computed yet
- Check `athlete_learning_state` table exists
- Verify user has clicked "Refresh Baselines"

**AI Insights not appearing**
- Check `baselines` object is not null
- Verify `weeklyMetrics` array has data
- Inspect browser console for errors

### Extending the System

**Add new metric types:**

1. Update `DbDerivedMetricWeekly` type in database.ts
2. Modify `derive-weekly-metrics` Edge Function
3. Add computation logic in analytics.ts
4. Create new AI insight case in AIInsight.tsx
5. Update Insights.tsx to display new metric

**Add new baseline parameters:**

1. Update `athlete_learning_state` schema
2. Modify `compute-learning-state` Edge Function
3. Update `DbAthleteLearningState` type
4. Extend `AthleteBaselines` interface in hook
5. Use new baseline in AI insight generation

## Integration with Existing Features

### Race Mode
- Baselines can predict race performance
- Use efficiency_trend_slope for pacing strategy
- Fatigue_threshold for taper recommendations

### Season Planning
- ACWR safe zones inform volume progression
- Data quality score validates plan adherence
- Monotony/strain metrics guide workout variety

### Unity (Social)
- Compare baselines with training partners (opt-in)
- Share AI insights in group chats
- Population-level percentiles (future)

## Performance Considerations

### Client-Side
- Hooks use memoization for expensive calculations
- Baselines cached until manual refresh
- Derived metrics fetched only for visible date range

### Server-Side
- Edge Functions process thousands of log entries efficiently
- Upsert operations prevent duplicate data
- Indexes optimize date range queries

### Database
- Learning state: One row per user (minimal storage)
- Derived metrics: ~52 rows per user per year
- Computation logs: Prunable after 30 days

## Security

- All tables use Row Level Security (RLS)
- Users can only access their own data
- Edge Functions verify authentication
- Service role key only used server-side

## Future Roadmap

**v2.0** (Next Quarter)
- Scheduled daily baseline recomputation
- Real-time updates via Supabase Realtime
- Mobile app push notifications for insights

**v3.0** (6 Months)
- Population-level cohort comparisons
- Neural network race prediction
- Injury risk forecasting

**v4.0** (1 Year)
- Coach dashboard with multi-athlete view
- API for third-party integrations
- ML-powered training plan generation
