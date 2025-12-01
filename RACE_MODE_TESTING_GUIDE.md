# Race Mode Simulation - Testing Guide

## Quick Start

Race Mode Simulation is now **LIVE** in your app! Here's how to test it:

### Access Points

**Option 1: Direct URL**
```
http://localhost:5173/race-mode
```

**Option 2: From Quest Page**
1. Navigate to Quest page (home)
2. If you have upcoming races, you'll see a **"RACE MODE SIMULATION"** button
3. Click the button with the 🏁 icon

## Prerequisites for Testing

The simulation needs data to generate predictions. Here's the minimum required:

### 1. Add a Race (Required)
- **Location**: Quest page or `/races`
- **What to add**:
  ```
  Name: Test Marathon
  Date: 2025-02-01 (any future date)
  Distance: 42.195 km
  Priority: A or B (recommended)
  Surface: trail/road/mixed (optional)
  Elevation: 500 meters (optional)
  ```

### 2. Add Training Logs (Required)
- **Location**: Mirror page or `/log`
- **Minimum**: 3-5 runs from the past few weeks
- **What to add**:
  ```
  Run 1: 10km in 60 min (2024-11-01)
  Run 2: 15km in 95 min (2024-11-03)
  Run 3: 21km in 135 min (2024-11-05)
  Run 4: 8km in 48 min (2024-11-07)
  ```

**Pro tip**: Add heart rate data to runs for better readiness calculation!

## What You'll See

### If Data is Complete ✅

**Main Prediction Card:**
- Large predicted finish time
- Confidence level (HIGH/MEDIUM/LOW)
- Your current readiness score (0-100)
- Personalized message

**Expandable Sections:**
1. **Simulation Factors** - Click to expand
   - Terrain factor (e.g., 1.12x for trail)
   - Elevation factor
   - Climate factor
   - Fatigue penalty

2. **Pacing Strategy** - Click to expand
   - Kilometer-by-kilometer pace
   - HR zone predictions
   - Fatigue accumulation bars
   - First 20 segments shown

3. **Race Day Tips**
   - Fueling recommendations
   - HR monitoring guidelines
   - Terrain-specific advice
   - Climate warnings

### If Data is Missing ❌

**No races:**
```
"No upcoming races found. Add one to your calendar to enable simulation."
[Button: Go to Race Calendar]
```

**No training data:**
The prediction may be inaccurate or show a default baseline.

## Testing Checklist

### Basic Functionality
- [ ] Page loads without errors
- [ ] Race selector dropdown appears (if multiple future races)
- [ ] Predicted time displays
- [ ] Confidence badge shows (HIGH/MEDIUM/LOW)
- [ ] Readiness score displays

### Interactive Elements
- [ ] Click "Simulation Factors" - expands/collapses
- [ ] Click "Pacing Strategy" - expands/collapses
- [ ] Factors show color coding (green for good, yellow for warnings)
- [ ] Pace table shows first 20 segments
- [ ] Fatigue bars animate

### Race Selector
- [ ] If you have multiple races, dropdown shows all future races
- [ ] Selecting a different race updates the prediction
- [ ] "Next Priority Race" auto-selects A or B priority

### Data Validation
- [ ] Try with a 5K race - should show ~30-40 min prediction
- [ ] Try with a marathon - should show 3-5 hour prediction
- [ ] Try with trail race - terrain factor should be > 1.10
- [ ] Try with high elevation - elevation factor should be > 1.05

## Advanced Testing

### Test Different Scenarios

**Scenario 1: Road Marathon**
```
Race: Road Marathon
Distance: 42.195 km
Surface: road
Elevation: 100m
Expected: Terrain ~1.0x, Elevation ~1.0x
```

**Scenario 2: Trail Ultra**
```
Race: Mountain 50K
Distance: 50 km
Surface: trail
Elevation: 2500m
Expected: Terrain ~1.12x, Elevation ~1.10-1.15x
```

**Scenario 3: Hot Climate Race**
```
Race: Thailand 100K (include "Thailand" in name)
Distance: 100 km
Expected: Climate factor ~1.05x
```

### Test Readiness Calculation

**High Readiness (80-100):**
- Have consistent training past 2-3 weeks
- Last hard run 3-5 days ago
- Total weekly volume steady

**Low Readiness (40-60):**
- Sudden volume spike
- Hard run yesterday
- Inconsistent training

## Troubleshooting

### Issue: "No upcoming races found"
**Solution:**
1. Go to Quest or Races page
2. Add a race with a **future date**
3. Ensure `distanceKm` is filled in
4. Refresh Race Mode page

### Issue: Prediction seems too fast/slow
**Check:**
1. Training log has realistic paces (4-8 min/km)
2. Baseline race/run is recent (last 3 months)
3. Distance entries are in kilometers (not miles)
4. Duration is in minutes

### Issue: Readiness always shows 70
**This is normal if:**
1. You just started using the app
2. You have < 1 week of training data
3. No high-intensity runs logged yet

**Fix:** Log more training runs with varied intensities

### Issue: Page won't load
**Check browser console for errors:**
1. Open DevTools (F12)
2. Look for red errors
3. Most common: Missing baseline race data

## Database Verification

The feature stores data in Supabase. To verify:

### Check Tables Created
```sql
SELECT * FROM race_simulations LIMIT 5;
SELECT * FROM readiness_scores LIMIT 5;
```

### Verify RLS Policies
- All queries should be user-scoped
- Only your simulations visible
- No access to other users' data

## Expected Behavior

### Prediction Formula
```
predictedTime = baseTime × (distance_ratio)^1.06
                × terrain_factor
                × elevation_factor
                × climate_factor
                × fatigue_penalty
```

### Confidence Levels
- **HIGH (75%+)**: 4-16 weeks to race, good fitness, high readiness
- **MEDIUM (50-75%)**: Less than 4 weeks or >16 weeks, moderate fitness
- **LOW (<50%)**: Race very soon or far away, low fitness

### Readiness Components
1. **Recovery Index (35%)**: Acute/chronic load ratio
2. **Freshness (25%)**: Days since last hard run
3. **Sleep (15%)**: Default 7.5 hours (manual input Phase 2)
4. **HRV (15%)**: Default 1.0 (wearable sync Phase 3)
5. **Fatigue (10%)**: Default moderate

## Success Indicators

✅ **Working correctly if:**
- Prediction appears within 10-15% of your expected time
- Confidence level makes sense for your training state
- Pacing strategy shows gradual slowdown over distance
- Factors reflect race characteristics (trail = higher terrain factor)
- Tips are relevant to the race type

## Next Steps After Testing

Once verified working:
1. Use it to plan race strategies
2. Compare predictions to actual race results
3. Adjust training based on readiness scores
4. Try "what-if" scenarios with different races

## Phase 2 Preview (Coming Soon)

Next enhancements will add:
- Manual sleep/fatigue input sliders
- Temperature/humidity overrides
- Custom elevation profiles
- Side-by-side race comparisons
- Readiness trend dashboard on home page

## Support

If something isn't working:
1. Check this guide first
2. Verify prerequisites (race + training logs)
3. Check browser console for errors
4. Verify database migration succeeded
5. Try hard refresh (Ctrl+Shift+R)

Happy racing! 🏁
