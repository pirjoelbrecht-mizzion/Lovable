# Adaptive Ultra Training Engine

**Module 1 — Foundation Types & Integration**

## Overview

This module provides the foundational type system for Mizzion's Adaptive Ultra Training Engine, a comprehensive AI-powered coach for ultramarathon training.

## Architecture

```
/src/lib/adaptive-coach/
├── types.ts          - All TypeScript interfaces and types
├── adapters.ts       - Bridge functions to integrate with existing Mizzion types
├── index.ts          - Module exports
└── README.md         - This file
```

## Integration with Existing Mizzion Code

### Type Namespacing

To avoid conflicts with existing types, this module uses distinct naming:

| Adaptive Coach Type | Existing Mizzion Type | Integration |
|---------------------|----------------------|-------------|
| `AthleteProfile` | `UserProfile` (onboarding) | Bridge via `buildAthleteProfile()` |
| `RaceEvent` | `Race` | Bridge via `convertRaceToEvent()` |
| `TrainingPhase` | `MacrocyclePhase` | Parallel system (more granular) |
| `WorkoutType` | `Focus` | Superset (more workout types) |
| `DailyPlan` | `PlanDay` | Compatible structure |
| `WeeklyPlan` | `PlanWeek` | Extended with feedback |

### Usage Examples

#### Convert existing user to athlete profile:

```typescript
import { buildAthleteProfile, convertRaceToEvent } from '@/lib/adaptive-coach';
import { getUserProfile } from '@/lib/userProfile';
import { getAllLogEntries, getRaces } from '@/lib/database';

async function setupAdaptiveCoach(userId: string) {
  const userProfile = await getUserProfile(userId);
  const logEntries = await getAllLogEntries();
  const races = await getRaces();

  const athleteProfile = buildAthleteProfile(userProfile, logEntries, races);
  
  return athleteProfile;
}
```

#### Convert Mizzion race to adaptive coach format:

```typescript
const mizzionRace = { 
  id: "123", 
  name: "Leadville 100", 
  dateISO: "2025-08-16",
  distanceKm: 160.9
};

const raceEvent = convertRaceToEvent(mizzionRace);
// raceEvent.raceType will be "100M"
```

## Database Integration

The adaptive coach will use these existing Mizzion tables:
- `user_profiles` - Base athlete data
- `log_entries` - Training history
- `races` - Race events

And will add new tables (in future migrations):
- `athlete_profiles` - Extended adaptive coach data
- `weekly_plans` - Generated training plans
- `daily_feedback` - Athlete feedback loops
- `adaptations` - History of plan adjustments

## Safety & Constraints

All safety rules are implemented in `types.ts` constants:
- `MAX_WEEKLY_INCREASE_PCT = 10` - Conservative volume progression
- `SAFE_ACWR_RANGE` - Acute:Chronic Workload Ratio bounds
- `TAPER_DURATION_WEEKS` - Race-type specific taper lengths

## Implemented Modules

✅ **Module 1: Types & Adapters** - Foundation type system and integration
✅ **Module 2: Athlete Profiler** - Cat1/Cat2 classification and readiness assessment
✅ **Module 3: Macrocycle Planner** - Long-term phase structure generation
✅ **Module 4: Workout Library** - 25+ comprehensive workout templates
✅ **Module 5: Microcycle Generator** - Intelligent weekly plan creation
✅ **Module 6: Safety System** - Hard constraint enforcement and ACWR monitoring
✅ **Module 7: Adaptive Controller** - AI-driven plan adjustments based on feedback
✅ **Module 8: Race-Specific Logic** - Customized training for 50K, 100K, 100M, 200M, Skimo
✅ **Module 9: Feedback Processing** - Pattern detection and insight generation
✅ **Module 10: Explanation Engine** - Natural language coaching messages

## Usage Examples

### Safety Checks (Module 6)

```typescript
import { checkWeeklyPlanSafety, calculateSafeVolumeRange } from '@/lib/adaptive-coach';

// Check if a weekly plan is safe
const safetyCheck = checkWeeklyPlanSafety(weeklyPlan, athlete, previousWeekMileage);
if (!safetyCheck.passed) {
  console.log('Safety violations:', safetyCheck.violations);
}

// Calculate safe volume range for a phase
const safeRange = calculateSafeVolumeRange(athlete, 'base', 50);
console.log(`Safe range: ${safeRange.min}-${safeRange.max}km, optimal: ${safeRange.optimal}km`);
```

### Adaptive Adjustments (Module 7)

```typescript
import { analyzeFeedbackSignals, makeAdaptationDecision, applyAdaptation } from '@/lib/adaptive-coach';

// Analyze athlete feedback
const signals = analyzeFeedbackSignals(dailyFeedback, athlete);

// Make intelligent adaptation decision
const decision = makeAdaptationDecision(signals, currentPlan, athlete);

// Apply the adaptation
const adaptedPlan = applyAdaptation(currentPlan, decision, athlete);
```

### Race-Specific Training (Module 8)

```typescript
import { getRaceRequirements, validateRaceReadiness } from '@/lib/adaptive-coach';

// Get requirements for a specific race
const requirements = getRaceRequirements(race);
console.log(`Need ${requirements.optimalWeeks} weeks, back-to-back: ${requirements.backToBackRequired}`);

// Validate athlete readiness
const readiness = validateRaceReadiness(race, athlete, weeksTrained);
if (!readiness.ready) {
  console.log('Training gaps:', readiness.gaps);
}
```

### Feedback Analysis (Module 9)

```typescript
import { processDailyFeedback } from '@/lib/adaptive-coach';

// Process and analyze feedback
const summary = processDailyFeedback(dailyFeedback, athlete);
console.log(`Overall score: ${summary.overallScore}/100`);
console.log(`Risk level: ${summary.riskLevel}`);
console.log(`Ready for progression: ${summary.readyForProgression}`);
```

### Coaching Explanations (Module 10)

```typescript
import { explainWeeklyPlan, explainAdaptation, explainRaceStrategy } from '@/lib/adaptive-coach';

// Generate weekly plan explanation
const explanation = explainWeeklyPlan(plan, athlete, race, weeksToRace);
console.log(explanation.title);
console.log(explanation.body);

// Explain why an adaptation was made
const adaptExplain = explainAdaptation(decision, athlete, originalPlan);

// Generate race strategy advice
const strategy = explainRaceStrategy(race, athlete);
```

## Testing

Run the comprehensive test suite:

```bash
# Test modules 1-5 (foundation)
npx tsx test-adaptive-coach.ts

# Test modules 6-10 (advanced features)
npx tsx test-adaptive-coach-advanced.ts
```

## Philosophy

The adaptive coach follows these principles:

1. **Athlete-First**: Always prioritize health and injury prevention
2. **Responsive**: Adapt daily/weekly based on feedback
3. **Transparent**: Explain every adjustment
4. **Scientific**: Based on proven periodization and training science
5. **Flexible**: Allow manual overrides with warnings
6. **Progressive**: Build fitness gradually and safely

## License

Part of Mizzion — Ultramarathon Training Platform
