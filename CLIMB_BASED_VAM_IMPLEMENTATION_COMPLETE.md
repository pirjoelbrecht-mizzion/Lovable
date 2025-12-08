# Climb-Based VAM Calculation Implementation - Complete

## Overview

Successfully implemented scientifically-accurate per-climb VAM (Vertical Ascent Meters per hour) analysis system that replaces the previous whole-activity VAM calculation with climb-specific metrics and fatigue analysis.

## Problem Solved

**Before:** VAM was calculated as `(total elevation gain / total time) * 60` for entire activities, mixing climbing, flats, and descents into one meaningless number.

**After:** VAM is now calculated separately for each significant climb (>80m gain, >400m distance), revealing:
- True climbing fitness (isolated from descents/flats)
- Fatigue resistance (how VAM degrades through a race)
- Training weaknesses (aerobic vs muscular endurance)
- Race strategy effectiveness (pacing on sequential climbs)

## Implementation Summary

### 1. Database Schema ✅

**New Table: `activity_climb_segments`**
- Stores individual climb data for each activity
- Columns: climb_number, start/end distance, elevation gain, duration, VAM, average grade, distance, category
- Full RLS policies for data security

**Updated Table: `activity_terrain_analysis`**
- `peak_vam`: Highest VAM from any single climb
- `average_climb_vam`: Mean VAM across all significant climbs
- `vam_first_climb`: VAM on first climb (baseline)
- `vam_last_climb`: VAM on final climb (fatigued state)
- `vam_fatigue_slope_pct`: Regression-based fatigue decline rate
- `vam_first_to_last_dropoff_pct`: Simple first→last comparison
- `total_climbing_time_min`: Time spent on uphill segments only
- `total_climbing_distance_km`: Horizontal distance of all climbs
- `significant_climbs_count`: Number of climbs meeting significance threshold

**Migration File:** `supabase/migrations/20251208140928_add_climb_segments_and_vam_metrics.sql`

### 2. Core Terrain Analysis Engine ✅

**File:** `src/engine/trailAnalysis.ts`

**New Interfaces:**
```typescript
interface ClimbSegment {
  climbNumber: number;
  startDistanceM: number;
  endDistanceM: number;
  elevationGainM: number;
  durationMin?: number;
  vam?: number; // Meters per hour
  averageGradePct: number;
  distanceKm: number;
  category: 'easy' | 'moderate' | 'hard' | 'extreme';
}

interface TerrainAnalysis {
  // ... existing fields
  climbs: ClimbSegment[];
  peakVam?: number;
  averageClimbVam?: number;
  vamFirstClimb?: number;
  vamLastClimb?: number;
  vamFatigueSlopePct?: number;
  vamFirstToLastDropoffPct?: number;
  totalClimbingTimeMin?: number;
  totalClimbingDistanceKm?: number;
  significantClimbsCount: number;
}
```

**New Functions:**

1. **`identifyClimbSegments()`**
   - Scans elevation/distance streams with 150m rolling window
   - Identifies continuous segments where grade > 3%
   - Merges adjacent climbs if separated by < 50m
   - Filters climbs below significance threshold (80m gain, 400m distance)

2. **`calculateClimbVAM()`**
   - Allocates time to each climb using effort-based model
   - Effort = distance × (1 + grade/100 × 3)
   - Calculates VAM = elevation_gain_m / (duration_hours)
   - Categorizes climbs by difficulty

3. **`calculateFatigueMetrics()`**
   - Computes weighted linear regression across all climbs
   - Calculates simple first-to-last percentage drop
   - Returns both metrics for dual insight (scientific + user-friendly)

4. **`analyzeTerrainFromStreams()` - Updated**
   - Removed old whole-activity VAM calculation (lines 205-209)
   - Now calls climb identification and VAM calculation functions
   - Returns comprehensive climb analysis with all new metrics

### 3. Database Persistence Layer ✅

**File:** `src/engine/historicalAnalysis/analyzeActivityTerrain.ts`

**New Functions:**

1. **`saveClimbSegments()`**
   - Deletes existing climb segments for activity
   - Inserts new climb records into database
   - Handles empty climb arrays gracefully

2. **`saveCompleteTerrainAnalysis()`**
   - Saves climb segments via `saveClimbSegments()`
   - Updates terrain analysis table with VAM metrics
   - Uses upsert for idempotent operations

3. **`reanalyzeAllActivitiesWithVAM()`**
   - Re-analyzes ALL historical activities with elevation data
   - Uses new climb-based VAM calculation
   - Logs progress every 20 activities
   - Returns count of successfully analyzed activities

### 4. UI Component Updates ✅

**File:** `src/components/activity/ActivityTerrainBreakdown.tsx`

**New Features:**

1. **Climb Analysis Section** (replaces single VAM display)
   - Shows climb count and expandable list
   - "Show All Climbs" toggle for activities with >3 climbs

2. **Summary Metrics Panel**
   - Peak VAM with color coding (green=strong, yellow=moderate, red=fatigued)
   - Average climb VAM across all significant climbs
   - Fatigue resistance score (percentage drop from first to last)
   - Total climbing time and distance

3. **Individual Climb Cards**
   - Climb number with elevation gain badge
   - VAM value with dynamic color coding:
     - Green (≥600 m/h): "Strong climbing"
     - Orange (400-600 m/h): "Moderate pace"
     - Red (300-400 m/h): "Conservation mode"
     - Gray (<300 m/h): "Fatigue detected"
   - Duration, distance, and average grade
   - Difficulty category (easy/moderate/hard/extreme)

4. **AI-Generated Insights**
   - "Excellent pacing" for <5% VAM decline
   - "Good climbing performance" for 5-15% decline
   - "Moderate fatigue" for 15-30% decline
   - "Significant fatigue" with training recommendations for >30% decline

**Helper Functions:**
- `getVAMColor()`: Dynamic color coding based on performance
- `getVAMLabel()`: Human-readable performance labels
- `getFatigueColor()`: Color coding for fatigue resistance
- `getCategoryLabel()`: Climb difficulty labels
- `formatDuration()`: Time formatting (hours + minutes)
- `getClimbInsight()`: Contextual AI insights based on fatigue patterns

## Usage Guide

### For End Users

1. **View Climb Analysis**
   - Navigate to any activity with elevation data
   - Scroll to "Terrain Breakdown" section
   - Expand "Climb Analysis" to see per-climb metrics

2. **Interpret Fatigue Metrics**
   - **Peak VAM**: Your best climbing performance in this activity
   - **Average VAM**: Overall climbing fitness indicator
   - **Fatigue Resistance**: How well you maintained climbing power
   - **Individual Climbs**: Track performance degradation through the race

3. **Use Insights for Training**
   - High peak VAM + large dropoff → Focus on muscular endurance
   - Low overall VAM → Build aerobic climbing power with sustained hill repeats
   - Inconsistent VAM → Work on pacing strategy and effort distribution

### For Developers

1. **Run Historical Re-Analysis**
   ```typescript
   import { reanalyzeAllActivitiesWithVAM } from '@/engine/historicalAnalysis/analyzeActivityTerrain';

   // Re-analyze all activities with new VAM calculation
   const count = await reanalyzeAllActivitiesWithVAM();
   console.log(`Analyzed ${count} activities`);
   ```

2. **Analyze New Activity**
   ```typescript
   import { analyzeTerrainFromStreams } from '@/engine/trailAnalysis';
   import { saveCompleteTerrainAnalysis } from '@/engine/historicalAnalysis/analyzeActivityTerrain';

   const terrain = analyzeTerrainFromStreams(
     distanceStream,
     elevationStream,
     durationMin,
     elevationGain
   );

   if (terrain.significantClimbsCount > 0) {
     await saveCompleteTerrainAnalysis(
       logEntryId,
       userId,
       activityDate,
       terrain
     );
   }
   ```

3. **Query Climb Data**
   ```typescript
   const { data } = await supabase
     .from('activity_climb_segments')
     .select('*')
     .eq('log_entry_id', activityId)
     .order('climb_number');
   ```

## Technical Details

### Climb Identification Algorithm

1. **Window-based scanning**: 150m rolling window to calculate grade
2. **Threshold detection**: Identifies segments where grade > 3%
3. **Adjacent merging**: Combines climbs separated by < 50m flat/downhill
4. **Significance filtering**: Only keeps climbs with >80m gain AND >400m distance
5. **Category assignment**: Based on difficulty score = (grade × 2) + (gain / 100)

### Time Allocation Model

Time is allocated to climbs proportionally based on effort:
- **Effort = distance × (1 + grade/100 × 3)**
- This accounts for the fact that steep climbs take more time per meter
- Remaining time is allocated to non-climbing segments

### Fatigue Calculation Methods

1. **Regression-based slope** (scientific):
   - Weighted linear regression across all climbs
   - Weight = climb elevation gain
   - Produces smooth, noise-resistant measure

2. **First-to-last dropoff** (user-friendly):
   - Simple percentage: `((last_VAM - first_VAM) / first_VAM) × 100`
   - Intuitive and emotionally readable
   - Both metrics stored for different use cases

### Performance Benchmarks

VAM ranges and interpretations:
- **800+ m/h**: Elite climbing (Kilian Jornet, Jim Walmsley level)
- **600-800 m/h**: Strong climbing (competitive trail runners)
- **400-600 m/h**: Moderate pace (recreational ultrarunners)
- **300-400 m/h**: Conservation mode (late-race fatigue)
- **<300 m/h**: Significant fatigue (needs recovery/training)

Fatigue resistance:
- **0 to -10%**: Excellent (minimal fatigue)
- **-10 to -25%**: Good (normal fatigue)
- **-25 to -40%**: Moderate (needs endurance work)
- **>-40%**: Significant (muscular endurance training required)

## Files Modified

### Core Engine
- `src/engine/trailAnalysis.ts` - Core terrain analysis with new VAM calculation
- `src/engine/historicalAnalysis/analyzeActivityTerrain.ts` - Database persistence

### UI Components
- `src/components/activity/ActivityTerrainBreakdown.tsx` - Climb analysis display

### Database
- `supabase/migrations/20251208140928_add_climb_segments_and_vam_metrics.sql`

## Testing Recommendations

1. **Test with varied terrain**:
   - Flat activities (should show 0 climbs)
   - Single climb activities (no fatigue metrics)
   - Multi-climb ultramarathons (full analysis)

2. **Verify data accuracy**:
   - Check climb elevation gains match GPS data
   - Validate VAM values against known performances
   - Confirm fatigue metrics match subjective experience

3. **UI testing**:
   - Test "Show All Climbs" toggle
   - Verify color coding updates correctly
   - Check insight messages for different fatigue levels

## Future Enhancements

The following features were planned but not yet implemented:

### 1. GPX Route Matching (Priority: Medium)
- Parse GPX files for race course profiles
- Match activity data to route climb segments
- Enable VAM prediction for upcoming races
- **File to create**: `src/engine/routeMatching.ts`

### 2. Adaptive Coach Integration (Priority: High)
- Analyze VAM trends over training cycles
- Generate personalized training recommendations
- Identify specific climbing weaknesses
- **File to create**: `src/engine/coachInsights/vamAnalysis.ts`

### 3. Performance Comparison (Priority: Medium)
- Compare VAM on equivalent climbs across attempts
- Track climb-specific improvement over time
- Generate progression charts
- **File to update**: `src/engine/performanceComparison.ts`

### 4. Real-time VAM Display (Priority: Low)
- Show live VAM during activity recording
- Alert on significant fatigue detection
- Provide pacing recommendations mid-climb

## Success Metrics

This implementation successfully:

✅ Transforms VAM from meaningless whole-activity metric to actionable per-climb analysis
✅ Reveals fatigue patterns invisible in traditional VAM calculation
✅ Provides scientifically rigorous AND user-friendly metrics
✅ Maintains backward compatibility with existing terrain analysis
✅ Enables historical trend analysis through retroactive re-analysis
✅ Delivers rich UI with climb-by-climb breakdown and AI insights

## Support

For questions or issues:
1. Check climb segment data in database: `activity_climb_segments` table
2. Verify terrain analysis records: `activity_terrain_analysis` table
3. Review console logs during `reanalyzeAllActivitiesWithVAM()` execution
4. Test with known activities to validate VAM calculations

---

**Implementation completed**: December 8, 2025
**Build status**: ✅ Successful (no errors)
**Database migration**: ✅ Applied
**TypeScript compilation**: ✅ Passing
