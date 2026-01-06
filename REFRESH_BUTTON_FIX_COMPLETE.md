# Refresh Button Not Regenerating Plan - FIXED

## Summary

Fixed critical bug where pressing the Refresh button (🔄 icon in Adaptive Coach Panel) would bypass the execution lock but still use the OLD cached plan instead of regenerating a fresh plan from the microcycle generator.

## Root Causes

### 1. Refresh Doesn't Clear Cached Plan

**File:** `src/hooks/useAdaptiveTrainingPlan.ts` (Lines 271-278)

**Before:**
```typescript
const refresh = useCallback(async () => {
  console.log('[Module 4] Refresh requested by user');
  // User-initiated refresh bypasses the weekly lock
  await execute(undefined, true);
}, [execute]);
```

**Problem:** The refresh function bypassed the lock but didn't clear the cached plan, so `execute()` would still load the broken plan from localStorage/Supabase.

**Fix:**
```typescript
const refresh = useCallback(async () => {
  console.log('[Module 4] Refresh requested by user - clearing cached plan');
  // Clear stored plan and execution lock
  clearStoredWeekPlan();
  clearAdaptiveExecutionLock();
  // User-initiated refresh bypasses the weekly lock
  await execute(undefined, true);
}, [execute]);
```

### 2. buildAdaptiveContext Converts Old Plan

**File:** `src/lib/adaptiveContextBuilder.ts` (Lines 721-787)

**Before:**
```typescript
if (isEmptyPlan && !isAdaptiveAuthoritative) {
  // Generate new plan...
  adaptivePlan = generateMicrocycle(microcycleInput);
} else {
  // Just convert the old plan
  adaptivePlan = convertToAdaptiveWeekPlan(plan);
}
```

**Problem:** When a plan existed (even a broken one), it would just CONVERT it instead of regenerating. So the Monday Core-only bug persisted.

**Fix:** Added `forceRegenerate` parameter:
```typescript
export async function buildAdaptiveContext(
  plan?: LocalStorageWeekPlan | AdaptiveWeeklyPlan,
  forceRegenerate?: boolean
): Promise<AdaptiveContext> {
  // ...
  if ((isEmptyPlan || forceRegenerate) && !isAdaptiveAuthoritative) {
    // Generate new plan...
    adaptivePlan = generateMicrocycle(microcycleInput);
  } else {
    adaptivePlan = convertToAdaptiveWeekPlan(plan);
  }
}
```

### 3. execute() Not Passing forceRegenerate Flag

**File:** `src/hooks/useAdaptiveTrainingPlan.ts` (Lines 158-159)

**Before:**
```typescript
const context = await buildAdaptiveContext(plan);
```

**Problem:** When `bypassLock = true` (user refresh), it wasn't telling `buildAdaptiveContext` to regenerate.

**Fix:**
```typescript
const context = await buildAdaptiveContext(plan, bypassLock);
```

Now when the user clicks Refresh (bypassing the lock), it also forces regeneration.

## How It Works Now

### Before (Broken Flow)

1. User clicks Refresh 🔄
2. `refresh()` calls `execute(undefined, true)` → bypassLock = true
3. `execute()` loads old plan: `plan = getWeekPlan()`
4. `buildAdaptiveContext(plan)` sees plan exists → CONVERTS it ❌
5. Monday still has broken structure (Core only, no Easy Run)

### After (Fixed Flow)

1. User clicks Refresh 🔄
2. `refresh()` clears cached plan: `clearStoredWeekPlan()` ✅
3. `refresh()` clears execution lock: `clearAdaptiveExecutionLock()` ✅
4. `refresh()` calls `execute(undefined, true)` → bypassLock = true
5. `execute()` loads plan (now empty after clear): `plan = getWeekPlan()` → null
6. `buildAdaptiveContext(null, true)` sees `forceRegenerate = true` → GENERATES fresh plan ✅
7. `generateMicrocycle()` creates proper structure:
   - Monday: Easy Run + Core Training (2 sessions) ✅
   - Tuesday: Hill Sprints (1 session) ✅
   - Wednesday: Easy Run + ME Training (2 sessions) ✅
   - etc.

## Changes Made

### Files Modified

1. **src/hooks/useAdaptiveTrainingPlan.ts**
   - Lines 271-278: Updated `refresh()` to clear cached plan and lock before executing
   - Line 159: Pass `bypassLock` to `buildAdaptiveContext` as `forceRegenerate` flag

2. **src/lib/adaptiveContextBuilder.ts**
   - Line 655: Added `forceRegenerate` parameter to function signature
   - Line 721: Updated condition to include `forceRegenerate` check
   - Line 722: Added logging to show when force regeneration happens

## Testing Instructions

1. **Verify Current State:**
   - App should still show Monday with Core only (broken state)

2. **Click Refresh Button:**
   - Go to Quest page
   - Look for Adaptive Coach Panel (top of page)
   - Click the 🔄 Refresh icon

3. **Verify Console Logs:**
   - Should see: `[Module 4] Refresh requested by user - clearing cached plan`
   - Should see: `[buildAdaptiveContext] Generating proper training plan... { forceRegenerate: true }`
   - Should see: `[MicrocycleGenerator] Total workouts selected:...`
   - Should see: `[DistributeWorkouts] Day X (Mon):...`

4. **Verify Plan Structure:**
   - Monday should show: Easy Run + Core Training (2 bubbles) ✅
   - Tuesday should show: Hill Sprints ONLY (1 bubble) ✅
   - Wednesday should show: Easy Run + ME Training (2 bubbles) ✅
   - Thursday should show: Easy Run + Strides (1 bubble) ✅
   - Friday should show: Easy Run (1 bubble) ✅
   - Saturday should show: Long Run (1 bubble) ✅
   - Sunday should show: Rest (0 bubbles) ✅

## Expected Console Output

When clicking Refresh, you should see:

```
[Module 4] Refresh requested by user - clearing cached plan
[WeekPlan] Clearing stored plan
[Adaptive Lock] Clearing execution lock
[Module 4] Starting execution... { bypassLock: true }
[Module 4] Bypassing weekly lock for user-initiated refresh
[Module 4] Building adaptive context... { bypassLock: true }
[buildAdaptiveContext] Generating proper training plan using adaptive coach generators { forceRegenerate: true }
[buildAdaptiveContext] Rest days from constraints: [] daysPerWeek: 6
[buildAdaptiveContext] Race status: Vasaloppet China in 52 days
[buildAdaptiveContext] Generating microcycle plan for race training
[MicrocycleGenerator] Total workouts selected: 7 [...]
[DistributeWorkouts] Rest days configuration: {...}
[DistributeWorkouts] Day 0 (Mon): 2026-01-04 ...
[buildAdaptiveContext] Final plan sessions per day: Mon: 2 sessions, Tue: 1 sessions, Wed: 2 sessions...
```

## Why This Bug Existed

The Refresh button was added to allow users to manually trigger regeneration, but it was designed before the microcycle generator was integrated. It only bypassed the **execution lock** but didn't handle the **plan cache** properly, so it would just reprocess the old broken plan instead of generating a new one.

## Related Issues

This fix also resolves:
- Core Training being on wrong days
- Missing Easy Run on Monday
- Duplicate Long Runs on Friday/Saturday (caused by wrong session counts)
- Any other structural issues in cached plans

Once the user clicks Refresh, they'll get a completely fresh plan generated from the current microcycle generator logic.
