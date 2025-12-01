# 🐛 Race Date Debugging Guide

## Problem

The Chiang Mai race is showing on **Friday** instead of **Sunday (Nov 30, 2024)**.

## Root Cause Analysis

This is likely a **date format mismatch** or **week alignment issue**. The race date matching logic compares:
- `race.date` (from database)
- `day.date` (generated for each day in plan)

If these don't match exactly, the race won't be inserted on the correct day.

## Enhanced Debug Logging

I've added comprehensive logging to identify the exact issue. When you refresh the page, open **Browser Console (F12)** and look for:

### Expected Console Output

```
🏁 Race Found: Chiang Mai | Days away: 4 | Priority: A
⚠️ RACE WEEK ACTIVE - Should override to race_week/taper phase

🏁 [DistributeWorkouts] Race week detected! Race date: 2024-11-30
🏁 [DistributeWorkouts] Week starts: 2024-11-25

[DistributeWorkouts] Day 0 (Mon): 2024-11-25 | Race: 2024-11-30 | Match: false
[DistributeWorkouts] Day 1 (Tue): 2024-11-26 | Race: 2024-11-30 | Match: false
[DistributeWorkouts] Day 2 (Wed): 2024-11-27 | Race: 2024-11-30 | Match: false
[DistributeWorkouts] Day 3 (Thu): 2024-11-28 | Race: 2024-11-30 | Match: false
[DistributeWorkouts] Day 4 (Fri): 2024-11-29 | Race: 2024-11-30 | Match: false
[DistributeWorkouts] Day 5 (Sat): 2024-11-30 | Race: 2024-11-30 | Match: false ← SHOULD BE TRUE!
[DistributeWorkouts] Day 6 (Sun): 2024-12-01 | Race: 2024-11-30 | Match: false

🏁 [applyAllLayers] Race week! Inserting race on 2024-11-30
🏁 [applyAllLayers] Plan days: Mon: 2024-11-25, Tue: 2024-11-26, Wed: 2024-11-27...

[applyAllLayers] Checking Mon (2024-11-25) vs Race (2024-11-30): false
[applyAllLayers] Checking Tue (2024-11-26) vs Race (2024-11-30): false
...
[applyAllLayers] Checking Sat (2024-11-30) vs Race (2024-11-30): true ← MATCH!
🏁 [applyAllLayers] ✅ RACE INSERTED on Sat 2024-11-30
```

## Diagnostic Steps

### Step 1: Check Race Data in Database

```sql
SELECT
  id,
  name,
  date_iso,
  priority,
  distance_km,
  elevation_gain
FROM races
WHERE user_id = 'your-user-id'
AND name LIKE '%Chiang%'
ORDER BY date_iso DESC;
```

**Expected:**
- `date_iso`: `2024-11-30` (YYYY-MM-DD format)
- `priority`: `A`

**If date is wrong:**
```sql
UPDATE races
SET date_iso = '2024-11-30'
WHERE name LIKE '%Chiang%';
```

### Step 2: Check Console Logs

Open Console (F12) and search for:

1. **Race Detection:**
   - Search: `Race Found`
   - Should show: `🏁 Race Found: Chiang Mai | Days away: X`

2. **Date Comparison:**
   - Search: `DistributeWorkouts`
   - Check all 7 days (Mon-Sun)
   - Find which day shows `Match: true`

3. **Week Alignment:**
   - Search: `Week starts`
   - Verify: Should be Monday of current week

### Step 3: Check Week Boundaries

The issue might be that the **plan week doesn't include Sunday Nov 30**.

**Example Problem:**
```
Week starts: 2024-12-02 (next Monday)
Days: Mon Dec 2 - Sun Dec 8
Race: Nov 30 (BEFORE week starts!)
Result: Race never matches any day
```

**Solution:** The plan must be for the week that **contains** Nov 30:
```
Week starts: 2024-11-25 (this Monday)
Days: Mon Nov 25 - Sun Dec 1
Race: Nov 30 (Saturday)
Result: Race matches Saturday
```

### Step 4: Force Plan Regeneration

If the plan is cached or stale:

```typescript
// In browser console
const { refresh } = useAdaptiveTrainingPlan();
await refresh();
```

Or trigger manually:
1. Go to Settings
2. Change any setting (e.g., toggle unit preference)
3. Save
4. This triggers plan regeneration

## Common Issues & Fixes

### Issue 1: Date Format Mismatch

**Symptom:** Console shows dates in different formats
```
Race: 2024-11-30T00:00:00.000Z
Day: 2024-11-30
Match: false (string comparison fails!)
```

**Fix Applied:** Used `toLocalDateString()` helper to normalize all dates to `YYYY-MM-DD`

### Issue 2: Timezone Offset

**Symptom:**
```
Race (UTC): 2024-11-30T00:00:00Z → Local: 2024-11-29
Day (Local): 2024-11-30
Match: false
```

**Fix Applied:** Force local timezone with `T00:00:00` suffix and avoid `toISOString()`

### Issue 3: Wrong Week

**Symptom:** All 7 days show dates that don't include race date

**Example:**
```
Week: Dec 2-8
Race: Nov 30
Result: Race never matches (it's in previous week!)
```

**Fix:** Ensure `weekStartDate` aligns with current week containing race date

### Issue 4: Day Name vs Date Mismatch

**Symptom:** Race inserted on correct DATE but wrong DAY NAME

**Example:**
```
Fri: 2024-11-30 (but Nov 30 is actually Saturday!)
```

**Fix:** Verify `dayNames` array index matches actual day of week

## Verification Checklist

After reloading page with Console open:

- [ ] `🏁 Race Found: Chiang Mai` appears
- [ ] `Days away: 4` (or similar small number)
- [ ] `Priority: A` confirmed
- [ ] `Race week detected! Race date: 2024-11-30`
- [ ] Week starts on Monday (Nov 25)
- [ ] Day 5 (Sat) shows `2024-11-30`
- [ ] Day 5 shows `Match: true`
- [ ] `✅ RACE INSERTED on Sat 2024-11-30`
- [ ] Calendar shows race on **Saturday Nov 30**

## If Race Still on Wrong Day

### Check Day Names Array

The `dayNames` array is:
```typescript
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
```

This means:
- Index 0 = Monday
- Index 5 = **Saturday**
- Index 6 = Sunday

**Verify:**
```javascript
// In console
const raceDate = new Date('2024-11-30T00:00:00');
console.log('Nov 30 is:', raceDate.toLocaleDateString('en-US', { weekday: 'long' }));
// Should show: "Saturday"
```

If Nov 30 is Saturday, but showing on Friday:
- The week start date is likely **one day late**
- Should start Mon Nov 25, not Tue Nov 26

### Manual Override Test

If all else fails, you can manually verify the date calculation:

```javascript
// In console
const weekStart = new Date('2024-11-25T00:00:00'); // Monday

for (let i = 0; i < 7; i++) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().slice(0, 10);
  const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
  console.log(`${i}: ${dayName} ${dateStr}`);
}
```

Expected output:
```
0: Mon 2024-11-25
1: Tue 2024-11-26
2: Wed 2024-11-27
3: Thu 2024-11-28
4: Fri 2024-11-29
5: Sat 2024-11-30 ← THIS SHOULD MATCH RACE!
6: Sun 2024-12-01
```

## Emergency Fix

If the system consistently puts race on wrong day, you can:

1. **Update race date to match wrong day:**
   ```sql
   -- If race shows on Friday, update to Friday
   UPDATE races SET date_iso = '2024-11-29' WHERE name LIKE '%Chiang%';
   ```

2. **Or adjust week start:**
   - The issue is likely in how the weekly plan determines its start date
   - Check `weekStartDate` in the context builder

## Next Steps

1. **Reload page** with Console open (F12)
2. **Copy all console logs** related to race
3. **Share the logs** so we can see exact date comparison
4. Look specifically for the line that shows `Match: true`
5. That tells us which day index (0-6) the race is being inserted on

The enhanced logging will show us exactly where the date matching succeeds or fails!
