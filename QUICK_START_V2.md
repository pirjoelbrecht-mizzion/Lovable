# Race Plan V2 - Quick Start Guide

## 🚀 For Developers

### Import the Hook

```typescript
import { useRacePlan } from '@/hooks/useRacePlanV2';
```

### Basic Usage

```typescript
function MyComponent() {
  const {
    plan,              // Current race plan
    isLoading,         // Loading state
    isSaving,          // Saving state
    isModified,        // Has unsaved changes
    error,             // Error message

    // Actions
    load,              // Load existing plan
    create,            // Create new plan
    save,              // Save to database
    reset,             // Clear everything
    revert,            // Undo changes

    // Updates
    updateConditions,  // Update weather/terrain
    updateNutrition,   // Update fueling
    updatePacing,      // Update pace segments
    setOutputs,        // Set simulation results

  } = useRacePlan(planId);

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {plan && (
        <div>
          <h1>{plan.race.name}</h1>
          <p>Distance: {plan.race.distanceKm} km</p>
          <p>Predicted Time: {plan.outputs.predictedTimeFormatted}</p>

          <button onClick={save} disabled={!isModified}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Running Simulations

```typescript
import { runRaceSimulation } from '@/utils/raceSimulationEngine';

// Full simulation (with training data)
const updatedPlan = await runRaceSimulation(plan, {
  useTrainingData: true,
  useWeatherForecast: true,
  usePerformanceFactors: true
});

// Quick simulation (What-If scenarios)
import { runQuickSimulation } from '@/utils/raceSimulationEngine';
const quickResult = await runQuickSimulation(plan);

// Update the plan with results
setOutputs(updatedPlan.outputs);
```

---

## 🎯 Common Tasks

### 1. Create a New Race Plan

```typescript
const { create, save } = useRacePlan();

const newRace = {
  id: 'race-123',
  name: 'Boston Marathon',
  distanceKm: 42.2,
  dateISO: '2025-04-21'
};

await create(newRace, 'race');
await save();
```

### 2. Update Conditions

```typescript
const { updateConditions, save } = useRacePlan(planId);

updateConditions({
  temperature: 25,
  humidity: 60,
  readiness: 85
});

await save();
```

### 3. Add Pacing Segments

```typescript
const { plan, updatePacing, save } = useRacePlan(planId);

const newSegments = [
  { startKm: 0, endKm: 10, targetPace: 5.5 },
  { startKm: 10, endKm: 30, targetPace: 5.3 },
  { startKm: 30, endKm: 42.2, targetPace: 5.6 }
];

updatePacing(newSegments);
await save();
```

### 4. Create What-If Scenario

```typescript
const { plan, updateConditions, createWhatIf } = useRacePlan(raceId);

// Modify conditions
updateConditions({ temperature: 35, humidity: 80 });

// Save as What-If scenario
const whatIfId = await createWhatIf('Hot Weather Test');
```

### 5. Load and Compare

```typescript
// Load original race plan
const { plan: racePlan } = useRacePlan(raceId);

// Load What-If scenario
const { plan: whatIfPlan } = useRacePlan(whatIfId);

// Compare results
const timeDiff = whatIfPlan.outputs.predictedTimeMin -
                 racePlan.outputs.predictedTimeMin;

console.log(`Time difference: ${timeDiff.toFixed(2)} minutes`);
```

---

## 🗄️ Database Operations

### Direct Database Access (if needed)

```typescript
import {
  getRacePlan,
  listRacePlans,
  createRacePlan,
  updateRacePlan,
  deleteRacePlan,
} from '@/lib/racePlanDatabase';

// Get single plan
const plan = await getRacePlan('plan-id');

// List all race plans
const allPlans = await listRacePlans();

// List only What-If scenarios
const whatIfs = await listRacePlans('whatif');

// Get plans for specific race
import { getRacePlansForRace } from '@/lib/racePlanDatabase';
const racePlans = await getRacePlansForRace('race-123');
```

---

## 📋 Type Definitions

```typescript
import type {
  RacePlan,
  RaceReference,
  SimulationInputs,
  SimulationOutputs,
  ConditionsInputs,
  NutritionInputs,
  PacingSegment,
} from '@/types/racePlanV2';

// Use in components
interface MyProps {
  plan: RacePlan;
  onUpdate: (plan: RacePlan) => void;
}
```

---

## ✅ Validation

```typescript
const { validate } = useRacePlan(planId);

const result = validate();

if (!result.valid) {
  console.error('Validation errors:', result.errors);
  // Show errors to user
} else {
  // Safe to save
  await save();
}
```

---

## 🔄 Version Tracking

```typescript
const { plan, createVersion } = useRacePlan(planId);

// Make some changes
updateConditions({ temperature: 30 });

// Save as new version
const newVersionId = await createVersion();

// Load version history
import { getRacePlanHistory } from '@/lib/racePlanDatabase';
const history = await getRacePlanHistory(planId);
```

---

## 🎨 UI Integration

### Display Plan Data

```typescript
function PlanDisplay({ planId }: { planId: string }) {
  const { plan, isLoading } = useRacePlan(planId);

  if (isLoading) return <Spinner />;
  if (!plan) return <div>Plan not found</div>;

  return (
    <div>
      <h1>{plan.race.name}</h1>

      {/* Race Info */}
      <div>
        <p>Distance: {plan.race.distanceKm} km</p>
        <p>Date: {plan.race.dateISO}</p>
      </div>

      {/* Conditions */}
      <div>
        <p>Temperature: {plan.inputs.conditions.temperature}°C</p>
        <p>Humidity: {plan.inputs.conditions.humidity}%</p>
        <p>Readiness: {plan.inputs.conditions.readiness}/100</p>
      </div>

      {/* Results */}
      <div>
        <h2>Predicted Performance</h2>
        <p>Time: {plan.outputs.predictedTimeFormatted}</p>
        <p>Pace: {plan.outputs.paceFormatted} /km</p>
        <p>Confidence: {plan.ui.confidence}</p>
      </div>

      {/* AI Message */}
      <div className="ai-advice">
        {plan.ui.message}
      </div>
    </div>
  );
}
```

### Edit Form

```typescript
function PlanEditor({ planId }: { planId: string }) {
  const {
    plan,
    updateConditions,
    updateNutrition,
    save,
    isModified,
    isSaving
  } = useRacePlan(planId);

  if (!plan) return null;

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await save();
    }}>
      {/* Conditions */}
      <label>
        Temperature (°C):
        <input
          type="number"
          value={plan.inputs.conditions.temperature}
          onChange={(e) => updateConditions({
            temperature: parseFloat(e.target.value)
          })}
        />
      </label>

      {/* Nutrition */}
      <label>
        Fueling Rate (g/hr):
        <input
          type="number"
          value={plan.inputs.nutrition.fuelingRate}
          onChange={(e) => updateNutrition({
            fuelingRate: parseFloat(e.target.value)
          })}
        />
      </label>

      <button
        type="submit"
        disabled={!isModified || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

---

## 🐛 Debugging

### Check Migration Status

```typescript
import { getRacePlanMigrationStatus } from '@/lib/racePlanDatabase';

const status = await getRacePlanMigrationStatus();
console.log(`V1 records: ${status.v1Count}`);
console.log(`V2 records: ${status.v2Count}`);
console.log(`Total: ${status.total}`);
```

### Inspect Plan Structure

```typescript
const { plan } = useRacePlan(planId);

console.log('Race:', plan?.race);
console.log('Inputs:', plan?.inputs);
console.log('Outputs:', plan?.outputs);
console.log('Context:', plan?.context);
console.log('Metadata:', plan?.metadata);
```

---

## 📚 Full Documentation

- **Architecture:** `RACE_PLAN_V2_MIGRATION_GUIDE.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY.md`
- **Type Definitions:** `src/types/racePlanV2.ts`
- **Database API:** `src/lib/racePlanDatabase.ts`
- **React Hook:** `src/hooks/useRacePlanV2.tsx`
- **Simulation Engine:** `src/utils/raceSimulationEngine.ts`

---

## 🆘 Common Issues

### Issue: Plan not loading

```typescript
// Check if planId is valid
const { plan, error } = useRacePlan(planId);
if (error) {
  console.error('Error loading plan:', error);
}
```

### Issue: Save fails validation

```typescript
const { validate, save } = useRacePlan(planId);

const validation = validate();
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
} else {
  await save();
}
```

### Issue: Migration not happening

```typescript
// Manually trigger migration
import { migrateRacePlanToV2 } from '@/lib/racePlanDatabase';
await migrateRacePlanToV2(planId);
```

---

## ✨ Tips & Best Practices

1. **Always validate** before saving
2. **Use TypeScript** for type safety
3. **Handle loading states** in UI
4. **Check isModified** before navigation
5. **Use scenario types** correctly (race vs whatif)
6. **Let the engine** handle calculations
7. **Track versions** for important changes
8. **Test edge cases** with extreme values

---

## 🎓 Next Steps

1. Read `RACE_PLAN_V2_MIGRATION_GUIDE.md` for detailed architecture
2. Check `IMPLEMENTATION_SUMMARY.md` for deployment info
3. Explore type definitions in `src/types/racePlanV2.ts`
4. Review examples in this guide
5. Start building! 🚀
