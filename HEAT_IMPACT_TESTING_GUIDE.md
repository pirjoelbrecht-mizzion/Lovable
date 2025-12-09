# Heat Impact Analysis System - Complete Testing Guide

## Overview
This guide shows you how to test ALL 19 features of the Heat Impact Analysis system.

## Quick Start (5 Minutes)

### Step 1: Import an Activity with GPS Data
1. Go to **Settings** page
2. Click **Connect Strava** (or use mock data)
3. Import at least one activity that:
   - Has GPS data (polyline)
   - Duration > 10 minutes
   - Has temperature/weather data

### Step 2: Trigger Analysis
The system analyzes activities **automatically** when:
- ✅ Activity has GPS polyline
- ✅ Duration > 10 minutes
- ✅ Activity just imported

**Manual Trigger (if needed):**
```javascript
// Open browser console (F12) on Settings page
import { analyzeActivityHeatImpact } from './lib/environmental-analysis/analyzeHeatImpact';

// Analyze a specific activity by ID
const activityId = 'your-activity-id-here';
await analyzeActivityHeatImpact(activityId);
```

### Step 3: View Results
1. Go to **Log** page
2. Click on any activity to open **Activity Detail**
3. Scroll down to see **"Heat Impact Analysis"** card
4. Look for:
   - Heat Impact Score (0-100)
   - Severity level badge
   - Temperature/humidity graph
   - AI-generated insights
   - Performance stress indicators
   - Recommendations

---

## Feature Testing Checklist

### ✅ CORE ANALYSIS (Features 1-9)

#### 1. Database Tables
**Test:** Check if tables exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'race_%';

-- Expected tables:
-- race_heat_stress_metrics
-- race_heat_stress_weather_data
-- race_heat_stress_insights
-- race_heat_stress_recommendations
```

#### 2. Historical Weather Retrieval
**Test:** Check if weather data is fetched
1. Import activity with GPS
2. Check browser console for: `Fetching weather data from Open-Meteo`
3. Look in database:
```sql
SELECT * FROM race_heat_stress_weather_data LIMIT 5;
```

#### 3. Elevation Temperature Correction
**Test:** Verify lapse rate application
```javascript
// In browser console
import { applyLapseRate } from './lib/environmental-analysis/lapseRate';

// Test: 20°C at sea level → 13.5°C at 1000m elevation
const corrected = applyLapseRate(20, 0, 1000);
console.log(corrected); // Should be ~13.5
```

#### 4. Heat Metrics Calculation
**Test:** View calculated metrics in Activity Detail
- Look for: Heat Index values
- Check: Time spent in different risk zones
- Verify: Progressive heat accumulation

#### 5. Physiological Stress Detection
**Test:** Find stress indicators
- **HR Drift:** Look for "Heart rate increased significantly"
- **Pace Decline:** Look for "Pace degraded in hot conditions"
- **VAM Drop:** Look for "Climbing power reduced"
- **Cadence Drop:** Look for "Running mechanics affected"

#### 6. Correlation Engine
**Test:** Performance impact scoring
- Find activities with heat stress
- Check if performance metrics are correlated
- Look for insights like "5% pace degradation due to heat"

#### 7. Impact Scoring
**Test:** Score accuracy
- **0-30:** Low stress (comfortable) - Green badge
- **30-50:** Moderate stress - Yellow badge
- **50-75:** High stress - Orange badge
- **75-100:** Extreme stress - Red badge

#### 8. LLM Insights
**Test:** AI-generated text
- Look for paragraph-style insights
- Should reference specific metrics
- Should provide actionable advice
- Check: Cached (loads instantly on refresh)

#### 9. Analysis Orchestrator
**Test:** Complete flow works
1. Import activity → 2s delay → Analysis triggered
2. Check database: `race_heat_stress_metrics` table
3. View Activity Detail → Heat card appears

---

### ✅ INTEGRATION & UI (Features 10-13)

#### 10. Automatic Trigger System
**Location:** `src/lib/database.ts` (logActivity function)

**Test:**
1. Import new Strava activity
2. Wait 2 seconds
3. Check console: `Triggering heat analysis for activity: ${id}`
4. Check database:
```sql
SELECT log_entry_id, heat_impact_score, created_at
FROM race_heat_stress_metrics
ORDER BY created_at DESC LIMIT 1;
```

#### 11. Activity Detail Integration
**Location:** `src/pages/ActivityDetail.tsx`

**Test:**
1. Go to `/log`
2. Click any activity
3. Scroll to "Heat Impact Analysis" section
4. Should see card with score, graph, and insights

#### 12. Weather Impact Graph
**Component:** `src/components/activity/WeatherImpactGraph.tsx`

**Test:**
- X-axis: Distance (km)
- Lines: Temperature (red), Humidity (blue), Heat Index (orange)
- Tooltips on hover
- Responsive width

#### 13. Weather Impact Card
**Component:** `src/components/activity/WeatherImpactCard.tsx`

**Test:**
- Displays heat impact score (large number)
- Shows severity badge (color-coded)
- Lists physiological stress signals
- Shows AI insights
- Provides recommendations

---

### ✅ ADVANCED FEATURES (Features 14-19)

#### 14. Fitness Calculation with Environmental Factors
**Location:** `src/lib/fitnessCalculator.ts`

**Test:**
1. Train in hot conditions for a week
2. Check fitness score
3. Should apply 0-15% penalty based on heat exposure
4. Formula: Higher heat stress → Larger penalty

**Verification:**
```sql
-- Check weekly heat exposure
SELECT
  week_start_date,
  AVG(heat_impact_score) as avg_heat_stress
FROM race_heat_stress_metrics
JOIN log_entries ON race_heat_stress_metrics.log_entry_id = log_entries.id
WHERE user_id = 'your-user-id'
GROUP BY week_start_date;
```

#### 15. Heat Acclimation Protocols
**Location:** `src/lib/environmental-learning/heatAcclimation.ts`

**Test in browser console:**
```javascript
import { generateHeatAcclimationProtocol } from './lib/environmental-learning/heatAcclimation';

// Test: Race in 3 weeks, target heat index 85
const protocol = await generateHeatAcclimationProtocol(
  '2024-12-30', // race date
  85, // target heat index
  'Death Valley, CA'
);

console.log(protocol);
// Check:
// - phase: 'initial' | 'adaptation' | 'maintenance'
// - weeklyPlan: Array of training weeks
// - recommendations: Specific advice
```

**Expected Protocols:**
- **<2 weeks:** No protocol, focus on heat management
- **2-3 weeks:** Rapid protocol (daily exposure)
- **4-6 weeks:** Full protocol (progressive adaptation)
- **Already adapted:** Maintenance protocol (2x/week)

#### 16. Environmental Impact Widget
**Component:** `src/components/EnvironmentalImpactWidget.tsx`

**How to Use:**
Add to any page (e.g., Home or Insights):
```tsx
import EnvironmentalImpactWidget from '@/components/EnvironmentalImpactWidget';

<EnvironmentalImpactWidget />
```

**What it shows:**
- Average heat stress (last 4 weeks)
- Current heat tolerance estimate
- Acclimation trend (improving/stable/declining)
- High stress days count

#### 17-19. Race Weather Planning Suite
**Location:** `src/utils/raceDayWeatherPlanning.ts`

**Test in browser console:**
```javascript
import { generateRaceWeatherPlan } from './utils/raceDayWeatherPlanning';

const plan = await generateRaceWeatherPlan(
  '2024-07-15', // race date
  'Western States 100', // race name
  'Squaw Valley, CA', // location
  28, // estimated duration (hours)
  '05:00', // start time
  161 // distance (km)
);

console.log(plan);
```

**Check plan includes:**
- ✅ Expected conditions (temp, humidity, heat index)
- ✅ Performance impact (% slowdown, time added)
- ✅ Pacing adjustments (by segment)
- ✅ Gear recommendations (clothing, cooling)
- ✅ Nutrition adjustments (hydration targets)
- ✅ Acclimation protocol (if needed)
- ✅ Race week tips

---

## Testing Scenarios

### Scenario 1: Cool Weather Run
**Expected:** Low heat stress (0-30), green badge, no warnings

1. Create/import activity:
   - Temperature: 10-15°C
   - Humidity: 50%
   - Duration: 60 min

2. Check Activity Detail:
   - Heat Impact Score: 5-25
   - Badge: Green "Comfortable"
   - Insights: "Ideal racing conditions"

### Scenario 2: Hot & Humid Run
**Expected:** High heat stress (50-75), orange badge, performance warnings

1. Create/import activity:
   - Temperature: 32°C
   - Humidity: 85%
   - Duration: 90 min

2. Check Activity Detail:
   - Heat Impact Score: 60-80
   - Badge: Orange "High Stress"
   - Insights: "Significant heat impact detected"
   - Stress signals: HR drift, pace decline

### Scenario 3: Mountain Run (Elevation Effect)
**Expected:** Temperature decreases with elevation, varying stress

1. Activity with:
   - Start elevation: 500m
   - Max elevation: 2500m
   - Temperature at start: 25°C

2. Check graph:
   - Temperature line should decrease on climbs
   - Should be ~12°C cooler at 2500m vs 500m

### Scenario 4: Race Planning (Hot Race)
**Expected:** Comprehensive warning and adaptation plan

```javascript
const plan = await generateRaceWeatherPlan(
  '2024-07-04', // Summer race
  'Badwater 135',
  'Death Valley, CA',
  48, // 48 hours
  '20:00', // 8pm start
  217 // 217km
);

// Check for:
// - Extreme severity warning
// - 15%+ slowdown prediction
// - Aggressive hydration (900ml/hour)
// - Heat acclimation protocol
// - Survival strategies
```

---

## Database Verification

### Check Analysis Results
```sql
-- Recent analyses
SELECT
  le.title,
  le.date,
  hm.heat_impact_score,
  hm.overall_severity,
  hm.time_extreme_risk_min
FROM race_heat_stress_metrics hm
JOIN log_entries le ON hm.log_entry_id = le.id
WHERE le.user_id = auth.uid()
ORDER BY le.date DESC
LIMIT 10;
```

### Check Weather Data Points
```sql
-- Weather readings for an activity
SELECT
  elapsed_time_seconds,
  temperature_celsius,
  humidity_percent,
  elevation_meters,
  heat_index
FROM race_heat_stress_weather_data
WHERE log_entry_id = 'your-activity-id'
ORDER BY elapsed_time_seconds
LIMIT 20;
```

### Check AI Insights
```sql
-- LLM-generated insights
SELECT
  le.title,
  hi.insight_text,
  hi.confidence_score
FROM race_heat_stress_insights hi
JOIN log_entries le ON hi.log_entry_id = le.id
WHERE le.user_id = auth.uid()
ORDER BY hi.created_at DESC;
```

---

## Troubleshooting

### Issue: "No heat analysis data available"
**Causes:**
- Activity too short (<10 min)
- No GPS data (no polyline)
- Analysis hasn't run yet (wait 2s after import)
- Weather API error

**Fix:**
```javascript
// Manually trigger in console
import { analyzeActivityHeatImpact } from './lib/environmental-analysis/analyzeHeatImpact';
await analyzeActivityHeatImpact('activity-id');
```

### Issue: Widget shows "No data available"
**Causes:**
- No activities analyzed in last 4 weeks
- User not logged in

**Fix:**
- Import recent activities with GPS
- Wait for automatic analysis

### Issue: Analysis fails silently
**Check:**
1. Browser console for errors
2. Supabase logs for RLS policy issues
3. Open-Meteo API rate limits (10,000/day)

### Issue: Fitness penalty seems wrong
**Verify:**
```sql
-- Check weekly average heat exposure
SELECT
  week_start_date,
  AVG(heat_impact_score) as avg_heat
FROM race_heat_stress_metrics
WHERE created_at >= NOW() - INTERVAL '4 weeks'
GROUP BY week_start_date;

-- Penalty calculation:
-- 0-30: 0% penalty
-- 30-50: 0-5% penalty
-- 50-75: 5-10% penalty
-- 75+: 10-15% penalty
```

---

## API Monitoring

### Open-Meteo API Usage
**Rate Limit:** 10,000 requests/day (free tier)

**Monitor usage:**
- Each activity analysis = 1 API call
- Weather data cached in database
- Re-analysis uses cached data

**Reduce API calls:**
- Analysis triggered once per activity
- Weather data reused for similar routes/times
- Consider upgrading for high-volume use

---

## Performance Metrics

### Expected Analysis Times
- Weather fetch: 200-500ms
- Heat metrics calculation: 50-100ms
- LLM insight generation: 1-2 seconds (cached after first)
- **Total:** ~2-3 seconds per activity

### Database Growth
- **Weather data points:** ~1 per minute of activity
- **1-hour run:** ~60 weather records
- **Storage:** ~5KB per activity analysis

### UI Performance
- Activity Detail load: <500ms
- Weather graph render: <100ms
- Widget load: <200ms

---

## Feature Integration Map

### Where Each Feature Lives:

| Feature | Location | Usage |
|---------|----------|-------|
| Auto Analysis | `database.ts` | Automatic (on import) |
| Activity Display | `ActivityDetail.tsx` | `/log/:id` page |
| Weather Card | `WeatherImpactCard.tsx` | Embedded in Activity Detail |
| Weather Graph | `WeatherImpactGraph.tsx` | Embedded in Activity Detail |
| Dashboard Widget | `EnvironmentalImpactWidget.tsx` | Add to any page |
| Fitness Penalty | `fitnessCalculator.ts` | Weekly fitness calculation |
| Acclimation | `heatAcclimation.ts` | API (use in console/planning) |
| Race Planning | `raceDayWeatherPlanning.ts` | API (use in console/planning) |

---

## Next Steps

### Recommended Integrations:

1. **Add Widget to Home Page:**
```tsx
// src/pages/Home.tsx
import EnvironmentalImpactWidget from '@/components/EnvironmentalImpactWidget';

// In render:
<EnvironmentalImpactWidget />
```

2. **Add to Insights Page:**
```tsx
// src/pages/Insights.tsx
<EnvironmentalImpactWidget />
```

3. **Race Planning UI (Future):**
Create a dedicated page at `/race-planning` that uses `generateRaceWeatherPlan()`

4. **Acclimation Tracker (Future):**
Create `/acclimation` page showing current protocol and progress

---

## Success Criteria

✅ **System is working if:**
1. Activity Detail shows Heat Impact Analysis card
2. Card displays score, severity, and insights
3. Graph visualizes temperature/humidity/heat index
4. Fitness calculations include heat penalty
5. Database tables contain analysis results
6. No console errors during analysis

🎉 **You're ready to use the system!**
