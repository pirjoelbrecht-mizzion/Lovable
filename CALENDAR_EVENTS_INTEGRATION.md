# Calendar Events Integration with Adaptive Training Coach

## Overview

Calendar events (races, training camps, challenges) are now fully integrated into the weekly training calendar and Adaptive Decision Engine. When you add an event through the Calendar page, it automatically:

1. **Appears in training plans** for the corresponding week
2. **Affects ACWR calculations** based on event distance and elevation
3. **Triggers adaptive adjustments** from the coaching AI
4. **Counts toward weekly training load**

## How It Works

### 1. Event Storage

Events are stored in the `events` table with:
- **name**: Event/race name
- **date**: Event date (YYYY-MM-DD)
- **type**: 'street', 'trail', or 'other'
- **distance_km**: Distance in kilometers (from GPX or manual entry)
- **expected_time**: Expected finish time (HH:MM:SS)
- **elevation_gain**: Total elevation gain in meters
- **location**: Event location
- **gpx_file_url**: URL to uploaded GPX file (optional)
- **priority**: 'A', 'B', or 'C' (A = goal race, B = tune-up, C = training)

### 2. Data Flow

```
AddEventModal
    ↓ (saves event)
events table in Supabase
    ↓ (queried by)
adaptiveContextBuilder
    ↓ (converts to RaceInfo)
Adaptive Decision Engine
    ↓ (adjusts plan)
Weekly Training Calendar
```

### 3. Workload Calculation

Events contribute to training load using this formula:

```typescript
Base Workload = distance_km × 10 units/km

+ Elevation Bonus = (elevation_gain / 100) × 10 units

× Priority Multiplier:
  - A races: 1.5×
  - B races: 1.2×
  - C races: 1.0×
```

**Example:**
- 50km race with 2,000m gain, Priority A
- Base: 50 × 10 = 500 units
- Elevation: (2000 / 100) × 10 = 200 units
- Subtotal: 700 units
- Priority A: 700 × 1.5 = **1,050 units**

This is equivalent to ~105km of flat running in training load impact.

### 4. Pace Estimation

When distance is not provided but expected time is available:

```typescript
// Assumes conservative 6:00 min/km pace
estimated_km = total_minutes / 6
```

This ensures the adaptive coach accounts for the event even without a GPX file.

### 5. Adaptive Coach Integration

The Adaptive Decision Engine considers events through:

**Race Calendar Context:**
- `mainRace`: Primary goal race (Priority A) or nearest event
- `daysToMainRace`: Days until goal race
- `allUpcoming`: All future events sorted by date

**Automatic Adjustments:**
- **8+ weeks out**: Base building phase
- **4-7 weeks out**: Specificity phase (more race-specific training)
- **2-3 weeks out**: Taper begins (volume reduction)
- **1 week out**: Peak taper (60-70% volume)
- **Race week**: Minimal volume, focus on freshness

### 6. Training Replacement Logic

An event replaces scheduled training if:
- Priority A race (goal race)
- Distance > 15km
- Expected duration > 2 hours

Otherwise, it supplements training (additional workload).

## Usage

### Adding an Event

1. Go to **Calendar** page
2. Click "Add Event" button
3. Fill in event details:
   - Name and date (required)
   - Type (street/trail/other)
   - Expected finish time
   - Total elevation gain
4. Optional: Upload GPX file for precise distance/elevation
5. Set priority (A/B/C)
6. Save

### Viewing Events in Training Plan

Events appear in:
- **Planner page**: Integrated into weekly sessions
- **Today view**: Shows events happening today
- **Insights page**: Factored into ACWR and readiness

### How Adaptive Coach Uses Events

The coach automatically:
- **Reduces volume** in weeks leading to A races
- **Increases specificity** (more race-pace work, vertical gain)
- **Schedules recovery** after events
- **Warns** if training load is too high near events
- **Adjusts pacing** recommendations based on event terrain

## API Reference

### Fetching Events

```typescript
import { getEvents } from '@/lib/database';

const events = await getEvents(50); // Get up to 50 events
```

### Getting Events for Current Week

```typescript
import { getEventsForWeek } from '@/utils/planEvents';
import { getWeekPlan } from '@/lib/plan';

const weekPlan = getWeekPlan();
const eventsByDate = await getEventsForWeek(weekPlan);

// eventsByDate is a Map<string, EventForDay[]>
// Key = date (YYYY-MM-DD), Value = array of events on that date
```

### Using in Components

```typescript
import { useWeeklyEvents } from '@/hooks/useWeeklyEvents';

function MyComponent() {
  const weekPlan = getWeekPlan();
  const { eventsByDate, totalEventWorkload, hasEvents, loading } = useWeeklyEvents(weekPlan);

  if (loading) return <div>Loading events...</div>;

  return (
    <div>
      {hasEvents && <p>Total event load: {totalEventWorkload} units</p>}
      {/* Render events */}
    </div>
  );
}
```

## Database Schema

### events table

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('street', 'trail', 'other')),
  date date NOT NULL,
  distance_km numeric,
  expected_time text,  -- HH:MM:SS format
  elevation_gain integer,  -- meters
  location text,
  gpx_file_url text,
  priority text CHECK (priority IN ('A', 'B', 'C')),
  goal text,  -- Optional goal description
  notes text,  -- Optional notes
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_user_date ON events(user_id, date);
```

## Implementation Files

### Core Integration
- `src/lib/adaptiveContextBuilder.ts` - Fetches events and converts to RaceInfo
- `src/utils/planEvents.ts` - Event utilities and workload calculations
- `src/hooks/useWeeklyEvents.ts` - React hook for weekly events

### UI Components
- `src/components/AddEventModal.tsx` - Event creation form
- `src/pages/Calendar.tsx` - Calendar view with events
- `src/components/ThisWeekBoard.tsx` - Weekly training board (can show events)

### Database
- `src/lib/database.ts` - getEvents(), saveEvent() functions
- `supabase/migrations/20251107130000_add_calendar_events_tables.sql` - Schema

## Testing

To verify integration:

1. **Add a test event** 7 days in the future, Priority A, 50km, 2000m gain
2. **Check Planner page** - Should show event in that week
3. **Check Insights** - ACWR should account for event workload
4. **Trigger Module 4** - Coach should mention taper if race is soon
5. **View Today screen** - Should show event if today is event day

## Future Enhancements

- Weather integration for event day
- Automatic recovery day scheduling post-event
- Event results tracking and learning
- Pacing strategy recommendations per event
- Travel logistics integration
