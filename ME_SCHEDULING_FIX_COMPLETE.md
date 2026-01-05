# ME Scheduling Conflict Fix - Complete

## Problem Identified

**Critical scheduling error**: Hill ME (Muscular Endurance) training was being scheduled on **both Monday AND Wednesday**, violating fundamental recovery principles.

### Why This Is Wrong

1. **Insufficient Recovery Window**
   - Monday to Wednesday = only 48 hours
   - ME sessions require **minimum 72-96 hours** recovery between identical workouts
   - 48 hours is insufficient for frontier muscle fiber recovery

2. **Overtraining Risk**
   - Hill ME targets Type IIa frontier muscle fibers
   - These fibers require extended recovery time
   - Back-to-back sessions lead to:
     - Reduced training adaptation
     - Increased injury risk
     - Diminished performance gains
     - Accumulated fatigue

3. **Violates Periodization Principles**
   - ME is high-intensity strength stimulus
   - Should be treated like interval training (not easy runs)
   - Requires same recovery consideration as VO2max work

## The Fix

### Code Changes

**File: `src/lib/adaptive-coach/microcycle.ts`**

1. **Added Clear Comments** (Lines 446-449)
   ```typescript
   // 3. Add Strength Training (Wednesday ONLY - not Monday)
   // CRITICAL: ME sessions require 72-96 hours recovery between identical sessions
   // Hill ME targets frontier muscle fibers and should occur ONCE per week max
   // Wednesday is optimal: allows recovery from Tuesday's key workout + rest before Saturday long run
   ```

2. **Updated Distribution Pattern** (Lines 560-572)
   ```typescript
   // CRITICAL ME SCHEDULING RULE: Only Wednesday gets ME/Strength
   // Monday = Easy run only (NO ME - insufficient recovery to Wednesday)
   // Wednesday = Strength/ME session (72+ hours to Saturday long run)
   const pattern: { [key: string]: string } = {
     Mon: 'easy_0|easy_1|easy_2', // Easy recovery only (NO strength/ME)
     Tue: 'tuesday_vo2|tuesday_hills|tuesday_sharpener', // Key workout
     Wed: 'strength_wednesday', // ONLY day for ME/Strength (once per week)
     Thu: 'thursday_tempo|thursday_strides|easy_0',
     Fri: 'easy_0|easy_1|easy_2',
     Sat: 'saturday_long',
     Sun: 'easy_0|easy_1|easy_2',
   };
   ```

3. **Added Validation Function** (Lines 829-892)
   - New `validateMEScheduling()` function
   - Detects ME scheduling conflicts
   - Enforces minimum 72-hour spacing
   - Specific check for Monday-Wednesday conflict
   - Returns detailed conflict reports

**File: `src/services/coreTrainingService.ts`**

4. **Added Comprehensive Documentation** (Lines 29-50)
   - Clarifies difference between Core and ME training
   - Documents frequency rules by training period
   - Emphasizes 72-96 hour recovery requirement
   - Warns against Monday-Wednesday scheduling

## Correct Scheduling Rules

### ME (Muscular Endurance) Sessions

**Frequency by Phase:**
- **Base/Build Phase**: 1-2x per week maximum
  - Primary: Wednesday
  - Optional secondary: Sunday (if needed, 4 days spacing from Wednesday)
- **Peak Phase**: 1x per week (Wednesday only)
- **Taper Phase**: 0x per week (maintenance only)
- **Race Week**: 0x per week

**Recovery Requirements:**
- **Minimum spacing**: 72 hours between identical ME sessions
- **Optimal spacing**: 96 hours (4 days)
- **Never schedule**: Monday + Wednesday (only 48hr gap)
- **Safe combinations**:
  - ✅ Wednesday only (1x per week)
  - ✅ Wednesday + Sunday (4-day gap)
  - ❌ Monday + Wednesday (TOO CLOSE)
  - ❌ Tuesday + Thursday (TOO CLOSE)

**Weekly Pattern:**
```
Mon: Easy run (recovery)
Tue: Key workout (VO2max, tempo, or hill intervals)
Wed: ME/Strength session ← PRIMARY ME DAY
Thu: Easy or moderate run
Fri: Easy run (prep for long run)
Sat: Long run (key workout)
Sun: Easy recovery run (or optional 2nd ME if advanced)
```

### Core Training (Separate from ME)

**Frequency by Phase:**
- **Transition**: 3x per week, 20 min, low intensity
- **Base**: 2x per week, 25 min, moderate intensity
- **Intensity**: 2x per week, 15 min, maintenance only
- **Recovery**: 1x per week, 15 min, light work
- **Taper**: 1x per week, 10 min, activation only
- **Race Week**: 0x per week (optional mobility)

**Key Differences: Core vs ME**

| Aspect | Core Training | ME Training |
|--------|---------------|-------------|
| **Type** | Anti-rotation, anti-extension, stability | Hill repeats, weighted carries, leg circuits |
| **Intensity** | Light to moderate | High (neuromuscular) |
| **Duration** | 10-25 minutes | 35-60 minutes |
| **Frequency** | 1-3x per week | 1-2x per week |
| **Recovery** | 24-48 hours | 72-96 hours |
| **Muscle Fibers** | Stabilizers, Type I | Frontier fibers, Type IIa |
| **Fatigue** | Low | Moderate to high |

## Implementation Details

### Wednesday ME Session

**Structure:**
1. **Easy run first** (morning or pre-ME)
   - 6-8 km easy pace
   - Activates muscles, primes nervous system
2. **ME session** (afternoon or 2+ hours after run)
   - 35-60 minutes depending on phase
   - Type determined by terrain access:
     - Steep hills available: Outdoor Hill ME
     - Gym access: Gym-based ME
     - Moderate hills: Weighted pack ME
     - Treadmill/stairs: Indoor ME

**Multi-Session Day:**
- Wednesday shows **2 distinct sessions** in Quest view
- Session 1: Easy run bubble
- Session 2: Strength/ME bubble
- Both tracked independently
- User can complete in any order

### Validation

The new `validateMEScheduling()` function checks:

1. **Session count**: Warns if more than 2 ME sessions per week
2. **Spacing validation**: Ensures minimum 3-day gaps
3. **Monday-Wednesday conflict**: Specific error for this common mistake
4. **Returns**:
   ```typescript
   {
     isValid: boolean,
     conflicts: string[],   // Critical errors
     warnings: string[]     // Recommendations
   }
   ```

**Example validation output:**
```typescript
{
  isValid: false,
  conflicts: [
    "CRITICAL: Hill ME scheduled on both Monday and Wednesday. " +
    "This violates recovery principles. ME should occur ONCE per week on Wednesday only."
  ],
  warnings: []
}
```

## Testing the Fix

### Manual Testing Steps

1. **Check Current Week Plan**
   ```bash
   # In browser console
   const validation = validateMEScheduling(weeklyPlan);
   console.log('Valid:', validation.isValid);
   console.log('Conflicts:', validation.conflicts);
   ```

2. **Verify Distribution**
   - Monday should show: Easy run only
   - Wednesday should show: Easy run + Strength/ME
   - No other days should have ME sessions

3. **Regenerate Plan**
   - Click "Regenerate Plan" on Planner page
   - Check that Monday no longer has Hill ME
   - Confirm Wednesday has single ME session

### Expected Behavior After Fix

**Before Fix:**
```
Mon: Hill ME (❌ WRONG)
Tue: Intervals
Wed: Hill ME (❌ CONFLICT - only 48hr from Monday)
Thu: Easy
Fri: Easy
Sat: Long Run
Sun: Easy
```

**After Fix:**
```
Mon: Easy Run (✅ CORRECT)
Tue: Intervals
Wed: Easy Run + ME Session (✅ CORRECT - only ME day)
Thu: Easy
Fri: Easy
Sat: Long Run
Sun: Easy
```

## Scientific Rationale

### Frontier Muscle Fibers

Hill ME targets **Type IIa frontier fibers**:
- Located at the aerobic-anaerobic boundary
- Critical for sustained climbing power
- Require 72-96 hours for glycogen resynthesis
- Incomplete recovery reduces training adaptation

### Recovery Timeline

**Post-ME Recovery Phases:**
- **0-24 hours**: Acute fatigue, glycogen depleted
- **24-48 hours**: Initial recovery, soreness peaks
- **48-72 hours**: Glycogen restoring, adaptation occurring
- **72-96 hours**: Full recovery, supercompensation begins

**Scheduling on Monday + Wednesday:**
- Wednesday session occurs during Phase 2 (acute fatigue)
- Prevents Phase 4 (adaptation) from completing
- Results in accumulated fatigue without fitness gain

### Training Stimulus vs Recovery

**Single weekly ME session:**
- Provides sufficient stimulus for adaptation
- Allows complete recovery cycle
- Permits progressive overload week-to-week
- Prevents overtraining accumulation

**Multiple weekly ME sessions (too close):**
- Interrupts recovery before adaptation
- Accumulates fatigue without fitness gain
- Increases injury risk
- Reduces long-term progress

## References

- Training for the Uphill Athlete (House & Johnston, 2019)
- "Muscular Endurance and Neuromuscular Fatigue" Chapter
- 72-96 hour recovery window for high-intensity strength work
- Periodization principles for ultra endurance athletes

## Summary

**What Changed:**
- Monday now gets easy run only (NO ME)
- Wednesday remains the ONLY ME day per week
- Added validation to prevent future conflicts
- Comprehensive documentation of scheduling rules

**Why It Matters:**
- Proper recovery = better adaptation
- Single weekly ME session = optimal stimulus
- Prevents overtraining and injury
- Maximizes training efficiency

**Action Required:**
- Users should regenerate their training plans
- Any existing Monday ME sessions will be replaced with easy runs
- Wednesday ME sessions remain unchanged
- Validation will prevent future scheduling errors
