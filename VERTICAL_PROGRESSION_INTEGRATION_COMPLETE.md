# Vertical Gain Progression Integration - COMPLETE

## Summary

Integrated **vertical gain tracking** into the rule-based progression system. Vertical now follows the same constraint-based progression as distance, with multi-dimensional coordination to prevent overtraining.

## Problem

Initial implementation of `progressionRules.ts` only tracked distance (km). Vertical gain (meters) was calculated as a simple ratio of distance (`vertPerKm * mileage`) without independent progression tracking.

**This violated key principle:**
> "Do not increase distance, vertical, AND intensity in the same week"

Vertical was just a derived value, not an independent dimension.

## Solution

**Vertical is now a first-class dimension** tracked independently with its own progression rules:

1. **Independent 10% rule** - Vertical can increase max 10%/week
2. **Multi-dimensional constraint** - Can't increase BOTH distance AND vertical same week
3. **Recovery weeks apply to both** - 40-60% drop in distance AND vertical
4. **Large jump detection** - If vertical jumps >15%, force recovery (same as distance)

## Implementation

### 1. Updated Types

#### `ProgressionContext`
```typescript
export interface ProgressionContext {
  currentWeekLoad: number;
  previousWeekLoad?: number;
  twoWeeksAgoLoad?: number;

  // NEW: Vertical tracking
  currentWeekVertical?: number;
  previousWeekVertical?: number;
  twoWeeksAgoVertical?: number;

  weeksInBuildCycle: number;
  recoveryRatio: '2:1' | '3:1';
  isIntensityWeek?: boolean;
  currentACWR?: number;
}
```

#### `ProgressionConstraints`
```typescript
export interface ProgressionConstraints {
  maxIncrease: number;           // Distance max (km)
  minDecrease?: number;          // Distance min if recovery

  // NEW: Vertical constraints
  maxVerticalIncrease?: number;  // Vertical max (meters)
  minVerticalDecrease?: number;  // Vertical min if recovery

  // NEW: Multi-dimensional flags
  canIncreaseDistance: boolean;  // Can distance go up?
  canIncreaseVertical: boolean;  // Can vertical go up?

  mustRecover: boolean;
  canHoldSteady: boolean;
  reasoning: string[];
  warnings?: string[];
}
```

### 2. Updated `calculateProgressionConstraints()`

Now handles vertical in parallel with distance:

#### Standard Progression (10% rule)
```typescript
// Distance
maxIncrease = currentWeekLoad * 1.10;

// Vertical (if tracked)
if (currentWeekVertical !== undefined) {
  maxVerticalIncrease = currentWeekVertical * 1.10;
  reasoning.push('Vertical 10% progression: 2000m → 2200m');
}
```

#### Multi-Dimensional Constraint
```typescript
// Check if both increased last week
const distanceIncreased = currentWeekLoad > previousWeekLoad;
const verticalIncreased = currentWeekVertical > previousWeekVertical;

if (distanceIncreased) {
  canIncreaseVertical = false; // Just increased distance, hold vertical
  reasoning.push('Distance increased - vertical should hold steady');
}

if (verticalIncreased) {
  canIncreaseDistance = false; // Just increased vertical, hold distance
  reasoning.push('Vertical increased - distance should hold steady');
}
```

#### Large Jump Detection
```typescript
// Check distance jumps
const largeDistanceJump = previousIncrease >= 0.15; // 15%

// Check vertical jumps
const previousVerticalIncrease =
  (previousWeekVertical - twoWeeksAgoVertical) / twoWeeksAgoVertical;
const largeVerticalJump = previousVerticalIncrease >= 0.15;

if (largeDistanceJump || largeVerticalJump) {
  mustRecover = true;
  const jumpType = largeDistanceJump ? 'distance' : 'vertical';
  reasoning.push(`Recovery required after large ${jumpType} jump`);
}
```

#### Recovery Weeks
```typescript
if (mustRecover) {
  // Distance recovery
  minDecrease = currentWeekLoad * 0.60;  // 40% drop
  maxIncrease = currentWeekLoad * 0.40;  // 60% drop

  // Vertical recovery (same proportions)
  if (currentWeekVertical !== undefined) {
    minVerticalDecrease = currentWeekVertical * 0.60;
    maxVerticalIncrease = currentWeekVertical * 0.40;
  }
}
```

### 3. Updated `calculateTargetVert()`

Now respects progression constraints:

```typescript
function calculateTargetVert(
  race: RaceEvent,
  phase: TrainingPhase,
  mileage: number,
  previousWeekVert?: number,          // NEW
  isRecoveryWeek?: boolean,           // NEW
  progressionConstraints?: {          // NEW
    maxVerticalIncrease?: number;
    canIncreaseVertical: boolean
  }
): number {
  // Start with race-appropriate vert/km ratio
  const vertPerKm = race.verticalGain > 1000 ? 40 : 20;
  let targetVert = mileage * vertPerKm;

  // Recovery week reduction
  if (isRecoveryWeek && previousWeekVert) {
    targetVert = previousWeekVert * 0.5; // 50% drop
  }

  // Apply progression constraints
  if (previousWeekVert && progressionConstraints) {
    if (!progressionConstraints.canIncreaseVertical) {
      // Can't increase vertical - hold or reduce
      targetVert = Math.min(targetVert, previousWeekVert);
    } else if (progressionConstraints.maxVerticalIncrease) {
      // Cap at max allowed increase
      targetVert = Math.min(targetVert, progressionConstraints.maxVerticalIncrease);
    } else {
      // Standard 10% rule
      targetVert = Math.min(targetVert, previousWeekVert * 1.10);
    }
  }

  return Math.round(targetVert);
}
```

### 4. Updated `MicrocycleInput`

Now accepts vertical history:

```typescript
export interface MicrocycleInput {
  weekNumber: number;
  macrocycleWeek: MacrocycleWeek;
  athlete: AthleteProfile;
  race: RaceEvent;
  isRecoveryWeek?: boolean;

  previousWeekMileage?: number;
  previousWeekVertical?: number;    // NEW
  twoWeeksAgoMileage?: number;      // NEW
  twoWeeksAgoVertical?: number;     // NEW
  weeksInBuildCycle?: number;       // NEW

  daysToRace?: number;
  constraints?: TrainingConstraints;
}
```

### 5. Updated `generateMicrocycle()`

Calculates and applies constraints:

```typescript
export function generateMicrocycle(input: MicrocycleInput): WeeklyPlan {
  // Calculate progression constraints
  const context: ProgressionContext = {
    currentWeekLoad: previousWeekMileage,
    previousWeekLoad: twoWeeksAgoMileage,
    currentWeekVertical: previousWeekVertical,
    previousWeekVertical: twoWeeksAgoVertical,
    weeksInBuildCycle: weeksInBuildCycle || 0,
    recoveryRatio: athlete.recoveryRatio || '3:1',
  };

  const constraints = calculateProgressionConstraints(context);

  console.log('[MicrocycleGenerator] Progression constraints:', {
    maxDistanceIncrease: constraints.maxIncrease,
    maxVerticalIncrease: constraints.maxVerticalIncrease,
    canIncreaseDistance: constraints.canIncreaseDistance,
    canIncreaseVertical: constraints.canIncreaseVertical,
    reasoning: constraints.reasoning
  });

  // Apply constraints to target vertical
  const targetVert = calculateTargetVert(
    race,
    phase,
    targetMileage,
    previousWeekVertical,
    isRecoveryWeek,
    constraints  // ← Pass constraints
  );
}
```

## Example: How It Works

### Scenario: Athlete at 50km/week, 2000m vert

#### Week 1-3: Build Distance
```
Week 1: 50km, 2000m
Week 2: 55km (+10%), 2000m (HOLD - just increased distance)
Week 3: 60km (+9%), 2000m (HOLD - just increased distance)
```

#### Week 4: Recovery
```
Week 4: 30km (-50%), 1000m (-50%) [both drop together]
```

#### Week 5-6: Build Vertical
```
Week 5: 30km (HOLD), 1100m (+10% - now we can increase vertical)
Week 6: 30km (HOLD), 1210m (+10%)
```

#### Week 7: Build Distance Again
```
Week 7: 33km (+10%), 1210m (HOLD - just increased distance)
```

### Multi-Dimensional Constraint in Action

**Constraint violated:**
```
Week N:   50km, 2000m
Week N+1: 55km (+10%), 2200m (+10%)  ← BOTH increased!
Week N+2: System BLOCKS further increases
          "Already increased 2 dimensions - must hold or recover"
```

**Correct approach:**
```
Week N:   50km, 2000m
Week N+1: 55km (+10%), 2000m (hold)  ← Only distance
Week N+2: 55km (hold), 2200m (+10%)  ← Only vertical
Week N+3: 55km (hold), 2200m (hold)  ← Recovery cycle
```

## Benefits

1. **Safer progression** - Prevents vertical overload
2. **Terrain-specific** - Mountain races can build vertical independently
3. **Respects physiology** - Can't hammer both distance AND vert same week
4. **Transparent** - Reasoning array explains why vertical is limited
5. **No hard ceiling** - Vertical grows with fitness, constrained only by rules

## What Changed

### Files Modified
- ✅ `progressionRules.ts` - Added vertical tracking to all rules
- ✅ `microcycle.ts` - Integrated vertical constraints into plan generation
- ✅ `MicrocycleInput` - Added vertical history parameters

### Files Created
- None (enhanced existing system)

### Build Status
✅ Passes with no type errors

## Next Steps (Not Implemented Yet)

The system now properly tracks and constrains vertical, but callers of `generateMicrocycle()` need to:

1. **Pass vertical history** when generating plans:
   ```typescript
   generateMicrocycle({
     previousWeekVertical: 2000,
     twoWeeksAgoVertical: 1800,
     // ... other params
   });
   ```

2. **Track `weeksInBuildCycle`** in macrocycle generator to enforce 3:1 or 2:1 cycles

3. **Store vertical in WeeklyPlan** already done (actualVert field exists)

## Testing Notes

To test vertical progression:

1. Generate plan with 50km, 2000m
2. Generate next week with those as "previous"
3. Check console logs for:
   ```
   [MicrocycleGenerator] Progression constraints: {
     maxDistanceIncrease: 55,
     maxVerticalIncrease: 2200,
     canIncreaseDistance: true,
     canIncreaseVertical: false,  ← Blocked!
     reasoning: ['Distance increased recently - vertical should hold']
   }
   ```

---

**Result:** Vertical gain is now a first-class dimension with independent progression tracking, multi-dimensional coordination, and rule-based constraints. No hard ceilings - just safe, smart progression.
