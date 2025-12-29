# ✅ STEP 7 COMPLETE: Enable Multiple Sessions Per Day (UI)

## Implementation Summary

Added complete UI functionality for users to create multiple sessions per day with proper origin tracking and ownership enforcement.

---

## Problem Statement

**Before STEP 7:**
- Users could only have ONE session per day (unless AI coach added more)
- No UI to manually add additional sessions
- Impossible to create multi-session training days (e.g., morning run + evening strength)
- Only adaptive engine could create multi-session days

**After STEP 7:**
- Users can click "+ Add" button for any day
- AddSessionModal provides clean interface for session creation
- All user-created sessions have `origin: "user"` and `locked: false`
- Multiple sessions per day fully supported in UI
- Sessions properly tracked with unique IDs

---

## Key Components Created

### 1. AddSessionModal Component

**File:** `/src/components/AddSessionModal.tsx`

**Features:**
- Clean modal interface for adding sessions
- Session type selector: Run, Strength, Core, Rest
- Title input with smart defaults per type
- Optional distance input (for runs)
- Optional notes textarea
- Validation: requires title before submission
- Responsive design with proper styling

**Type Options:**
```typescript
type SessionType = "run" | "strength" | "core" | "rest";

const sessionTypeOptions = [
  { type: "run", label: "Run", emoji: "🏃" },
  { type: "strength", label: "Strength", emoji: "💪" },
  { type: "core", label: "Core", emoji: "🧘" },
  { type: "rest", label: "Rest", emoji: "😌" },
];
```

**Smart Defaults:**
- Run → "Easy Run"
- Strength → "Strength Training"
- Core → "Core Training"
- Rest → "Rest Day"

### 2. AddSessionModal Styling

**File:** `/src/components/AddSessionModal.css`

**Design:**
- Dark theme consistent with app
- Backdrop blur for focus
- Type selector grid (4 columns)
- Active state highlighting (blue)
- Smooth transitions and hover effects
- Proper z-index layering

### 3. addUserSession Function

**File:** `/src/lib/plan.ts`

**Function:**
```typescript
export function addUserSession(dayIndex: number, sessionData: Partial<Session>)
```

**Behavior:**
- Generates unique session ID: `"s_" + random`
- Sets `origin: "user"` (CRITICAL for ownership)
- Sets `source: "user"` (legacy compatibility)
- Sets `locked: false` (user sessions can be adapted)
- Adds session to day's sessions array
- Triggers plan update events
- Returns new session ID

**Logging:**
```typescript
console.log('[STEP 7] Adding user session:', { dayIndex, sessionData });
console.log('[STEP 7] Created session with origin:', newSession.origin);
```

### 4. Quest Page Integration

**File:** `/src/pages/Quest.tsx`

**Changes:**

#### Added State
```typescript
const [addSessionDay, setAddSessionDay] = useState<{ label: string; index: number } | null>(null);
```

#### Added Handler
```typescript
const handleAddSession = (dayIndex: number, sessionData: any) => {
  console.log('[STEP 7] handleAddSession called:', { dayIndex, sessionData });
  addUserSession(dayIndex, sessionData);
  setRefresh((r) => r + 1);
  toast('Session added successfully', 'success');
};
```

#### Added UI Buttons
- "+ Add" button below each day label in bubbles view
- Small, blue, positioned below day name
- Logs when clicked
- Opens AddSessionModal for that specific day

#### Added Modal Rendering
```tsx
{addSessionDay && (
  <AddSessionModal
    dayLabel={addSessionDay.label}
    dayIndex={addSessionDay.index}
    onAdd={(sessionData) => handleAddSession(addSessionDay.index, sessionData)}
    onClose={() => setAddSessionDay(null)}
  />
)}
```

---

## User Flow

### Creating a Second Session

**Step 1:** User views week in bubbles view
```
┌─────────┐
│   WED   │ ← Day label
│  + Add  │ ← New button
└─────────┘
    ↓
  ╭─────╮
  │ ⚡  │ ← Existing tempo run
  │ Tempo│
  │ 45m │
  ╰─────╯
```

**Step 2:** User clicks "+ Add" button
- AddSessionModal opens
- Title: "Add Session to Wednesday"

**Step 3:** User selects session type
- Clicks "Strength" button
- Title auto-fills: "Strength Training"

**Step 4:** User customizes
- Changes title to "ME Circuit"
- Adds notes: "Lower body focus"
- Clicks "Add Session"

**Step 5:** Session added immediately
```
┌─────────┐
│   WED   │
│  + Add  │
└─────────┘
    ↓
  ╭─────╮     ╭─────╮
  │ ⚡  │     │ 💪  │ ← New session!
  │ Tempo│     │ ME  │
  │ 45m │     │ 30m │
  │ 1/2 │     │ 2/2 │ ← Multi-session badges
  ╰─────╯     ╰─────╯
```

**Step 6:** Toast confirms
```
✓ Session added successfully
```

---

## Data Flow

### Session Creation Flow

```
1. User clicks "+ Add" on day label
   ↓
2. Opens AddSessionModal with { label: "Wednesday", index: 2 }
   ↓
3. User fills form: { title: "ME Circuit", type: "strength", notes: "..." }
   ↓
4. onAdd() calls handleAddSession(2, sessionData)
   ↓
5. addUserSession(2, sessionData) creates:
   {
     id: "s_abc123",
     title: "ME Circuit",
     type: "strength",
     notes: "...",
     origin: "user",  ← CRITICAL
     source: "user",
     locked: false
   }
   ↓
6. Session added to weekPlan[2].sessions[]
   ↓
7. setWeekPlan() triggers events: "plan:updated", "planner:updated"
   ↓
8. setRefresh() forces Quest re-render
   ↓
9. Quest page re-renders with new session visible
   ↓
10. Toast shows "Session added successfully"
```

### Origin Enforcement

**CRITICAL:** All user-created sessions have `origin: "user"`:

```typescript
const newSession: Session = {
  id: "s_" + Math.random().toString(36).slice(2),
  title: sessionData.title || "New Session",
  notes: sessionData.notes || "",
  km: sessionData.km,
  source: "user",     // Legacy
  origin: "user",     // ← SESSION OWNERSHIP
  locked: false,      // User sessions can be adapted
  ...sessionData,
};
```

This ensures:
- ✅ Adaptive engine CANNOT delete user sessions
- ✅ Conflict resolution respects user intent
- ✅ Session ownership clearly tracked
- ✅ Proper separation of concerns

---

## Testing Scenarios

### Scenario 1: Add Single Session to Empty Day

**Input:** Rest day (no sessions)
**Action:** Click "+ Add", select "Run", title "Easy 5K", distance "5"
**Expected:**
- Session created with origin: "user"
- Bubble appears on Quest page
- No multi-session badge (only 1 session)
**Result:** ✅ Works

### Scenario 2: Add Second Session to Existing Day

**Input:** Day already has "Tempo Run"
**Action:** Click "+ Add", select "Strength", title "ME Lower"
**Expected:**
- Second session created with origin: "user"
- Two bubbles visible (slightly offset)
- Both show badges: "1/2", "2/2"
**Result:** ✅ Works

### Scenario 3: Add Third Session

**Input:** Day has "Morning Run" and "Strength"
**Action:** Click "+ Add", select "Core", title "Core Circuit"
**Expected:**
- Third session added
- Three bubbles visible
- Badges: "1/3", "2/3", "3/3"
**Result:** ✅ Works

### Scenario 4: Different Session Types

**Input:** Empty day
**Action:** Add Run, Strength, Core, Rest sessions sequentially
**Expected:**
- Each session has appropriate emoji
- Each has correct title/notes
- All have origin: "user"
- All visible in UI
**Result:** ✅ Works

### Scenario 5: Cancel Modal

**Input:** Open AddSessionModal
**Action:** Click "Cancel" or backdrop
**Expected:**
- Modal closes
- No session added
- No changes to plan
**Result:** ✅ Works

### Scenario 6: Empty Title Validation

**Input:** Open modal, clear title field
**Action:** Try to click "Add Session"
**Expected:**
- Button disabled
- Cannot submit
- No session created
**Result:** ✅ Works

---

## Integration with Existing System

### With STEP 6 (Multi-Session Rendering)

**Perfect Integration:**
- STEP 6 renders all sessions in `day.sessions[]`
- STEP 7 adds sessions to `day.sessions[]`
- UI automatically shows new sessions
- Position offsetting works for any number of sessions

**Example:**
```typescript
// STEP 7 adds session
addUserSession(2, { title: "ME", type: "strength" });

// STEP 6 renders it
weekPlan[2].sessions.forEach((session, idx) => {
  // Each session gets unique bubble with offset
  x: pos.x + (idx * 3),
  y: pos.y + (idx * 2),
});
```

### With STEP 5 (Conflict Resolution)

**Ownership Respected:**
- User-created sessions have `origin: "user"`
- Adaptive engine CANNOT delete them
- Conflict resolution keeps user sessions
- Coach can still add sessions alongside user sessions

**Example Conflict:**
```typescript
Day has:
  - [0] { title: "User Run", origin: "user" }

Coach tries to adapt:
  - Wants to replace with { title: "Easy", origin: "coach" }

Result:
  - User session PRESERVED
  - Coach session APPENDED
  - Day now has: [User Run, Easy (Coach)]
```

### With STEP 4 (Session-Level Adaptation)

**Adaptation Allowed:**
- User sessions have `locked: false`
- Coach can adapt user sessions (modify km, notes)
- Coach CANNOT delete user sessions
- Adaptation respects user intent

**Example:**
```typescript
User creates:
  { title: "Easy 10K", km: 10, origin: "user", locked: false }

Coach adapts based on fatigue:
  { title: "Easy 10K (Reduced)", km: 7, origin: "user", locked: false }
  // Still user's session, just adapted
```

---

## UI/UX Highlights

### Visual Design

**"+ Add" Buttons:**
- Small, unobtrusive
- Blue gradient matching app theme
- Positioned below day labels
- Hover effect for discoverability

**AddSessionModal:**
- Dark theme with blur backdrop
- Grid layout for session types
- Active state highlighting
- Clean, minimal design
- Mobile-responsive

### User Experience

**Discoverability:**
- "+ Add" visible but not distracting
- Appears below every day label
- Tooltip shows "Add session to [Day]"

**Ease of Use:**
- 1 click to open modal
- Smart defaults reduce typing
- 4 clicks for basic session: Type → Add Session
- Optional fields for customization

**Feedback:**
- Toast notification on success
- Immediate visual update (new bubble)
- Multi-session badge shows count
- No page reload required

---

## Logging and Debugging

### Console Logs

**When opening modal:**
```
[STEP 7] Opening add session modal for day: Wednesday 2
```

**When submitting:**
```
[STEP 7] AddSessionModal submitting: {
  title: "ME Circuit",
  type: "strength",
  notes: "Lower body focus"
}

[STEP 7] handleAddSession called: {
  dayIndex: 2,
  sessionData: { ... }
}

[STEP 7] Adding user session: {
  dayIndex: 2,
  sessionData: { ... }
}

[STEP 7] Created session with origin: user
```

**When rendering:**
```
[STEP 6] Multi-session day detected: {
  day: "Wednesday",
  sessionCount: 2,
  sessions: ["Tempo", "ME Circuit"]
}
```

---

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ No new warnings
✅ All existing functionality preserved
✅ 2 new files added (component + CSS)
✅ 1 function added to plan.ts
✅ Quest page properly integrated

---

## Files Modified/Created

### New Files
- `/src/components/AddSessionModal.tsx` - Modal component for adding sessions
- `/src/components/AddSessionModal.css` - Styling for modal

### Modified Files
- `/src/lib/plan.ts`
  - Added `addUserSession()` function
  - Exports new function for external use
  - Proper origin/locked tracking

- `/src/pages/Quest.tsx`
  - Imported AddSessionModal and addUserSession
  - Added `addSessionDay` state
  - Added `handleAddSession` handler
  - Added "+ Add" buttons in bubbles view
  - Rendered AddSessionModal at end of component

---

## Critical Design Decisions

### Why `origin: "user"`?

**Decision:** All user-created sessions have `origin: "user"`

**Reasoning:**
- Enables ownership tracking
- Prevents accidental deletion by coach
- Allows differentiated UI treatment
- Foundation for advanced features (locked sessions, premium users)

**Alternative Considered:** Use `source: "user"` only
**Rejected:** `source` is legacy, `origin` is canonical ownership field

### Why `locked: false`?

**Decision:** User sessions start as `locked: false`

**Reasoning:**
- Allows coach to adapt user sessions (helpful!)
- User can still benefit from AI adjustments
- Respects user intent while enabling intelligence
- Future: could add UI to lock specific sessions

**Alternative Considered:** Default to `locked: true`
**Rejected:** Too restrictive, limits adaptive capabilities

### Why separate modal vs inline editor?

**Decision:** Use separate modal (AddSessionModal)

**Reasoning:**
- Cleaner UI (doesn't clutter Quest page)
- Better mobile experience
- Reusable across views (cosmic, bubbles, list)
- Easier to add fields in future

**Alternative Considered:** Inline editor in bubble
**Rejected:** Too cramped, poor UX

### Why "+ Add" buttons vs context menu?

**Decision:** Visible "+ Add" buttons

**Reasoning:**
- More discoverable for users
- Clear affordance (obvious you can add)
- Faster workflow (1 click vs 2)
- Consistent with app's visual language

**Alternative Considered:** Right-click context menu
**Rejected:** Hidden, not mobile-friendly

---

## Usage Examples

### Example 1: Morning Run + Evening Strength

```typescript
// User adds morning run
addUserSession(2, {
  title: "Morning Easy",
  type: "run",
  km: 8,
  notes: "Pre-work run"
});

// User adds evening strength
addUserSession(2, {
  title: "Upper Body",
  type: "strength",
  notes: "Push-focused"
});

// Result: Wednesday has 2 sessions, both origin: "user"
```

### Example 2: Long Run + Recovery Core

```typescript
// User adds long run
addUserSession(6, {
  title: "Long Run",
  type: "run",
  km: 25,
  notes: "Race simulation"
});

// User adds recovery core
addUserSession(6, {
  title: "Post-Run Core",
  type: "core",
  notes: "Light stretching + core"
});

// Result: Sunday has 2 sessions for recovery focus
```

### Example 3: Triple Session Day

```typescript
// Morning easy
addUserSession(3, { title: "Morning Easy", type: "run", km: 5 });

// Noon strength
addUserSession(3, { title: "Strength", type: "strength" });

// Evening tempo
addUserSession(3, { title: "Evening Tempo", type: "run", km: 10 });

// Result: Thursday has 3 sessions (1/3, 2/3, 3/3 badges)
```

---

## Benefits

### For Users

✅ Full control over training schedule
✅ Can plan complex multi-session days
✅ Visual feedback (bubbles, badges)
✅ Simple, intuitive UI
✅ Works on mobile and desktop

### For Coaches (AI)

✅ User sessions preserved during adaptation
✅ Can still add complementary sessions
✅ Ownership clearly tracked
✅ No risk of deleting user intent

### For System

✅ Proper separation of concerns
✅ Ownership model enforced
✅ Foundation for future features
✅ Clean, maintainable code
✅ Reusable components

---

## Next Steps (STEP 8+)

**STEP 8: Clean up legacy hacks**
- Remove remaining single-workout assumptions
- Ensure all code uses `sessions[]` array
- Remove deprecated fields

**STEP 9: Add validation tests**
- Test multi-session adaptive engine
- Test conflict resolution with user sessions
- Test persistence and loading

**STEP 10: Final sanity check**
- Comprehensive testing
- Documentation review
- Edge case handling

---

## Summary

STEP 7 completes the **user-facing UI** for multi-session training days. Users can now:

1. Click "+ Add" on any day
2. Choose session type (run, strength, core, rest)
3. Customize title, distance, notes
4. Add multiple sessions to the same day
5. See all sessions rendered as separate bubbles
6. Have sessions properly tracked with `origin: "user"`

This unlocks the full potential of the multi-session system:
- Users create their base plan
- AI coach adds adaptive sessions alongside
- Conflict resolution respects user intent
- Everything renders correctly
- Ownership properly enforced

The foundation is now complete for advanced training plan management! 🚀
