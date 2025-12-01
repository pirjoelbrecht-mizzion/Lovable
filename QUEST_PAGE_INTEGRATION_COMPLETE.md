# Quest Page Integration - Complete

## What Changed

The **Route Suggestions** component has been successfully integrated into the Quest page. Users will now see AI-powered route recommendations directly below their weekly training overview.

## Implementation Details

### 1. Added Imports
```tsx
import RouteSuggestions from '@/components/RouteSuggestions';
import { type DbSavedRoute } from '@/lib/database';
import { toast } from '@/components/ToastHost';
```

### 2. Added Training Target Calculation
The system now extracts today's training target from the weekly plan:

```tsx
const todayTarget = useMemo(() => {
  const todaySession = weekPlan[today];
  const mainSession = todaySession?.sessions[0];

  if (!mainSession || !mainSession.km || mainSession.km === 0) {
    return null;
  }

  return {
    distance: mainSession.km,
    elevation: parsed elevation from notes (if present),
    terrain: 'trail' | 'road' | 'mixed' (parsed from notes),
  };
}, [weekPlan, today]);
```

### 3. Added Route Selection Handler
```tsx
const handleRouteSelected = (route: DbSavedRoute) => {
  toast(`Selected route: ${route.name}`, 'success');
  setSelectedSession(null);
};
```

### 4. Integrated Component into JSX
The Route Suggestions panel appears:
- **After** the weekly training card (bubble or list view)
- **Only when** today has a running session with distance > 0
- **Before** the upcoming races section

```tsx
{todayTarget && (
  <div style={{ marginTop: 24 }}>
    <RouteSuggestions
      targetDistance={todayTarget.distance}
      targetElevation={todayTarget.elevation}
      targetTerrain={todayTarget.terrain}
      onRouteSelected={handleRouteSelected}
    />
  </div>
)}
```

## User Experience

### When It Appears
- User opens the Quest page (`/quest`)
- Today's training session includes a run with distance
- The panel appears collapsed by default

### How It Works
1. **Automatic Matching**: AI scores all saved routes against today's training target
2. **Top 3 Display**: Shows the best 3 matching routes with scores
3. **Expandable Panel**: Click header to expand and see full details
4. **Weather-Aware**: Applies penalties for hot weather conditions
5. **One-Click Selection**: Click any route to select it

### Visual Indicators
- **Match Score Badge**: Color-coded (green ≥80%, blue ≥60%, yellow <60%)
- **"BEST MATCH" label** on the top recommendation
- **Detailed Breakdown**: Distance, elevation, and surface scores
- **Refresh Button**: Manually re-calculate recommendations

## What Happens When User Clicks a Route

Currently: Toast notification appears with route name

**Future enhancements** you can add:
- Open route details modal
- Replace today's session with selected route
- Navigate to route explorer with route highlighted
- Add route to favorites
- Export route as GPX

## Testing the Integration

### 1. With a Running Session Today
1. Make sure today's plan includes a run (e.g., "10K Easy Run")
2. Open `/quest` page
3. You should see "Route Suggestions" panel below weekly view
4. Click to expand and view top 3 routes

### 2. Without Routes in Database
- Panel shows: "No saved routes match your training target"
- Call-to-action: "Explore and save routes to get AI-powered recommendations"

### 3. On Rest Day
- Route Suggestions panel **does not appear**
- Only shows if today has a run with distance > 0

## Example Training Session Formats

The system parses these formats:

**Distance Only:**
```
Session: 10K Easy Run
Notes: Zone 2 effort
```
→ Matches routes ~10km, any terrain

**With Elevation:**
```
Session: Hill Repeats
Notes: 8K with 400m elevation gain
```
→ Matches routes ~8km with ~400m elevation

**With Terrain:**
```
Session: Trail Run
Notes: 15K on trail surface
```
→ Prioritizes trail routes ~15km

## Database Requirements

For the Route Suggestions to work, you need:

1. **Saved Routes in Database**
   - Import from Strava starred segments
   - Manually add routes via Route Explorer
   - Import GPX files (future feature)

2. **Route Metadata**
   - Distance (required)
   - Elevation gain (recommended)
   - Surface type (recommended)
   - Popularity and scenic scores (optional)

## Adding Sample Routes for Testing

You can add sample routes to test the feature:

```sql
-- Add test routes to your database
INSERT INTO saved_routes (user_id, name, distance_km, elevation_gain_m, surface_type, popularity_score, scenic_score)
VALUES
  (auth.uid(), 'Morning Park Loop', 8.5, 120, 'trail', 8, 9),
  (auth.uid(), 'Hill Training Circuit', 10.0, 400, 'trail', 7, 8),
  (auth.uid(), 'City Flat Run', 5.0, 30, 'road', 9, 6);
```

Or use the Route Explorer to discover nearby Strava segments.

## Performance Notes

- Route matching executes client-side (fast for <100 routes)
- Weather data cached for 15 minutes
- Component only renders when training target exists
- Lazy-loads AI scoring algorithm

## Customization Options

You can customize the behavior by modifying:

### Show/Hide Logic
```tsx
{todayTarget && userSettings.showRouteSuggestions && (
  <RouteSuggestions ... />
)}
```

### Default Expanded State
```tsx
<RouteSuggestions
  {...props}
  defaultExpanded={true}  // Always show expanded
/>
```

### Integration with Planner
```tsx
const handleRouteSelected = async (route: DbSavedRoute) => {
  const confirmed = confirm(`Replace today's session with ${route.name}?`);
  if (confirmed) {
    await updateTodaySession({
      title: `Run: ${route.name}`,
      km: route.distance_km,
      notes: `${route.elevation_gain_m}m elevation • ${route.surface_type}`,
    });
    toast('Session updated!', 'success');
  }
};
```

## Build Status

✅ **Build Successful**
- No TypeScript errors
- All dependencies resolved
- Bundle size: 3.12 MB (within limits)
- Component properly integrated

## Next Steps

1. **Add Sample Routes**: Import routes from Strava or add manually
2. **Test with Real Data**: Create a training plan and verify recommendations
3. **Tune Scoring Weights**: Adjust AI weights in `brain.ts` if needed
4. **Add Route Preview**: Create modal to show route details before selection
5. **Enable Route Replacement**: Allow users to swap their planned session with recommended route

## Files Modified

- `src/pages/Quest.tsx` - Added Route Suggestions integration

## Files Created (Already Implemented)

- `src/components/RouteSuggestions.tsx` - Main UI component
- `src/ai/brain.ts` - AI scoring engine (extended)
- `src/utils/weather.ts` - Location-based weather (extended)
- `src/hooks/useOfflineSync.ts` - Offline support
- Database migrations for saved_routes tables

---

**The Route Recommendation System is now live on the Quest page!**

Users will see intelligent route suggestions every time they open their daily training view.
