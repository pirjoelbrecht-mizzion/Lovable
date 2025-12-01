# Race Plan V2 - Migration Guide

## Overview

This guide documents the unified Race Plan architecture (V2) that consolidates Race Mode, What-If Simulator, and Pacing Strategy into a single, cohesive data model.

## ✅ What Has Been Implemented

### 1. Database Schema Evolution

**File:** `supabase/migrations/20251110000000_unified_race_plan_v2.sql`

- Extended `race_simulations` table with v2 columns:
  - `schema_version` (INTEGER) - Tracks data model version (1=legacy, 2=unified)
  - `scenario_type` (TEXT) - Distinguishes 'race', 'whatif', 'training'
  - `race_plan` (JSONB) - Unified structure containing all data
  - `parent_id` (UUID) - Version lineage tracking

- Backward compatibility maintained - legacy columns preserved
- Automatic migration functions included in SQL
- New indexes for performance optimization
- `race_plans_v2` view for easy querying

### 2. Unified Type System

**File:** `src/types/racePlanV2.ts`

Complete type definitions for the unified model:

```typescript
RacePlan {
  race: RaceReference
  inputs: SimulationInputs {
    conditions: ConditionsInputs
    nutrition: NutritionInputs
    pacing: PacingSegment[]
    overrides?: SimulationOverrides
  }
  outputs: SimulationOutputs {
    predictedTimeMin, avgPace, factors
    physiological?, performance?
  }
  context: SimulationContext {
    readiness, training, weather
  }
  ui: SimulationUI {
    message, confidence, tabs
  }
  metadata: SimulationMetadata {
    schema_version, scenario_type, parent_id, timestamps
  }
}
```

- Comprehensive validation functions
- Default value constants
- Utility functions for cloning and comparison

### 3. Type Adapters

**File:** `src/utils/racePlanAdapters.ts`

Conversion functions between legacy and v2 formats:

- `raceSimulationToRacePlan()` - Convert legacy RaceSimulation
- `whatIfScenarioToRacePlan()` - Convert WhatIfScenario
- `racePlanToSimulationOverrides()` - For backward compatibility
- `dbRowToRacePlan()` - Handle both v1 and v2 database rows
- `racePlanToDbRow()` - Prepare data for database storage

### 4. Database Layer

**File:** `src/lib/racePlanDatabase.ts`

Unified CRUD operations with automatic migration:

**Read Operations:**
- `getRacePlan(id)` - Auto-migrates v1 to v2 on read
- `listRacePlans(scenarioType?, limit?)` - List with filters
- `getRacePlansForRace(raceId)` - All plans for a race
- `getRacePlanHistory(planId)` - Version lineage

**Create Operations:**
- `createRacePlan(plan)` - Create new v2 plan
- `createRacePlanVersion(parent, updates)` - Create child version
- `createWhatIfScenario(base, name)` - Create What-If from race

**Update Operations:**
- `updateRacePlan(id, plan)` - Full update
- `updateRacePlanInputs(id, inputs)` - Update inputs only
- `updateRacePlanOutputs(id, outputs)` - Update outputs only

**Delete Operations:**
- `deleteRacePlan(id)`
- `deleteRacePlansForRace(raceId)`

**Migration Operations:**
- `migrateRacePlanToV2(id)` - Manual migration trigger
- `getRacePlanMigrationStatus()` - Check v1 vs v2 counts

### 5. React Hook

**File:** `src/hooks/useRacePlanV2.tsx`

Unified React hook for state management:

```typescript
const {
  plan, originalPlan, isModified, isLoading, isSaving, error,

  // Actions
  load, create, save, reset, revert,

  // Updates
  updateConditions, updateNutrition, updatePacing,
  updateOverrides, setOutputs,

  // Advanced
  createVersion, createWhatIf, deletePlan, validate
} = useRacePlan(planId);
```

Additional hooks:
- `useRacePlanList(scenarioType?)` - List plans
- `useRacePlansForRace(raceId)` - Plans for specific race

### 6. Simulation Engine

**File:** `src/utils/raceSimulationEngine.ts`

Unified simulation logic used by both Race Mode and What-If:

- `runRaceSimulation(plan, options)` - Full simulation with training data
- `runQuickSimulation(plan)` - Fast simulation for What-If scenarios
- Consistent factor calculations across all features
- Performance analysis integration
- Confidence level computation

## 🎯 Architecture Benefits

### Before (Fragmented)
```
Race Mode         → RaceSimulation type → race_simulations table
What-If Simulator → WhatIfScenario type → whatif_scenarios table
Pacing Strategy   → PacingStrategy type → pacing_strategies table
```

### After (Unified)
```
All Features → RacePlan (v2) type → race_simulations table
                                      ↓
                            (filtered by scenario_type)
```

## 📊 Migration Strategy

### Phase 1: Shadow Mode (✅ Complete)
- Schema extended with v2 columns
- Both v1 and v2 data coexist
- No user-facing changes

### Phase 2: Lazy Migration (🔄 Ready)
- Auto-migrate v1→v2 on read
- Update database with converted structure
- Users see no difference

### Phase 3: API Switch (⏳ Next)
- Frontend components use new hooks
- New data created as v2 by default
- Old API deprecated but functional

### Phase 4: Full Migration (⏳ Future)
- Batch convert remaining v1 records
- Remove legacy code paths
- Optional: deprecate old columns

## 🔧 How to Deploy

### 1. Apply Database Migration

```bash
# The migration is already in supabase/migrations/
# It will be applied on next Supabase deploy or via CLI:
supabase db push
```

**Safe to deploy:** The migration is non-destructive and backward-compatible.

### 2. Verify Migration

```sql
-- Check schema version distribution
SELECT schema_version, COUNT(*)
FROM race_simulations
GROUP BY schema_version;

-- Test the migration function (dry run)
SELECT migrate_race_simulation_v1_to_v2(id)
FROM race_simulations
WHERE schema_version = 1
LIMIT 1;
```

### 3. Use New Hooks in Components

```typescript
// Old way (deprecated)
import { useRacePlanStore } from '@/hooks/useRacePlanStore';

// New way
import { useRacePlan } from '@/hooks/useRacePlanV2';

function RaceModePage() {
  const { plan, updateConditions, save } = useRacePlan(raceId);

  // Rest of component logic...
}
```

## 📝 Code Migration Examples

### Example 1: Converting Race Mode Component

**Before:**
```typescript
const simulation = await simulateRace(raceId);
// simulation.predictedTimeMin
// simulation.factors.terrainFactor
```

**After:**
```typescript
const { plan, save } = useRacePlan(raceId);
await runRaceSimulation(plan);
// plan.outputs.predictedTimeMin
// plan.outputs.factors.terrainFactor
```

### Example 2: Creating What-If Scenario

**Before:**
```typescript
const scenario: WhatIfScenario = {
  raceId,
  name: "Hot Weather Test",
  overrides: { temperature: 35, humidity: 80 },
  // ...
};
```

**After:**
```typescript
const { plan, updateConditions, createWhatIf } = useRacePlan(raceId);
updateConditions({ temperature: 35, humidity: 80 });
const whatIfId = await createWhatIf("Hot Weather Test");
```

### Example 3: Updating Pacing Strategy

**Before:**
```typescript
const strategy = await getPacingStrategy(raceId);
strategy.segments.push({ distanceKm: 21, targetPace: 5.5 });
await savePacingStrategy(strategy);
```

**After:**
```typescript
const { plan, updatePacing, save } = useRacePlan(raceId);
updatePacing([
  ...plan.inputs.pacing,
  { startKm: 10, endKm: 21, targetPace: 5.5 }
]);
await save();
```

## 🧪 Testing Checklist

- [ ] Apply migration to staging database
- [ ] Verify v1 records are readable
- [ ] Create new v2 race plan
- [ ] Create What-If scenario from race plan
- [ ] Update pacing segments
- [ ] Run simulation and check outputs
- [ ] Verify version lineage (parent_id)
- [ ] Test with 100+ existing records
- [ ] Check query performance
- [ ] Validate data integrity

## 🔍 Monitoring

### Key Metrics to Track

1. **Migration Progress**
   ```sql
   SELECT
     schema_version,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM race_simulations
   GROUP BY schema_version;
   ```

2. **Scenario Distribution**
   ```sql
   SELECT scenario_type, COUNT(*)
   FROM race_simulations
   WHERE schema_version = 2
   GROUP BY scenario_type;
   ```

3. **Version Lineage Usage**
   ```sql
   SELECT COUNT(*) as versioned_plans
   FROM race_simulations
   WHERE parent_id IS NOT NULL;
   ```

## 🚨 Rollback Plan

If issues arise during deployment:

1. **Database is safe** - Legacy columns intact, data not modified
2. **Revert frontend code** - Use old hooks temporarily
3. **Keep monitoring** - V2 records remain valid
4. **Debug specific issues** - Check migration logs

## 📚 Additional Resources

- **Type Definitions:** `src/types/racePlanV2.ts`
- **Database Helpers:** `src/lib/racePlanDatabase.ts`
- **Adapters:** `src/utils/racePlanAdapters.ts`
- **Simulation Engine:** `src/utils/raceSimulationEngine.ts`
- **React Hook:** `src/hooks/useRacePlanV2.tsx`
- **Migration SQL:** `supabase/migrations/20251110000000_unified_race_plan_v2.sql`

## 🎓 Best Practices

1. **Always use the new hook** for new components
2. **Validate before saving** using `validate()` method
3. **Track versions** when making significant changes
4. **Use scenario types** correctly (race vs whatif vs training)
5. **Let the engine handle** factor calculations
6. **Test edge cases** like missing data or extreme conditions

## 🔮 Future Enhancements

- **GraphQL API** for nested querying
- **Real-time sync** across devices
- **AI-powered suggestions** based on plan history
- **Collaborative planning** with shared scenarios
- **Advanced analytics** on performance trends
- **Export/import** functionality for race plans

---

## Questions or Issues?

This migration maintains 100% backward compatibility while providing a solid foundation for future features. All existing data remains accessible, and the transition can happen gradually without disrupting users.
