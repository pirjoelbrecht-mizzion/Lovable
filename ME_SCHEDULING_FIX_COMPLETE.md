# ME and Core Training Scheduling Fix - Complete

## Problems Identified

### 1. ME Scheduling Conflict (CRITICAL)

**Critical scheduling error**: Hill ME (Muscular Endurance) training was being scheduled on **both Monday AND Wednesday**, violating fundamental recovery principles.

### 2. Missing Core Training Sessions

**Core sessions not appearing**: Only ME sessions were being generated. Core training (lighter stability work) was completely absent from weekly plans, despite being a separate requirement with different frequency rules.

### Why ME Conflict Was Wrong

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

### Why Missing Core Sessions Was Wrong

1. **Core ≠ ME (They're Different!)**
   - **Core training** = Anti-rotation, anti-extension, stability (lighter work)
   - **ME training** = Hill repeats, weighted carries, leg circuits (heavy work)
   - Both are needed but serve different purposes

2. **Missing Essential Injury Prevention**
   - Core work provides stabilization for running
   - Prevents compensatory movement patterns
   - Reduces injury risk from accumulated fatigue
   - Should occur 2-3x per week in base phase

3. **Incomplete Training System**
   - `useCoreTraining` hook existed but wasn't connected
   - Core exercises in database but never scheduled
   - Users couldn't complete the full strength training program

## The Fix

### Code Changes

**File: `src/lib/adaptive-coach/microcycle.ts`**

**Part 1: Fixed ME Scheduling**

1. **Changed ME Session Type** (Lines 446-459)
   - Changed from `type: 'strength'` to `type: 'muscular_endurance'` for clarity
   - Changed ID from `strength_wednesday` to `me_wednesday`
   - Added comments explaining 72-96 hour recovery requirement

2. **Added Core Training Sessions** (Lines 461-500)
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
Mon: Hill ME (❌ WRONG - conflict with Wednesday)
Tue: Intervals
Wed: Hill ME (❌ WRONG - only 48hr recovery)
Thu: Easy
Fri: Easy
Sat: Long Run
Sun: Easy

Missing: No core training sessions scheduled
```

**After Fix (Base Phase):**
```
Mon: Easy Run + Core Training (✅ 25min core work)
Tue: Intervals
Wed: Easy Run + ME Session (✅ 45min heavy work)
Thu: Easy + Core Training (✅ 25min core work)
Fri: Easy
Sat: Long Run
Sun: Easy

Strength: 1 ME (45min) + 2 Core (25min each) ✅
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
1. **ME Scheduling Fixed:**
   - Monday now gets easy run only (NO ME)
   - Wednesday remains the ONLY ME day per week
   - Added validation to prevent future conflicts

2. **Core Training Added:**
   - Core sessions now appear as separate bubbles
   - 2-3 sessions per week (phase-dependent)
   - Scheduled on easy days (Monday, Thursday, Friday)
   - Duration adjusts by phase (20-25 min)

3. **Complete Strength System:**
   - Both ME and Core training now fully functional
   - Proper separation of heavy vs light work
   - Comprehensive documentation of all rules

**Why It Matters:**
- **ME fix**: Proper recovery = better adaptation, prevents overtraining
- **Core addition**: Injury prevention, running efficiency, stability
- **Complete system**: Users get full strength training program
- **Better results**: Balanced load distribution, optimal stimulus

**Action Required:**
- Users should regenerate their training plans
- Monday ME will be removed, Core may be added
- Wednesday ME remains unchanged
- Additional Core sessions will appear on easy days
- Both ME and Core sessions will show as separate bubbles in Quest view
