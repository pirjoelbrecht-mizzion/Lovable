# Event Elevation and Duration Display Fix

## Problem
Training plans (both Adaptive Coach and Quest "This Week" view) were missing:
1. **Elevation gain data** (showing 0m instead of actual elevation)
2. **Accurate duration** (not using personalized pace profile or stored duration)
3. **Type mismatch** - Session types didn't include required fields

## Solution Summary

### 1. Extended Session Type Definition
**File:** `src/utils/plan.ts`

Added missing fields to the `Session` type:
```typescript
export type Session = {
  title: string;
  km?: number;
  notes?: string;
  durationMin?: number;        // ✅ Added
  elevationGain?: number;      // ✅ Added
  type?: string;               // ✅ Added
  distanceKm?: number;         // ✅ Added
  zones?: any[];               // ✅ Added
  source?: "coach" | "user";   // ✅ Added
};
```

### 2. Created Duration Calculation Function
**File:** `src/utils/planEvents.ts`

New function `calculateEventDuration()` that:
- Uses user's personalized pace profile from GPX analysis
- Falls back to expected_time if provided by user
- Adds time penalty for elevation gain (10 min per 100m)
- Uses conservative 6:00 min/km if no profile available

```typescript
export async function calculateEventDuration(event: EventForDay): Promise<number> {
  // Priority 1: User-provided expected time
  if (event.expectedTime) {
    return parseExpectedTime(event.expectedTime);
  }

  // Priority 2: Calculate from personalized pace profile
  const paceProfile = await calculateUserPaceProfile();
  if (paceProfile && paceProfile.baseFlatPaceMinKm) {
    let totalTime = event.distanceKm * paceProfile.baseFlatPaceMinKm;
    // Add elevation penalty
    if (event.elevationGain) {
      totalTime += (event.elevationGain / 100) * 10;
    }
    return Math.round(totalTime);
  }

  // Priority 3: Conservative fallback (6:00 min/km)
  let totalTime = event.distanceKm * 6;
  if (event.elevationGain) {
    totalTime += (event.elevationGain / 100) * 10;
  }
  return Math.round(totalTime);
}
```

### 3. Updated Event Hook
**File:** `src/hooks/useWeeklyEvents.ts`

Enhanced to automatically calculate duration for each event:
```typescript
const enrichedEvents = await Promise.all(
  eventList.map(async (event) => {
    const calculatedDurationMin = await calculateEventDuration(event);
    return {
      ...event,
      calculatedDurationMin,
    };
  })
);
```

### 4. Created Event-to-Session Converter
**File:** `src/utils/eventPlanIntegration.ts` (new)

Utility functions to:
- Convert events to training session format
- Merge events into training plans
- Preserve elevation and duration data

```typescript
export async function eventToSession(event: EventForDay): Promise<Session> {
  const durationMin = await calculateEventDuration(event);

  return {
    title: event.name,
    type: 'race',
    distanceKm: event.distanceKm,
    durationMin,                    // ✅ Calculated duration
    elevationGain: event.elevationGain,  // ✅ Preserved elevation
    notes: `${event.elevationGain}m gain • Est. ${formatDuration(durationMin)}`,
    source: 'user',
  };
}
```

## Data Flow

```
Calendar Event (database)
    ↓
    distance_km: 54.8
    elevation_gain: 2380
    expected_time: "8:45:00" or null
    ↓
getEventsForWeek()
    ↓
calculateEventDuration()
    ├─→ Check expected_time (if provided)
    ├─→ Load personalized pace profile
    ├─→ Calculate: distance × pace + (elevation/100 × 10)
    └─→ Returns durationMin
    ↓
eventToSession()
    ↓
Training Session
    ├─→ distanceKm: 54.8
    ├─→ elevationGain: 2380      ✅ NOW DISPLAYED
    └─→ durationMin: 523 (8:43)  ✅ NOW DISPLAYED
    ↓
AdaptiveCoachPanel Display
    ↓
UI: "54.8 km • 523 min • 2380m vert"
```

## Display Format

Events now display with full details in training plans:

**Before:**
```
Chiang Mai
54.8 km • 0m vert
```

**After:**
```
Chiang Mai
54.8 km • 523 min • 2380m vert
Trail event • 2380m gain • Est. 8:43:00 • Priority A
```

## Calculation Examples

### Example 1: User with Pace Profile
**Event:** 50km trail race, 2000m gain
**User Profile:** Base pace 5:30 min/km (from GPS analysis)

```
Calculation:
- Flat time: 50 × 5.5 = 275 minutes
- Elevation: (2000 / 100) × 10 = 200 minutes
- Total: 475 minutes (7:55:00)
```

### Example 2: User-Provided Time
**Event:** 50km, expected time "8:00:00"

```
Calculation:
- Use provided time: 480 minutes
```

### Example 3: No Profile, Using Fallback
**Event:** 50km, 2000m gain, no pace profile

```
Calculation:
- Flat time: 50 × 6 = 300 minutes (conservative)
- Elevation: (2000 / 100) × 10 = 200 minutes
- Total: 500 minutes (8:20:00)
```

## Files Modified

1. **`src/utils/plan.ts`** - Extended Session type definition
2. **`src/utils/planEvents.ts`** - Added duration calculation functions
3. **`src/hooks/useWeeklyEvents.ts`** - Auto-calculate duration for events
4. **`src/utils/eventPlanIntegration.ts`** (new) - Event-to-session conversion utilities
5. **`src/pages/Planner.tsx`** - Updated Session type and display logic
6. **`src/pages/Quest.tsx`** - Updated SessionNode type and data extraction

## Testing

To verify the fix:

1. **Add a calendar event:**
   - Go to Calendar page
   - Click "Add Event"
   - Enter: 50km, 2000m elevation gain
   - Save

2. **Check Adaptive Coach Panel:**
   - Generate adaptive plan
   - Click "Details"
   - Verify event shows:
     - Distance: 50 km
     - Duration: ~XXX min (calculated)
     - Elevation: 2000m vert

3. **Check "This Week" training view:**
   - Event should display with elevation and duration
   - Format: "50 km • XXX min • 2000m vert"

## Benefits

1. **Accurate Planning:** Events now use realistic time estimates based on your actual pace
2. **Terrain Awareness:** Elevation gain properly factored into duration
3. **Training Load:** ACWR calculations now account for event difficulty
4. **Better Visualization:** Clear display of distance, time, and elevation

## Quest Page ("This Week" View) Fixes

### Problem
The Quest page was:
1. **Estimating duration** instead of using actual `durationMin` field
2. **Parsing elevation from notes** using regex instead of reading `elevationGain` field
3. **Missing elevation in SessionNode** type definition

### Solution

**Updated SessionNode Type:**
```typescript
type SessionNode = {
  // ... existing fields
  elevation?: number;  // ✅ Added
};
```

**Extract Real Data:**
```typescript
// OLD: Always estimated
const duration = estimateDuration(km, sessionType);

// NEW: Use actual duration if available
const durationMin = mainSession?.durationMin ?? fallback?.durationMin;
const duration = durationMin
  ? `${Math.floor(durationMin / 60)}h ${Math.floor(durationMin % 60)}m`
  : estimateDuration(km, sessionType);

const elevation = mainSession?.elevationGain ?? fallback?.elevationGain;
```

**Enhanced Description:**
```typescript
if (elevation && elevation > 0) {
  description = `${km}km • ${Math.round(elevation)}m↑ • ${duration}`;
}
```

### Display Result

**Before:**
```
Long Run
25K • 150 min
```

**After:**
```
Chiang Mai
54.8km • 2,380m↑ • 8h 43m
Trail event • Est. 8:43:00 • Priority A
```

## Related Documentation

- `CALENDAR_EVENTS_INTEGRATION.md` - Full event system documentation
- `PERSONALIZED_PACE_SYSTEM.md` - Pace profile calculation details
