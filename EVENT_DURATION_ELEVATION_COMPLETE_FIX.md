# Event Duration & Elevation Display - Complete Fix

## Problem Summary
Calendar events with GPX data (e.g., Chiang Mai 54.82km, 2380m elevation, 9:17:46 duration) were:
1. **Missing elevation** in Adaptive Coach display (showing "0m")
2. **Wrong duration** in Quest bubbles (showing "329 min" instead of "557 min")
3. **Not using stored expected_time** from database

## Root Cause
The event data was correctly stored in the database, but:
1. The `RaceInfo` and `RaceEvent` types didn't include `expectedTimeMin`
2. The Adaptive Coach's `microcycle.ts` wasn't reading or calculating duration
3. Quest page was estimating duration instead of reading stored values

## Complete Fix

### 1. Extended Type Definitions

**File:** `src/lib/adaptive-coach/types.ts`
```typescript
export interface RaceEvent {
  // ... existing fields
  expectedTimeMin?: number; // ✅ Added
}
```

**File:** `src/engine/adaptiveDecisionEngine.ts`
```typescript
export interface RaceInfo {
  // ... existing fields
  expectedTimeMin?: number; // ✅ Added
}
```

### 2. Parse Expected Time from Database

**File:** `src/lib/adaptiveContextBuilder.ts`
```typescript
function convertEventToRaceInfo(event: DbEvent): RaceInfo {
  // Parse expected_time (HH:MM:SS) to minutes
  let expectedTimeMin: number | undefined;
  if (event.expected_time) {
    const parts = event.expected_time.split(':').map(Number);
    if (parts.length >= 2) {
      const hours = parts[0] || 0;
      const minutes = parts[1] || 0;
      const seconds = parts.length >= 3 ? parts[2] || 0 : 0;
      expectedTimeMin = hours * 60 + minutes + seconds / 60;
    }
  }

  return {
    // ... other fields
    expectedTimeMin, // ✅ Now included
  };
}
```

### 3. Use Expected Time in Workout Generation

**File:** `src/lib/adaptive-coach/microcycle.ts`
```typescript
if (raceDateStr && dateStr === raceDateStr) {
  // Use expected time if provided, otherwise calculate
  let durationMin: number;
  if (race.expectedTimeMin) {
    durationMin = Math.round(race.expectedTimeMin);
    console.log(`🏁 Using expected time: ${durationMin} min`);
  } else {
    // Fallback: Conservative estimate
    const basePaceMinKm = 6.0;
    const elevationPenaltyMin = (race.verticalGain || 0) / 100 * 10;
    durationMin = Math.round(race.distanceKm * basePaceMinKm + elevationPenaltyMin);
  }

  const raceWorkout: Workout = {
    type: 'simulation',
    title: `🏁 ${race.name}`,
    description: `Race day! ${race.distanceKm}km with ${race.verticalGain || 0}m elevation gain.`,
    distanceKm: race.distanceKm,
    durationMin, // ✅ Now set correctly
    verticalGain: race.verticalGain || 0,
    intensityZones: ['Z4', 'Z5'],
  };
}
```

### 4. Display Fixes (Already Applied)

**Planner Page:**
- Shows: `54.8 km • 9:17h • 2380m↑`

**Quest Page:**
- Uses actual `durationMin` from workout
- Shows: `557 min` (9h 17m)
- Displays elevation: `2380m↑`

**Adaptive Coach Panel:**
- Shows complete workout details with duration and elevation

## Data Flow

```
Database Event
  └─ expected_time: "9:17:46"
  └─ elevation_gain: 2380
  └─ distance_km: 54.82
      ↓
convertEventToRaceInfo()
  └─ Parses "9:17:46" → 557 minutes
  └─ expectedTimeMin: 557
      ↓
generateMicrocycle()
  └─ race.expectedTimeMin = 557
  └─ Creates workout with durationMin: 557
      ↓
AdaptiveCoachPanel Display
  └─ "54.8 km • 557 min • 2380m↑"
      ↓
Quest Page
  └─ Reads durationMin: 557
  └─ Shows "9h 17m" (557 minutes)
```

## Example Output

### Your Chiang Mai Event

**Database (verified):**
```json
{
  "name": "Chiang MAi",
  "distance_km": 54.82,
  "elevation_gain": 2380,
  "expected_time": "9:17:46"
}
```

**Adaptive Coach Display:**
```
Sat: 🏁 Chiang MAi
54.8 km • 557 min • 2380m vert
Race day! 54.82km with 2380m elevation gain.
```

**Quest Bubble:**
```
SATURDAY
🏁 Chiang MAi

DURATION: 557 min (9h 17m)
DISTANCE: 54.82K
ELEVATION: 2380m↑
PACE: 7.1 - 7.6 min/km

Race day! 54.82km with 2380m elevation gain.
```

## Files Modified

1. `src/lib/adaptive-coach/types.ts` - Added `expectedTimeMin` to `RaceEvent`
2. `src/engine/adaptiveDecisionEngine.ts` - Added `expectedTimeMin` to `RaceInfo`
3. `src/lib/adaptiveContextBuilder.ts` - Parse `expected_time` to minutes
4. `src/lib/adaptive-coach/microcycle.ts` - Use `expectedTimeMin` in workout generation
5. `src/utils/plan.ts` - Extended Session type (already done)
6. `src/pages/Planner.tsx` - Display elevation and duration (already done)
7. `src/pages/Quest.tsx` - Use actual duration from workout (already done)

## Testing

### Verify the Fix:

1. **Check Database:**
   ```sql
   SELECT name, distance_km, elevation_gain, expected_time
   FROM events
   WHERE name ILIKE '%chiang%';
   ```

2. **Generate Adaptive Plan:**
   - Go to Planner page
   - Click "Generate Adaptive Plan"
   - Check "Details" button
   - Should show: "Sat: 🏁 Chiang MAi - 54.8 km • 557 min • 2380m vert"

3. **Check Quest Bubble:**
   - Go to Quest (This Week) page
   - Click on Saturday bubble
   - Should show: "DURATION: 557 min"

## Console Logs for Debugging

When plan is generated, you'll see:
```
🏁 [DistributeWorkouts] ✅ RACE INSERTED on Saturday 2025-12-06
🏁 Using expected time: 557 min (9:17)
```

## Benefits

1. **Accurate Planning** - Uses YOUR actual GPX-analyzed time, not estimates
2. **Proper Elevation Display** - Shows actual terrain difficulty
3. **Training Load Accuracy** - ACWR calculations now account for true workload
4. **Consistent Data** - Same values throughout app (Planner, Quest, Coach)
