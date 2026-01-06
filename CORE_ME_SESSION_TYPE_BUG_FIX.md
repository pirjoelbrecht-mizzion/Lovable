# Core vs ME Session Type Bug - FIXED

## Summary

Fixed critical bugs where **Core Training** and **ME Training** sessions were being confused, causing:
1. All strength sessions showing incorrect ME workout details
2. Core Training sessions displaying ME template information
3. Wrong emoji indicators (💪 for all instead of 💪 for Core, 🏋️ for ME)

## Root Causes

### 1. Missing Session Type in `detectSessionType`

**File:** `src/pages/Quest.tsx` (Line 113)

The adaptive plan generator creates:
- Core Training: `type: 'strength'`
- ME Training: `type: 'muscular_endurance'`

But `detectSessionType` had:
```typescript
const validTypes = ['strength', 'recovery', 'easy', 'tempo', 'intervals', 'long', 'workout'];
// Missing: 'muscular_endurance'!
```

**Result:** ME Training sessions with `type: 'muscular_endurance'` were **NOT** recognized, fell through to text matching, and incorrectly mapped to 'strength'.

**Fix:**
```typescript
const validTypes = ['strength', 'muscular_endurance', 'recovery', 'easy', 'tempo', 'intervals', 'long', 'workout'];
```

### 2. Wrong `isMESession` Flag

**File:** `src/pages/Quest.tsx` (Line 763)

```typescript
// BEFORE (Wrong!)
isMESession: sessionType === 'strength',
```

This marked **ALL** strength sessions (Core + ME) as `isMESession: true`, causing:
- Core Training sessions to show MESessionInline component
- Wrong template data displayed

**Fix:**
```typescript
// AFTER (Correct!)
isMESession: sessionType === 'muscular_endurance',
```

### 3. Core Sessions Getting ME Assignment Data

**File:** `src/pages/Quest.tsx` (Lines 682-695)

```typescript
// BEFORE (Wrong!)
if (sessionType === 'strength') {
  if (meAssignment) {
    title = `ME ${meAssignment.meType}...`;
    // Changed ALL strength sessions to show ME data
  }
}
```

**Fix:**
```typescript
// AFTER (Correct!)
if (sessionType === 'muscular_endurance') {
  if (meAssignment) {
    title = `ME ${meAssignment.meType}...`;
    emoji = "🏋️";
  }
} else if (sessionType === 'strength') {
  // Core Training keeps original title
  emoji = "💪";
}
```

### 4. Missing Emoji for ME Sessions

**File:** `src/pages/Quest.tsx` (Line 90-98)

```typescript
// BEFORE (Missing!)
const SESSION_EMOJIS: Record<string, string> = {
  strength: "💪",
  // muscular_endurance missing!
};
```

**Fix:**
```typescript
// AFTER (Added!)
const SESSION_EMOJIS: Record<string, string> = {
  strength: "💪",
  muscular_endurance: "🏋️",
};
```

### 5. Wrong Session Type in selectedSession

**File:** `src/pages/Quest.tsx` (Lines 811-832)

```typescript
// BEFORE (Wrong!)
const isStrength = sessionType === 'strength';
// ...
isMESession: isStrength,  // Marked Core as ME!
```

**Fix:**
```typescript
// AFTER (Correct!)
const isMESession = sessionType === 'muscular_endurance';
const isCoreSession = sessionType === 'strength';
// ...
isMESession: isMESession,  // Only ME sessions marked
```

## Changes Made

### File: `src/pages/Quest.tsx`

1. **Line 90-98:** Added `muscular_endurance: "🏋️"` to SESSION_EMOJIS
2. **Line 113:** Added `'muscular_endurance'` to validTypes array
3. **Lines 682-695:** Split logic to handle ME vs Core sessions separately
4. **Lines 726-729:** Updated to clear distance/pace for both types
5. **Lines 738-745:** Updated description logic for both types
6. **Line 764:** Changed `isMESession: sessionType === 'strength'` to `sessionType === 'muscular_endurance'`
7. **Lines 811-832:** Added proper type checks for isMESession and isCoreSession

## Expected Result

### Monday
- ✅ Shows: Easy Run + **Core Training** (💪)
- ✅ When clicked: Shows Core exercises, NOT ME template

### Tuesday
- ✅ Shows: Short Hill Sprints (🔥) ONLY
- ✅ When clicked: Shows hill sprint workout details, NOT strength info

### Wednesday
- ✅ Shows: Easy Run + **ME Training** (🏋️)
- ✅ When clicked: Shows ME template with Hill exercises, NOT Core

### Session Display Rules

| Session Type | Original Type Value | Title Display | Emoji | Modal Shows |
|-------------|---------------------|---------------|-------|-------------|
| Core Training | `'strength'` | "Core Training" | 💪 | CoreSessionCard |
| ME Training | `'muscular_endurance'` | "ME Training" or "ME HILL" | 🏋️ | MESessionInline |
| Running | `'easy'`, `'tempo'`, etc. | Original title | 🏃/⚡/🔥 | Run details |

## Testing

After clearing browser cache (Ctrl+Shift+R):

1. ✅ **Monday** should show Core Training with 💪 emoji
   - Click it → Should show Core exercises, NOT ME template
2. ✅ **Tuesday** should show ONLY Hill Sprints with 🔥 emoji
   - Click it → Should show workout details, NO strength card
3. ✅ **Wednesday** should show Easy Run + ME Training with 🏋️ emoji
   - Click ME → Should show ME template with hill exercises

## Architecture Notes

The system now properly distinguishes:

1. **Type Field:** The raw type from adaptive plan (`'strength'` vs `'muscular_endurance'`)
2. **Session Type:** The normalized type after detection
3. **Display Logic:** Separate paths for Core vs ME rendering
4. **Modal Logic:** `isMESession` flag only true for actual ME sessions

This prevents cross-contamination between Core and ME session data.
