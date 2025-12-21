# Terrain & Strength Training Integration - Complete

## Overview

The terrain and strength training preferences collected during onboarding are now fully integrated with the adaptive training system. This provides personalized workout guidance based on where athletes train (road, trail, treadmill, mixed) and their strength training goals.

## What Was Implemented

### 1. Onboarding Collection ✓ (Already Existed)

**Surface Preference** is asked in Step 5 (StepSurface) with 4 options:
- Road Running
- Trail Running
- Treadmill
- Mixed Terrain

**Strength Preference** is asked in Step 6 (StepStrength) with 4 options:
- None - Just running
- Basic - Light strength work
- Mountain Legs - Hill-focused training
- Ultra Legs - Advanced strength & power

Both are stored in `user_profiles` table:
- `surface` column (TEXT)
- `strength_preference` column (TEXT)

### 2. Adaptive Coach Integration ✓ (NEW)

#### Updated Files:
- `src/lib/adaptive-coach/types.ts`
- `src/lib/adaptive-coach/adapters.ts`
- `src/lib/adaptive-coach/workout-library.ts`
- `src/lib/adaptive-coach/microcycle.ts`
- `src/lib/adaptive-coach/strength-integration.ts`

#### Changes Made:

**A. AthleteProfile Type Extension**
```typescript
export interface AthleteProfile {
  // ... existing fields

  // NEW: Terrain & Training Preferences (from onboarding)
  surfacePreference?: "road" | "trail" | "treadmill" | "mixed";
  strengthPreference?: "none" | "base" | "mountain" | "ultra";
}
```

**B. Profile Building (adapters.ts)**
```typescript
export function buildAthleteProfile(...) {
  return {
    // ... existing fields
    surfacePreference: userProfile.surface,
    strengthPreference: userProfile.strengthPreference,
  };
}
```

**C. Terrain-Specific Workout Adaptations (workout-library.ts)**

New function `adaptWorkoutToSurface()` that modifies workouts based on surface preference:

**Trail Running:**
- Long runs: +15% duration allowance for technical terrain
- Focus on effort-based pacing vs. distance
- Guidance on fueling, navigation, terrain adaptation

**Treadmill:**
- Incline recommendations (1-2% for outdoor simulation)
- Mental engagement strategies
- Break long runs into segments

**Road Running:**
- Hill workout alternatives (parking garages, overpasses)
- Form-focused guidance
- Specific pacing targets

**Mixed:**
- No modifications (athletes adapt to all surfaces)

**D. Microcycle Integration (microcycle.ts)**

Updated `personalizeWorkout()` function to apply terrain adaptations:
```typescript
export function personalizeWorkout(workout, athlete, weekMileage) {
  // ... existing personalization

  // NEW: Apply terrain-specific adaptations
  if (athlete.surfacePreference) {
    return adaptWorkoutToSurface(personalized, athlete.surfacePreference);
  }
}
```

**E. Strength Training Integration (strength-integration.ts)**

1. **Updated ME Assignment:**
   - `determineMEAssignment()` now considers `strengthPreference`
   - Different guidance based on strength level:
     - Ultra: "Include eccentric work and extended ME sessions"
     - Mountain: "Emphasize leg strength and power for climbing"
     - Base: "Keep ME sessions moderate and focus on form"

2. **NEW: Auto-Configuration Helper:**
   - `suggestTerrainAccessFromSurface()` function
   - Automatically suggests terrain access settings based on surface preference

   Examples:
   - **Trail + Mountain:** Hills 15%, gym access, stairs
   - **Road + Base:** Gym access, stairs, no hills
   - **Treadmill + Any:** Treadmill access, gym access
   - **Mixed + Ultra:** Hills 10%, treadmill, gym, stairs

### 3. Terrain Access Settings ✓ (Already Existed, Now Enhanced)

The `user_terrain_access` table tracks detailed terrain availability:
- `hasGymAccess` - Access to gym equipment
- `hasHillsAccess` - Access to hills/mountains
- `maxHillGrade` - Steepest hill grade (%)
- `treadmillAccess` - Treadmill available
- `stairsAccess` - Stadium/building stairs
- `usesPoles` - Uses trekking poles
- `isSkimoAthlete` - Ski mountaineering athlete

This can be:
- **Auto-detected** from past activities (via `detectTerrainFromActivities()`)
- **Auto-suggested** from surface/strength preferences (via `suggestTerrainAccessFromSurface()`)
- **Manually configured** in Settings → Strength Training

## How It Works End-to-End

### Onboarding Flow:
1. User selects surface preference (e.g., "Trail Running")
2. User selects strength preference (e.g., "Mountain Legs")
3. Preferences saved to `user_profiles` table
4. Auto-suggestion for terrain access created (optional)

### Training Plan Generation:
1. `buildAthleteProfile()` extracts surface & strength preferences
2. `generateMicrocycle()` creates weekly training plan
3. For each workout, `personalizeWorkout()` is called:
   - Adjusts duration/distance based on athlete category
   - Applies terrain-specific guidance via `adaptWorkoutToSurface()`
4. Strength sessions added via `integrateStrengthTraining()`:
   - ME type selected based on terrain access
   - Guidance customized by strength preference

### Workout Display:
Athletes see:
- **Base workout template** (distance, intensity, structure)
- **Terrain-specific notes** (e.g., "Trail: Allow extra time for technical terrain...")
- **Strength session guidance** (e.g., "Mountain legs focus: Emphasize leg strength...")

## Benefits

### For Road Runners:
- Gym-based strength recommendations
- Specific pacing targets
- Alternative hill workout locations (parking garages)

### For Trail Runners:
- Effort-based pacing guidance
- Extra time allowance for technical terrain
- Hill/mountain-specific strength work
- Navigation and fueling reminders

### For Treadmill Users:
- Incline simulation recommendations
- Mental engagement strategies
- Indoor strength training integration

### For Mixed Terrain:
- Flexible workout adaptations
- Access to all training environments
- Comprehensive strength training

## Settings Integration

Users can refine their terrain access in:
**Settings → Strength Training → Configure Terrain Access**

This opens a modal where they can:
- Enable/disable gym, hills, treadmill, stairs
- Set max hill grade
- Enable poles usage
- Mark as Skimo athlete

These settings override the auto-suggestions and provide precise ME type selection.

## Database Schema

### user_profiles
- `surface` - Surface preference ('road' | 'trail' | 'treadmill' | 'mixed')
- `strength_preference` - Strength preference ('none' | 'base' | 'mountain' | 'ultra')

### user_terrain_access
- All terrain availability flags
- Auto-detected or manually configured
- Used for ME session type selection

## Testing

Build completed successfully with full integration.

All terrain adaptations are:
- Type-safe
- Backwards compatible (works with existing profiles)
- Optional (only applied when preferences are set)

## Future Enhancements

Potential additions:
- Race-specific terrain training (match race terrain profile)
- Progressive terrain difficulty adaptation
- Terrain-specific recovery recommendations
- GPS-based automatic terrain detection
- Trail technical difficulty ratings

## Summary

Terrain and strength preferences are now:
✅ Asked during onboarding
✅ Stored in database
✅ Extracted to athlete profile
✅ Applied to running workouts
✅ Integrated with strength training
✅ Surfaced in training guidance

The system provides intelligent, personalized training recommendations based on where athletes train and their strength training goals.
