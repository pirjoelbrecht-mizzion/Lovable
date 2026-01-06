# Legacy Core Injection Bug - FIXED

## Root Cause Found

The problem was **NOT** in the microcycle generator - it was generating the correct plan. The issue was a **legacy core injection effect** in `Quest.tsx` (lines 200-249) that was:

1. **Overriding the adaptive plan** by injecting Core Training into "today"
2. **Adding core to the wrong day** (Tuesday instead of Monday)
3. **Running on every render** and modifying the week plan

### What Was Happening

```typescript
// LEGACY CODE (NOW DISABLED)
useEffect(() => {
  // This was checking if "today" had a strength session
  // If not, it would INJECT Core Training into today
  // This overrode the adaptive plan's proper scheduling

  console.log('[Quest] Adding core training as separate session for today');
  // ... inject core into today's plan
}, [selectedCoreSession, coreEmphasis, coreFrequency, weekPlan]);
```

### The Result

**Current Week (Today = Tuesday):**
- Monday: Core only (correct from adaptive plan)
- Tuesday: Hill Sprints + **INJECTED Core** ❌ (wrong!)
- Wednesday: Easy Run + ME (correct)
- Thursday: Easy Run + Strides (correct)
- Friday: Long Run (wrong - should be easy run)
- Saturday: Long Run (correct)
- Sunday: Rest (correct)

The Tuesday injection then caused the Friday long run issue because the plan had 8 sessions instead of 7.

## Fix Applied

### File: `src/pages/Quest.tsx` (Lines 200-204)

**Before:**
```typescript
useEffect(() => {
  // 50 lines of core injection logic
  setWeekPlan(normalizeAdaptivePlan(updatedPlan));
}, [selectedCoreSession, coreEmphasis, coreFrequency, weekPlan]);
```

**After:**
```typescript
// DISABLED: Core training is now scheduled properly by the adaptive plan generator
// This legacy injection logic was overriding the adaptive plan and adding core to wrong days
// useEffect(() => { ... (removed) });
```

## Expected Result After Fix

With the legacy injection disabled, the adaptive plan will work correctly:

```
Monday:    Easy Run (6km, 36min) + Core Training (25min) ✓
Tuesday:   Short Hill Sprints (7km, 35min) ✓ (NO MORE EXTRA CORE!)
Wednesday: Easy Run (6km, 36min) + ME Training (45min) ✓
Thursday:  Easy Run + Strides (8.8km, 53min) ✓
Friday:    Easy Run (8km, 48min) ✓ (NO MORE DUPLICATE LONG RUN!)
Saturday:  Long Run (22.5km, 2h 15min) ✓
Sunday:    Rest ✓

Total Sessions: 7 (correct!)
- 1 Core (Monday)
- 1 ME (Wednesday)
- 5 Running workouts
- 1 Rest day
```

## Why This Happened

This was a **code conflict** between:

1. **Old System**: Manual core injection based on user settings
2. **New System**: Adaptive plan generator that schedules everything properly

The old system wasn't removed when the new adaptive engine was added, causing them to fight each other.

## Testing

After clearing browser cache:

1. ✅ Monday should show: Easy Run + Core Training (2 bubbles)
2. ✅ Tuesday should show: Short Hill Sprints ONLY (1 bubble)
3. ✅ Wednesday should show: Easy Run + ME Training (2 bubbles)
4. ✅ Thursday should show: Easy Run + Strides (1 bubble)
5. ✅ Friday should show: Easy Run ONLY (1 bubble, not long run!)
6. ✅ Saturday should show: Long Run (1 bubble)
7. ✅ Sunday should show: Rest (0 bubbles)

## Additional Notes

- The microcycle generator was working correctly all along
- The multi-session support added earlier was also correct
- Only the legacy injection effect needed to be removed
- Core training is now ONLY scheduled by the adaptive plan generator
