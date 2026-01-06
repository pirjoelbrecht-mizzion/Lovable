# Multi-Session Core Training Fix - Complete

## Problems Fixed

### 1. Monday Missing Easy Run
**Problem**: Monday showed ONLY Core Training, missing the easy run
**Cause**: Distribution pattern used `|` (OR) operator, picking ONE workout instead of BOTH
**Fix**: Updated distribution logic to support multi-session days with running + core

### 2. Friday Duplicate Long Run
**Problem**: Friday showed a duplicate long run instead of easy run
**Cause**: Pattern expected `core_3` but only 2 core sessions generated; fallback reused long run
**Fix**: Added fallback to create easy run when expected core session not found

### 3. Core Sessions Not Appearing as Separate Bubbles
**Problem**: Core sessions weren't being scheduled at all in the original issue
**Cause**: Core workouts generated but distribution didn't support multi-session days
**Fix**: Complete multi-session support for Mon/Thu/Fri with running + core combinations

### 4. Removed "Reset Plan" Button
**Problem**: Manual reset button shouldn't be needed
**Cause**: User expects automatic plan updates
**Fix**: Removed reset button - plan auto-updates via adaptive engine

## Technical Changes

### File: `src/lib/adaptive-coach/microcycle.ts`

#### 1. Multi-Session Distribution Logic (Lines 718-819)

**Before:**
```typescript
// Find ONE workout matching pattern
let workout = workouts.find(w => expectedIds.some(id => w.id?.includes(id)));
```

**After:**
```typescript
// Find MULTIPLE workouts for multi-session days
const sessions: Workout[] = [];

// Support Mon/Thu/Fri with running + core
if (primaryWorkout.id?.startsWith('core_')) {
  // Add easy run FIRST, then core
  sessions.push(easyRunBeforeCore, workoutWithMeta);
}
else if (hasCoreInPattern && hasRunInPattern) {
  // Find core workout to add with the run
  sessions.push(workoutWithMeta, coreWithMeta);
}
```

#### 2. Smart Fallback for Missing Workouts (Lines 731-753)

**Added:**
```typescript
if (!primaryWorkout) {
  // If day expected easy/core but none found, create easy run
  const expectedEasyOrCore = expectedIds.some(id =>
    id.startsWith('easy_') || id.startsWith('core_')
  );

  if (expectedEasyOrCore) {
    // Create easy run for this day (prevents duplicate long runs)
    primaryWorkout = {
      type: 'easy',
      title: 'Easy Run',
      distanceKm: 8,
      durationMin: 48,
      verticalGain: 100,
      intensityZones: ['Z2'],
      id: `easy_${dayName.toLowerCase()}`,
    };
  }
}
```

### File: `src/pages/Quest.tsx`

#### Removed Reset Plan Button (Lines 1351-1365)

**Before:**
```typescript
<button onClick={() => { /* Reset plan logic */ }}>
  🔄 Reset Plan
</button>
```

**After:**
```typescript
// Removed entirely - plan auto-updates
```

## Expected Results

### Correct Weekly Plan (Base Phase)

```
Monday:    Easy Run (6km, 36min) + Core Training (25min) ✓
Tuesday:   Short Hill Sprints (7km, 35min) ✓
Wednesday: Easy Run (6km, 36min) + ME Training (45min) ✓
Thursday:  Easy Run + Strides (8.8km, 53min) + Core Training (25min) ✓
Friday:    Easy Run (8km, 48min) ✓
Saturday:  Long Run (22.5km, 2h 15min) ✓
Sunday:    Rest Day ✓

Total Strength: 1 ME (45min) + 2 Core (25min each) = Complete program
```

### Multi-Session Day Handling

**Days with Multiple Sessions:**
- **Monday**: Running + Core
- **Wednesday**: Running + ME (already working)
- **Thursday**: Running + Core (when 2nd core scheduled)

**Single Session Days:**
- **Tuesday**: Intervals/Hills only
- **Friday**: Easy run only
- **Saturday**: Long run only
- **Sunday**: Rest

## Validation

### What Should Appear in Quest View:

1. **Monday**: 2 bubbles - "Easy Run" + "Core Training"
2. **Tuesday**: 1 bubble - "Short Hill Sprints"
3. **Wednesday**: 2 bubbles - "Easy Run" + "ME Training"
4. **Thursday**: 2 bubbles - "Easy Run + Strides" + "Core Training" (if 2 cores scheduled)
5. **Friday**: 1 bubble - "Easy Run"
6. **Saturday**: 1 bubble - "Long Run"
7. **Sunday**: Rest (no bubbles)

### What Should NOT Appear:

- No Monday with only Core (must have run too)
- No Friday with Long Run (only Saturday gets long run)
- No "Reset Plan" button (plan auto-updates)
- No duplicate long runs
- No missing core sessions

## Key Architectural Improvements

1. **Multi-Session Support**: Days can now have both running + strength work
2. **Smart Fallbacks**: Creates easy runs instead of reusing wrong workouts
3. **Automatic Updates**: No manual reset needed, plan stays current
4. **Proper Separation**: Core (light) vs ME (heavy) properly distinguished

## Testing

After this fix:

1. **Clear browser cache** or localStorage
2. **Reload Quest page**
3. **Plan will auto-generate** with correct structure
4. **Verify each day** has correct number of sessions
5. **No reset button** should appear

All sessions should appear as separate bubbles with correct running + strength combinations.
