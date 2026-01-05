# Multi-Session Display Fix - Summary

## Issue Description
When clicking on "today's training" in the Quest view, the interface initially displayed a "Core Training" card, then automatically jumped/switched to show "Easy Recovery Run" instead. Only one training bubble was displayed instead of two separate bubbles.

## Root Cause
The core training sessions were loaded separately via `useCoreTraining()` hook and rendered conditionally in the UI layer, but were **NOT part of the weekPlan data structure**. This caused:

1. Only the run session appeared as a bubble in the week view
2. When clicking today's bubble, both components rendered in the same modal container
3. React's rendering cycle caused a "jump" effect as components loaded sequentially

## Solution Implemented

### Changes Made to `/src/pages/Quest.tsx`

#### 1. Core Training Integration (Lines 197-235)
Added a `useEffect` hook that:
- Monitors when core training is scheduled (`selectedCoreSession`, `coreEmphasis`, `coreFrequency`)
- Checks if today already has a strength session (to avoid duplicates)
- Injects core training as a **separate session** into the weekPlan for today
- Normalizes the plan to ensure proper rendering

```typescript
useEffect(() => {
  if (!selectedCoreSession.length || !coreEmphasis || coreFrequency.frequency === 0) {
    return; // No core training scheduled
  }

  // Check if today already has a strength session
  const todayDay = weekPlan[today];
  const hasStrengthSession = todayDay?.sessions?.some(s => {
    const sessionType = detectSessionType(s.title || '', s.notes, (s as any).type);
    return sessionType === 'strength';
  });

  if (hasStrengthSession) {
    return; // Avoid duplicate
  }

  // Add core training as a separate session
  const coreSession: Session = {
    id: `core-${Date.now()}`,
    title: 'Core Training',
    km: 0,
    notes: `${selectedCoreSession.length} exercises • ${coreEmphasis} focus`,
    type: 'strength',
    source: 'coach',
  };

  // Update weekPlan with new session
  updatedPlan[today] = {
    ...updatedPlan[today],
    sessions: [...(updatedPlan[today].sessions || []), coreSession],
  };

  setWeekPlan(normalizeAdaptivePlan(updatedPlan));
}, [selectedCoreSession.length, coreEmphasis, coreFrequency.frequency, today]);
```

#### 2. Enhanced Diagnostic Logging (Lines 669-680)
Added clear console logging to help diagnose multi-session days:

```typescript
if (daySessions.length > 1) {
  console.log(`[Quest] 🎯 Multi-session day: ${DAYS[idx]}`, {
    sessionCount: daySessions.length,
    sessions: daySessions.map(s => ({
      id: s?.id,
      type: (s as any)?.type,
      title: s?.title || 'Rest',
      km: s?.km,
    })),
  });
}
```

## Expected Behavior After Fix

### In Week View (Bubbles/Cosmic Mode)
✅ **TWO separate bubbles** appear for today:
- Bubble 1: Run training (e.g., "Easy Recovery Run" 🏃)
- Bubble 2: Core training (e.g., "Core Training" 💪)
- Bubbles are slightly offset (3px horizontal, 2px vertical)
- Each bubble shows a badge like "1/2" and "2/2"

### In Modal (When Clicking a Bubble)
✅ Clicking the **run bubble** shows run details only
✅ Clicking the **core bubble** shows core training exercises only
✅ No more "jumping" between sessions

### In Mobile View
✅ Both sessions appear stacked vertically with proper spacing
✅ User can scroll to see both sessions

## Verification Steps

### 1. Check Console Logs
Open browser console and look for these messages:
```
[Quest] Core training scheduled, checking if needs to be added to plan
[Quest] Adding core training as separate session for today
[Quest] 🎯 Multi-session day: Wednesday
  sessionCount: 2
  sessions: [
    { id: 'xxx', type: 'easy', title: 'Easy Recovery Run', km: 6 },
    { id: 'core-xxx', type: 'strength', title: 'Core Training', km: 0 }
  ]
```

### 2. Visual Verification
- Open the Quest page
- Look at today's training
- You should see **2 bubbles** slightly offset from each other
- The first bubble should show your run training
- The second bubble should show "Core Training" with a 💪 icon
- Each bubble should have a badge showing "1/2" and "2/2"

### 3. Interaction Test
- Click on the first bubble (run) → Should show run details
- Close modal
- Click on the second bubble (core) → Should show core exercises
- No "jumping" or switching should occur

## Technical Architecture

### Session Flow
```
useCoreTraining() → selectedCoreSession
                 ↓
         useEffect (new)
                 ↓
      Inject into weekPlan
                 ↓
      normalizeAdaptivePlan()
                 ↓
         weekPlan state
                 ↓
     sessions useMemo → SessionNode[]
                 ↓
      Render as bubbles
```

### Key Architectural Decisions

1. **Single Source of Truth**: weekPlan is the authoritative data structure for all training sessions
2. **Reactive Integration**: Core training is injected reactively when scheduled
3. **Deduplication**: Checks prevent duplicate strength sessions on the same day
4. **Proper IDs**: Each session gets a unique ID for proper React key handling
5. **Type Safety**: Sessions are properly typed with `type: 'strength'` for correct rendering

## Files Modified
- `/src/pages/Quest.tsx` (Lines 197-235, 669-680)

## Related Systems
- `useCoreTraining()` hook - Provides core training data
- `useStrengthTraining()` hook - Provides ME session data
- `normalizeAdaptivePlan()` - Converts sessions to UI workouts
- `CosmicWeekView` component - Renders the bubbles
- `TodayTrainingMobile` component - Renders mobile view

## Potential Edge Cases Handled

1. **Duplicate Prevention**: Won't add core training if strength session already exists
2. **Empty State**: Only injects when core training is actually scheduled
3. **Race Conditions**: Uses unique timestamp-based IDs to prevent conflicts
4. **Plan Updates**: Properly normalizes after injection to maintain UI consistency

## Future Enhancements

If issues persist, consider:
1. Moving core training scheduling into the adaptive plan generation itself
2. Adding explicit multi-session support to plan templates
3. Creating a dedicated "session composer" that handles multi-session days upfront
4. Adding UI controls to manually add/remove sessions from days
