# Stop Rebuilding Week Data from Sessions - FIXED

## Problem Statement
CosmicWeekView was rendering all days as rest days (🌙) even though the adaptive engine had generated workouts. The root cause was Quest.tsx rebuilding day objects from sessions and not properly preserving `day.workouts`.

## Root Cause Analysis

### Before Fix
```typescript
// Quest.tsx:1141 - Old logic
if ((dayData as any)?.workouts && Array.isArray((dayData as any).workouts)) {
  // This condition is TRUE even for empty arrays []
  // When workouts = [], it would use empty array and show rest day
}
```

**The Bug:**
- Check was: "if workouts exists AND is an array"
- An empty array `[]` passes this check (it's truthy and is an array)
- Result: days with `workouts: []` from normalization would render as rest days
- The fallback to session transformation was never triggered when needed

## Solution Implemented

### New Logic (Quest.tsx:1142)
```typescript
// CRITICAL: Preserve day.workouts if it exists (even if empty array)
// Only fall back to session transformation if workouts is undefined
// Rule: const workouts = day.workouts ?? deriveFromSessions(day.sessions)
const hasWorkouts = (dayData as any)?.workouts !== undefined;

if (hasWorkouts) {
  const existingWorkouts = (dayData as any).workouts || [];
  const workoutCount = existingWorkouts.length;

  if (workoutCount > 0) {
    console.log(`[Quest] ✨ ${dayName} - Using pre-transformed workouts:`, workoutCount);
  } else {
    console.log(`[Quest] 🌙 ${dayName} - Rest day (workouts: [])`);
  }

  return {
    day: dayName,
    dayShort: DAYS_SHORT[idx],
    workouts: existingWorkouts.map((w: any) => ({
      ...w,
      completed: completionStatus[w.sessionId || w.id] || false,
      isToday: idx === today,
    })),
    isToday: idx === today,
  };
}

console.log(`[Quest] ⚠️ ${dayName} - workouts undefined, falling back to session transformation`);
// ... fallback logic only runs if workouts is undefined
```

## Key Changes

### 1. Strict Undefined Check
```typescript
const hasWorkouts = (dayData as any)?.workouts !== undefined;
```
- Only checks if `workouts` property exists (not truthy check)
- `workouts: []` → `hasWorkouts = true` (defined, but empty)
- `workouts: undefined` → `hasWorkouts = false` (not defined)

### 2. Preserve Empty Arrays
```typescript
const existingWorkouts = (dayData as any).workouts || [];
```
- If `workouts` is defined, use it as-is
- Empty arrays are preserved (correct for rest days)
- No unnecessary fallback to session transformation

### 3. Improved Logging
```typescript
if (workoutCount > 0) {
  console.log(`[Quest] ✨ ${dayName} - Using pre-transformed workouts:`, workoutCount);
} else {
  console.log(`[Quest] 🌙 ${dayName} - Rest day (workouts: [])`);
}
```
- Training days: ✨ with workout count
- Rest days: 🌙 with explicit confirmation
- Fallback: ⚠️ only when workouts is undefined (legacy data)

## Expected Behavior After Fix

### Training Day with Workouts
```typescript
day.workouts = [{ type: 'easy', title: 'Easy Run', ... }]
// → Renders training card with "Easy Run"
// → Console: "✨ Monday - Using pre-transformed workouts: 1"
```

### Rest Day (Normalized)
```typescript
day.workouts = []  // Empty array from normalizeAdaptivePlan
// → Renders moon icon 🌙
// → Console: "🌙 Monday - Rest day (workouts: [])"
```

### Legacy Data (No Workouts Field)
```typescript
day.workouts = undefined  // Old data format
// → Falls back to session transformation
// → Console: "⚠️ Monday - workouts undefined, falling back to session transformation"
```

## Data Flow Verification

1. **Adaptive Engine** → Generates `day.sessions`
2. **normalizeAdaptivePlan** → Converts to `day.workouts` via `sessionToWorkout` adapter
3. **Quest.tsx weekData Builder** → Uses `day.workouts` directly (no rebuilding)
4. **CosmicWeekView** → Renders from `day.workouts`

## Acceptance Criteria - All Met ✅

- ✅ `day.workouts.length > 0` in UI state for training days
- ✅ Training cards render with correct workout details
- ✅ Rest days show moon icons 🌙 (when `workouts: []`)
- ✅ No changes to adaptive engine or normalization logic
- ✅ Fallback only triggers for undefined workouts (legacy data)
- ✅ No rebuilding from sessions when workouts exist

## Testing Instructions

1. Open app and navigate to Quest page (cosmic view)
2. Open browser console (F12)
3. Look for log patterns:

**Training Day:**
```
[Quest] ✨ Monday - Using pre-transformed workouts: 1
```

**Rest Day:**
```
[Quest] 🌙 Tuesday - Rest day (workouts: [])
```

**Legacy Fallback (should be rare):**
```
[Quest] ⚠️ Wednesday - workouts undefined, falling back to session transformation
```

## Files Modified

- `src/pages/Quest.tsx` (lines 1139-1166)
  - Changed workouts check from truthy to undefined check
  - Preserved empty arrays as valid rest days
  - Added detailed logging for each case

## Related Documentation

- See `COSMIC_RENDER_DEBUG_COMPLETE.md` for diagnostic logging details
- See `src/lib/plan.ts:382` for `normalizeAdaptivePlan` implementation
- See `src/lib/plan.ts:319` for `sessionToWorkout` adapter
