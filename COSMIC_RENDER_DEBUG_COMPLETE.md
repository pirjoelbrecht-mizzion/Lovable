# CosmicWeekView Render Gate Fix + Diagnostic Logging

## Changes Made

### 1. CosmicWeekView.tsx (Line 79)
**Fixed:** Removed the early render gate that was blocking rendering when workouts hadn't loaded yet.

**Before:**
```typescript
const effectiveWeekData = weekData && weekData.length === 7 && weekData.some(d => d.workouts && d.workouts.length > 0)
  ? weekData
  : DAYS_FALLBACK.map(...)
```

**After:**
```typescript
const effectiveWeekData = weekData && weekData.length === 7
  ? weekData
  : DAYS_FALLBACK.map(...)
```

This ensures the week structure renders immediately, even when workouts array is empty (before adaptive data arrives).

### 2. plan.ts - normalizeAdaptivePlan() (Lines 396-405)
**Added:** Detailed per-day logging to trace session → workout transformation.

**Logs:**
- Each day's session count and types
- Each day's workout count and types
- Whether sessions are being converted to workouts correctly

### 3. Quest.tsx - CosmicWeekView weekData builder (Lines 1121-1157)
**Added:** Diagnostic logging to trace weekData construction.

**Logs:**
- Overall weekPlan state (total sessions/workouts)
- Per-day processing (whether workouts exist, their count)
- Whether using pre-transformed workouts or falling back to session transformation

## Diagnostic Log Output Guide

When you open the app and navigate to Quest page (cosmic view), you should see logs like:

### If Adapter is Working:
```
[Normalize] Mon: { hasSessions: true, sessionsCount: 1, hasWorkouts: true, workoutsCount: 1, sessionTypes: ['easy'], workoutTypes: ['easy'] }
[Quest] Building weekData for CosmicWeekView - weekPlan: { planLength: 7, planSource: 'adaptive', totalSessions: 5, totalWorkouts: 5 }
[Quest] Processing Monday: { hasWorkouts: true, workoutsIsArray: true, workoutsLength: 1, hasSessions: true, sessionsLength: 1 }
[Quest] ✨ Monday - Using pre-transformed workouts: 1
```

### If Adapter is NOT Working:
```
[Normalize] Mon: { hasSessions: true, sessionsCount: 1, hasWorkouts: false, workoutsCount: 0, ... }
[Quest] Building weekData for CosmicWeekView - weekPlan: { ..., totalSessions: 5, totalWorkouts: 0 }
[Quest] Processing Monday: { hasWorkouts: false, ... }
[Quest] ⚠️ Monday - No pre-transformed workouts, falling back to session transformation
```

## What to Check

1. **Open Quest page in cosmic view mode**
2. **Open browser console** (F12 → Console tab)
3. **Look for the log patterns above**
4. **Check if:**
   - `normalizeAdaptivePlan` is being called
   - Sessions are being converted to workouts (workoutsCount > 0)
   - Quest.tsx sees the workouts in weekPlan
   - CosmicWeekView receives days with workouts

## Expected Behavior

✅ **Week structure renders immediately** (even with empty workouts)
✅ **When adaptive engine finishes, workouts appear automatically**
✅ **Rest days show moon icons** (🌙)
✅ **Training days show workout type icons** (🏃, ⚡, 🔥, etc.)

## Next Steps if Issues Persist

If logs show `totalSessions > 0` but `totalWorkouts = 0`:
- The sessionToWorkout adapter may be failing
- Check session structure (they need `id`, `title`, `type` fields)

If logs show `totalWorkouts > 0` in normalize but `totalWorkouts = 0` in Quest:
- weekPlan state is not updating after normalization
- Check if setWeekPlan is being called after normalize

If logs show Quest has workouts but CosmicWeekView shows rest days:
- Issue is in the weekData inline function (lines 1128-1260)
- The workouts property may not be serializing through React state correctly
