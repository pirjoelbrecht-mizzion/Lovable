# UI Render Gate Fix Complete

## Problem Statement

Adaptive workouts existed in storage, persisted correctly, and loaded successfully, but **no training cards appeared** in CosmicWeekView. The UI always fell back to default template data.

## Root Cause

The `sessionToWorkout()` adapter in `src/lib/plan.ts` was converting all adaptive workout types to generic `'run'` values, but CosmicWeekView requires specific type strings to render workout cards.

### CosmicWeekView Type Requirements

```typescript
type WorkoutType = 'rest' | 'recovery' | 'easy' | 'tempo' | 'intervals' | 'long' | 'strength' | 'workout';
```

### Old Broken Mapping

```typescript
const typeMap: Record<string, string> = {
  'easy': 'run',        // ❌ WRONG - CosmicWeekView doesn't recognize 'run'
  'tempo': 'run',       // ❌ All workouts became generic 'run'
  'vo2': 'run',         // ❌ Lost workout distinction
  // ... all mapped to 'run'
};
```

### Result

When CosmicWeekView received workouts with `type: 'run'`, it didn't recognize them and fell back to default template data.

## Solution

Fixed the type mapping in `sessionToWorkout()` to use CosmicWeekView-compatible types:

### New Correct Mapping

```typescript
const typeMap: Record<string, string> = {
  'easy': 'easy',              // ✅ CosmicWeekView renders easy runs
  'aerobic': 'easy',
  'long': 'long',              // ✅ CosmicWeekView renders long runs
  'backToBack': 'long',
  'tempo': 'tempo',            // ✅ CosmicWeekView renders tempo workouts
  'threshold': 'tempo',
  'vo2': 'intervals',          // ✅ CosmicWeekView renders intervals
  'hill_sprints': 'intervals',
  'hill_repeats': 'intervals',
  'muscular_endurance': 'strength',
  'strength': 'strength',      // ✅ CosmicWeekView renders strength sessions
  'cross_train': 'recovery',
  'rest': 'rest',              // ✅ CosmicWeekView renders rest days
  'shakeout': 'recovery',
  'race_pace': 'workout',
  'speed_play': 'workout',
  'hike': 'long',
  'recovery': 'recovery',
  'intervals': 'intervals',
  'workout': 'workout',
};
```

## Additional Fixes

### 1. Distance Format
- **Old:** `"8.0km"` (with decimal and lowercase)
- **New:** `"8K"` (matches UI convention)

### 2. Duration Format
- **Old:** `"45m"` (short form)
- **New:** `"45 min"` (matches UI convention)

### 3. Fallback Duration
- Added fallback: `"40 min"` for strength, `"30 min"` for others
- Ensures all workouts have visible duration

## Files Modified

- `src/lib/plan.ts:292-372` - Updated `sessionToWorkout()` adapter

## Flow Verification

```
Adaptive Engine
  └─> Creates sessions with type: 'easy', 'tempo', 'vo2', etc.
      └─> normalizeAdaptivePlan()
          └─> sessions.map(sessionToWorkout)
              └─> Maps to UI types: 'easy', 'tempo', 'intervals'
                  └─> Quest.tsx
                      └─> CosmicWeekView ✅ Renders cards
```

## Acceptance Criteria Status

- ✅ Adaptive workouts pass UI render filters
- ✅ Training cards appear immediately
- ✅ Rest days remain empty and visible
- ✅ No fallback plans triggered
- ✅ No changes to adaptive engine logic
- ✅ No changes to guards or storage

## Testing

1. Adaptive plan loads from storage
2. `normalizeAdaptivePlan()` converts sessions to workouts
3. Workout types map correctly to CosmicWeekView types
4. Cards render with correct icons and colors:
   - 🏃 Easy runs → cyan bubble
   - ⚡ Tempo → purple bubble
   - 🔥 Intervals → red bubble
   - 🏔️ Long runs → blue bubble
   - 💪 Strength → orange bubble
   - 😌 Rest → gray bubble

## Impact

- Zero changes to adaptive decision engine
- Zero changes to architectural guards
- Zero changes to storage/persistence
- Single adapter fix resolved entire render gate issue
