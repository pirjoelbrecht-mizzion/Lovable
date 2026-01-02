# Adaptive Plan Rest Days Bug Fix

## Problem

When users clicked "Reset Plan" in the Quest page, the adaptive training plan would regenerate with all 7 days showing as rest days instead of actual training workouts.

### Symptoms

```
[Quest] Building weekData for CosmicWeekView - weekPlan: {
  planLength: 7,
  planSource: 'adaptive',
  totalSessions: 7,
  totalWorkouts: 0  ⚠️ ALL WORKOUTS MISSING
}

[sessionToWorkout] Input session: {type: 'rest', title: 'Rest Day', ...}
[sessionToWorkout] Filtering out REST session
```

All 7 sessions had `type: 'rest'` and were being filtered out by `sessionToWorkout()`, resulting in 0 workouts displayed.

## Root Cause

In `src/lib/adaptiveContextBuilder.ts` (lines 629-658), there was a code path that created a "placeholder plan" with 7 rest days when:
1. The plan was empty
2. Adaptive execution was "pending"
3. User had constraints defined

This placeholder plan was created with the intention that it would be replaced by actual workouts, but it was being passed directly to the decision engine and saved as the final plan.

### The Problematic Code

```typescript
if (adaptivePending && hasUserConstraints) {
  console.log('[buildAdaptiveContext] ⏭️ Skipping fallback plan - adaptive execution pending');
  // Return minimal valid 7-day plan with all rest days
  const emptyDays: DailyPlan[] = Array.from({ length: 7 }, (_, i) => {
    return {
      day: dayNames[i],
      date: date.toISOString().slice(0, 10),
      sessions: [{
        type: 'rest',
        title: 'Rest Day',
        description: 'Recovery',
      }],
      completed: false,
    };
  });
  adaptivePlan = { /* plan with 7 rest days */ };
}
```

## The Flaw

1. We're INSIDE the adaptive execution when `buildAdaptiveContext()` is called
2. The "adaptive pending" check was meant for a different scenario (future execution)
3. The placeholder rest days were never replaced with actual workouts
4. The decision engine processed this placeholder plan and returned it unchanged
5. Users saw a week of rest days instead of training

## The Fix

Removed the placeholder rest days logic entirely from `src/lib/adaptiveContextBuilder.ts`:

```typescript
if (isEmptyPlan && !isAdaptiveAuthoritative) {
  // CRITICAL FIX: Always generate a proper fallback plan with actual workouts
  // The "adaptive pending" check was creating placeholder rest days that never got replaced
  console.log('[buildAdaptiveContext] Generating default base plan (empty/missing plan detected)');

  // Extract constraints to respect rest days during plan generation
  const constraints = extractTrainingConstraints(athlete, supabaseProfile || userProfile);
  const restDaySet = new Set(constraints.restDays || []);

  // Generate a default 7-day base plan RESPECTING REST DAYS
  const defaultPlan: LocalStorageWeekPlan = Array.from({ length: 7 }, (_, i) => {
    // ... generates actual training workouts (easy runs, strength sessions, etc.)
  });

  adaptivePlan = convertToAdaptiveWeekPlan(defaultPlan);
}
```

## Changes Made

### File: `src/lib/adaptiveContextBuilder.ts`

1. **Removed** the conditional placeholder rest days path (lines 629-658)
2. **Simplified** the logic to always generate proper training workouts when plan is empty
3. **Removed** the unused `adaptivePending` check and related imports
4. **Kept** the proper fallback plan generation that includes:
   - Easy runs on most days
   - Strength training on Wednesday
   - Proper rest days based on user constraints
   - Actual distance, duration, and zones

## Result

When users click "Reset Plan" now:

1. `buildAdaptiveContext()` is called with an empty plan
2. The fallback plan generator creates actual training workouts
3. The decision engine processes this plan (may adjust based on ACWR, climate, etc.)
4. Users see a proper training week with workouts displayed in the UI

### Expected Console Output

```
[buildAdaptiveContext] Generating default base plan (empty/missing plan detected)
[buildAdaptiveContext] Rest days from constraints: ['Fri'] daysPerWeek: 6

[convertToLocalStoragePlan] Mon raw sessions: [{type: 'easy', title: 'Easy Run', distanceKm: 8, ...}]
[sessionToWorkout] Input session: {type: 'easy', title: 'Easy Run', distanceKm: 8, ...}
[sessionToWorkout] Created workout: {id: '...', type: 'easy', title: 'Easy Run', ...}

[MULTI-SESSION] Output sessions per day: Mon: 1 sessions, Tue: 1 sessions, ...
[MULTI-SESSION] Output workouts per day: Mon: 1 workouts, Tue: 1 workouts, ...
                                          ✅ WORKOUTS NOW PRESENT
```

## Testing

1. Navigate to the Quest page
2. Click "Reset Plan"
3. Confirm the prompt
4. Page reloads
5. Verify that training workouts appear in the weekly view (not all rest days)
6. Check console logs show `Output workouts per day` with non-zero counts

## Related Files

- `src/lib/adaptiveContextBuilder.ts` - Main fix location
- `src/lib/plan.ts` - Session to workout conversion (debug logging added previously)
- `src/hooks/useAdaptiveTrainingPlan.ts` - Hook that triggers adaptive execution
- `src/pages/Quest.tsx` - UI that displays the weekly plan

## Prevention

The fix prevents this issue by:
1. Eliminating the placeholder rest days pattern entirely
2. Always generating proper training workouts when plan is empty
3. Trusting the decision engine to adjust the plan as needed
4. Removing confusing "adaptive pending" checks during execution

## Build Status

✅ Build successful with no errors (only existing warnings)
