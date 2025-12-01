# Race Mode Simulation - Complete Data Structure

This document provides a comprehensive data tree showing all data structures used in the Race Mode Simulation page.

---

## 📊 Main Data Structure: `RaceSimulation`

```typescript
RaceSimulation {
  // Race Details
  race: Race {
    id: string
    name: string
    dateISO: string              // "2025-12-15"
    distanceKm: number           // 42.195
    elevationM?: number          // 500
    surface?: string             // "road" | "trail" | "mixed"
    terrain?: string             // "flat" | "hilly" | "mountainous"
    temperature?: number         // 22
    humidity?: number            // 50
    notes?: string
    priority?: number            // 1-5
    goal?: string               // "PR" | "finish" | "training"
    targetTime?: number         // minutes
    location?: string
  }

  // Core Predictions
  predictedTimeMin: number       // 180.5 (3h 00m 30s)
  predictedTimeFormatted: string // "3h 00m"
  avgPace: number               // 5.5 (min/km)
  paceFormatted: string         // "5:30"

  // Simulation Factors
  factors: SimulationFactors {
    terrainFactor: number       // 1.000 - 1.150
    elevationFactor: number     // 1.000 - 1.150
    climateFactor: number       // 1.000 - 1.150
    fatiguePenalty: number      // 1.000 - 1.100
    confidenceScore: number     // 0.0 - 1.0
  }

  // Pace Strategy Breakdown
  paceBreakdown: PaceBreakdown[] [
    {
      segment: number           // 1, 2, 3...
      pace: number             // 5.5 (min/km)
      cumulativeFatigue: number // 0.0 - 1.0
      hrZone: number           // 1-5
    }
  ]

  // Contextual Information
  message: string               // AI-generated race advice
  readinessScore: number        // 0-100
  weeksToRace: number          // 12
  confidence: "high" | "medium" | "low"

  // Extended Performance Analysis
  extendedFactors?: ExtendedSimulationFactors {
    trainingConsistency: number    // 0.0 - 1.0
    longRunQuality: number         // 0.0 - 1.0
    taperQuality: number          // 0.0 - 1.0
    experienceFactor: number      // 0.0 - 1.0
    weatherImpact: number         // 0.0 - 2.0
  }

  // Multi-Factor Performance Breakdown
  performanceFactors?: PerformanceFactor[] [
    {
      id: string                // "training_consistency"
      category: string          // "Training" | "Recovery" | "Environment"
      label: string            // "Training Consistency"
      value: number            // 0.85
      impact: "positive" | "negative" | "neutral"
      impactMagnitude: "high" | "medium" | "low"
      description: string      // "8 weeks of consistent training"
      color: string           // "#22c55e" (CSS color)
      percentChange: number   // -2.5 (percentage impact on time)
    }
  ]

  // Weather Forecast
  weatherDescription?: string   // "Hot conditions expected - 28°C"
}
```

---

## 🎯 Supporting Data Structures

### 1. Pacing Strategy (`DbPacingStrategy`)

```typescript
DbPacingStrategy {
  id?: string
  race_id: string
  user_id?: string
  name: string                  // "Boston Marathon Conservative"
  mode: "manual" | "auto"
  segments: PacingSegment[] [
    {
      startKm: number          // 0
      endKm: number            // 5
      targetPaceMinPerKm: number // 5.5
      effort?: string          // "easy" | "moderate" | "hard"
      notes?: string
      hrZone?: number          // 1-5
      plannedPowerW?: number   // 250
    }
  ]
  created_at?: string
  updated_at?: string
}
```

---

### 2. What-If Overrides (`SimulationOverrides`)

```typescript
SimulationOverrides {
  temperature?: number         // 15-40°C
  humidity?: number           // 20-90%
  elevation?: number          // 0-3000m
  terrain?: "road" | "trail" | "mixed"
  surface?: string
  readiness?: number          // 0-100
  startStrategy?: StartStrategy // "conservative" | "target" | "aggressive"

  // Physiological parameters
  vo2max?: number            // 40-80 ml/kg/min
  lactateThreshold?: number  // 150-180 bpm
  runningEconomy?: number    // 180-220 ml/kg/km
  fuelingRate?: number       // 0-300 kcal/h
  fluidIntake?: number       // 0-1000 ml/h
  preRaceGlycogen?: number   // 300-600g
}
```

---

### 3. Physiological Simulation Results

```typescript
PhysiologicalSimulation {
  timePoints: number[]         // [0, 60, 120, 180...] seconds
  energyStores: number[]       // [100, 95, 87, 78...] % remaining
  fatigueLevels: number[]      // [0, 5, 12, 22...] % accumulated
  hydrationStatus: number[]    // [100, 98, 95, 91...] % hydrated
  electrolyteLevels: number[]  // [100, 97, 93, 88...] % balanced
  giDistressRisk: number[]     // [0, 2, 5, 12...] % risk
  performanceCapacity: number[] // [100, 98, 94, 87...] % capacity
  estimatedTimeToExhaustion: number // 240 minutes
  criticalMoments: CriticalMoment[] [
    {
      timeMin: number          // 90
      type: "energy" | "hydration" | "gi_distress"
      severity: "low" | "moderate" | "high"
      message: string          // "Energy stores dropping below 50%"
    }
  ]
}
```

---

### 4. Training Context

```typescript
TrainingStats {
  basePace: number            // 6.0 min/km
  baseDistance: number        // 25 km (longest run)
  fitnessLevel: number        // 0.0 - 1.0
}

PerformanceContext {
  trainingStats: TrainingStats
  recentRaces: Race[]
  readinessScore: number
  weeksToRace: number
  longRunQuality: {
    count: number             // Number of long runs
    maxDistance: number       // Longest run in km
    avgDistance: number       // Average long run distance
    consistency: number       // 0.0 - 1.0
  }
  trainingConsistency: {
    weeksActive: number       // 8
    totalWeeks: number        // 12
    consistency: number       // 0.67
  }
  taperQuality: {
    volumeReduction: number   // 0.3 (30% reduction)
    quality: number          // 0.0 - 1.0
  }
}
```

---

### 5. Readiness Score

```typescript
ReadinessScore {
  score: number                // 0-100
  category: "peak" | "good" | "moderate" | "poor"
  factors: {
    sleep: number             // 0-100
    soreness: number          // 0-100
    stress: number            // 0-100
    mood: number              // 0-100
  }
  lastUpdated: string         // ISO timestamp
}
```

---

### 6. Weather Forecast

```typescript
WeatherForecast {
  temperature: number         // 22°C
  humidity: number           // 60%
  conditions: string         // "partly_cloudy"
  windSpeed?: number         // 15 km/h
  precipitation?: number     // 0-100%
  description: string        // "Mild conditions, ideal for racing"
  impactFactor: number       // 1.02 (2% slowdown)
}
```

---

### 7. Comparison & Scenario Data

```typescript
SimulationComparison {
  baselineTime: number        // 180.5
  adjustedTime: number        // 185.2
  timeDifference: number      // 4.7 minutes
  percentChange: number       // 2.6%
  factorChanges: {
    terrain: { base: 1.0, adjusted: 1.05, impact: "+5%" }
    elevation: { base: 1.0, adjusted: 1.0, impact: "0%" }
    climate: { base: 1.02, adjusted: 1.08, impact: "+6%" }
    fatigue: { base: 1.005, adjusted: 1.02, impact: "+1.5%" }
  }
}

WhatIfScenario {
  id: string
  race_id: string
  user_id: string
  name: string                // "Hot Day Scenario"
  description?: string
  overrides: SimulationOverrides
  predicted_time_min: number
  created_at: string
  updated_at: string
}
```

---

## 📈 Data Flow

```
User Input (Race Selection)
    ↓
useRaceSimulation(raceId)
    ↓
simulateRace(raceId)
    ↓
[Parallel Fetch]
    ├─ Race details from database
    ├─ Training logs (past 8 weeks)
    ├─ Readiness score
    ├─ Weather forecast
    └─ Baseline race performance
    ↓
Calculate Factors
    ├─ Terrain factor
    ├─ Elevation factor
    ├─ Climate factor
    ├─ Fatigue penalty
    └─ Confidence score
    ↓
Apply Performance Modifiers
    ├─ Training consistency
    ├─ Long run quality
    ├─ Taper quality
    └─ Experience factor
    ↓
Generate Prediction
    ├─ Predicted time
    ├─ Pace breakdown
    ├─ AI message
    └─ Performance factors
    ↓
Return RaceSimulation
    ↓
Display in UI
```

---

## 🗄️ Database Tables

### Tables Used:
1. **`races`** - Race event details
2. **`log_entries`** - Training log history
3. **`readiness_scores`** - Daily readiness tracking
4. **`pacing_strategies`** - Saved pacing plans
5. **`whatif_scenarios`** - Saved simulation scenarios
6. **`race_simulations`** - Cached simulation results
7. **`performance_factors`** - Historical factor analysis

---

## 🎨 UI State Management

```typescript
RaceMode Component State {
  selectedRaceId?: string
  allRaces: Race[]
  racesLoading: boolean

  simulation: RaceSimulation | null
  loading: boolean
  error: string | null

  overrides: SimulationOverrides
  adjustedSimulation: { predictedTimeMin, factors } | null

  pacingStrategy: DbPacingStrategy | null
  showPacingForm: boolean
  pacingMode: "view" | "edit"

  showWhatIf: boolean
  showFactors: boolean
  showPaceBreakdown: boolean

  readiness: ReadinessScore
}
```

---

This comprehensive data structure provides full visibility into all data flowing through the Race Mode simulation system, from raw inputs to final predictions and UI display.
