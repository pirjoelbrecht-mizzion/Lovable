# Progression Rules Refactor - COMPLETE

## Summary

Removed hardcoded `volumeCeiling` constraints and replaced with **rule-based progression system** that follows Uphill Athlete training principles.

## Problem

The system had hardcoded volume ceilings:
- **Cat1: 80 km/week** (becomes 12h/week on flat but 13h+ in mountains)
- **Cat2: 140 km/week** (becomes 23h/week in mountains - INSANE!)

For ultra mountain runners, km-based ceilings don't make sense. A 140km ceiling on mountainous terrain could mean 20+ hours/week of training, which is unsustainable and dangerous.

## Solution

**NO HARD CEILINGS** - Maximum volume emerges from:

1. **Current load + safe progression rules**
2. **Time/fatigue/injury limits (natural boundaries)**
3. **ACWR safety thresholds**
4. **Modulation cycles (3:1 or 2:1)**

## Key Training Principles (Now Implemented)

### Progression Guidelines
- ≤10% per week increase for distance, vertical, and time
- Max 3 weeks of increases in a row
- Can't increase distance, vertical, AND intensity same week
- Large jumps (~15%) must be followed by recovery
- Never >15% for two consecutive weeks

### Modulation Guidelines
- Use 3:1 or 2:1 build-to-recovery cycle
- Recovery weeks: Drop load by 40-60%
- Don't hold load constant for multiple weeks
- Rest before you are forced to

### Intensity Guidelines
- Start Z3 at ≤5% of weekly volume; build to 10%
- Add Z4 only when comfortable with Z3 at 10%
- Drop Z2 when adding Z3/Z4; do base work in Z1
- Adding intensity should not reduce Z1-Z2 volume by >5%
- Use 30/30s to introduce Z4 if new to high intensity

## Changes Made

### 1. New Module: `progressionRules.ts`

Created comprehensive progression rule system:

```typescript
calculateProgressionConstraints(context) → {
  maxIncrease: number,      // Dynamic, not hardcoded
  mustRecover: boolean,     // Force recovery when needed
  canHoldSteady: boolean,   // Prevent load plateaus
  reasoning: string[],      // Explain the limits
  warnings?: string[]
}
```

**Features:**
- Tracks consecutive build weeks
- Detects large jumps and forces recovery
- Enforces ACWR safety
- Limits increases during intensity weeks
- Multi-dimensional progression tracking (distance, vertical, time, intensity)

### 2. Updated Files

#### `athlete-profiler.ts`
- ❌ Removed `volumeCeiling` from `ClassificationResult`
- ❌ Removed `CEILING_KM` from `VOLUME_SETTINGS`
- ✅ Kept `startMileage` (conservative starting point)
- ✅ Kept age-based adjustments (but for starting point, not ceiling)

#### `types.ts`
- ❌ Removed `volumeCeiling?: number` from `AthleteProfile`

#### `safety.ts`
- ✅ Imports `calculateProgressionConstraints` from `progressionRules`
- ✅ Updated `calculateSafeVolumeRange()` to use progression rules
- ❌ Removed age-based ceiling checks (age affects starting point, not max)

#### `microcycle.ts`
- ❌ Removed `Math.min(targetMileage, athlete.volumeCeiling || 120)`
- ✅ Progression now limited by rules, not arbitrary cap

#### `athleteIntelligenceProfile.ts`
- ❌ Removed `volumeCeiling` from classification data
- ✅ `weeklyMileageCapacity` now derived from category (still used for display/reference)

## Example: How Progression Works Now

**Scenario:** Cat2 athlete currently at 50km/week

### Old System (Hardcoded Ceiling)
```
Week 1: 50km
Week 2: 55km (+10%)
Week 3: 60km (+9%)
Week 4: 66km (+10%)
...continue building...
Week N: Hit 140km ceiling ← HARD STOP (23 hours in mountains!)
```

### New System (Rule-Based)
```
Week 1: 50km (start)
Week 2: 55km (+10% ✓)
Week 3: 60.5km (+10% ✓)
Week 4: 66.5km (+10% ✓) [3 weeks up - at limit]
Week 5: 33km (MANDATORY RECOVERY -50%) [3:1 cycle]
Week 6: 73km (+10% from 66.5) [fresh cycle]
Week 7: 80km (+10% ✓)
Week 8: 88km (+10% ✓) [3 weeks up]
Week 9: 44km (RECOVERY -50%)
...continues indefinitely...

Ceiling emerges from:
- ACWR going red (forced recovery)
- Time constraints (can't run >X hours/week)
- Fatigue scores (body says no)
- Life events (travel, work, injury)
```

## Benefits

1. **No arbitrary caps** - volume grows with fitness
2. **Safer** - forced recovery prevents overtraining
3. **Terrain-agnostic** - works for flat road or 8000m+ vert/week
4. **Respects physiology** - ACWR, fatigue, age all factored in
5. **Transparent** - reasoning array explains every limit

## What Athlete Sees

Instead of:
> "You've hit your 140km ceiling"

They see:
> "Recovery week required (3 build weeks completed). Target: 44km (50% drop)"
>
> **Reasoning:**
> - 3 consecutive build weeks completed
> - ACWR at 1.28 (approaching caution zone)
> - Next build cycle starts at 73km

## Future Enhancements

Could add **time-based constraints** from:
1. **Self-reported:** "I have 12 hours/week max"
2. **Schedule-based:** "5 days × 1.5h + 1 long run of 3h = 10.5h"
3. **Historical:** "Your sustainable peak was 11h/week"

But these are **soft limits**, not hard ceilings. If athlete says "12h max" and rules allow 13h, system warns but doesn't block:
> ⚠️ Plan calls for 13h this week, exceeds your 12h preference. Adjust?

## Testing

Build completed successfully with no type errors.

## Files Created
- `src/lib/adaptive-coach/progressionRules.ts` (364 lines)

## Files Modified
- `src/lib/adaptive-coach/athlete-profiler.ts`
- `src/lib/adaptive-coach/types.ts`
- `src/lib/adaptive-coach/safety.ts`
- `src/lib/adaptive-coach/microcycle.ts`
- `src/engine/athleteIntelligenceProfile.ts`

---

**Result:** The training system now follows Uphill Athlete principles with constraint-based progression instead of arbitrary volume ceilings. Volume grows naturally with fitness and is limited only by safety rules, ACWR, and recovery requirements.
