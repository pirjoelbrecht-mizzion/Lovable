# Workouts Lost at Quest.tsx Boundary - Root Cause Analysis

## Executive Summary

Adaptive workouts were **lost at the Quest.tsx boundary** because plans with `sessions` were never converted to plans with `workouts` before being stored in React state.

CosmicWeekView requires `day.workouts` to render cards, but Quest.tsx was receiving plans with only `day.sessions` and never calling the normalization function.

## Exact Location of Data Loss

**File:** `src/pages/Quest.tsx`

### Problem Locations

1. **Initial State Load (Line 193)**
   ```typescript
   const [weekPlan, setWeekPlan] = useState<WeekPlan>(() => {
     const plan = getWeekPlan();
     // ... validation ...
     return plan; // ❌ WRONG: Returns plan with sessions, no workouts
   });
   ```

2. **Adaptive Plan Callback (Line 237)**
   ```typescript
   const handleAdaptivePlanAdjusted = useCallback((decision, plan) => {
     if (plan && plan.length === 7) {
       setWeekPlan(plan); // ❌ WRONG: Sets plan with sessions, no workouts
     }
   }, []);
   ```

3. **Plan Updated Event (Line 445)**
   ```typescript
   const handlePlanUpdate = () => {
     const updatedPlan = getWeekPlan();
     setWeekPlan(updatedPlan); // ❌ WRONG: Sets plan with sessions, no workouts
   };
   ```

4. **Plan Adapted Event (Line 481)**
   ```typescript
   const handlePlanAdapted = () => {
     const updatedPlan = getWeekPlan();
     setWeekPlan(updatedPlan); // ❌ WRONG: Sets plan with sessions, no workouts
   };
   ```

## Data Flow Diagram

```
Adaptive Engine
  ↓
  Creates plan with day.sessions (no day.workouts)
  ↓
Quest.tsx setWeekPlan() ❌ STORED WITHOUT NORMALIZATION
  ↓
weekPlan state = { sessions: [...], workouts: undefined }
  ↓
CosmicWeekView weekData preparation (line 1119)
  ↓
  Checks: if (dayData?.workouts && Array.isArray(dayData.workouts))
  ↓
  Result: FALSE (workouts is undefined)
  ↓
  Falls back to default template data
  ↓
  User sees template workouts, not adaptive workouts ❌
```

## Why This Happened

1. **Misleading Comment:** Line 236 had a comment saying "normalization happens in setWeekPlan" but this was false. `setWeekPlan` is a React useState setter that does nothing except update state.

2. **Missing Function Call:** `normalizeAdaptivePlan()` exists in `src/lib/plan.ts` and correctly converts `sessions → workouts`, but it was **never imported or called** in Quest.tsx.

3. **Implicit Assumption:** The CosmicWeekView data preparation (line 1119) has a fast path that checks for pre-existing `workouts`, but this fast path was never executed because workouts were never created.

## The Fix

### What Was Changed

1. **Import normalization function:**
   ```typescript
   import { normalizeAdaptivePlan } from "@/lib/plan";
   ```

2. **Normalize at initial load:**
   ```typescript
   return normalizeAdaptivePlan(plan); // ✅ Convert sessions → workouts
   ```

3. **Normalize in adaptive callback:**
   ```typescript
   const normalizedPlan = normalizeAdaptivePlan(plan);
   setWeekPlan(normalizedPlan); // ✅ Store plan with workouts
   ```

4. **Normalize in event handlers:**
   ```typescript
   const normalizedPlan = normalizeAdaptivePlan(updatedPlan);
   setWeekPlan(normalizedPlan); // ✅ Store plan with workouts
   ```

## Files Modified

- **Quest.tsx:14** - Added `normalizeAdaptivePlan` to imports
- **Quest.tsx:193** - Normalize plan at initial load
- **Quest.tsx:237** - Normalize plan in adaptive callback
- **Quest.tsx:445** - Normalize plan in "plan:updated" event
- **Quest.tsx:483** - Normalize plan in "plan:adapted" event

## What Was NOT Changed

- ✅ No changes to adaptive engine
- ✅ No changes to sessionToWorkout adapter
- ✅ No changes to CosmicWeekView
- ✅ No changes to storage/persistence
- ✅ No changes to architectural guards

## Verification

### Before Fix
```typescript
weekPlan[0] = {
  label: "Mon",
  sessions: [{ type: 'easy', title: 'Easy Run', ... }],
  workouts: undefined // ❌ Missing!
}
```

### After Fix
```typescript
weekPlan[0] = {
  label: "Mon",
  sessions: [{ type: 'easy', title: 'Easy Run', ... }],
  workouts: [{ type: 'easy', title: 'Easy Run', duration: '45 min', ... }] // ✅ Present!
}
```

### CosmicWeekView Check (Line 1119)
```typescript
if (dayData?.workouts && Array.isArray(dayData.workouts)) {
  // ✅ NOW TRUE - Fast path executes
  return { workouts: existingWorkouts }; // Renders adaptive cards
}
```

## Impact

- Adaptive workouts now render immediately on page load
- Cards show correct workout type, title, distance, duration
- Rest days display correctly (empty moon icons)
- No fallback to default template data
- Zero changes to core adaptive engine logic

## Key Lesson

**Always normalize at the boundary.** When data crosses from one system (adaptive engine) to another (React UI), transformation must happen at the boundary, not deep inside components.

Quest.tsx is the boundary between:
- **Storage layer** (sessions in localStorage/Supabase)
- **UI layer** (workouts for rendering)

The normalization must happen when data enters React state, not when it's rendered.
