# Module 4: Adaptive Decision Engine - COMPLETE

## Overview

Module 4 implements the **Adaptive Decision Engine (ADE)** - the "brain" of the entire training system. This is the most critical module as it integrates ALL existing learning systems into one unified intelligence that makes cohesive training recommendations.

## What Was Built

### 1. Core Adaptive Decision Engine (`src/engine/adaptiveDecisionEngine.ts`)

The central intelligence system that orchestrates all adjustment layers:

- **Layer 1: Race Priority Resolver** - Modifies training structure based on upcoming races with intelligent taper logic
- **Layer 2: ACWR Volume Guardrail** - Safety-critical system that prevents overtraining (ACWR thresholds)
- **Layer 3: Climate Adjustment Engine** - Heat stress adaptations using WBGT (Wet Bulb Globe Temperature)
- **Layer 4: Motivation Integration** - Personalizes training tone and messaging based on athlete archetype

**Key Features:**
- Layered priority system (safety overrides always win)
- Conflict resolution with transparent reasoning
- Complete audit trail of every decision
- Confidence scoring for each decision
- Safety flags and warnings system

**Example Usage:**
```typescript
import { computeTrainingAdjustment } from '@/engine';

const decision = computeTrainingAdjustment({
  athlete: athleteProfile,
  plan: weeklyPlan,
  acwr: { current: 1.85, projected: 1.9, trend: 'rising', riskLevel: 'high' },
  climate: { wbgt: 29, level: 'orange', currentTemp: 32, humidity: 75 },
  motivation: { archetype: 'performer', confidence: 0.85 },
  races: { mainRace, nextRace, daysToMainRace: 27 },
  history: { completionRate: 0.85, averageFatigue: 6.5 },
  location: { terrainType: 'mixed', currentElevation: 1200 }
});
```

### 2. Unified Athlete Intelligence Profile (`src/engine/athleteIntelligenceProfile.ts`)

Single source of truth for all athlete learning state:

**Consolidates:**
- Classification data (Cat1/Cat2, volume ceiling)
- ACWR risk levels and personalized zones
- Climate tolerance and heat adaptation
- Motivation archetype and engagement
- Terrain affinity (road/trail/mountain)
- Race focus and historical performance
- Injury history and recovery capacity
- Training age vs chronological age

**Key Functions:**
```typescript
// Build complete profile from all systems
const profile = await buildAthleteIntelligenceProfile(userId);

// Save to database
await saveAthleteIntelligenceProfile(profile);

// Retrieve cached profile
const cached = await getAthleteIntelligenceProfile(userId);

// Force refresh from all sources
const fresh = await refreshAthleteIntelligenceProfile(userId);
```

### 3. Database Schema (`supabase/migrations/20251118200000_create_adaptive_decision_engine_tables.sql`)

Three core tables with full RLS security:

**athlete_intelligence_profile:**
- Stores complete unified athlete profile (JSONB)
- One record per user
- Tracks completeness score
- Auto-updated timestamps

**adaptive_decisions:**
- Logs every decision made by ADE
- Stores original + modified plans
- Records confidence, reasoning, safety flags
- Indexed by user, date, confidence

**adjustment_layers:**
- Detailed breakdown of each adjustment layer
- Links to parent decision
- Tracks priority, safety overrides, changes
- Complete audit trail

**Helper Functions:**
- `get_latest_adaptive_decision(user_id)` - Fetch most recent decision
- `get_adaptive_decision_history(user_id, limit)` - Get decision history with stats
- `count_recent_safety_overrides(user_id, days)` - Count safety interventions

### 4. Database Helpers (`src/engine/adaptiveDecisionDatabase.ts`)

TypeScript functions for all database operations:

```typescript
// Log a decision
await logAdaptiveDecision(userId, decision, context);

// Retrieve decisions
const latest = await getLatestAdaptiveDecision(userId);
const history = await getAdaptiveDecisionHistory(userId, 10);

// Analytics
const stats = await getAdaptiveDecisionStats(userId, 30);
const overrideCount = await countRecentSafetyOverrides(userId, 14);
```

### 5. React Hooks (`src/hooks/useAdaptiveDecisionEngine.ts`)

Three specialized hooks for React integration:

**Full-Featured Hook:**
```typescript
const {
  decision,
  isLoading,
  error,
  computeAndApplyDecision,
  refreshLatestDecision,
  history,
  loadHistory,
  stats,
  safetyOverrideCount,
  loadStats
} = useAdaptiveDecisionEngine();
```

**Lightweight Hook (just latest decision):**
```typescript
const { decision, isLoading, refresh } = useLatestDecision();
```

**Stats Hook (analytics only):**
```typescript
const { stats, safetyOverrideCount, refresh } = useDecisionStats(30);
```

### 6. Transparent UI Component (`src/components/TrainingAdjustmentExplanation.tsx`)

Complete transparency component showing:
- Safety overrides and flags
- Applied adjustment layers with reasoning
- Individual changes (volume, intensity, type, notes)
- Final reasoning summary
- Warnings and important notes
- Confidence score
- Timestamp

**Two views:**
- **Compact:** Summary badge showing number of adjustments
- **Expanded:** Full detailed breakdown with color-coded sections

### 7. Demo/Integration Component (`src/components/AdaptiveDecisionEngineDemo.tsx`)

Complete working example showing:
- How to build AdaptiveContext
- How to trigger ADE computation
- Display of latest decision
- Decision history viewer
- Analytics dashboard with stats
- Layer application rate charts

## Integration with Existing Systems

The ADE integrates with ALL existing learning modules:

### From `adaptive-coach` system:
- Athlete classification (Cat1/Cat2)
- Periodization phases
- Workout library
- Safety constraints

### From `motivation` system:
- Archetype detection
- Personalized messaging
- Engagement tracking

### From `training intelligence`:
- ACWR calculation
- Load management
- Injury risk prediction

### From `climate performance`:
- Heat stress modeling
- WBGT calculations
- Performance derating

### From `race planning`:
- Taper logic
- Priority-based adjustments
- Peak management

### From `route intelligence`:
- Terrain affinity
- Elevation adaptation
- Location-based modifications

## Decision Flow

```
1. Gather Context
   ├─ Athlete Profile (classification, capacity)
   ├─ Current Plan (weekly structure)
   ├─ ACWR Data (load management)
   ├─ Climate Data (heat, humidity, WBGT)
   ├─ Motivation Data (archetype, engagement)
   ├─ Race Calendar (upcoming events)
   ├─ Training History (completion, fatigue)
   └─ Location Data (terrain, elevation)

2. Apply Adjustment Layers (in priority order)
   ├─ Layer 1: Race Priority (taper logic)
   ├─ Layer 2: ACWR Guardrail (safety limits) [SAFETY OVERRIDE]
   ├─ Layer 3: Climate Adjustment (heat modifications) [SAFETY OVERRIDE]
   └─ Layer 4: Motivation Integration (tone/messaging)

3. Resolve Conflicts
   ├─ Safety overrides always win
   ├─ Higher priority layers take precedence
   └─ Generate conflict warnings

4. Generate Decision
   ├─ Modified plan with all changes applied
   ├─ Complete reasoning for every change
   ├─ Safety flags for critical interventions
   ├─ Warnings for athlete awareness
   └─ Confidence score (0-1)

5. Log to Database
   ├─ Store original + modified plans
   ├─ Record all adjustment layers
   ├─ Save complete context snapshot
   └─ Track for future learning

6. Display Transparency
   ├─ Show all applied changes
   ├─ Explain reasoning for each
   ├─ Highlight safety overrides
   └─ Provide actionable warnings
```

## Safety Systems

The ADE implements multiple safety layers:

### ACWR Guardrails:
- **Extreme (≥2.2):** Replace ALL intensity with easy runs (safety override)
- **Very High (≥2.0):** Remove intensity, reduce long run 30% (safety override)
- **High (≥1.85):** Convert high-intensity to moderate
- **Moderate (≥1.65):** Cap volume increases

### Climate Safety:
- **Green (WBGT <25°C):** Safe, hydration tips only
- **Yellow (25-28°C):** Reduce intensity 5-7%, increase hydration
- **Orange (28-31°C):** Convert intervals→tempo, reduce 15% (safety override)
- **Red (31-34°C):** Downgrade to easy, indoor only (safety override)
- **Black (≥34°C):** UNSAFE - prohibit outdoor running (safety override)

### Race Taper Logic:
- **A-races:** Full taper (2-7 days depending on distance)
- **B-races:** Micro-taper for long distances (15% reduction)
- **C-races:** Guidance only, no volume changes

## Example Scenarios

### Scenario 1: High ACWR + Hot Weather
**Input:**
- ACWR: 2.1 (extreme)
- WBGT: 30°C (orange)
- Plan: Intervals + Tempo this week

**ADE Decision:**
1. ACWR Layer triggers safety override → Replace intervals/tempo with easy
2. Climate Layer sees orange level → Reduce intensity further
3. Conflict: Both want to modify intensity
4. Resolution: ACWR wins (higher priority 5 vs 4)
5. Final: All workouts become easy recovery runs + heat safety warnings

**Reasoning:**
- "ACWR at 2.10 (extreme risk). All hard sessions replaced with easy runs."
- "High heat stress (WBGT 30.0°C). Early morning training recommended."

### Scenario 2: Approaching A-Race
**Input:**
- Days to A-race: 5 days
- Race: Ultra 100K
- Plan: Normal training week

**ADE Decision:**
1. Race Layer identifies taper window (7 days for ultra)
2. Reduces all volumes by 40%
3. Adds race-specific preparation notes
4. No conflicts with other layers

**Reasoning:**
- "Full taper for A-race Desert Ultra 100K in 5 days. Volume reduced 40%."

### Scenario 3: Performer Archetype + Base Training
**Input:**
- Archetype: Performer (high confidence)
- No upcoming races
- Normal ACWR, safe climate

**ADE Decision:**
1. Only Motivation Layer applies
2. Enhances workout notes with performance-focused language
3. Adds metrics and targets emphasis

**Reasoning:**
- "Training personalized for performer archetype with appropriate messaging tone"

## Analytics & Insights

The system tracks:
- **Total Decisions:** How many times ADE has been invoked
- **Safety Override Rate:** Frequency of safety interventions
- **Average Confidence:** How certain the system is about decisions
- **Layer Application Rates:** Which layers activate most often
- **Conflict Patterns:** When/why layers disagree

This data enables:
- Understanding athlete patterns
- Identifying chronic issues (frequent safety overrides = overtraining)
- Refining adjustment algorithms
- Improving confidence calibration

## API Reference

### Core Functions

```typescript
// Compute decision
computeTrainingAdjustment(context: AdaptiveContext): AdaptiveDecision

// Build intelligence profile
buildAthleteIntelligenceProfile(userId: string): Promise<AthleteIntelligenceProfile>

// Database operations
logAdaptiveDecision(userId: string, decision: AdaptiveDecision, context: AdaptiveContext): Promise<boolean>
getLatestAdaptiveDecision(userId?: string): Promise<AdaptiveDecision | null>
getAdaptiveDecisionHistory(userId?: string, limit?: number): Promise<DecisionHistorySummary[]>
getAdaptiveDecisionStats(userId?: string, days?: number): Promise<DecisionStats>
```

### React Hooks

```typescript
useAdaptiveDecisionEngine(): UseAdaptiveDecisionEngineResult
useLatestDecision(): UseLatestDecisionResult
useDecisionStats(days?: number): UseDecisionStatsResult
```

## Next Steps

To fully activate Module 4:

1. **Run Database Migration:**
   ```bash
   # Migration already created at:
   # supabase/migrations/20251118200000_create_adaptive_decision_engine_tables.sql
   ```

2. **Integrate into Planner Page:**
   ```typescript
   import { useAdaptiveDecisionEngine } from '@/hooks/useAdaptiveDecisionEngine';

   // In component:
   const { computeAndApplyDecision } = useAdaptiveDecisionEngine();

   // When generating weekly plan:
   const decision = await computeAndApplyDecision(buildContext());
   ```

3. **Add to Training Dashboard:**
   ```typescript
   import { useLatestDecision } from '@/hooks/useAdaptiveDecisionEngine';
   import TrainingAdjustmentExplanation from '@/components/TrainingAdjustmentExplanation';

   const { decision } = useLatestDecision();

   {decision && <TrainingAdjustmentExplanation decision={decision} />}
   ```

4. **Show Analytics:**
   ```typescript
   import { useDecisionStats } from '@/hooks/useAdaptiveDecisionEngine';

   const { stats, safetyOverrideCount } = useDecisionStats(30);
   ```

## Success Metrics

Module 4 is successful when:
- ✅ All adjustment layers integrate seamlessly
- ✅ Safety overrides prevent injuries (ACWR, climate)
- ✅ Athletes understand WHY training changed
- ✅ Conflicts resolve intelligently
- ✅ System confidence improves over time
- ✅ Analytics reveal useful patterns

## Architecture Highlights

**Separation of Concerns:**
- Engine (pure computation) separate from database (persistence)
- Hooks (React integration) separate from core logic
- UI (presentation) separate from business logic

**Type Safety:**
- Full TypeScript coverage
- Strict interfaces for all data structures
- Type-safe database operations

**Transparency:**
- Every decision logged with complete context
- Full audit trail of changes
- Clear reasoning for every modification

**Safety First:**
- Safety overrides always prioritized
- Multiple safety layers (ACWR, climate, race)
- Warning system for athlete awareness

## Status: ✅ COMPLETE

Module 4 - Adaptive Decision Engine is now fully implemented and ready for integration.

All components:
- ✅ Core engine with 4 adjustment layers
- ✅ Unified athlete intelligence profile
- ✅ Database schema with RLS security
- ✅ Database helper functions
- ✅ React hooks (full, lite, stats)
- ✅ Transparent UI component
- ✅ Demo/integration component
- ✅ Complete documentation

The "brain" of the adaptive coach is operational and ready to make intelligent, safe, transparent training decisions.
