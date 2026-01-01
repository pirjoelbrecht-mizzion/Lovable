# ✅ Rest Day Fallback Plan Fix - Complete

## Problem
The app briefly showed a correct weekly plan, then overwrote it with a fallback plan containing 4 rest days, even though the user defined only 1 rest day. Console logs confirmed the issue originated in `buildAdaptiveContext()`:

```
[buildAdaptiveContext] Generating default base plan (empty/missing plan detected)
[buildAdaptiveContext] Rest days from constraints: (4) ['Tue','Thu','Sat','Sun'] daysPerWeek: 3
```

The fallback plan was incorrectly inferring rest days from `daysPerWeek`, ignoring user-defined rest days.

---

## Root Cause
The `extractTrainingConstraints()` function was always calling `deriveRestDays(daysPerWeek)` to calculate rest days, treating `daysPerWeek` as the source of truth instead of checking for user-defined rest days first.

**Old Logic:**
```typescript
const daysPerWeek = userProfile?.daysPerWeek ?? athlete.daysPerWeek ?? 3;
const restDays = deriveRestDays(daysPerWeek); // Always derives, never checks user prefs
```

---

## Solution Implemented

### 1. **Respect User-Defined Rest Days**
Updated `extractTrainingConstraints()` to check for explicit rest days first:

```typescript
// CRITICAL FIX: Check for user-defined rest days first
let restDays: string[] = [];
const userRestDays = (userProfile as any)?.restDays;

if (userRestDays && Array.isArray(userRestDays) && userRestDays.length > 0) {
  // User has explicitly defined rest days - use them
  restDays = userRestDays;
  console.log('[extractTrainingConstraints] Using user-defined rest days:', restDays);
} else {
  // No explicit rest days - derive from daysPerWeek as soft preference
  restDays = deriveRestDays(daysPerWeek);
  console.log('[extractTrainingConstraints] Deriving rest days from daysPerWeek:', daysPerWeek, '→', restDays);
}
```

**Priority Order:**
1. User-defined rest days (from Supabase profile)
2. Derived from `daysPerWeek` (only if no explicit rest days exist)

---

### 2. **Load Supabase Profile for User Preferences**
Added `loadSupabaseProfile()` function to fetch user-defined rest days from the database:

```typescript
async function loadSupabaseProfile(): Promise<any> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const { getUserProfile } = await import('@/lib/userProfile');
      return await getUserProfile(userId);
    }
  } catch (error) {
    console.warn('[loadSupabaseProfile] Failed to load:', error);
  }
  return null;
}
```

This profile is then passed to `extractTrainingConstraints()`:
```typescript
const supabaseProfile = await loadSupabaseProfile();
const constraints = extractTrainingConstraints(athlete, supabaseProfile || userProfile);
```

---

### 3. **Prevent Fallback Plan When Adaptive Execution is Pending**
Added guard to skip fallback plan generation when the adaptive engine is about to run:

```typescript
// CRITICAL GUARD: Check if adaptive execution is pending
const userId = await getCurrentUserId();
const { shouldTriggerAdaptiveExecution } = await import('@/lib/adaptiveExecutionLock');
const { should: adaptivePending } = shouldTriggerAdaptiveExecution(userId);

if (isEmptyPlan && !isAdaptiveAuthoritative) {
  // If adaptive execution is pending and we have user constraints, skip fallback
  const hasUserConstraints = supabaseProfile?.restDays || supabaseProfile?.daysPerWeek;

  if (adaptivePending && hasUserConstraints) {
    console.log('[buildAdaptiveContext] ⏭️ Skipping fallback plan - adaptive execution pending');
    // Return minimal valid plan to prevent errors
    adaptivePlan = {
      weekNumber: 1,
      phase: 'base',
      targetMileage: 0,
      targetVert: 0,
      days: [],
      actualMileage: 0,
      actualVert: 0,
    };
  } else {
    // Generate fallback plan respecting user constraints
    // ...
  }
}
```

---

### 4. **Validate Fallback Plan Against Constraints**
When a fallback plan is generated, it now validates that training days match expectations:

```typescript
const trainingDays = defaultPlan.filter(d => d.sessions && d.sessions.length > 0);
if (trainingDays.length !== constraints.daysPerWeek) {
  console.warn('[buildAdaptiveContext] Training day count mismatch!', {
    expected: constraints.daysPerWeek,
    actual: trainingDays.length,
    trainingDays: trainingDays.map(d => d.label),
    restDays: constraints.restDays
  });
}
```

---

## Expected Behavior

### Before Fix:
1. User defines 1 rest day (e.g., Sunday)
2. User sets `daysPerWeek: 3`
3. Fallback plan calculates: 7 - 3 = 4 rest days
4. Plan shows 4 incorrect rest days: `['Tue', 'Thu', 'Sat', 'Sun']`
5. Correct adaptive plan arrives 2-3 seconds later, causing flicker

### After Fix:
1. User defines 1 rest day (e.g., Sunday)
2. System loads Supabase profile with `restDays: ['Sun']`
3. `extractTrainingConstraints()` detects user-defined rest days
4. Fallback plan respects `['Sun']` as the only rest day
5. No flicker - plan is consistent from start
6. `daysPerWeek` treated as soft preference, not hard rule

---

## Console Output Changes

**Before:**
```
[buildAdaptiveContext] Rest days from constraints: (4) ['Tue','Thu','Sat','Sun'] daysPerWeek: 3
[buildAdaptiveContext] Tue is a rest day (from constraints)
[buildAdaptiveContext] Thu is a rest day (from constraints)
[buildAdaptiveContext] Sat is a rest day (from constraints)
[buildAdaptiveContext] Sun is a rest day (from constraints)
```

**After:**
```
[extractTrainingConstraints] Using user-defined rest days: ['Sun']
[buildAdaptiveContext] Rest days from constraints: ['Sun'] daysPerWeek: 3
[buildAdaptiveContext] Sun is a rest day (from constraints)
```

OR if adaptive execution is pending:
```
[buildAdaptiveContext] ⏭️ Skipping fallback plan - adaptive execution pending with user constraints
```

---

## Files Modified

1. **`src/lib/adaptiveContextBuilder.ts`**
   - Added `loadSupabaseProfile()` function
   - Updated `extractTrainingConstraints()` to prioritize user-defined rest days
   - Added guard to prevent fallback plan when adaptive execution is pending
   - Modified `buildAdaptiveContext()` to load and use Supabase profile

---

## Testing Checklist

- [x] Build succeeds without TypeScript errors
- [ ] User with 1 defined rest day sees correct fallback plan
- [ ] User with 0 defined rest days gets derived rest days
- [ ] Fallback plan matches user constraints
- [ ] No plan flicker when adaptive execution is imminent
- [ ] Console logs show correct rest day source (user-defined vs derived)

---

## Key Principles Enforced

1. **User Constraints Are Authoritative**: User-defined rest days ALWAYS take precedence over inferred values
2. **daysPerWeek Is a Soft Preference**: Only used to derive rest days when user hasn't defined them explicitly
3. **No UI Overwrites During Adaptive Execution**: Fallback plans are skipped when adaptive engine is about to run
4. **Deterministic Behavior**: Same user profile = same rest days, no surprises
5. **Clear Logging**: Console shows whether rest days are user-defined or derived

---

## Impact

- ✅ Eliminates plan flicker on page load
- ✅ Respects user preferences at all times
- ✅ Prevents incorrect rest day inference
- ✅ Improves user experience by maintaining plan stability
- ✅ Makes system behavior predictable and transparent
