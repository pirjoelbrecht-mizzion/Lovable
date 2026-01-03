# Training Load Architecture

## Current State: Binary Flag

The `counts_for_running_load` boolean flag determines whether an activity contributes to running-specific metrics.

```typescript
interface LogEntry {
  countsForRunningLoad: boolean;
}
```

## Problem: Too Binary

The single boolean forces "all or nothing" thinking and creates three problems:

1. **Cannot distinguish load types**: Running performance vs. fatigue vs. musculoskeletal stress
2. **Makes Phase 2 harder**: Adding multi-dimensional load requires refactoring all flag checks
3. **Loses nuance**: A 20km hike creates fatigue but shouldn't affect pace-based performance models

## Future: Multi-Dimensional Load Model

### Three Load Channels

```typescript
interface LoadContribution {
  performanceLoad: number;      // 0.0-1.0: Running-specific fitness gains
  fatigueLoad: number;           // 0.0-1.0: Recovery debt accumulation
  musculoskeletalLoad: number;   // 0.0-1.0: Time-on-feet, impact stress
}
```

### Example Contributions by Activity Type

| Activity Type | Performance | Fatigue | Musculoskeletal |
|--------------|-------------|---------|-----------------|
| Trail Run    | 1.0         | 1.0     | 1.2 (terrain)   |
| Road Run     | 1.0         | 1.0     | 1.0             |
| Hike         | 0.0         | 0.7     | 0.8             |
| Cycling      | 0.0         | 0.5     | 0.2             |
| Swimming     | 0.0         | 0.4     | 0.0             |
| Strength     | 0.0         | 0.3     | 0.3             |

## Coding Guidelines

### ✅ GOOD: Positive Intent Pattern

```typescript
// Good: Explicit about what we're including
if (entry.countsForRunningLoad) {
  includeInPerformanceMetrics(entry);
  includeInFatigueCalculation(entry);
}
```

This pattern makes Phase 2 migration easy:

```typescript
// Phase 2: Add other load types without refactoring
if (entry.countsForRunningLoad) {
  includeInPerformanceMetrics(entry);
}

// New logic can be added alongside
includeInFatigueCalculation(entry, getFatigueWeight(entry));
```

### ❌ BAD: Early Exit Pattern

```typescript
// Bad: Early exits make Phase 2 harder
if (!entry.countsForRunningLoad) {
  return; // This prevents adding other load logic later
}

// All subsequent code assumes running-only
calculateFitness(entry);
```

Problem: When we add fatigue tracking for non-running activities, we need to refactor all early exits.

### ✅ GOOD: Filter Pattern

```typescript
// Good: Explicit filtering with clear intent
const runningActivities = entries.filter(e => e.countsForRunningLoad);
const performanceMetrics = calculateMetrics(runningActivities);
```

Phase 2 migration:

```typescript
// Keep existing logic
const runningActivities = entries.filter(e => e.countsForRunningLoad);
const performanceMetrics = calculateMetrics(runningActivities);

// Add new logic for all activities
const fatigueMetrics = calculateFatigue(entries);
```

### ❌ BAD: Negative Filter Pattern

```typescript
// Bad: Negative logic is harder to extend
const validEntries = entries.filter(e => !e.isWalking && !e.isCycling);
```

Problem: Every new activity type requires updating the filter.

## Current Codebase Status

### ✅ Already Following Good Patterns

1. **Edge Function** (`derive-weekly-metrics/index.ts:102`):
   ```typescript
   .eq('counts_for_running_load', true)
   ```
   Clean filtering for running-only metrics.

2. **Import Logic** (`stravaImport.ts:157`):
   ```typescript
   if (sportMapping.countsForRunningLoad) {
     runCount++;
   }
   ```
   Positive intent, easy to extend.

3. **UI Filtering** (`Log.tsx:54`):
   ```typescript
   if (!showAllActivities) {
     filtered = filtered.filter(e => e.countsForRunningLoad !== false);
   }
   ```
   User-driven filter, not architectural constraint.

### No Problematic Patterns Found

Grep search for:
- `if (!counts_for_running_load) return;` → **0 matches** ✅
- Early exits based on flag → **0 matches** ✅
- Hard-coded negative logic → **0 matches** ✅

## Phase 2 Migration Path

### Step 1: Add Load Contribution Tables (Database)

```sql
CREATE TABLE activity_load_profiles (
  sport_type text PRIMARY KEY,
  performance_contribution numeric DEFAULT 0,
  fatigue_contribution numeric DEFAULT 0,
  musculoskeletal_contribution numeric DEFAULT 0,
  counts_for_running_load boolean  -- Keep for backward compatibility
);
```

### Step 2: Add Helper Functions

```typescript
function getLoadContribution(entry: LogEntry): LoadContribution {
  const profile = LOAD_PROFILES[entry.activityType] || DEFAULT_PROFILE;

  return {
    performanceLoad: profile.performance * entry.km,
    fatigueLoad: profile.fatigue * entry.km,
    musculoskeletalLoad: profile.musculoskeletal * entry.km
  };
}
```

### Step 3: Update Calculations (Additive, Not Replacement)

```typescript
// KEEP existing running-only logic
const runningLoad = entries
  .filter(e => e.countsForRunningLoad)
  .reduce((sum, e) => sum + e.km, 0);

// ADD new multi-dimensional logic
const totalFatigue = entries
  .reduce((sum, e) => {
    const contrib = getLoadContribution(e);
    return sum + contrib.fatigueLoad;
  }, 0);
```

### Step 4: Update Adaptive Coach

The coach can now:
- Use `runningLoad` for performance predictions
- Use `totalFatigue` for recovery recommendations
- Use `musculoskeletalLoad` for injury risk assessment

```typescript
if (totalFatigue > fatigueThreshold && readiness < 7) {
  return "Rest day - accumulated fatigue from hiking and running";
}
```

## Benefits of Current Architecture

1. **Clean separation**: Running performance stays pure
2. **Easy migration**: No refactoring needed, only additive changes
3. **Backward compatible**: Old logic continues working
4. **Type safe**: TypeScript prevents accidental breaking changes

## Action Items

- ✅ Document architectural intent (this file)
- ✅ Audit codebase for problematic patterns (none found)
- ⏳ Design Phase 2 database schema (when needed)
- ⏳ Implement load contribution profiles (when needed)
- ⏳ Add multi-dimensional calculations (when needed)

## Summary

The codebase is already well-architected for Phase 2. The binary flag works correctly for Phase 1, and all usage patterns are migration-friendly. No immediate action required.
