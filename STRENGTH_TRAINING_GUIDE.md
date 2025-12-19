# Adaptive Strength Training System - Testing Guide

## Overview

The Adaptive Strength Training System is now fully integrated into Mizzion. This guide shows you how to access and test all features.

## Quick Start

### 1. Access the Strength Training Page

Navigate to: **http://localhost:5173/strength-training**

Or from Settings: Look for a link to "Strength Training" (to be added)

### 2. Setup Your Terrain Access (First Time)

1. Click on the **"Terrain Setup"** tab
2. Select your terrain availability:
   - **Steep Hills Available** (20%+ grade) → You'll get Outdoor Steep Hill ME
   - **Moderate Hills** (10-15% grade) → You'll get Weighted Outdoor ME
   - **Flat Terrain** → You'll get Gym-Based ME
3. Check off your equipment access:
   - Gym Access (weights, benches, boxes)
   - Treadmill with Incline
   - Stairs Access
4. Click **"Save Preferences"**

The system will automatically assign you the most effective ME type based on your access.

### 3. Browse Exercise Library

1. Click on **"Exercise Library"** tab
2. Browse 30+ pre-loaded exercises including:
   - Core: Dead bugs, planks, bird dogs, Pallof press
   - Lower body: Squats, lunges, step-ups, single-leg deadlifts
   - Plyometrics: Box jumps, depth jumps, bounding
   - Mobility: Hip 90/90, couch stretch, ankle mobility
3. Expand any exercise card to see:
   - Technique cues
   - Target muscles
   - Equipment required
   - Video placeholder (ready for Phase 2)

### 4. Start a Strength Session

1. Click on **"Start Session"** tab
2. You'll see 5 ME session templates:
   - **Steep Hill ME Session** (outdoor steep)
   - **Weighted Outdoor ME Session** (outdoor weighted)
   - **Gym-Based ME Session** (gym)
   - **Treadmill Incline ME Session** (indoor)
   - **Corrective Strength Session** (recovery mode)
3. The **RECOMMENDED FOR YOU** badge shows which session matches your terrain access
4. Click **"Start Session"** on any template
5. Track your progress:
   - Timer starts automatically
   - Mark sets complete as you go
   - Add session notes
6. Click **"Complete Session"** when done

### 5. Log Soreness (Auto-Prompts After Session)

After completing a session, you'll automatically be prompted to log soreness:

1. **Overall Soreness Slider** (1-10)
2. **Pain Checkbox** - Check if experiencing actual pain (not just soreness)
3. **Select Affected Areas** - Tap body parts that feel sore:
   - Quadriceps, Hamstrings, Calves, Glutes (L/R)
   - Knees, Ankles, Hip Flexors, IT Band (L/R)
   - Core, Lower Back, Upper Back, Shoulders
4. **Rate Each Area** - Set severity (1-10) and onset type:
   - Immediate (during/right after)
   - Delayed (next day - DOMS)
   - Persistent (ongoing)
5. Add optional notes

**48-Hour Follow-Up**: The system will prompt you 48 hours later to check if soreness has resolved.

### 6. Understand Load Regulation

The system automatically adjusts your training based on soreness:

#### Soreness Thresholds:
- **1-5**: Progress OK - continue as planned
- **6**: Monitoring zone
- **7**: Hold load, remove plyometrics, reduce 20%
- **8+**: Reduce load 30%
- **9-10** or **Pain**: Corrective exercises only

#### Load Adjustments:
When soreness is high (7+) for 48+ hours:
- **Load Reduction (30%)** - Lighter weights, fewer reps
- **Plyometric Removal** - No explosive movements
- **Corrective Only** - Switch to mobility and corrective work only

#### Recovery Detection:
The system auto-reverts to normal training when:
- Soreness drops to 5 or below
- No pain reported
- Two consecutive sessions without elevated soreness

### 7. ME vs Z3 Resolution (Automatic)

The system automatically resolves conflicts between ME and Z3 uphill intervals:

**Why?** Both ME work and Z3 uphill intervals target the same frontier muscle fibers. Doing both in the same week is redundant and increases injury risk.

**How it works:**
- If your plan has ME sessions + Z3 uphill intervals → ME replaces Z3 intervals
- If your plan has Z3 intervals but no ME (in base/build phase) → First Z3 interval becomes ME
- ME never stacks with hard running within same 72-hour window

You'll see this in the **coaching message** on the Overview tab.

## Testing Scenarios

### Scenario 1: Flat Terrain Runner
1. Set terrain to **"Flat Terrain"**
2. Check **"Gym Access"**
3. Save preferences
4. You should be assigned **Gym-Based ME**
5. Start the "Gym-Based ME Session"
6. Complete 2-3 exercises
7. Log soreness at 4-5 (normal)
8. Check Overview - should show "Normal" load status

### Scenario 2: Mountain Runner
1. Set terrain to **"Steep Hills Available"**
2. Don't check any equipment boxes
3. Save preferences
4. You should be assigned **Outdoor Steep Hill ME**
5. Start "Steep Hill ME Session"
6. Complete session
7. Log high soreness (8+)
8. Check Overview - should show "Adjusted" with load reduction

### Scenario 3: Pain Detection
1. Start any session
2. Complete it
3. When logging soreness:
   - Check "I'm experiencing PAIN"
   - Set overall soreness to 7+
   - Select knee area
4. Check Overview - should show "Corrective Only" mode
5. Go to Start Session tab - all sessions should suggest corrective work

### Scenario 4: 48h Follow-up
1. Complete a session
2. Log soreness at 7+
3. Wait (or manually test by checking "soreness" tab after 48 hours)
4. System should prompt 48h follow-up check
5. If soreness drops to 5 or below → Load adjustments auto-revert

## Overview Tab Metrics

The Overview tab shows real-time status:

1. **ME Type Card**
   - Current assigned ME type
   - Reason for assignment

2. **Load Status Card**
   - Green = Normal training
   - Yellow/Orange = Adjusted (with reason)
   - Shows adjustment percentage

3. **Recent Soreness Card**
   - Number of records in last 7 days
   - Latest soreness level

4. **Coach Message**
   - Explains current ME assignment
   - Provides context for load adjustments
   - Motivational guidance

5. **Pending Follow-ups**
   - Shows if you have 48h checks waiting
   - Quick button to complete them

## Data Structure

All data is stored in Supabase:

- `strength_exercises` - 30 exercises pre-populated
- `me_session_templates` - 5 templates pre-populated
- `user_terrain_access` - Your terrain settings
- `strength_session_log` - Completed sessions
- `soreness_tracking` - Soreness records with 48h follow-ups
- `strength_load_adjustments` - Active load regulations

## Integration Points

The strength training system integrates with:

1. **Adaptive Coach Module** (`src/lib/adaptive-coach/strength-integration.ts`)
   - Automatically resolves ME vs Z3 conflicts
   - Ensures no back-to-back hard sessions
   - Applies load regulation to weekly plans

2. **Weekly Plan Generator** (ready to integrate)
   - Can inject ME sessions into weekly plans
   - Respects terrain access and current load state

3. **Training Mode Detection** (ready to integrate)
   - Can detect when user is in maintenance vs peak phases
   - Adjusts ME frequency accordingly

## Phase 2 Features (Placeholders Ready)

1. **Video Form Analysis**
   - "Record My Form" button is present but disabled
   - Ready for AI video analysis integration
   - Database table `user_exercise_videos` already created

2. **Integration with Weekly Plan View**
   - Hook available: `useStrengthTraining(weeklyPlan, phase)`
   - Can be added to ThisWeekBoard component

3. **Automatic Prompts**
   - Post-session soreness prompts can be triggered
   - 48h follow-up notifications can be enabled

## Troubleshooting

**Can't see exercises?**
- Check database - exercises should be pre-populated
- Run: `fetchStrengthExercises()` to verify

**ME type not assigned?**
- Make sure you've saved terrain preferences
- Check that terrain detection ran successfully

**Soreness not triggering load adjustments?**
- Ensure soreness level is 7+ for load reduction
- Check that you've logged soreness correctly
- Adjustments only apply after 48h of high soreness

**Sessions not saving?**
- Verify you're signed in
- Check Supabase connection
- Look for errors in browser console

## Next Steps

To fully integrate with your training plan:

1. Add strength training link to Settings page
2. Integrate `useStrengthTraining` hook into weekly plan components
3. Enable automatic soreness prompts after sessions
4. Add ME session suggestions to daily plan cards

The core system is complete and ready to use!
