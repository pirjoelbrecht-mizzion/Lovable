# Personalized Pace System - Quick Start Guide

## What is it?

The Personalized Pace System learns from your historical training data to provide accurate time estimates for race routes. Instead of using a generic 6 min/km pace for everyone, it analyzes YOUR actual performance on different terrain types (uphill, downhill, flat) to give YOU personalized estimates.

## How It Works in 3 Steps

### 1. **Analyze Your Training History**
The system looks at your past activities that have elevation data and breaks them down into segments:
- Uphill segments (e.g., 5% grade, 2km, you ran it at 7:15/km)
- Downhill segments (e.g., -4% grade, 1.5km, you ran it at 5:10/km)
- Flat segments (e.g., 1% grade, 3km, you ran it at 5:45/km)

### 2. **Calculate Your Personal Pace Profile**
Based on your history, it calculates:
- Your base flat pace
- How much you slow down on uphills (adjustment factor)
- How much you speed up on downhills (adjustment factor)
- Specific paces for different grades of hills

Recent activities (last 30 days) count more heavily than older ones.

### 3. **Apply to Race Predictions**
When you upload a GPX file for a race, it uses YOUR paces instead of generic formulas.

## Requirements

To get personalized estimates, you need:
- ✅ At least **3 activities** with elevation data
- ✅ At least **5 uphill segments** from your training
- ✅ At least **5 downhill segments** from your training
- ✅ At least **5 flat segments** from your training

Don't have enough data? The system will use default formulas until you do.

## Quick Integration Guide

### Step 1: Add the Pace Profile Card to Your UI

```tsx
import { PaceProfileCard } from '@/components/PaceProfileCard';

function SettingsPage() {
  return (
    <div>
      <h1>Your Training Profile</h1>
      <PaceProfileCard />
    </div>
  );
}
```

This shows the user:
- Their flat, uphill, and downhill paces
- Grade-specific paces (if available)
- Data quality and sample size
- A refresh button to recalculate

### Step 2: Use Personalized Pace for GPX Analysis

**Before:**
```typescript
import { analyzeGPXRoute } from '@/utils/gpxParser';

const analysis = analyzeGPXRoute(gpxPoints, 6.0); // Generic 6 min/km pace
console.log('Estimated time:', analysis.totalTimeEstimate);
```

**After:**
```typescript
import { analyzeGPXRoutePersonalized } from '@/utils/personalizedGPXAnalysis';

const result = await analyzeGPXRoutePersonalized(gpxPoints);
console.log('Estimated time:', result.analysis.totalTimeEstimate);
console.log('Using your pace:', result.hasPersonalizedPace);
console.log('Confidence:', result.analysis.paceConfidence);
```

That's it! The system automatically:
1. Analyzes your training history (if not already done)
2. Calculates your pace profile (if not already done)
3. Applies it to the GPX route

### Step 3 (Optional): Compare Estimates

Want to see the difference between your personalized pace and the default?

```typescript
import { compareGPXEstimates } from '@/utils/personalizedGPXAnalysis';

const comparison = await compareGPXEstimates(gpxPoints);

console.log('Your personalized time:', comparison.personalizedAnalysis.totalTimeEstimate);
console.log('Default generic time:', comparison.defaultAnalysis.totalTimeEstimate);
console.log('Difference:', comparison.comparison.timeDifferenceMin, 'minutes');
console.log('Percentage:', comparison.comparison.percentDifference, '%');
```

## What Happens Automatically

The system automatically recalculates your pace profile when:

1. **You import new activities** (single or bulk)
   - If the activity has elevation data, it's analyzed immediately
   - Your pace profile is updated in the background

2. **Your profile is stale** (older than 7 days)
   - Next time you analyze a GPX route, it triggers a background update

3. **You manually refresh** (via the UI button in PaceProfileCard)

## Understanding the Output

### Data Quality Levels

- 🟢 **Excellent**: You have 10+ activities with great terrain coverage
- 🔵 **Good**: You have 3+ activities meeting minimum requirements
- 🟡 **Fair**: You have some data but missing certain terrain types
- 🔴 **Insufficient**: Not enough data yet (keep training!)

### Confidence Levels

- **High**: Estimate based on extensive historical data matching the route terrain
- **Medium**: Estimate based on moderate historical data
- **Low**: Estimate based on limited historical data
- **Default**: Using generic formulas (no personalized data)

## Example Output

```
Your Pace Profile:
- Flat Pace: 5:47 /km (based on 42 segments)
- Uphill Pace: 7:22 /km (based on 28 segments)
- Downhill Pace: 5:08 /km (based on 31 segments)

Grade-Specific Paces:
- Easy Uphill (+2% to +5%): 6:15 /km (15 samples)
- Moderate Uphill (+5% to +8%): 7:45 /km (8 samples)
- Steep Uphill (+8% to +12%): 9:30 /km (5 samples)
- Easy Downhill (-2% to -5%): 5:20 /km (18 samples)
- Moderate Downhill (-5% to -8%): 4:55 /km (10 samples)

Data Quality: Good
Based on 12 activities (last 90 days)
```

## Special Features

### 1. Recency Weighting
Activities from the last 30 days count twice as much as older ones. This means your current fitness matters more than old data.

### 2. Grade Bucketing
Instead of treating all uphills the same, the system recognizes that:
- Easy uphills (+2-5%) are different from steep uphills (+8-12%)
- Easy downhills (-2-5%) are different from steep downhills (-8-12%)

### 3. Fatigue Adjustment
For long segments (>3km), the system blends your terrain pace with your flat pace:
- 80% terrain-specific pace
- 20% flat pace (to account for cumulative fatigue)

### 4. Smart Fallback
If you don't have enough data for a specific grade bucket, it falls back to:
1. General terrain type (uphill/downhill/flat) pace
2. Default formula if no data available

## Troubleshooting

### "Not enough data for personalized estimates"
- Import more activities with elevation data
- Make sure activities have `elevationStream`, `distanceStream`, and `durationMin`
- Train on varied terrain (not just flat runs)

### "Estimates seem off"
- More data = better accuracy. The system improves as you log more activities
- Recent activities (last 30 days) have the most weight
- Check your pace profile card to see what data the system has

### "Profile not updating"
- Manually trigger refresh with the button in PaceProfileCard
- Check console logs for errors during import
- Verify activities have required data fields

## Technical Details

For developers who want to understand the implementation:

**Database Tables:**
- `user_pace_profiles` - Stores calculated pace metrics
- `activity_terrain_analysis` - Caches terrain analysis of activities

**Key Files:**
- `src/utils/terrainAnalysis.ts` - Analyzes activities
- `src/utils/paceProfileCalculator.ts` - Calculates pace profiles
- `src/utils/personalizedGPXAnalysis.ts` - Integrates with GPX analysis
- `src/components/PaceProfileCard.tsx` - UI component

**Migration:**
- `supabase/migrations/*_create_personalized_pace_tables.sql`

## Next Steps

1. **Add PaceProfileCard to your settings/profile page** so users can see their pace data
2. **Replace `analyzeGPXRoute()` with `analyzeGPXRoutePersonalized()`** in your GPX analysis components
3. **Test with real data** - import activities and see the personalized estimates
4. **Show confidence indicators** in your UI so users know when estimates are reliable

See `PERSONALIZED_PACE_SYSTEM.md` for complete technical documentation.
