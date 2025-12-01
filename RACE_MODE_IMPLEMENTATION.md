# Race Mode Simulation - Implementation Summary

## Overview
Implemented the **Race Mode Simulation** feature - the highest-impact addition to the Mizzion platform. This feature combines training data, readiness metrics, and race characteristics to predict performance and provide actionable pacing strategies.

## What Was Built

### 1. Readiness Score Calculator (`src/utils/readiness.ts`)
**Phase 1: Automatic Core**

Calculates a 0-100 daily readiness score using:
- **Recovery Index (35%)**: Based on acute/chronic load ratio (ACWR)
- **Freshness Factor (25%)**: Days since last hard workout (exponential decay)
- **Sleep Modifier (15%)**: Manual input or default 7.5 hours
- **HRV Factor (15%)**: Optional heart rate variability data
- **Fatigue Modifier (10%)**: Manual perceived fatigue or calculated

**Features:**
- Automatic calculation from training load data
- Manual input support for sleep and fatigue
- Category classification (high/moderate/low)
- Personalized messaging based on score
- Local caching for performance

### 2. Race Simulation Engine (`src/utils/raceSimulation.ts`)
**Core Prediction Algorithm**

Uses the Riegel formula with multiple adjustment factors:
```
predictedTime = baseTime × (targetDistance / baseDistance)^1.06 × 
                terrainFactor × elevationFactor × climateFactor × fatiguePenalty
```

**Adjustment Factors:**
- **Terrain**: 1.12x for trail, 1.06x for mixed, 1.0x for road
- **Elevation**: 1.0-1.15x based on meters per kilometer
- **Climate**: 1.05x for hot/humid, 1.0x for ideal conditions
- **Fatigue**: Based on current readiness score

**Advanced Features:**
- Kilometer-by-kilometer pace breakdown
- Cumulative fatigue modeling (exponential for ultras)
- HR zone predictions with drift
- Confidence scoring (high/medium/low)
- Baseline detection from recent races/runs

### 3. React Hooks
**`useReadinessScore` Hook**
- Fetches/calculates readiness for any date
- Caches results locally
- Provides loading/error states
- Auto-recalculates on mount

**`useRaceSimulation` Hook**
- Simulates race for given ID or next priority race
- Integrates readiness, training stats, and race factors
- Returns full simulation with pacing strategy
- Handles A/B priority race selection

### 4. Race Mode UI (`src/pages/RaceMode.tsx`)
**Main Dashboard Sections:**

1. **Header Card**
   - Race selector dropdown
   - Auto-selects next A or B priority race

2. **Main Prediction Card**
   - Large predicted time display
   - Confidence badge (high/medium/low)
   - Readiness score indicator
   - Personalized message

3. **Simulation Factors (Collapsible)**
   - Terrain, elevation, climate, fatigue factors
   - Color-coded warnings
   - Surface and elevation details

4. **Pacing Strategy Table (Collapsible)**
   - Per-kilometer pace projections
   - HR zone predictions
   - Fatigue accumulation bars
   - First 20 segments displayed

5. **Race Day Tips**
   - Dynamic advice based on conditions
   - Fueling recommendations
   - HR monitoring guidelines
   - Terrain-specific tips

### 5. Database Integration
**New Supabase Tables:**

**race_simulations**
- Stores simulation history
- Tracks prediction accuracy
- Links to races and users
- Full factor breakdown

**readiness_scores**
- Daily readiness tracking
- Component breakdown storage
- Manual input support
- Multi-source compatibility (manual/garmin/oura/etc)

**Row Level Security:** All tables protected with user-scoped policies

## How It Works

### User Flow
1. User navigates to `/race-mode`
2. System auto-selects next A or B priority race
3. Fetches last 8 weeks of training data
4. Calculates current readiness score
5. Applies terrain, elevation, and climate factors
6. Generates prediction with confidence level
7. Displays pacing strategy and race tips

### Data Flow
```
Training History (8 weeks)
         │
         ├──> Training Stats (pace, distance, fitness)
         │
         ▼
Readiness Calculator
         │
         ├──> Acute/Chronic Load
         ├──> Freshness (days since hard run)
         ├──> Sleep/Fatigue inputs
         │
         ▼
Race Simulation Engine
         │
         ├──> Baseline race detection
         ├──> Riegel prediction
         ├──> Factor adjustments
         ├──> Pace breakdown
         │
         ▼
Race Mode UI
```

### Confidence Scoring
Combines three factors:
- **Time to Race**: Optimal at 4-16 weeks
- **Fitness Level**: Based on weekly volume
- **Readiness**: Current recovery state

Thresholds:
- **High**: 75%+ overall score
- **Medium**: 50-75% overall score  
- **Low**: <50% overall score

## Key Features

### Automatic Intelligence
- No manual setup required
- Works with existing training data
- Learns from logged runs and races
- Adapts to current fitness level

### Race-Specific Adjustments
- Trail vs road surface handling
- Elevation gain penalties
- Climate/weather factors
- Distance-appropriate fatigue modeling

### Actionable Insights
- Clear time predictions
- Segment-by-segment pacing
- HR zone guidance
- Fueling recommendations
- Confidence indicators

### Future-Proof Design
- Ready for wearable integrations (Garmin, Oura, Coros)
- Supports manual health inputs
- Stores simulation history for accuracy tracking
- What-if scenario foundation (coming next)

## Integration Points

### Existing Features Used
- Race calendar (priority A/B/C)
- Training load analysis (ACWR)
- Race projection utilities (Riegel)
- Log entries database
- Fitness calculator

### New Routes Added
- `/race-mode` - Main simulation dashboard

### Database Schema
- 2 new tables with RLS
- Automatic timestamp triggers
- User-scoped queries
- History tracking

## Technical Highlights

### Performance Optimizations
- Local caching of readiness scores
- Efficient database queries
- Lazy loading of pace breakdowns
- Collapsible sections to reduce initial render

### Error Handling
- Graceful fallbacks for missing data
- Default values for incomplete profiles
- Clear error messages
- Loading states throughout

### Type Safety
- Full TypeScript coverage
- Exported types for extensibility
- Strict null checking
- Validated enums

## Next Steps (Future Enhancements)

### Phase 2: What-If Simulator
- Temperature/humidity overrides
- Custom elevation profiles
- Readiness adjustments
- Side-by-side scenario comparison

### Phase 3: Readiness Dashboard
- Daily readiness gauge on home page
- 7-day trend sparkline
- Manual input sliders
- Integration with coach AI

### Phase 4: Wearable Sync
- Garmin Connect integration
- Oura Ring sync
- Auto-populate HRV and sleep
- Real-time readiness updates

### Phase 5: Advanced Analytics
- Prediction accuracy tracking
- Historical simulation comparison
- VO2max estimation
- HR drift analysis

## Usage Example

```typescript
// Get current race simulation
const { simulation, loading } = useRaceSimulation();

// Get readiness score
const { readiness } = useReadinessScore();

// Manual readiness input
saveManualReadinessInputs('2024-11-07', {
  sleepHours: 8,
  fatigueLevel: 3,
});

// Simulate specific race
const { simulation } = useRaceSimulation('race-id-123');
```

## Files Created/Modified

**New Files:**
- `src/utils/readiness.ts`
- `src/utils/raceSimulation.ts`
- `src/hooks/useReadinessScore.ts`
- `src/hooks/useRaceSimulation.ts`
- `src/pages/RaceMode.tsx`
- `supabase/migrations/[timestamp]_add_race_simulation_tables.sql`

**Modified Files:**
- `src/main.tsx` - Added RaceMode route
- `src/lib/database.ts` - Added simulation database helpers

## Testing Recommendations

1. Add a future race with A priority
2. Log some training runs (varied distances/paces)
3. Navigate to `/race-mode`
4. Verify prediction appears
5. Expand factors and pacing sections
6. Test race selector dropdown
7. Try with different race distances
8. Verify readiness score calculation

## Success Metrics

- Users spend 2+ minutes on Race Mode
- 70%+ confidence predictions generated
- Race simulations saved to database
- Users reference pacing table during races
- Prediction accuracy improves over time
