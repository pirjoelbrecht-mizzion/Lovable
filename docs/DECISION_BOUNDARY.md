# Decision Boundary — Training Plan Adjustments

## Primary Statement

**All adaptive weekly training plan adjustments in Mizzion flow through `adjustWeeklyTrainingDecision`.**

---

## Scope

### ✅ What This Covers

- **Adaptive adjustments to existing weekly training plans**
  - Volume modifications based on ACWR
  - Intensity changes based on climate/heat stress
  - Rest day insertions for safety
  - Workout substitutions based on motivation
  - Race week taper adjustments
  - Multi-layer conflict resolution

### ❌ What This Does NOT Cover

- **Initial weekly plan generation** (handled by `generateMicrocycle` and `generateMaintenancePlan`)
- **Workout execution tracking** (handled by workout completion services)
- **Race day simulations** (handled by race simulation engine)
- **Long-term season planning** (handled by macrocycle planner)

---

## Function Signature

```typescript
function adjustWeeklyTrainingDecision(
  context: AdaptiveContext
): AdaptiveDecision
```

---

## Inputs Required

### `AdaptiveContext` Contains:

1. **Athlete Profile**
   - Experience level (Cat1/Cat2)
   - Fitness metrics (VO2max, threshold pace, weekly mileage)
   - Injury history
   - Training constraints (rest days, available days per week)

2. **Current Weekly Plan**
   - 7 days of training sessions
   - Target mileage and vertical gain
   - Existing workout structure

3. **ACWR (Acute:Chronic Workload Ratio)**
   - Current ratio
   - Projected ratio
   - Trend (rising/stable/falling)
   - Risk level (low/moderate/high/extreme)

4. **Climate & Environment**
   - Temperature, humidity, heat index
   - WBGT (Wet Bulb Globe Temperature)
   - Safety level (green/yellow/orange/red/black)
   - Current conditions

5. **Motivation Data**
   - Archetype (Achiever/Explorer/Warrior/Sage)
   - Confidence score
   - Recent engagement rate

6. **Race Calendar**
   - Main race details (if any)
   - Days to main race
   - All upcoming races

7. **Training History**
   - Completion rate (last 4 weeks)
   - Average fatigue level
   - Missed workouts (last 2 weeks)
   - Last hard workout (days ago)

8. **Location Data**
   - Current location
   - Available routes
   - Terrain preferences

---

## Output Guarantees

### `AdaptiveDecision` Contains:

1. **Original Plan** — Unmodified input plan for comparison
2. **Modified Plan** — Adjusted 7-day weekly plan
3. **Adjustment Layers** — Applied modifications (race priority, ACWR, climate, motivation)
4. **Final Reasoning** — Human-readable explanation of adjustments
5. **Safety Flags** — Any safety overrides triggered
6. **Warnings** — Risk alerts (injury, overtraining, etc.)
7. **Applied At** — Timestamp of decision
8. **Confidence Score** — System confidence (0-1)

### Invariants:

- Modified plan always has exactly 7 days
- Session count per day is preserved (no sessions added/removed)
- Session origins (user vs system) are preserved
- Safety constraints are never violated

---

## Responsibilities

### This Function IS Responsible For:

✅ Evaluating all input signals (ACWR, climate, motivation, races)
✅ Applying 4 decision layers in sequence (race → ACWR → climate → motivation)
✅ Resolving conflicts between layers
✅ Inserting race day workouts during race week
✅ Enforcing safety guardrails
✅ Generating human-readable explanations
✅ Calculating confidence scores

### This Function is NOT Responsible For:

❌ Building the adaptive context (handled by `buildAdaptiveContext`)
❌ Storing decisions in database (handled by `logAdaptiveDecision`)
❌ Converting between plan formats (handled by `convertToLocalStoragePlan`)
❌ Locking execution state (handled by `adaptiveExecutionLock`)
❌ Generating initial plans (handled by microcycle/maintenance generators)

---

## Current Entry Point Location

**File:** `/src/engine/decisionFacade.ts`
**Function:** `adjustWeeklyTrainingDecision`
**Delegates to:** `computeTrainingAdjustment` in `/src/engine/adaptiveDecisionEngine.ts`

---

## Architecture Note

This facade serves as the **explicit API boundary** for weekly training adjustments. The underlying implementation (`computeTrainingAdjustment`) may evolve, but this entry point remains stable.

**Initial Plan Generation** (out of scope) currently uses:
- `generateMicrocycle()` — When race goal exists
- `generateMaintenancePlan()` — When no race goal

These may be unified under a separate facade in the future.

---

## Current Callers

### Direct Callers of Decision Engine:

1. **File:** `src/hooks/useAdaptiveTrainingPlan.ts` (line 163)
   - **Function:** `execute()`
   - **Purpose:** Main orchestration hook for automatic weekly plan adjustment
   - **Uses:** `computeTrainingAdjustment` directly

2. **File:** `src/hooks/useAdaptiveDecisionEngine.ts` (line 71)
   - **Function:** `computeAndApplyDecision()`
   - **Purpose:** Lighter-weight hook for UI demos and analytics
   - **Uses:** `computeTrainingAdjustment` directly

### Consumers of These Hooks:

3. **File:** `src/pages/Quest.tsx`
   - **Uses:** `useAdaptiveTrainingPlan`
   - **Purpose:** Main weekly training view page

4. **File:** `src/components/AdaptiveCoachPanel.tsx`
   - **Uses:** `useAdaptiveTrainingPlan`
   - **Purpose:** Adaptive coaching panel UI

5. **File:** `src/components/AdaptiveDecisionEngineDemo.tsx`
   - **Uses:** `useAdaptiveDecisionEngine`
   - **Purpose:** Demo/debug component

### Type-Only Imports:

6. **File:** `src/components/TrainingAdjustmentExplanation.tsx`
7. **File:** `src/components/AdaptiveDecisionExplanation.tsx`

---

## Last Updated

2026-01-04
