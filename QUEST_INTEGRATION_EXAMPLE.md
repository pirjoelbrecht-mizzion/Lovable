# Quest Page Route Suggestions Integration Example

## Quick Integration Guide

This guide shows exactly how to add the Route Suggestions panel to your existing Quest page.

## Step 1: Import the Component

Add this import to the top of `src/pages/Quest.tsx`:

```tsx
import RouteSuggestions from '@/components/RouteSuggestions';
```

## Step 2: Add State for Selected Route

Inside the Quest component, add state to track route selection:

```tsx
const [selectedRoute, setSelectedRoute] = useState<DbSavedRoute | null>(null);
```

## Step 3: Extract Training Target

Create a helper to extract today's training target:

```tsx
const todayTarget = useMemo(() => {
  const today = todayDayIndex();
  const todaySession = weekPlan.sessions[today];

  return {
    distance: todaySession?.km || 10,
    elevation: todaySession?.elevationGain,
    terrain: todaySession?.terrain as 'road' | 'trail' | 'mixed' | undefined,
  };
}, [weekPlan]);
```

## Step 4: Add Route Selection Handler

```tsx
const handleRouteSelected = useCallback((route: DbSavedRoute) => {
  setSelectedRoute(route);
  toast(`Selected route: ${route.name}`, 'success');

  // Optional: Open route details modal
  // Optional: Add to today's session
  // Optional: Navigate to route explorer
}, []);
```

## Step 5: Insert Component in JSX

Add the RouteSuggestions component in your Quest page layout, typically after the daily workout summary:

```tsx
{/* Existing daily workout summary */}
<div className="daily-workout-card">
  <h2>Today's Training</h2>
  <p>{todaySession?.title || 'Rest day'}</p>
  {/* ... existing workout details ... */}
</div>

{/* NEW: Route Suggestions Panel */}
{todayTarget.distance > 0 && (
  <div style={{ marginTop: 16 }}>
    <RouteSuggestions
      targetDistance={todayTarget.distance}
      targetElevation={todayTarget.elevation}
      targetTerrain={todayTarget.terrain}
      onRouteSelected={handleRouteSelected}
    />
  </div>
)}

{/* Rest of Quest page content */}
```

## Complete Example

Here's a complete minimal integration:

```tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { getWeekPlan, type WeekPlan, todayDayIndex } from "@/lib/plan";
import RouteSuggestions from "@/components/RouteSuggestions";
import { type DbSavedRoute } from "@/lib/database";
import { toast } from "@/components/ToastHost";
import "./Quest.css";

export default function QuestPage() {
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<DbSavedRoute | null>(null);

  useEffect(() => {
    const plan = getWeekPlan();
    setWeekPlan(plan);
  }, []);

  const todayTarget = useMemo(() => {
    if (!weekPlan) return { distance: 0 };

    const today = todayDayIndex();
    const todaySession = weekPlan.sessions[today];

    return {
      distance: todaySession?.km || 0,
      elevation: todaySession?.elevationGain,
      terrain: todaySession?.terrain as 'road' | 'trail' | 'mixed' | undefined,
    };
  }, [weekPlan]);

  const handleRouteSelected = useCallback((route: DbSavedRoute) => {
    setSelectedRoute(route);
    toast(`Route selected: ${route.name}`, 'success');
  }, []);

  if (!weekPlan) {
    return <div>Loading...</div>;
  }

  const today = todayDayIndex();
  const todaySession = weekPlan.sessions[today];

  return (
    <div className="quest-page">
      <h1>Today's Quest</h1>

      {/* Daily Workout Summary */}
      <div className="workout-card">
        <h2>{todaySession?.title || 'Rest Day'}</h2>
        {todaySession?.km && (
          <p>{todaySession.km} km • {todaySession.description}</p>
        )}
      </div>

      {/* Route Suggestions */}
      {todayTarget.distance > 0 && (
        <div style={{ marginTop: 24 }}>
          <RouteSuggestions
            targetDistance={todayTarget.distance}
            targetElevation={todayTarget.elevation}
            targetTerrain={todayTarget.terrain}
            onRouteSelected={handleRouteSelected}
          />
        </div>
      )}

      {/* Selected Route Display */}
      {selectedRoute && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}>
          <h3>Selected Route</h3>
          <p>{selectedRoute.name} - {selectedRoute.distance_km} km</p>
          <button onClick={() => {
            // Navigate to route details or add to planner
            console.log('View route:', selectedRoute);
          }}>
            View Details
          </button>
        </div>
      )}

      {/* Rest of your Quest page content */}
    </div>
  );
}
```

## Advanced: Replace Session with Route

If you want to allow users to replace their planned session with a recommended route:

```tsx
const handleReplaceSessionWithRoute = useCallback(async (route: DbSavedRoute) => {
  const today = todayDayIndex();

  const updatedSessions = [...weekPlan.sessions];
  updatedSessions[today] = {
    ...updatedSessions[today],
    title: `Run: ${route.name}`,
    km: route.distance_km,
    elevationGain: route.elevation_gain_m,
    terrain: route.surface_type,
    routeId: route.id,
  };

  const updatedPlan = { ...weekPlan, sessions: updatedSessions };
  await saveWeekPlan(updatedPlan);
  setWeekPlan(updatedPlan);

  toast(`Updated today's session with ${route.name}`, 'success');
}, [weekPlan]);
```

Then update the handler:

```tsx
onRouteSelected={(route) => {
  setSelectedRoute(route);

  // Show confirmation dialog
  if (confirm(`Replace today's session with ${route.name}?`)) {
    handleReplaceSessionWithRoute(route);
  }
}}
```

## Styling Tips

The component uses inline styles by default, but you can customize via CSS:

```css
/* Quest.css */

.route-suggestions-panel {
  margin-top: 24px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Conditional Display

Show route suggestions only when relevant:

```tsx
{/* Only show for running sessions */}
{todaySession?.type === 'run' && todayTarget.distance > 0 && (
  <RouteSuggestions {...} />
)}

{/* Hide on rest days */}
{todaySession?.type !== 'rest' && (
  <RouteSuggestions {...} />
)}

{/* Show based on user preference */}
{userSettings.showRouteSuggestions && (
  <RouteSuggestions {...} />
)}
```

## Mobile Optimization

For mobile views, you might want to default to collapsed:

```tsx
<RouteSuggestions
  targetDistance={todayTarget.distance}
  targetElevation={todayTarget.elevation}
  targetTerrain={todayTarget.terrain}
  onRouteSelected={handleRouteSelected}
  defaultExpanded={window.innerWidth > 768}
/>
```

## Testing the Integration

1. **Verify Display**: Check that the panel appears on Quest page
2. **Test Expansion**: Click to expand and collapse the panel
3. **Check Scoring**: Verify routes are ranked correctly
4. **Test Selection**: Click a route and verify the handler fires
5. **Mobile View**: Test on mobile screen sizes
6. **Empty State**: Test with no saved routes
7. **Loading State**: Refresh page and verify loading indicator

## Troubleshooting

**Panel doesn't appear:**
- Check that todayTarget.distance > 0
- Verify routes exist in database
- Check browser console for errors

**Routes don't match:**
- Verify route distance/elevation data in database
- Check AI scoring weights in brain.ts
- Use RouteDebugMap to visualize scoring

**Performance issues:**
- Limit getSavedRoutes() to 100 routes
- Add memoization to expensive calculations
- Use React.memo() on RouteSuggestions component

## Next Steps

Once integrated:
1. Gather user feedback on route recommendations
2. Tune AI scoring weights based on usage
3. Add route preview modal
4. Implement one-click "Use this route" button
5. Add route history tracking
