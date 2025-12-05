# How to Apply Event Duration & Elevation Fixes

## Current Situation
Your Quest page is showing:
- ❌ "Race day! 54.82km with **0m** elevation gain"
- ❌ Duration: **329 min** (calculated estimate)

But your database has:
- ✓ Elevation: **2380m**
- ✓ Expected Time: **9:17:46** (557 minutes)

## Why This Is Happening
The plan displayed on the Quest page is **cached in localStorage** from before our fixes were applied. The code is now fixed, but you need to regenerate the plan.

## Step-by-Step Fix

### 1. Go to Planner Page
Navigate to: `/planner` or click "Planner" in the menu

### 2. Find Adaptive Coach Panel
Scroll down to the "Adaptive Coach" section

### 3. Click "Generate Adaptive Plan"
Click the button: **"🎯 Generate Adaptive Plan"**

### 4. Watch Console Logs
Open browser DevTools (F12) and check the Console tab. You should see:

```
[convertEventToRaceInfo] Event: Chiang MAi {
  elevation_gain: 2380,
  expected_time: "9:17:46",
  verticalGain: 2380,
  expectedTimeMin: 557.3
}

🏁 [DistributeWorkouts] ✅ RACE INSERTED on Saturday 2025-12-06
🏁 Using expected time: 557 min (9:17)
```

### 5. Check Quest Page
Go back to Quest page (`/quest`) and you should now see:

**Saturday Bubble:**
- ✓ Duration: **557 min** (9h 17m)
- ✓ Elevation: **2380m↑**
- ✓ Instructions: "Race day! 54.82km with **2380m** elevation gain."

## What Was Fixed

### Code Changes:
1. ✓ Added `expectedTimeMin` field to `RaceInfo` and `RaceEvent` types
2. ✓ Parse `expected_time` from database (HH:MM:SS → minutes)
3. ✓ Use actual expected time in workout generation (not estimate)
4. ✓ Display elevation gain correctly
5. ✓ Fixed database query column names (`duration_min` not `duration`)

### Files Modified:
- `src/lib/adaptive-coach/types.ts`
- `src/engine/adaptiveDecisionEngine.ts`
- `src/lib/adaptiveContextBuilder.ts`
- `src/lib/adaptive-coach/microcycle.ts`
- `src/lib/database.ts`

## Troubleshooting

### If elevation still shows 0m:
1. Check console for: `[convertEventToRaceInfo]` log
2. Verify `elevation_gain` field is not null
3. Check that event date matches the race week

### If duration is still wrong:
1. Check console for: `🏁 Using expected time:` log
2. If it says "Calculated duration" instead, the `expected_time` field is missing
3. Verify event has `expected_time` in database:
   ```sql
   SELECT name, date, expected_time, elevation_gain
   FROM events
   WHERE name ILIKE '%chiang%';
   ```

### If regeneration doesn't work:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Check console for errors
4. Verify you're logged in and have a user_id

## Expected Result

After regeneration, your **Quest page should show**:

```
SATURDAY
🏁 Chiang MAi

DURATION: 557 min
DISTANCE: 54.82K
ELEVATION: 2380m↑
PACE: 7.1 - 7.6 min/km

Race day! 54.82km with 2380m elevation gain.
```

## Important Notes

- **You must regenerate the plan** after any event data changes
- The plan is **cached** for performance, not live-updated
- Console logs will help debug if data isn't flowing correctly
- All fixes are now in the build and ready to use
