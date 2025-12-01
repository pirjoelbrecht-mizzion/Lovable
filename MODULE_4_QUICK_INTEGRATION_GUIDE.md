# Module 4: Adaptive Decision Engine - Quick Integration Guide

## What is Module 4?

Module 4 is the **"brain"** of the adaptive training coach. It takes ALL learning signals (ACWR, climate, motivation, races, terrain, history) and produces ONE cohesive training recommendation with complete transparency.

## 🎯 Quick Start (5 minutes)

### 1. Use in Any Component

```typescript
import { useAdaptiveDecisionEngine } from '@/hooks/useAdaptiveDecisionEngine';
import TrainingAdjustmentExplanation from '@/components/TrainingAdjustmentExplanation';

function MyComponent() {
  const { decision, computeAndApplyDecision, isLoading } = useAdaptiveDecisionEngine();

  const handleOptimizeWeek = async () => {
    // Build context from your app state
    const context = {
      athlete: currentAthleteProfile,
      plan: weeklyTrainingPlan,
      acwr: { current: 1.4, projected: 1.5, trend: 'rising', riskLevel: 'moderate' },
      climate: { wbgt: 26, level: 'yellow', currentTemp: 28, humidity: 60 },
      motivation: { archetype: 'performer', confidence: 0.85, recentEngagement: 0.9 },
      races: { mainRace, nextRace, daysToMainRace: 30 },
      history: { completionRate: 0.9, averageFatigue: 5, missedWorkouts: 0 },
      location: { terrainType: 'road', currentElevation: 100 }
    };

    // Compute and apply adjustments
    await computeAndApplyDecision(context);
  };

  return (
    <>
      <button onClick={handleOptimizeWeek} disabled={isLoading}>
        Optimize This Week
      </button>

      {decision && <TrainingAdjustmentExplanation decision={decision} />}
    </>
  );
}
```

### 2. Show Latest Decision Anywhere

```typescript
import { useLatestDecision } from '@/hooks/useAdaptiveDecisionEngine';
import TrainingAdjustmentExplanation from '@/components/TrainingAdjustmentExplanation';

function DashboardWidget() {
  const { decision, isLoading } = useLatestDecision();

  if (isLoading) return <div>Loading...</div>;
  if (!decision) return null;

  return <TrainingAdjustmentExplanation decision={decision} expanded={false} />;
}
```

### 3. Show Analytics Dashboard

```typescript
import { useDecisionStats } from '@/hooks/useAdaptiveDecisionEngine';

function AnalyticsDashboard() {
  const { stats, safetyOverrideCount, isLoading } = useDecisionStats(30);

  if (isLoading || !stats) return <div>Loading stats...</div>;

  return (
    <div>
      <h3>Last 30 Days</h3>
      <p>Total Decisions: {stats.totalDecisions}</p>
      <p>Safety Overrides: {safetyOverrideCount}</p>
      <p>Avg Confidence: {Math.round(stats.averageConfidence * 100)}%</p>
      <p>Most Active Layer: {stats.mostCommonLayer}</p>
    </div>
  );
}
```

## 🔧 How It Works

### The 4 Adjustment Layers

**Priority order (higher number = higher priority):**

1. **Race Priority (Priority 3)** - Taper logic for upcoming races
   - A-races: Full taper (2-7 days)
   - B-races: Micro-taper
   - C-races: Guidance only

2. **ACWR Guardrail (Priority 5)** ⚠️ SAFETY CRITICAL
   - ACWR ≥2.2: Replace all intensity → easy runs
   - ACWR ≥2.0: Remove intensity, reduce long run
   - ACWR ≥1.85: Convert high → moderate intensity
   - ACWR ≥1.65: Cap volume increases

3. **Climate Adjustment (Priority 4)** ⚠️ SAFETY CRITICAL
   - Green (WBGT <25°C): Safe
   - Yellow (25-28°C): Reduce intensity 5-7%
   - Orange (28-31°C): Intervals → tempo
   - Red (31-34°C): Easy runs only, indoor recommended
   - Black (≥34°C): UNSAFE - prohibit outdoor running

4. **Motivation Integration (Priority 1)** - Personalized messaging
   - Performer: Metrics and targets focus
   - Adventurer: Exploration emphasis
   - Mindful: Balance and awareness
   - Health: Consistency and habits
   - Transformer: Growth and progress
   - Connector: Community and social

### Conflict Resolution

When layers conflict:
- Safety overrides (ACWR, Climate) ALWAYS win
- Higher priority takes precedence
- All conflicts are logged and explained
- User sees clear reasoning for final decision

## 📊 What Gets Logged

Every decision logs:
- ✅ Original plan
- ✅ Modified plan
- ✅ All adjustment layers with reasoning
- ✅ Individual changes (field-by-field)
- ✅ Safety flags
- ✅ Warnings
- ✅ Confidence score
- ✅ Complete context snapshot
- ✅ Timestamp

## 🎨 UI Components

### TrainingAdjustmentExplanation
Shows transparent reasoning for training changes:
- **Compact mode:** Badge with "X adjustments made by AI coach"
- **Expanded mode:** Full breakdown with sections for:
  - Safety overrides (red)
  - Applied adjustments (blue)
  - Coach's reasoning
  - Important warnings
  - Confidence badge

### AdaptiveDecisionEngineDemo
Full demo showing:
- How to compute decisions
- Analytics dashboard
- Decision history viewer
- Integration examples

## 🔐 Security

All tables use Row Level Security (RLS):
- Users can only access their own decisions
- Authenticated users only
- Complete audit trail
- No data leakage between users

## 📁 File Structure

```
src/
├── engine/
│   ├── index.ts                           # Main exports
│   ├── adaptiveDecisionEngine.ts          # Core brain (4 layers)
│   ├── athleteIntelligenceProfile.ts      # Unified profile
│   └── adaptiveDecisionDatabase.ts        # DB helpers
├── hooks/
│   └── useAdaptiveDecisionEngine.ts       # React hooks (3 variants)
└── components/
    ├── TrainingAdjustmentExplanation.tsx  # Transparency UI
    └── AdaptiveDecisionEngineDemo.tsx     # Full demo

supabase/migrations/
└── 20251118200000_create_adaptive_decision_engine_tables.sql
```

## 🚀 Integration Points

### Planner Page
When generating weekly plan, run ADE to optimize:
```typescript
const optimizedDecision = await computeAndApplyDecision(buildContext());
setWeeklyPlan(optimizedDecision.modifiedPlan);
```

### Dashboard
Show latest decision summary:
```typescript
const { decision } = useLatestDecision();
```

### Settings/Profile
Show safety override history:
```typescript
const { safetyOverrideCount } = useDecisionStats(14);
if (safetyOverrideCount > 5) {
  // Alert: You may be overtraining
}
```

### Training Log
After completing workout, recompute for next week:
```typescript
await computeAndApplyDecision(updatedContext);
```

## 🎯 Example Scenarios

### Scenario: High ACWR + Hot Weather
```
Input: ACWR 2.1, WBGT 30°C, Plan has intervals
Output: All workouts → easy runs (ACWR override wins)
Reasoning: "ACWR at 2.10 (extreme). All intensity replaced."
```

### Scenario: Approaching A-Race
```
Input: 5 days to Ultra 100K
Output: Volume reduced 40% across all workouts
Reasoning: "Full taper for Desert Ultra 100K in 5 days."
```

### Scenario: Normal Training
```
Input: Safe ACWR, good weather, no races
Output: Only motivation layer applies (tone adjustments)
Reasoning: "Training personalized for performer archetype."
```

## ✅ Status

Module 4 is **COMPLETE** and ready for integration:
- ✅ Core engine implemented
- ✅ Database schema deployed
- ✅ React hooks ready
- ✅ UI components built
- ✅ Full documentation
- ✅ Build passing

## 📚 Full Documentation

See `MODULE_4_ADAPTIVE_DECISION_ENGINE_COMPLETE.md` for:
- Complete API reference
- Detailed architecture
- All interfaces and types
- Database schema details
- Advanced usage patterns
