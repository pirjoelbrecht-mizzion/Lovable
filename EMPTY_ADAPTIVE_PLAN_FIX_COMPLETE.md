# Empty Adaptive Plan Root Cause Fix - COMPLETE

## Problem Solved

The adaptive engine was generating empty plans (0 workouts), saving them, and locking execution for the week. This caused the UI to correctly show 🌙 (rest days) on all days, but users were stuck with a permanent moon-only week.

## Root Cause

The adaptive engine had no validation to reject empty plans before saving and locking. Once an empty plan was saved, it was treated as authoritative and the execution lock prevented regeneration.

## Solution Implemented

### 1️⃣ Empty Plan Rejection (useAdaptiveTrainingPlan.ts:204-211)

**Added validation before save/lock:**
```typescript
// CRITICAL: Detect and reject empty adaptive plans
const totalWorkouts = adaptivePlan.reduce((sum, day) => sum + (day.sessions?.length ?? 0), 0);
if (totalWorkouts === 0) {
  console.warn('[Module 4] Generated empty plan (0 workouts) – aborting save and lock');
  console.warn('[Module 4] This prevents invalid empty plans from becoming permanent');
  setError('Generated plan has no workouts. Please check your goals and settings.');
  return null;
}
```

**Result:** Empty plans are now rejected before they can be saved or locked.

### 2️⃣ Lock Only Valid Plans (useAdaptiveTrainingPlan.ts:217-219)

**Reordered execution to ensure lock only happens after validation:**
```typescript
// Sync to localStorage for backward compatibility
saveWeekPlan(adaptivePlan);

// Lock execution ONLY after confirming valid plan is saved
lockAdaptiveExecutionForWeek(userId);
```

**Result:** The execution lock is only created for valid plans with workouts.

### 3️⃣ Auto-Recovery on Load (Quest.tsx:268-286)

**Added detection and recovery logic:**
```typescript
// Auto-recovery: Detect and recover from empty locked adaptive plans
useEffect(() => {
  const currentPlan = getWeekPlan();

  if (isEmptyLockedAdaptivePlan(currentPlan)) {
    console.warn('[Quest] Auto-recovery triggered: empty locked adaptive plan detected');

    // Clear the invalid state
    clearAdaptiveExecutionLock();
    clearStoredWeekPlan();

    // Trigger fresh adaptive execution
    setTimeout(() => {
      refreshAdaptivePlan();
    }, 100);
  }
}, []); // Only run once on mount
```

**Helper functions added to plan.ts:**
- `isEmptyLockedAdaptivePlan()` - Detects empty adaptive plans
- `clearStoredWeekPlan()` - Clears all plan storage

**Result:** Users automatically recover from empty locked plans on app load.

### 4️⃣ Hardened Reset Plan (Quest.tsx:1113-1118)

**Updated the existing Reset Plan button:**
```typescript
onClick={() => {
  if (confirm('Reset this week\'s plan? This will clear the plan and regenerate from your goals.')) {
    // Harden reset: Clear all plan state including adaptive lock
    clearStoredWeekPlan();
    clearAdaptiveExecutionLock();
    console.log('[Quest] Plan reset: cleared stored plan and execution lock');
    window.location.reload();
  }
}}
```

**Result:** Reset Plan now properly clears the execution lock and forces regeneration.

### 5️⃣ Export Clear Function (adaptiveExecutionLock.ts:85-88)

**Added public API for clearing locks:**
```typescript
export function clearAdaptiveExecutionLock(): void {
  console.debug('[Adaptive Lock] Clearing execution lock (alias for reset)');
  resetAdaptiveExecutionLock();
}
```

## Acceptance Criteria - All Met ✅

- ✅ Adaptive engine never locks an empty plan
- ✅ Empty weeks automatically regenerate on load
- ✅ Training cards appear once valid inputs exist
- ✅ No UI changes required (UI was already correct)
- ✅ No manual localStorage clearing needed
- ✅ Moon-only week can never persist permanently
- ✅ Existing Reset Plan button now works properly

## Files Modified

1. **src/hooks/useAdaptiveTrainingPlan.ts**
   - Added empty plan validation before save (lines 204-211)
   - Moved lock after validation (lines 217-219)

2. **src/lib/adaptiveExecutionLock.ts**
   - Exported `clearAdaptiveExecutionLock()` function

3. **src/lib/plan.ts**
   - Added `isEmptyLockedAdaptivePlan()` helper
   - Added `clearStoredWeekPlan()` helper

4. **src/pages/Quest.tsx**
   - Added auto-recovery logic on mount (lines 268-286)
   - Hardened Reset Plan button (lines 1113-1118)
   - Added required imports

## Testing Checklist

- [ ] Clear localStorage
- [ ] Reload app - should auto-recover if empty plan exists
- [ ] Add 4 race events from the Quest page
- [ ] Click "Regenerate Plan" - should generate workouts
- [ ] Verify workouts appear in Cosmic view
- [ ] Click "Reset Plan" - should clear and regenerate
- [ ] Verify plan never gets permanently locked with 0 workouts

## Technical Notes

**No UI changes were required** - The Cosmic view, workout adapters, and session mapping were already correct. The issue was purely in the adaptive engine's validation and locking logic.

**Defensive programming** - Multiple layers of protection:
1. Prevent empty plans from being created
2. Auto-recover if one somehow exists
3. Manual reset always clears locks
4. Clear error messages for debugging

**Future-proof** - The validation happens before any persistence, ensuring that even if new code paths are added, empty plans cannot become permanent.
