# Pace Profile System - Fixed Issues

## ✅ Problems Fixed

### 1. **Grade Buckets Now Much More Granular**

**Before (9 buckets, terrible ranges):**
- Very Steep Uphill: **12% to 100%** ❌ (way too wide!)
- Very Steep Downhill: **-100% to -12%** ❌ (ridiculous range!)

**After (17 buckets, realistic ranges):**

**Uphill (8 buckets):**
- Gentle Uphill: 2-4%
- Easy Uphill: 4-6%
- Moderate Uphill: 6-8%
- Hard Uphill: 8-10%
- Steep Uphill: 10-12%
- Very Steep Uphill: 12-15%
- Extreme Uphill: 15-20%
- Climbing: 20%+ (technical terrain)

**Flat:**
- Flat: ±2%

**Downhill (8 buckets):**
- Gentle Downhill: -2 to -4%
- Easy Downhill: -4 to -6%
- Moderate Downhill: -6 to -8%
- Hard Downhill: -8 to -10%
- Steep Downhill: -10 to -12%
- Very Steep Downhill: -12 to -15%
- Extreme Downhill: -15 to -20%
- Technical Descent: -20%+ (very steep trails)

**Why this is better:**
- Most trail running happens in 0-20% range, now much more precise
- Separates "runnable steep" (10-12%) from "hiking steep" (15%+)
- You won't see crazy 100% grades anymore

---

### 2. **System Uses YOUR ACTUAL Pace Data**

The system already WAS using real data, but now with better granularity:

**How it works:**
1. You import activities with elevation data
2. Each activity is broken into segments by grade
3. System records your ACTUAL pace on each segment
4. Calculates weighted median (recent runs count more)
5. Displays YOUR real performance, not formulas

**Example:**
- Your Gentle Uphill (2-4%): **6:15/km** (from 15 actual runs)
- Your Steep Uphill (10-12%): **8:45/km** (from 8 actual runs)
- Your Very Steep (12-15%): **11:20/km** (from 3 actual runs - much slower!)

---

### 3. **Steeper = Slower (Obviously!)**

Fixed the display order and logic:

**Display order now:**
1. Climbing (20%+) - SLOWEST pace shown first
2. Extreme Uphill (15-20%)
3. Very Steep Uphill (12-15%)
4. Steep Uphill (10-12%)
5. ... (progressively faster)
6. Flat (±2%)
7. ... (progressively faster)
8. Technical Descent (-20%+) - FASTEST pace shown last

**Visual cues:**
- Steep uphill = Red border + light red background
- Moderate uphill = Orange tint
- Flat = Gray
- Moderate downhill = Teal tint
- Steep downhill = Green border + light green background

You'll immediately see that:
- **15% uphill = MUCH slower pace** (as it should be!)
- **-15% downhill = MUCH faster pace** (as expected)

---

### 4. **Added to Mirror Page for Visibility**

**Where to find Pace Profile Card now:**

**Option 1: Mirror Page (EASIEST)**
- Click **📊 Mirror** in bottom nav
- Card appears at top of page
- Always visible, no scrolling needed

**Option 2: Settings Page**
- Click **⚙️ Settings** in bottom nav
- Click **🏃 Training** tab
- Scroll to bottom
- Card appears after all settings

---

## What You'll See Now

### With Good Data (10+ activities):

```
┌────────────────────────────────────────────────────┐
│ Your Pace Profile                    [Refresh]     │
│ Excellent Data ●                                    │
├────────────────────────────────────────────────────┤
│                                                     │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│ │ Flat     │  │ Uphill   │  │ Downhill │         │
│ │ 5:47 /km │  │ 7:22 /km │  │ 5:08 /km │         │
│ │ 42 seg   │  │ 28 seg   │  │ 31 seg   │         │
│ └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│ Grade-Specific Paces                                │
│ ┌────────────────────────────────────────────────┐│
│ │🔴 Extreme Uphill (15-20%)    11:45 /km    3   ││ ← SLOWEST
│ ├────────────────────────────────────────────────┤│
│ │🔴 Very Steep Uphill (12-15%)  9:52 /km    5   ││
│ ├────────────────────────────────────────────────┤│
│ │🟠 Steep Uphill (10-12%)       8:38 /km    8   ││
│ ├────────────────────────────────────────────────┤│
│ │🟠 Hard Uphill (8-10%)         7:48 /km   12   ││
│ ├────────────────────────────────────────────────┤│
│ │🟡 Moderate Uphill (6-8%)      6:55 /km   18   ││
│ ├────────────────────────────────────────────────┤│
│ │🟡 Easy Uphill (4-6%)          6:18 /km   22   ││
│ ├────────────────────────────────────────────────┤│
│ │⚪ Flat (±2%)                  5:47 /km   42   ││
│ ├────────────────────────────────────────────────┤│
│ │🔵 Gentle Downhill (-2 to -4%) 5:22 /km   15   ││
│ ├────────────────────────────────────────────────┤│
│ │🟢 Easy Downhill (-4 to -6%)   5:05 /km   12   ││
│ ├────────────────────────────────────────────────┤│
│ │🟢 Moderate Downhill (-6 to -8%) 4:48 /km  8   ││
│ ├────────────────────────────────────────────────┤│
│ │🟢 Steep Downhill (-10 to -12%) 4:20 /km   4   ││ ← FASTEST
│ └────────────────────────────────────────────────┘│
│                                                     │
│ Based on 12 activities • Updated today             │
└────────────────────────────────────────────────────┘
```

**Key improvements you'll notice:**
1. ✅ Steepest uphill (15-20%) shows SLOWEST pace (11:45/km)
2. ✅ Steepest downhill (-10 to -12%) shows FASTEST pace (4:20/km)
3. ✅ Realistic grade ranges (no more "100%" nonsense)
4. ✅ Color-coded by difficulty
5. ✅ Sample sizes shown for confidence
6. ✅ Uses YOUR actual performance data

---

## Technical Details

### Data Collection

**From each activity with elevation:**
1. Splits into 100m segments
2. Calculates grade for each segment
3. Classifies into bucket (e.g., "6.5% = Moderate Uphill")
4. Records your actual pace on that segment
5. Stores in database with date

**Recency weighting:**
- 0-30 days: 2x weight (current fitness)
- 30-90 days: 1x weight (baseline)
- 90+ days: Ignored (outdated)

### Calculation Method

**For each grade bucket:**
1. Collect all matching segments
2. Apply recency weights
3. Calculate weighted median pace
4. Require minimum 3 segments for display

**Why median, not average?**
- Resistant to outliers (bad GPS, walking breaks)
- More representative of typical performance
- Weighted by recency = current fitness

---

## What Changed in Code

**Files modified:**
- ✅ `/src/engine/historicalAnalysis/analyzeActivityTerrain.ts`
  - Updated `GRADE_BUCKETS` from 9 to 17 buckets
  - More granular 0-20% range
  - Realistic max values (20% instead of 100%)

- ✅ `/src/components/PaceProfileCard.tsx`
  - Sorts buckets by grade (steepest uphill → steepest downhill)
  - Color-codes by difficulty
  - Visual borders (red=uphill, green=downhill)
  - Larger pace text, cleaner layout

- ✅ `/src/pages/Mirror.tsx`
  - Added PaceProfileCard at top for easy visibility

**Database tables (already created):**
- `activity_terrain_analysis` - Stores segment data
- `user_pace_profiles` - Stores calculated profiles

---

## How to Test

### 1. Import Activities with Elevation
- Go to Settings → Training
- Upload Strava CSV or connect wearable
- Wait for import to complete

### 2. View Your Profile
**Easy way:**
- Go to **Mirror** page
- Card is at the top

**Settings way:**
- Go to Settings → Training tab
- Scroll to bottom

### 3. Check the Data
- Verify steeper grades = slower paces
- Check sample sizes (more samples = more reliable)
- Click "Refresh" to recalculate

### 4. Upload GPX to See It in Action
- Go to Calendar
- Add Event
- Upload GPX file
- Time estimate now uses your grade-bucketed paces!

---

## Expected Behavior

**With insufficient data (< 3 activities):**
```
⚠️ Track at least 3 activities with elevation data
   to unlock personalized pace estimates.

Current data: 1 activities analyzed
```

**With some data (3-9 activities):**
- Shows "Fair Data" or "Good Data"
- Displays overall Flat/Uphill/Downhill paces
- May show a few grade buckets (with ≥3 segments each)

**With excellent data (10+ activities):**
- Shows "Excellent Data"
- Displays detailed grade-specific paces
- All 17 buckets visible (if you have segments in each)
- High confidence indicators

---

## Build Status

✅ **Build successful**
✅ **No errors**
✅ **Ready to use**

---

## Summary

**What was wrong:**
1. ❌ Grade buckets too wide (12-100% uphill!)
2. ❌ Not visible in Settings
3. ❌ Order didn't make sense
4. ❌ User thought it was using formulas instead of real data

**What's fixed:**
1. ✅ 17 granular buckets (2% increments for 0-20% range)
2. ✅ Visible in Mirror page (top) and Settings (Training tab, bottom)
3. ✅ Sorted: steepest uphill → flat → steepest downhill
4. ✅ System DOES use your real pace data (always has!)

**Result:**
You now see YOUR actual performance on different grades, with realistic ranges and proper ordering. Steeper = slower for uphill, steeper = faster for downhill! 🎉
