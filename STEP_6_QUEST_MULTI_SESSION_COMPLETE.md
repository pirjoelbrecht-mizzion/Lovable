# ✅ STEP 6 COMPLETE: Quest Page Multi-Session Rendering

## Implementation Summary

Fixed Quest page (cosmic bubble view) to properly render multiple sessions per day instead of collapsing them into a single bubble.

---

## Problem Statement

**Before STEP 6:**
- Quest page used `.map()` to create ONE SessionNode per day
- If a day had 2+ sessions, only the first was rendered as a bubble
- Second session info was appended to description text (hack)
- No way to see/interact with individual sessions on multi-session days

**After STEP 6:**
- Quest page uses `.flatMap()` to create MULTIPLE SessionNodes per day
- Each session gets its own bubble in the cosmic view
- Sessions on same day are slightly offset for visibility
- Visual badge shows "1/2", "2/2" for multi-session days

---

## Key Changes

### 1. Changed from `.map()` to `.flatMap()`

**Before:**
```typescript
return weekPlan.map((day, idx) => {
  const mainSession = day.sessions[0];  // Only first session
  const secondSession = day.sessions[1]; // Just for enrichment
  // ...
  return {
    id: day.label.toLowerCase(),  // Same ID for all sessions on day
    // ...
  };
});
```

**After:**
```typescript
return weekPlan.flatMap((day, idx) => {
  const daySessions = day.sessions.length > 0 ? day.sessions : [null];

  return daySessions.map((session, sessionIdx) => {
    // Process EACH session individually
    return {
      id: `${day.label.toLowerCase()}-${sessionIdx}`,  // Unique ID per session
      // ...
    };
  });
}).flat();
```

### 2. Unique IDs Per Session

Each session now gets a unique ID: `monday-0`, `monday-1`, `tuesday-0`

This allows:
- Individual bubbles to be tracked separately
- Drag-and-drop to work correctly
- Click handlers to target specific sessions

### 3. Position Offsetting for Multi-Session Days

```typescript
const xOffset = sessionIdx > 0 ? sessionIdx * 3 : 0;
const yOffset = sessionIdx > 0 ? sessionIdx * 2 : 0;

return {
  x: pos.x + xOffset,
  y: pos.y + yOffset,
  // ...
};
```

Sessions on the same day are slightly offset so they're visible as separate bubbles instead of overlapping completely.

### 4. Deduplicated Day Labels

**Problem:** With multiple sessions per day, the original code would render duplicate "MON" labels.

**Solution:**
```typescript
{Array.from(new Set(sessions.map(s => s.day))).map(day => {
  const firstSessionForDay = sessions.find(s => s.day === day);
  if (!firstSessionForDay) return null;
  return (
    <div key={`label-${day}`} style={{ position: "absolute", left: `${firstSessionForDay.x}%`, top: `${firstSessionForDay.y}%` }}>
      <div className={`quest-day-label ${firstSessionForDay.x > 50 ? "quest-day-right" : "quest-day-left"}`}>
        {day}
      </div>
    </div>
  );
})}
```

Only renders ONE label per unique day, positioned at the first session's location.

### 5. Visual Multi-Session Indicator

Added a badge showing session count:

```typescript
const sessionsOnSameDay = sessions.filter(s => s.day === session.day);
const isMultiSession = sessionsOnSameDay.length > 1;
const sessionIndex = sessionsOnSameDay.findIndex(s => s.id === session.id) + 1;

{isMultiSession && (
  <div
    className="quest-bubble-badge"
    style={{
      background: 'rgba(59, 130, 246, 0.9)',
      fontSize: '10px',
      top: 'auto',
      bottom: '4px',
      right: '4px'
    }}
    title={`Session ${sessionIndex} of ${sessionsOnSameDay.length}`}
  >
    {sessionIndex}/{sessionsOnSameDay.length}
  </div>
)}
```

Shows "1/2", "2/2" on multi-session days for clarity.

### 6. Added Logging

```typescript
if (daySessions.length > 1) {
  console.log(`[STEP 6] Multi-session day detected:`, {
    day: DAYS[idx],
    sessionCount: daySessions.length,
    sessions: daySessions.map(s => s?.title || 'Rest')
  });
}
```

Logs when multi-session days are rendered for debugging.

---

## Visual Examples

### Single Session Day (Monday)
```
┌─────────┐
│   MON   │ ← Day label
└─────────┘
    ↓
  ╭─────╮
  │ 🏃  │
  │ Easy│
  │ 60m │
  ╰─────╯
```

### Multi-Session Day (Wednesday)
```
┌─────────┐
│   WED   │ ← Single day label
└─────────┘
    ↓
  ╭─────╮     ╭─────╮
  │ 🏃  │     │ 💪  │
  │ Tempo    │ │ ME  │
  │ 45m │     │ 30m │
  │ 1/2 │     │ 2/2 │ ← Multi-session badges
  ╰─────╯     ╰─────╯
```

---

## Testing Scenarios

### Scenario 1: Single Session Per Day
**Input:** Week with 7 days, each with 1 session
**Expected:** 7 SessionNodes, no multi-session badges
**Result:** ✅ Works as before

### Scenario 2: One Day with Two Sessions
**Input:** Monday has [Easy Run, ME Circuit]
**Expected:**
- 2 SessionNodes for Monday
- Both show "MON" day label (deduplicated to 1 label)
- Badges: "1/2" and "2/2"
- Slight position offset
**Result:** ✅ Both sessions visible

### Scenario 3: Multiple Days with Multiple Sessions
**Input:**
- Monday: [Easy Run]
- Tuesday: [Tempo, Core]
- Wednesday: [Long Run, Strength, Recovery]
**Expected:**
- 6 SessionNodes total (1 + 2 + 3)
- Tuesday shows "1/2", "2/2"
- Wednesday shows "1/3", "2/3", "3/3"
**Result:** ✅ All sessions visible

### Scenario 4: Empty Day
**Input:** Tuesday has no sessions
**Expected:** 1 SessionNode showing "Rest"
**Result:** ✅ Rest day rendered

---

## Benefits

### User Experience
✅ Can now see all sessions on a day individually
✅ Can click/interact with each session separately
✅ Visual feedback shows multi-session days clearly
✅ Drag-and-drop still works for each session

### Developer Experience
✅ Code is more explicit about handling multiple sessions
✅ Logging makes multi-session behavior visible
✅ No more "hack" of appending second session to description
✅ Proper separation of concerns

### System Integrity
✅ Respects the `sessions[]` array structure
✅ No data loss - all sessions are rendered
✅ Unique IDs prevent collision bugs
✅ Foundation for STEP 7 (creating multiple sessions per day)

---

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ No new warnings
✅ All existing functionality preserved

---

## Files Modified

### Modified Files
- `/src/pages/Quest.tsx`
  - Changed `weekPlan.map()` to `weekPlan.flatMap()`
  - Added `daySessions.map()` for each session
  - Updated ID generation to include session index
  - Added position offsetting for multi-session days
  - Deduplicated day label rendering
  - Added multi-session badge indicator
  - Added logging for multi-session days

---

## Next Steps (STEP 7+)

Now that Quest page can RENDER multiple sessions:

**STEP 7:** Enable UI for CREATING multiple sessions per day
- Add "+ Session" button to days
- Allow users to add strength, core, or second run
- Ensure proper origin tracking (USER)

**STEP 8:** Clean up legacy single-workout assumptions
- Remove remaining `day.workout` references
- Ensure all components use `day.sessions[]`

**STEP 9:** Add comprehensive validation tests
- Test multi-session days with adaptive engine
- Test conflict resolution with user-created multi-sessions
- Test persistence and loading

**STEP 10:** Final sanity check and documentation

---

## Key Design Decisions

### Why `.flatMap()` + `.flat()`?
- `flatMap()` naturally handles variable array lengths
- Each day can produce 0-N SessionNodes
- `.flat()` at the end collapses nested arrays
- More functional than imperative loops

### Why Offset Positioning?
- Bubbles need to be visible as separate entities
- Small offset (3% x, 2% y) keeps them grouped visually
- Still recognizable as "same day" but clearly distinct
- Future: Could animate/stack them more elegantly

### Why Deduplicate Labels?
- One "MON" label is clearer than two overlapping labels
- Position at first session is intuitive anchor point
- Users understand multiple bubbles = multiple sessions without duplicate labels

### Why Badge Indicator?
- Immediate visual feedback for multi-session days
- Shows order (1/2, 2/2) for context
- Helps users understand which session is which
- Tooltip provides additional clarity

---

## Verification Checklist

✅ Multiple sessions on same day render as separate bubbles
✅ Each bubble has unique ID
✅ Position offsetting prevents complete overlap
✅ Day labels deduplicated (one per day)
✅ Multi-session badge shows "X/Y" format
✅ Logging confirms multi-session detection
✅ Build successful with no errors
✅ Existing single-session days work as before
✅ Empty days still render as "Rest"

---

## Summary

STEP 6 transforms Quest page from **single-session-per-day view** to **true multi-session visualization**. Each session now exists as an independent bubble with proper ID, position, and visual indicators. This is a critical foundation for allowing users to CREATE multiple sessions per day in STEP 7.

The refactor is clean, maintainable, and preserves all existing functionality while unlocking multi-session capabilities.

Ready for STEP 7! 🚀
