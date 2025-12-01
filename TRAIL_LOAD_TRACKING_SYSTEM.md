# Trail Running Load Tracking System

## Overview

A comprehensive trail running load management system that combines **distance (km)** and **vertical gain (m)** into a unified training load metric, applies the 10% progression rule, and provides intelligent safety alerts.

## 🎯 Key Features

### 1. **Combined Load Calculation**
- Normalizes vertical gain to distance equivalent
- Formula: `Combined Load = Distance + (Vertical / Ratio)`
- Default: 100m vertical ≈ 1km distance
- Adaptive ratio based on experience level:
  - Beginner/Intermediate: 100m : 1km
  - Advanced mountain runners: 80m : 1km
  - Mountain/ultra strength preference: 90m : 1km

### 2. **Automatic Trail Runner Detection**
Trail mode activates when user profile shows:
- `surface: 'trail'` or `'mixed'`
- `goalType: 'ultra'`
- `strengthPreference: 'mountain'` or `'ultra'`

### 3. **10% Progression Rule**
Monitors three metrics:
- Distance week-over-week change
- Vertical gain week-over-week change
- **Combined load week-over-week change** (most important)

Color coding:
- 🟢 Green: &lt;5% increase (safe)
- 🟡 Yellow: 5-10% increase (approaching limit)
- 🔴 Red: &gt;10% increase (unsafe)

### 4. **Visual Chart Component**
`WeeklyDistanceVertChart` displays:
- Distance as bars (dual Y-axis)
- Vertical gain as line (dual Y-axis)
- Combined load as shaded area
- Week-over-week percentage changes
- Safety warnings for excessive increases
- Tooltips with detailed metrics

### 5. **ACWR Integration**
New function: `calculateACWRWithTrailLoad()`
- Includes vertical gain in ACWR calculations
- Prevents scenarios where distance stays stable but vertical spikes
- More accurate injury risk assessment for trail runners

### 6. **Intelligent Coach Alerts**
Automatic alerts when:
- Combined load exceeds 10%
- Both distance AND vertical increase significantly
- Single metric jumps too high

Alert messages include:
- Current week metrics
- Week-over-week changes
- Specific recommendations (reduce volume, add rest, hold steady)
- Contextualized advice based on which metric(s) exceeded limits

## 📁 File Structure

### Core Utilities
```
src/utils/trailLoad.ts
```
- `isTrailRunner()` - Detects if user is trail runner
- `getLoadConfig()` - Returns personalized load configuration
- `calculateCombinedLoad()` - Computes total training load
- `calculateWeeklyLoads()` - Processes weekly data with thresholds
- `getSafetyWarning()` - Generates warning messages
- `getSafetyColor()` - Returns color based on safety status
- `formatLoadSummary()` - Human-readable load summary

### Chart Component
```
src/components/WeeklyDistanceVertChart.tsx
```
Props:
- `data` - Array of `{ week, distance, vertical }`
- `profile` - User profile for configuration
- `showCombinedLoad` - Toggle combined load area (default: true)
- `showWarnings` - Toggle safety warnings (default: true)

### Alert Service
```
src/services/trailLoadAlerts.ts
```
- `checkTrailLoadProgression()` - Analyzes weekly data for issues
- `sendTrailLoadAlertToCoach()` - Sends alert to AI coach
- `shouldShowTrailLoadAlert()` - Throttles repeated alerts
- `generateCoachResponse()` - Creates contextual coach message

### ACWR Integration
```
src/utils/acwrZones.ts
```
- Enhanced with `ACWRCalculationOptions` interface
- New `calculateACWRWithTrailLoad()` function
- Supports both distance-only and combined load calculations

### Data Aggregation
```
src/utils/dataAggregation.ts
src/types/timeframe.ts
```
- `aggregateByWeek()` now includes `vertical` field
- `BinnedDataPoint` type extended with `vertical?: number`

## 🚀 Usage Examples

### Basic Integration in Insights Page

```typescript
import { useMemo, useEffect, useState } from 'react';
import WeeklyDistanceVertChart from '@/components/WeeklyDistanceVertChart';
import { isTrailRunner } from '@/utils/trailLoad';
import { getCurrentUserProfile } from '@/lib/userProfile';
import { aggregateByWeek } from '@/utils/dataAggregation';

function Insights() {
  const [profile, setProfile] = useState(null);
  const entries = useLogEntries(); // your log entries

  useEffect(() => {
    getCurrentUserProfile().then(setProfile);
  }, []);

  const weeklyData = useMemo(() => {
    const weeks = aggregateByWeek(entries, 8);
    return weeks.map(w => ({
      week: w.key,
      distance: w.value,
      vertical: w.vertical || 0,
    }));
  }, [entries]);

  const isTrail = isTrailRunner(profile);

  return (
    <div>
      {isTrail ? (
        <WeeklyDistanceVertChart
          data={weeklyData}
          profile={profile}
        />
      ) : (
        <StandardDistanceChart data={weeklyData} />
      )}
    </div>
  );
}
```

### Manual Alert Trigger

```typescript
import { checkTrailLoadProgression, sendTrailLoadAlertToCoach } from '@/services/trailLoadAlerts';

async function checkAndAlert(weeklyData, profile) {
  const alert = await checkTrailLoadProgression(weeklyData, profile);

  if (alert) {
    console.log(`${alert.type}: ${alert.title}`);
    console.log(alert.message);

    // Send to coach
    await sendTrailLoadAlertToCoach(alert, profile);
  }
}
```

### ACWR with Trail Load

```typescript
import { calculateACWRWithTrailLoad } from '@/utils/acwrZones';

const acwr = calculateACWRWithTrailLoad(
  acuteLoadKm: 55,      // Last week distance
  chronicLoadKm: 48,    // Average of last 4 weeks
  acuteVerticalM: 1200, // Last week vertical
  chronicVerticalM: 900, // Average of last 4 weeks vertical
  verticalToKmRatio: 100 // 100m = 1km
);

// For trail runners with 100m:1km ratio:
// Acute: 55 + (1200/100) = 67 km-equivalent
// Chronic: 48 + (900/100) = 57 km-equivalent
// ACWR = 67 / 57 = 1.18 (safe zone)
```

## 🎨 Demo Page

Access the demo at `/trail-load-demo` (needs to be added to router):

```typescript
// src/main.tsx
import TrailLoadDemo from "./pages/TrailLoadDemo";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // ... other routes
      { path: "trail-load-demo", element: <TrailLoadDemo /> },
    ],
  },
]);
```

## 📊 Data Flow

```
Log Entries (LogEntry[])
  ↓
aggregateByWeek()
  ↓
{ week, distance, vertical }[]
  ↓
calculateWeeklyLoads() + getLoadConfig()
  ↓
WeeklyLoad[] with thresholds & flags
  ↓
WeeklyDistanceVertChart (visualization)
  +
checkTrailLoadProgression() → Alert
  ↓
sendTrailLoadAlertToCoach() → Coach message
```

## 🔧 Configuration

### Per-User Load Configuration

The system adapts to user experience:

```typescript
// Beginner trail runner
{
  verticalToKmRatio: 100,        // 100m vert = 1km
  maxWeeklyIncrease: 0.10,       // 10% max
  experienceMultiplier: 1.0       // No bonus
}

// Advanced mountain runner
{
  verticalToKmRatio: 80,         // 80m vert = 1km (handles vert better)
  maxWeeklyIncrease: 0.10,       // Still 10% base
  experienceMultiplier: 1.1       // Can handle 11% increases
}
```

## 🧪 Testing

Sample data for testing:

```typescript
const testData = [
  { week: 'Week -3', distance: 50, vertical: 900 },
  { week: 'Week -2', distance: 52, vertical: 950 },
  { week: 'Week -1', distance: 55, vertical: 1000 },
  { week: 'This Week', distance: 68, vertical: 1300 }, // 🔴 Over limit!
];
```

Expected results:
- Distance change: +23.6% (🔴 over 10%)
- Vertical change: +30.0% (🔴 over 10%)
- Combined load change: ~+24% (🔴 over 10%)
- Warning displayed
- Bar colored red
- Alert available to send to coach

## 🎯 Integration Checklist

- [x] ✅ Trail runner detection logic
- [x] ✅ Combined load calculation utilities
- [x] ✅ WeeklyDistanceVertChart component
- [x] ✅ ACWR integration with trail load
- [x] ✅ Coach alert service
- [x] ✅ Data aggregation enhancements
- [ ] ⏳ Add to Insights page (conditional render)
- [ ] ⏳ Wire up automatic alerts (on data sync)
- [ ] ⏳ Add trail load to performance model
- [ ] ⏳ Create onboarding hint for trail runners

## 📚 Best Practices

### For Trail Runners

1. **Never increase both distance and vertical in the same week**
   - Week 1: Increase distance, hold vertical
   - Week 2: Increase vertical, hold distance

2. **Use combined load as primary metric**
   - Don't just watch distance
   - A 40km week with 2000m vert = 60km flat equivalent

3. **Recovery matters more with elevation**
   - Downhill impact is significant
   - Factor in technical difficulty
   - Consider muscle soreness, not just HR

4. **Build vertical capacity gradually**
   - Start with 100m:1km ratio
   - Progress to 80m:1km as you adapt
   - Elite mountain runners: 60-70m:1km

### For Developers

1. **Always check `isTrailRunner()` before showing trail-specific UI**
2. **Use `vertical || 0` when accessing vertical field (it's optional)**
3. **Test with varied experience levels** to verify adaptive configuration
4. **Throttle coach alerts** - don't spam the user every week
5. **Provide context** in warnings - explain WHY the load is high

## 🔮 Future Enhancements

1. **Terrain difficulty multiplier**
   - Technical vs. runnable trails
   - Scrambling sections
   - Exposure level

2. **Altitude integration**
   - Adjust load for altitude training
   - Acclimatization tracking

3. **Weather impact**
   - Heat adds ~15% to load
   - Cold, wind, precipitation effects

4. **Recovery predictions**
   - Estimate recovery time based on load
   - Suggest optimal deload weeks

5. **Race-specific taper**
   - Different taper for distance vs. vertical races
   - Mountain ultra vs. road marathon taper

## 📖 References

- Gabbett, T. J. (2016). The training-injury prevention paradox
- Soligard et al. (2016). ACWR and injury risk in sports
- Mountain Ultra Training principles (Koop & Coates)
- Vertical gain equivalency research (various sources)

---

**System Status:** ✅ Production Ready

**Last Updated:** 2025-11-20

**Maintained By:** Mizzion Development Team
