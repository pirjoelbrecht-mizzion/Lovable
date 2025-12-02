# Bolt Component Structure

## Directory Layout

```
src/
├── components/          # React components
│   ├── RouteMap/       # Map-related components
│   └── *.tsx           # Individual components
├── pages/              # Route pages
│   ├── Unity/         # Community features
│   ├── Onboarding/    # Onboarding flow
│   └── connect/       # Integration mocks
├── lib/               # Core libraries
│   ├── adaptive-coach/      # AI coaching system
│   ├── statistical-learning/ # ML models
│   └── environmental-learning/ # Weather/altitude learning
├── ai/                # AI-related utilities
├── engine/            # Performance engine
├── hooks/             # React hooks
├── services/          # Business logic services
├── utils/             # Helper functions
├── types/             # TypeScript types
├── state/             # State management
├── styles/            # CSS files
└── i18n/              # Internationalization
```

## Quick Stats

- **150+ Components** organized in 9 categories
- **25+ Pages** with full routing
- **24 Custom Hooks** for state management
- **11 Services** for business logic
- **3 Core Libraries** (AI Coach, ML, Environmental)
- **Performance Engine** with adaptive decision making
- **100+ Utility Functions**

## Component Categories

### 1. Core UI Components (Reusable)

**Dialogs & Overlays:**
- `Modal.tsx` - Generic modal wrapper
- `Popup.tsx` - Popup notifications
- `Toast.tsx` / `ToastHost.tsx` - Toast notifications
- `ConfirmDialog.tsx` - Confirmation dialogs

**Layout & Navigation:**
- `FloatingCoach.tsx` - Floating AI coach button
- `CoachFab.tsx` - Floating action button
- `FloatingSummaryBar.tsx` - Summary bar overlay

**Data Display:**
- `MiniChart.tsx` - Small chart component
- `ACWRChart.tsx` - Acute/Chronic workload ratio chart
- `PacingChart.tsx` - Pacing visualization
- `WeeklyDistanceVertChart.tsx` - Weekly metrics chart

**Badges & Indicators:**
- `Badges.tsx` - Achievement badges
- `HeatBadge.tsx` - Heat stress indicator
- `ComparisonBadge.tsx` - Comparison metrics
- `ConnectionsBadge.tsx` - Connection status
- `WeatherDot.tsx` - Weather indicator
- `FactorChip.tsx` - Performance factor chips

### 2. Feature Components (Domain-Specific)

**AI Coach & Chat (11 components):**
- `AIChat.tsx` - Main AI chat interface
- `AIInsight.tsx` - AI-generated insights
- `CoachChat.tsx` - Coach conversation
- `CoachBubble.tsx` - Coach message bubble
- `CoachInsightsFeed.tsx` - Insights feed
- `VoiceCoach.tsx` - Voice interaction
- `AdaptiveCoachPanel.tsx` - Adaptive coaching panel
- And more...

**Training & Planning (8 components):**
- `ThisWeekBoard.tsx` - Weekly training board
- `QuickWorkout.tsx` - Quick workout creator
- `WorkoutGenerator.tsx` - AI workout generation
- `SessionEditor.tsx` - Edit training sessions
- `TrainingInsights.tsx` - Training analysis
- And more...

**Season Planning (4 components):**
- `SeasonPlanEditor.tsx` - Edit season plans
- `SeasonTimeline.tsx` - Season visualization
- `SeasonWheel.tsx` - Circular season view
- `MultiSeasonTabs.tsx` - Multi-season interface

**Race Management (5 components):**
- `QuickAddRace.tsx` - Quick race entry
- `RaceContextHeader.tsx` - Race context display
- `RaceFeedbackModal.tsx` - Post-race feedback
- `ResultsModal.tsx` - Race results
- `ResultsSidebar.tsx` - Results sidebar

### 3. Data & Analytics Components

**Readiness & Recovery:**
- `ReadinessCard.tsx` - Daily readiness score
- `ReadinessGauge.tsx` - Readiness gauge visual
- `ReadinessTrendChart.tsx` - Readiness trends

**Performance Analysis:**
- `PerformanceImpactCard.tsx` - Performance factors
- `BaselineCard.tsx` - Baseline comparison
- `FactorBreakdown.tsx` - Factor analysis

**What-If Analysis:**
- `WhatIfSimulatorRedesigned.tsx` - Main simulator
- `WhatIfControls.tsx` - Simulation controls
- `SimulationComparison.tsx` - Compare scenarios

**Learning & Insights:**
- `StatisticalLearningDashboard.tsx` - ML insights
- `EnvironmentalLearningDashboard.tsx` - Environmental learning
- `ProactiveRecommendationsWidget.tsx` - AI recommendations

### 4. Route & Map Components

- `RouteMap.tsx` - Main route map
- `RouteDebugMap.tsx` - Debug map view
- `RouteSuggestions.tsx` - Route recommendations
- `CommunityRoutes.tsx` - Community-shared routes
- `GPXElevationProfile.tsx` - Elevation profile

### 5. Integration & Sync Components

**Data Connections:**
- `DataConnect.tsx` - Data source connections
- `StravaImporter.tsx` - Strava import
- `ImportWizard.tsx` - Import wizard

**Sync Management:**
- `SyncPanel.tsx` - Sync control panel
- `SyncStatus.tsx` - Sync status display
- `AutoCalculationStatus.tsx` - Auto-calc status

### 6. Onboarding & Settings

**Onboarding Flow (9 steps):**
- `Onboarding/index.tsx` - New onboarding flow
- `StepGoal.tsx` - Goal selection
- `StepActivity.tsx` - Activity level
- `StepMotivation.tsx` - Motivation profile
- `StepDevice.tsx` - Device connection
- And more...

### 7. Feedback & Interaction

- `PostWorkoutFeedbackModal.tsx` - Post-workout feedback
- `RaceFeedbackModal.tsx` - Race feedback
- `AddEventModal.tsx` - Add calendar event
- `WeatherAlertBanner.tsx` - Weather alerts

### 8. Motivation & Gamification

- `MotivationArchetypeCard.tsx` - Archetype display
- `ArchetypeReveal.tsx` - Archetype reveal animation
- `Achievements.tsx` - Achievement display

### 9. Advanced Features

- `AdaptiveDecisionEngineDemo.tsx` - Engine demo
- `ErrorBoundary.tsx` - Error handling
- `PWAInstall.tsx` - PWA installation

## Pages Structure

```
pages/
├── Auth.tsx              # Authentication
├── Welcome.tsx           # Landing page
├── Home.tsx              # Dashboard
├── Calendar.tsx          # Calendar view
├── Planner.tsx           # Training planner
├── Coach.tsx             # AI coach page
├── Quest.tsx             # Missions
├── Mirror.tsx            # Comparison
├── Log.tsx               # Activity log
├── Races.tsx             # Race list
├── RaceMode.tsx          # Race mode
├── Route.tsx             # Route details
├── SeasonPlan.tsx        # Season planning
├── Settings.tsx          # Settings
├── Insights.tsx          # Analytics
├── Unity.tsx             # Community
└── Onboarding/           # 8-step flow
```

## Custom Hooks (24 total)

```
hooks/
├── useSession.tsx                # Session management
├── useAdaptiveDecisionEngine.ts  # Decision engine
├── useRacePlanV2.tsx             # Race planning
├── useRaceSimulation.ts          # Race simulation
├── useReadinessScore.ts          # Readiness calculation
├── usePerformanceModel.ts        # Performance modeling
├── useMotivation.ts              # Motivation system
├── useWearableSync.ts            # Wearable sync
└── ... (16 more)
```

## Services (11 total)

```
services/
├── adaptiveTriggerService.ts          # Adaptive triggers
├── autoCalculationService.ts          # Auto calculations
├── proactiveRecommendations.ts        # AI recommendations
├── weatherNotifications.ts            # Weather alerts
└── wearable/                          # Wearable integrations
    ├── WearableManager.ts
    └── providers/
        ├── StravaProvider.ts
        ├── GarminProvider.ts
        ├── COROSProvider.ts
        └── ... (5 more providers)
```

## Core Libraries

### 1. Adaptive Coach System (`lib/adaptive-coach/`)
```
├── adaptive-controller.ts         # Main controller
├── athlete-profiler.ts            # Athlete profiling
├── workout-library.ts             # Workout database
├── microcycle.ts                  # Weekly planning
├── macrocycle.ts                  # Season planning
├── race-specificity.ts            # Race-specific training
├── safety.ts                      # Safety constraints
└── explain.ts                     # Explanation generation
```

### 2. Statistical Learning (`lib/statistical-learning/`)
```
├── regression.ts                  # Regression models
├── bayesian.ts                    # Bayesian inference
├── time-series.ts                 # Time series analysis
├── ensemble.ts                    # Ensemble methods
└── outliers.ts                    # Outlier detection
```

### 3. Environmental Learning (`lib/environmental-learning/`)
```
├── heatTolerance.ts              # Heat adaptation
├── altitudeResponse.ts           # Altitude adaptation
└── optimalTime.ts                # Optimal timing
```

## Performance Engine

```
engine/
├── adaptiveDecisionEngine.ts          # Decision engine
├── adaptiveDecisionDatabase.ts        # Decision DB
├── athleteIntelligenceProfile.ts      # Intelligence profiling
└── historicalAnalysis/
    ├── analyzeActivityTerrain.ts
    └── calculateUserPaceProfile.ts
```

## AI Modules

```
ai/
├── brain.ts                           # AI brain/coordinator
├── coach.ts                           # AI coach
├── personality.ts                     # Coach personality
├── adjust.ts                          # Plan adjustments
└── recommend.ts                       # Recommendations
```

## Component Naming Convention

### Pattern: `[Feature][Type].tsx`

**Component Types:**
- `Modal` - Full-screen or overlay dialogs
- `Card` - Card-style containers
- `Panel` - Side panels or sections
- `Chart` - Data visualizations
- `Gauge` - Circular/gauge displays
- `Banner` - Top/bottom banners
- `Widget` - Small self-contained features
- `Dashboard` - Full dashboards

**Examples:**
- `ReadinessCard.tsx` - Card showing readiness
- `RaceFeedbackModal.tsx` - Modal for race feedback
- `WeeklyDistanceVertChart.tsx` - Chart for weekly metrics
- `TimeToExhaustionGauge.tsx` - Gauge for exhaustion time

## Architecture Patterns

### 1. Component Composition
Small, focused components that compose into complex UIs.

**Example:** `CoachBubble` → `CoachChat` → `AIChat`

### 2. Hook-Based State
Custom hooks encapsulate business logic and separate concerns.

**Example:** `useRacePlanV2` manages all race plan state

### 3. Service Layer
Business logic lives in services, components stay presentational.

**Example:** `autoCalculationService` handles background calculations

### 4. Context Providers
Global state managed via React contexts.

**Example:** `PerformanceEngineContext` for performance data

### 5. Adaptive AI System
Modular AI coaching with:
- Decision engine in `engine/`
- Learning models in `lib/statistical-learning/`
- Coach logic in `lib/adaptive-coach/`

## Data Flow

```
User Input
    ↓
Component (presentation)
    ↓
Hook (state & logic)
    ↓
Service (business logic)
    ↓
Supabase (persistence)
    ↓
Engine/AI (intelligence)
    ↓
Back to Component (updated UI)
```

## Key Features by Component

| Feature | Primary Components |
|---------|-------------------|
| **AI Coaching** | `AIChat`, `CoachInsightsFeed`, `AdaptiveCoachPanel` |
| **Race Planning** | `RaceMode`, `PacingStrategyForm`, `WhatIfSimulatorRedesigned` |
| **Training Plans** | `ThisWeekBoard`, `SeasonPlanEditor`, `WorkoutGenerator` |
| **Data Import** | `StravaImporter`, `ImportWizard`, `DataConnect` |
| **Analytics** | `StatisticalLearningDashboard`, `EnvironmentalLearningDashboard` |
| **Community** | `Unity`, `FindCompanions`, `CommunityRoutes` |
| **Motivation** | `MotivationArchetypeCard`, `Quest` |
| **Routes** | `RouteMap`, `RouteSuggestions`, `RouteExplorer` |

## Technology Stack

- **Frontend:** React 18 + TypeScript
- **State:** Custom hooks + Context API
- **Charts:** Chart.js + Recharts
- **Maps:** Mapbox GL
- **Database:** Supabase (PostgreSQL)
- **Build:** Vite
- **Styling:** CSS Modules + CSS Variables

## Project Scale

- **~500 TypeScript files**
- **150+ React components**
- **100+ utility functions**
- **24 custom hooks**
- **11 services**
- **3 AI/ML modules**
- **Full offline support (PWA)**
