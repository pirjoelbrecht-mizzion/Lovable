# Terrain Analysis - Quick Start Guide

## 🎯 How to See Your Terrain Analysis

Your trail running activity detail page now includes 3 powerful new sections:

### 1. **Terrain Analysis**
Shows terrain breakdown, VAM, downhill braking, and technicality scoring

### 2. **Performance Insights**
Compares your performance to personal baselines with adaptive recommendations

### 3. **Fueling Log**
Track nutrition timeline during runs (for runs >30 minutes)

## 🚀 Getting Started

### For NEW Activities (Automatic)
From now on, every Strava activity you import will be **automatically analyzed**:
1. Import your Strava activity as usual
2. Wait ~5-10 seconds for analysis to complete (runs in background)
3. Open the activity detail page
4. Scroll down to see the new sections!

### For EXISTING Activities (Backfill Required)

Your existing Strava activities need to be analyzed. Here's how:

#### Option 1: Browser Console (Recommended)
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Paste this command and press Enter:

```javascript
import('/src/utils/backfillTerrainAnalysis.js').then(m => m.backfillTerrainAnalysis())
```

This will analyze your **50 most recent** Strava activities. Progress will show in the console:
```
🔄 Starting terrain analysis backfill...
Found 50 Strava activities to analyze
Processing: Morning Trail Run (2024-12-01)
  ✅ Analyzed (1/50)
...
📊 Backfill Summary:
  ✅ Processed: 45
  ⏭️  Skipped: 5 (already analyzed)
  ❌ Failed: 0
  ✓ Complete!
```

#### Option 2: Analyze Specific Activity
If you want to analyze just one specific activity:

```javascript
import('/src/utils/backfillTerrainAnalysis.js').then(m =>
  m.analyzeSpecificActivity('your-activity-id-here')
)
```

Get the activity ID from the URL when viewing the activity:
`/activity/abc-123-def` → ID is `abc-123-def`

## 📍 Where to Find It

1. Go to **Log** page (main activity list)
2. Click on any Strava activity
3. Scroll down past the map, photos, and segments
4. You'll see:
   - **Terrain Analysis** (with colorful terrain breakdown)
   - **Performance Insights** (with green/red metric cards)
   - **Fueling Log** (add nutrition entries)

## 🎨 What You'll See

### Terrain Analysis Card
- **Horizontal bar**: Visual time distribution across terrain types
  - Green = Flat
  - Blue = Rolling
  - Orange = Steep uphill
  - Red = Very steep
  - Purple = Runnable downhill
  - Pink = Technical downhill
- **Stats per terrain**: Pace, HR, cadence for each type
- **VAM**: Your climbing power (meters/hour)
- **Technicality Score**: How technical the trail was (0-100%)
- **Downhill Braking Alert**: If you're slowing too much on descents (coaching opportunity!)

### Performance Insights Card
- **Efficiency Badge**: Overall performance score
- **Key Metrics Grid**:
  - Flat/Uphill/Downhill pace vs baseline (% change)
  - Aerobic Decoupling (fatigue indicator)
  - HR Drift (climbing fatigue)
  - Fatigue Score (0-100)
  - Heat Strain (if applicable)
- **Insights**: Automated findings (improvements/regressions/warnings)
- **Adaptive Recommendations**: Specific training adjustments

### Fueling Log Card
- **Summary**: Carbs/hour, fluids/hour, sodium, GI issues
- **Carb Rating**: Optimal (60g/h), Good (45g/h), Adequate (30g/h), Low (<30g/h)
- **Timeline**: Visual entries with time stamps
- **Add Entry Form**: Log what you ate/drank and when

## ⚡ Tips

1. **First Time Setup**: Run the backfill command to analyze your existing activities
2. **Automatic Going Forward**: New Strava imports will analyze automatically
3. **Check Console**: If analysis doesn't appear, check browser console for errors
4. **Wait a Moment**: Analysis takes 5-10 seconds after import
5. **Refresh**: If you don't see data immediately, refresh the activity detail page

## 🐛 Troubleshooting

### "No terrain analysis available"
- Activity might not be from Strava
- Activity might be too old (no streams available)
- Analysis might still be running (wait 10 seconds and refresh)
- Try running the backfill command for this specific activity

### Analysis shows but no data
- Activity might not have detailed GPS/elevation data
- Strava might not have returned streams for this activity
- Check that the activity has an elevation profile on Strava.com

### Fueling Log doesn't show
- Only shows for activities longer than 30 minutes
- Check that activity has a valid duration

## 🎉 What's Next?

Once you've analyzed your activities:
1. **Compare performances**: See how your pace on similar terrain changes over time
2. **Track improvements**: Watch your downhill braking score decrease (getting more confident!)
3. **Monitor fatigue**: Use aerobic decoupling to prevent overtraining
4. **Optimize fueling**: Experiment with different nutrition strategies
5. **Get adaptive recommendations**: The system will suggest training adjustments

## 📚 More Info

See `TRAIL_RUNNER_ACTIVITY_DETAIL_COMPLETE.md` for comprehensive technical documentation.

---

**Ready to analyze your runs?** Open the browser console and run the backfill command now!
