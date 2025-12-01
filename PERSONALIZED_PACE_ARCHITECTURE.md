# Personalized Pace System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌─────────────────────┐          │
│  │  SettingsV2.tsx  │         │  AddEventModal.tsx  │          │
│  │  =============== │         │  ================    │          │
│  │                  │         │                      │          │
│  │  Training Tab:   │         │  GPX Upload:         │          │
│  │  - Profile       │         │  - Analyzes route    │          │
│  │  - HR Zones      │         │  - Shows estimate    │          │
│  │  - Pace Zones    │         │  - With confidence   │          │
│  │  ─────────────── │         │                      │          │
│  │  PaceProfileCard │         └──────────┬───────────┘          │
│  │  - Flat pace     │                    │                      │
│  │  - Uphill pace   │                    │                      │
│  │  - Downhill pace │                    │                      │
│  │  - Grade buckets │                    │                      │
│  │  - Refresh btn   │                    │                      │
│  └────────┬─────────┘                    │                      │
│           │                              │                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            │                              │
┌───────────┼──────────────────────────────┼──────────────────────┐
│           │     UTILITIES LAYER          │                      │
├───────────┴──────────────────────────────┴──────────────────────┤
│                                                                   │
│           ┌────────────────────────────────────┐                │
│           │  personalizedGPXAnalysis.ts        │                │
│           │  ==============================    │                │
│           │                                    │                │
│           │  analyzeGPXRoutePersonalized()     │                │
│           │  - Fetches user's pace profile    │                │
│           │  - Analyzes GPX with profile      │                │
│           │  - Returns analysis + confidence  │                │
│           │                                    │                │
│           │  compareGPXEstimates()             │                │
│           │  - Personalized vs default        │                │
│           │  - Calculates time difference     │                │
│           └─────────────┬──────────────────────┘                │
│                         │                                        │
│                         │ calls                                  │
│                         ▼                                        │
│           ┌────────────────────────────────────┐                │
│           │  gpxParser.ts (Enhanced)           │                │
│           │  ==============================    │                │
│           │                                    │                │
│           │  analyzeGPXRoute()                 │                │
│           │  - Accepts PersonalizedPaceParams  │                │
│           │  - Uses grade-bucketed paces       │                │
│           │  - Returns confidence level        │                │
│           └────────────────────────────────────┘                │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
            │
            │ uses
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  HISTORICAL ANALYSIS ENGINE                      │
├─────────────────────────────────────────────────────────────────┤
│  /src/engine/historicalAnalysis/                                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  analyzeActivityTerrain.ts                                │  │
│  │  ==============================================            │  │
│  │                                                           │  │
│  │  analyzeActivityTerrain(logEntry, logEntryId, userId)    │  │
│  │  - Breaks activity into segments                         │  │
│  │  - Classifies by grade bucket                            │  │
│  │  - Calculates pace per segment                           │  │
│  │  - Returns TerrainAnalysis                               │  │
│  │                                                           │  │
│  │  analyzeUserActivities(userId)                           │  │
│  │  - Finds unanalyzed activities                           │  │
│  │  - Analyzes each with elevation data                     │  │
│  │  - Saves to database                                     │  │
│  │                                                           │  │
│  │  Grade Buckets: 9 terrain types                          │  │
│  │  - Flat, Easy/Moderate/Steep/Very Steep Uphill/Downhill  │  │
│  └───────────────────┬───────────────────────────────────────┘  │
│                      │                                           │
│                      │ provides data to                          │
│                      ▼                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  calculateUserPaceProfile.ts                              │  │
│  │  ==============================================            │  │
│  │                                                           │  │
│  │  calculatePaceProfile(userId)                            │  │
│  │  - Queries terrain analysis data                         │  │
│  │  - Applies recency weighting (2x / 1x / 0)              │  │
│  │  - Groups by grade bucket                                │  │
│  │  - Calculates weighted median paces                      │  │
│  │  - Determines confidence levels                          │  │
│  │  - Returns PaceProfile                                   │  │
│  │                                                           │  │
│  │  getPaceProfile(userId)                                  │  │
│  │  - Fetches from database                                 │  │
│  │  - Checks staleness (7 days)                             │  │
│  │  - Triggers background refresh if needed                 │  │
│  │                                                           │  │
│  │  getOrCalculatePaceProfile(userId)                       │  │
│  │  - Gets cached or calculates new                         │  │
│  │                                                           │  │
│  │  recalculatePaceProfile(userId)                          │  │
│  │  - Forces recalculation + save                           │  │
│  └───────────────────┬───────────────────────────────────────┘  │
│                      │                                           │
└──────────────────────┼───────────────────────────────────────────┘
                       │
                       │ saves/reads
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  user_pace_profiles                                       │   │
│  │  ────────────────────                                     │   │
│  │  - user_id (uuid)                                         │   │
│  │  - base_flat_pace_min_km (numeric)                        │   │
│  │  - uphill_pace_adjustment_factor (numeric)                │   │
│  │  - downhill_pace_adjustment_factor (numeric)              │   │
│  │  - grade_bucket_paces (jsonb) ◄── Detailed per bucket    │   │
│  │  - sample_size (integer)                                  │   │
│  │  - min_segments_per_type (jsonb)                          │   │
│  │  - last_calculated_at (timestamptz)                       │   │
│  │  - calculation_period_days (integer)                      │   │
│  │                                                           │   │
│  │  RLS: Users can only access their own profile            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  activity_terrain_analysis                                │   │
│  │  ────────────────────────                                 │   │
│  │  - log_entry_id (uuid)                                    │   │
│  │  - user_id (uuid)                                         │   │
│  │  - uphill_distance_km (numeric)                           │   │
│  │  - downhill_distance_km (numeric)                         │   │
│  │  - flat_distance_km (numeric)                             │   │
│  │  - uphill_pace_min_km (numeric)                           │   │
│  │  - downhill_pace_min_km (numeric)                         │   │
│  │  - flat_pace_min_km (numeric)                             │   │
│  │  - avg_grade_pct (numeric)                                │   │
│  │  - segments_data (jsonb) ◄── All segments with buckets   │   │
│  │  - activity_date (date) ◄── For recency weighting        │   │
│  │                                                           │   │
│  │  RLS: Users can only access their own analysis           │   │
│  │  Index: user_id, activity_date                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                       ▲
                       │
                       │ triggered by
                       │
┌─────────────────────────────────────────────────────────────────┐
│               AUTOMATIC TRIGGERS                                 │
├─────────────────────────────────────────────────────────────────┤
│  /src/lib/database.ts                                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  saveLogEntry()                                           │   │
│  │  ──────────────                                           │   │
│  │  1. Saves activity to database                            │   │
│  │  2. If has elevation data:                                │   │
│  │     - Analyzes terrain                                    │   │
│  │     - Saves analysis                                      │   │
│  │     - Triggers background profile recalc                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  bulkInsertLogEntries()                                   │   │
│  │  ──────────────────────                                   │   │
│  │  1. Bulk inserts activities                               │   │
│  │  2. After completion:                                     │   │
│  │     - Analyzes all new activities with elevation          │   │
│  │     - Triggers background profile recalc                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Scenario 1: User Imports Activities (First Time)

```
1. User imports Strava CSV
   ↓
2. bulkInsertLogEntries() saves to database
   ↓
3. analyzeUserActivities() processes activities with elevation
   ↓
4. Each activity broken into segments:
   - 2.5km flat (5:47/km)
   - 1.8km uphill +5% (7:22/km)
   - 0.7km flat (5:52/km)
   - etc.
   ↓
5. Segments saved to activity_terrain_analysis
   ↓
6. recalculatePaceProfileBackground() triggered
   ↓
7. calculatePaceProfile() aggregates all segments:
   - Groups by grade bucket
   - Applies recency weights
   - Calculates weighted median paces
   ↓
8. Profile saved to user_pace_profiles
```

### Scenario 2: User Uploads GPX for Race

```
1. User clicks "Add Event" → Uploads GPX
   ↓
2. parseGPXFile() extracts elevation points
   ↓
3. analyzeGPXRoutePersonalized() called
   ↓
4. getPaceProfile() fetches user's profile
   ↓
5. analyzeGPXRoute() with PersonalizedPaceParams:
   - For each segment:
     * Classify grade (e.g., +6% = moderate uphill)
     * Look up bucket pace (7:15/km)
     * Or fallback to terrain type
     * Apply fatigue blending if >3km
   ↓
6. Returns analysis with:
   - Total time: 4h 38min
   - Confidence: High
   - usingPersonalizedPace: true
   ↓
7. UI shows estimate with confidence indicator
```

### Scenario 3: Automatic Profile Update

```
1. User logs a new run with elevation
   ↓
2. saveLogEntry() detects elevation data
   ↓
3. analyzeActivityTerrain() processes immediately
   ↓
4. recalculatePaceProfileBackground() triggers (async)
   ↓
5. Profile recalculates in background
   ↓
6. Next time user views Settings → Training:
   - PaceProfileCard shows updated paces
   - "Updated today"
```

## Key Design Decisions

### 1. Separate Engine from Utilities
- **Engine** (`/src/engine/historicalAnalysis/`): Core business logic
- **Utils** (`/src/utils/`): High-level helper functions
- **Components** (`/src/components/`): UI layer

### 2. Database-First Approach
- All pace data persisted in Supabase
- Caching strategy for performance
- RLS for security

### 3. Background Processing
- Non-blocking recalculation
- Fire-and-forget pattern
- UI remains responsive

### 4. Graceful Degradation
- Falls back to default formulas
- Progressive enhancement
- Clear confidence indicators

### 5. Privacy by Design
- User-scoped queries
- RLS policies
- No cross-user data

## Performance Characteristics

### Database Queries
- **Indexed lookups**: O(log n) via user_id, activity_date
- **Caching**: Profile cached for 7 days
- **Pagination**: Not needed (90 days = ~100 activities max)

### Computation
- **Terrain analysis**: O(n) where n = number of points in activity
- **Profile calculation**: O(m) where m = number of segments (typically < 1000)
- **GPX analysis**: O(p) where p = number of points in GPX (typically < 5000)

### Memory
- Minimal memory footprint
- Streaming analysis (no large arrays)
- JSONB for flexible storage

## Security Measures

1. **Row Level Security (RLS)**
   - Users can only access their own data
   - Enforced at database level

2. **Input Validation**
   - Pace ranges validated (2.5-15 min/km)
   - Segment counts verified
   - Date ranges checked

3. **Error Handling**
   - Graceful fallbacks
   - No sensitive data in errors
   - Logging for debugging

## Extensibility Points

The system is designed for future enhancements:

1. **Weather Adjustment**: Add conditions data to segments
2. **Time-of-Day**: Add timestamp analysis
3. **Course Similarity**: Match GPX to historical routes
4. **Seasonal Trends**: Track fitness over time
5. **Race-Day Factors**: Apply conservative multipliers

Each extension can be added without breaking existing functionality.
