# Adaptive Engine Display Fix - Complete

## Problem
The adaptive training engine was generating plans correctly, but the Quest page was showing empty bubbles instead of the planned workouts.

## Root Cause
When `sessionToWorkout()` was updated to return `null` for rest sessions, the `convertToLocalStoragePlan()` function in `adaptiveContextBuilder.ts` was not filtering out these null values. This resulted in workout arrays like `[null, WorkoutObj, null, ...]` being saved to localStorage.

When the UI tried to render these arrays, it skipped the null entries, resulting in no visible workouts.

## Changes Made

### 1. Fixed Workout Conversion (Line 213)
**File:** `src/lib/adaptiveContextBuilder.ts`

**Before:**
```typescript
const workouts = sessions.map(sessionToWorkout);
```

**After:**
```typescript
const workouts = sessions.map(sessionToWorkout).filter((w): w is NonNullable<typeof w> => w !== null);
```

This ensures null values from rest sessions are removed before the plan is saved.

### 2. Updated Invariant Check (Lines 237-244)
**Before:** Required `workouts.length === sessions.length` (this was wrong after rest handling)

**After:** Checks `workouts.length <= sessions.length` (workouts can be fewer due to rest sessions)

### 3. Fixed Fallback Empty Plan (Lines 144-152)
**Before:** Created synthetic rest sessions with workouts

**After:** Creates truly empty days with no sessions and no workouts
```typescript
return {
  label: dayLabels[i],
  dateISO: date.toISOString().slice(0, 10),
  sessions: [],
  workouts: [],
};
```

### 4. Fixed Day Padding Logic (Lines 168-173)
**Before:** Added rest sessions when padding to 7 days

**After:** Adds empty session arrays instead

## Data Flow (Fixed)

1. **Adaptive Engine** → Generates `WeeklyPlan` with sessions (including rest-type sessions)
2. **convertToLocalStoragePlan** → Converts sessions to workouts, **filters out nulls**
3. **localStorage** → Stores plan with clean workout arrays (no nulls)
4. **Quest.tsx** → Loads plan and normalizes it
5. **UI** → Renders non-null workout objects correctly

## Verification

✅ Build passes without errors
✅ TypeScript checks pass
✅ Null filtering prevents empty workout arrays
✅ Invariant checks updated to allow rest days

## Expected Behavior

- Adaptive engine plans now display correctly in the Quest page
- Rest days appear as empty days (no bubbles)
- Training days show workout bubbles with proper details
- Plan metadata (source: 'adaptive', timestamp) preserved correctly

## Testing

To verify the fix works:
1. Clear your adaptive lock: localStorage.removeItem('adaptiveExecutionLock')
2. Refresh the Quest page
3. The adaptive engine should run and generate a plan
4. Workouts should appear as bubbles on the cosmic week view
5. Console should show: "Output workouts per day: Mon: X workouts, Tue: Y workouts..."
