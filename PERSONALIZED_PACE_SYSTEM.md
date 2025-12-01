# Personalized Pace Calculation System

## Overview

The Personalized Pace Calculation System learns from each user's historical training data to provide accurate, individualized pace estimates for GPX route planning. Instead of using generic pace formulas, the system analyzes past activities with elevation data to understand how each runner performs on different terrain types.

## Key Features

### 1. Grade-Bucketed Pace Calculation
Routes are broken into 9 terrain buckets based on grade percentage:
- **Flat**: -2% to +2%
- **Easy Uphill**: +2% to +5%
- **Moderate Uphill**: +5% to +8%
- **Steep Uphill**: +8% to +12%
- **Very Steep Uphill**: +12%+
- **Easy Downhill**: -2% to -5%
- **Moderate Downhill**: -5% to -8%
- **Steep Downhill**: -8% to -12%
- **Very Steep Downhill**: -12%-

### 2. Recency Weighting
Activities are weighted based on age to reflect current fitness:
- **0-30 days**: 2x weight (recent form)
- **30-90 days**: 1x weight (baseline)
- **90+ days**: Ignored (outdated)

### 3. Smart Fallback Strategy
The system uses a three-tier approach:
1. **Primary**: Grade-bucketed pace (if ≥3 segments available)
2. **Fallback 1**: Terrain-type median pace (uphill/downhill/flat)
3. **Fallback 2**: Default pace formulas

### 4. Fatigue Adjustment
For long segments (>3km), the system blends terrain-specific pace with flat pace:
- **80%** terrain-specific pace
- **20%** flat pace
- This accounts for accumulated fatigue on extended climbs/descents

### 5. Minimum Data Requirements
To ensure accuracy, the system requires:
- At least **3 activities** with elevation and pace data
- At least **5 segments** each of uphill, downhill, and flat terrain

## System Architecture

### Database Schema

#### `user_pace_profiles`
Stores calculated pace metrics per user:
```sql
- user_id (uuid)
- base_flat_pace_min_km (numeric)
- uphill_pace_adjustment_factor (numeric)
- downhill_pace_adjustment_factor (numeric)
- grade_bucket_paces (jsonb) - detailed pace per grade bucket
- sample_size (integer) - number of activities used
- min_segments_per_type (jsonb) - segment counts per terrain type
- last_calculated_at (timestamptz)
- calculation_period_days (integer)
```

#### `activity_terrain_analysis`
Caches terrain analysis of past activities:
```sql
- log_entry_id (uuid)
- user_id (uuid)
- uphill_distance_km (numeric)
- downhill_distance_km (numeric)
- flat_distance_km (numeric)
- uphill_pace_min_km (numeric)
- downhill_pace_min_km (numeric)
- flat_pace_min_km (numeric)
- avg_grade_pct (numeric)
- segments_data (jsonb) - detailed segment breakdown
- activity_date (date)
```

### Core Modules

#### 1. Terrain Analysis Engine (`src/utils/terrainAnalysis.ts`)
- Analyzes historical activities with elevation data
- Breaks activities into terrain segments
- Calculates actual pace for each segment
- Stores analysis in database

**Key Functions:**
- `analyzeActivityTerrain()` - Process a single activity
- `analyzeUserActivities()` - Batch analyze all user activities
- `saveTerrainAnalysis()` - Persist analysis to database

#### 2. Pace Profile Calculator (`src/utils/paceProfileCalculator.ts`)
- Aggregates terrain analysis data
- Applies recency weighting
- Calculates grade-bucketed paces
- Handles minimum data requirements

**Key Functions:**
- `calculatePaceProfile()` - Compute pace profile from historical data
- `getPaceProfile()` - Fetch cached profile from database
- `getOrCalculatePaceProfile()` - Get cached or recalculate if stale
- `recalculatePaceProfile()` - Force recalculation and save

#### 3. GPX Integration (`src/utils/gpxParser.ts`)
- Enhanced to accept personalized pace parameters
- Uses grade-bucketed paces when available
- Falls back gracefully to default formulas

**Key Functions:**
- `analyzeGPXRoute()` - Analyze GPX with optional personalized params

#### 4. Helper Utilities (`src/utils/personalizedGPXAnalysis.ts`)
- Convenience functions for common use cases
- Automatic pace profile loading
- Comparison between personalized and default estimates

**Key Functions:**
- `analyzeGPXRoutePersonalized()` - Main entry point for personalized analysis
- `compareGPXEstimates()` - Compare personalized vs default
- `getPaceExplanation()` - Generate human-readable explanation

### UI Components

#### `PaceProfileCard` (`src/components/PaceProfileCard.tsx`)
Displays the user's current pace profile:
- Base paces for flat, uphill, downhill
- Detailed grade-bucket paces
- Sample size and data quality indicators
- Refresh button for manual recalculation

## Usage Examples

### Basic GPX Analysis

```typescript
import { analyzeGPXRoutePersonalized } from '@/utils/personalizedGPXAnalysis';

const result = await analyzeGPXRoutePersonalized(gpxPoints);

console.log('Estimated Time:', result.analysis.totalTimeEstimate, 'min');
console.log('Using Personalized Pace:', result.hasPersonalizedPace);
console.log('Confidence:', result.analysis.paceConfidence);
```

### Compare Estimates

```typescript
import { compareGPXEstimates } from '@/utils/personalizedGPXAnalysis';

const comparison = await compareGPXEstimates(gpxPoints);

console.log('Personalized:', comparison.personalizedAnalysis.totalTimeEstimate, 'min');
console.log('Default:', comparison.defaultAnalysis.totalTimeEstimate, 'min');
console.log('Difference:', comparison.comparison.timeDifferenceMin, 'min');
```

### Display Pace Profile

```tsx
import { PaceProfileCard } from '@/components/PaceProfileCard';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <PaceProfileCard />
    </div>
  );
}
```

### Manual Recalculation

```typescript
import { recalculatePaceProfile } from '@/utils/paceProfileCalculator';
import { analyzeUserActivities } from '@/utils/terrainAnalysis';

// Analyze activities first
await analyzeUserActivities();

// Then recalculate profile
const profile = await recalculatePaceProfile();

console.log('Profile Updated:', profile);
```

## Automatic Triggers

The system automatically recalculates pace profiles when:

1. **Single Activity Import**: When a new activity with elevation data is saved
   - Triggers terrain analysis immediately
   - Triggers background pace profile recalculation

2. **Bulk Activity Import**: When multiple activities are imported (e.g., from Strava)
   - Analyzes all new activities with elevation data
   - Triggers background pace profile recalculation

3. **Stale Profile Detection**: When pace profile is older than 7 days
   - Automatic background recalculation on next GPX analysis

## Data Quality Indicators

### Profile Data Quality
- **Excellent**: ≥10 activities + minimum segment requirements met
- **Good**: ≥3 activities + minimum segment requirements met
- **Fair**: ≥3 activities but missing some segment requirements
- **Insufficient**: <3 activities

### Pace Confidence Levels
- **High**: ≥6 grade buckets with data (comprehensive terrain coverage)
- **Medium**: 3-5 grade buckets with data (moderate coverage)
- **Low**: 1-2 grade buckets with data (limited coverage)
- **Default**: No personalized data available

### Bucket Confidence
Each grade bucket has its own confidence:
- **High**: ≥15 segments analyzed
- **Medium**: 8-14 segments analyzed
- **Low**: 3-7 segments analyzed

## Performance Considerations

1. **Caching**: Pace profiles are cached in the database and only recalculated when stale
2. **Background Processing**: Recalculation happens asynchronously to avoid blocking UI
3. **Incremental Analysis**: New activities are analyzed individually, not reprocessing all data
4. **Indexed Queries**: Database queries use indexes on `user_id` and `activity_date`

## Privacy & Security

- All pace calculations are user-scoped via RLS policies
- Pace profiles are private and never shared between users
- Analysis data is only accessible by the user who owns the activities
- No cross-user data aggregation or comparison

## Future Enhancements

Potential improvements for future versions:

1. **Weather Adjustment**: Account for temperature, wind, and conditions
2. **Time-of-Day Patterns**: Learn performance variations by time of day
3. **Fatigue Modeling**: More sophisticated fatigue accumulation models
4. **Seasonal Trends**: Track fitness changes across training cycles
5. **Race-Day Adjustment**: Apply conservative factors for race predictions
6. **Course Matching**: Find similar routes from past activities

## Troubleshooting

### Profile Not Calculating
- Ensure activities have `elevationStream`, `distanceStream`, and `durationMin`
- Verify at least 3 activities within the last 90 days
- Check that activities have realistic paces (2.5-15 min/km)

### Inaccurate Estimates
- More training data improves accuracy
- Ensure variety in terrain types (uphill, downhill, flat)
- Recent activities (0-30 days) have more weight

### Manual Profile Refresh
```typescript
import { recalculatePaceProfile } from '@/utils/paceProfileCalculator';

const profile = await recalculatePaceProfile();
console.log('Profile recalculated:', profile);
```

## API Reference

### Terrain Analysis

```typescript
// Analyze a single activity
analyzeActivityTerrain(
  logEntry: LogEntry,
  logEntryId: string,
  userId: string
): ActivityTerrainAnalysis | null

// Analyze all unanalyzed activities
analyzeUserActivities(userId?: string): Promise<number>

// Save analysis to database
saveTerrainAnalysis(analysis: ActivityTerrainAnalysis): Promise<boolean>
```

### Pace Profile

```typescript
// Calculate pace profile from historical data
calculatePaceProfile(userId?: string): Promise<PaceProfile | null>

// Get cached profile
getPaceProfile(userId?: string): Promise<PaceProfile | null>

// Get cached or recalculate if needed
getOrCalculatePaceProfile(userId?: string): Promise<PaceProfile | null>

// Force recalculation and save
recalculatePaceProfile(userId?: string): Promise<PaceProfile | null>

// Trigger background recalculation (non-blocking)
recalculatePaceProfileBackground(userId: string): void
```

### GPX Analysis

```typescript
// Analyze GPX with personalized pace
analyzeGPXRoute(
  points: GPXPoint[],
  userBasePaceMinKm?: number,
  personalizedParams?: PersonalizedPaceParams
): GPXRouteAnalysis

// Convenient wrapper with automatic profile loading
analyzeGPXRoutePersonalized(
  points: GPXPoint[],
  userId?: string,
  fallbackPaceMinKm?: number
): Promise<{ analysis, paceProfile, hasPersonalizedPace }>

// Compare personalized vs default estimates
compareGPXEstimates(
  points: GPXPoint[],
  userId?: string,
  defaultPaceMinKm?: number
): Promise<ComparisonResult | null>
```

## Testing

To test the personalized pace system:

1. Import or manually add activities with elevation data
2. Verify terrain analysis runs: Check `activity_terrain_analysis` table
3. Trigger pace profile calculation: Call `recalculatePaceProfile()`
4. Verify profile saved: Check `user_pace_profiles` table
5. Test GPX analysis: Use `analyzeGPXRoutePersonalized()` with a GPX file
6. Compare estimates: Use `compareGPXEstimates()` to see difference

## Support

For issues or questions about the personalized pace system, check:
- Database migrations in `supabase/migrations/`
- Implementation in `src/utils/terrainAnalysis.ts` and `src/utils/paceProfileCalculator.ts`
- Example usage in `src/examples/PersonalizedPaceExample.tsx`
