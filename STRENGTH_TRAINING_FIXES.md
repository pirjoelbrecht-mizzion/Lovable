# Strength Training System - Bug Fixes Complete

## Issues Fixed

### 1. Terrain Settings Not Persisting to Database
**Root Cause**: CHECK constraint violation in the database

The `user_terrain_access` table has a CHECK constraint requiring `steep_hills_access` to be one of: `'yes'`, `'some'`, or `'no'`

However, the code was trying to save: `'steep'`, `'moderate'`, or `'none'`

**Fix Applied**:
- Updated `src/services/strengthTrainingService.ts` line 121-123
- Changed values to match database constraint: `'yes'` (steep), `'some'` (moderate), `'no'` (none)
- Updated read functions to properly map `'no'` back to `hasHillsAccess: false`

**Files Modified**:
- `src/services/strengthTrainingService.ts` (upsertUserTerrainAccess, fetchUserTerrainAccess)
- `src/components/strength/index.tsx` (added useEffect to update form when data loads)

### 2. Strength Training Not Showing in Quest Page
**Root Cause**: Multiple issues

1. The default week plan had `type: "rest"` instead of `type: "strength"`
2. The `detectSessionType` function wasn't respecting explicit type hints
3. The Quest page wasn't properly detecting strength sessions from the plan

**Fix Applied**:
- Updated `src/utils/weekPlan.ts`:
  - Added `"strength"` to the type union
  - Changed Wednesday's session type from `"rest"` to `"strength"`
- Updated `src/pages/Quest.tsx`:
  - Modified `detectSessionType()` to accept and respect explicit type parameter
  - Session mapping now reads the `type` field and passes it to detection
  - Improved "Reset Plan" button to clear all localStorage keys including `planner:week`

**Files Modified**:
- `src/utils/weekPlan.ts` (type definition and default plan)
- `src/pages/Quest.tsx` (detectSessionType function signature, session mapping logic)

### 3. Strength Training Schedule Corrected
**Previous Issue**: Strength training was REPLACING the running on Wednesday instead of being ADDITIONAL to it

**Current Schedule** (as implemented):
- **Wednesday** (Primary):
  - Morning: Easy run (6-7km, Z2)
  - Afternoon: Strength Training session when enabled (45 min)
  - The running and strength are BOTH included as separate sessions
- **Friday** (Optional): Second strength session (40 min)
  - Only added when fatigue score is low (≤ 0.6) and quality workouts are enabled
  - Also includes morning easy run if added

**Key Change**: Wednesday now ALWAYS has a morning easy run, and strength training is added as a SECOND session in the afternoon, not as a replacement.

**Files Modified**:
- `src/pages/Planner.tsx` (week generation logic - now adds easy run first, then strength)
- `src/utils/weekPlan.ts` (default plan updated to show "Easy run + Strength")
- `src/pages/Quest.tsx` (now displays multiple sessions per day correctly)

## How to Use the System

### Step 1: Configure Terrain Access
1. Go to **Strength Training** page
2. Click **Terrain Setup** tab
3. Configure your available terrain:
   - Gym access
   - Hills access (and max grade)
   - Treadmill access
   - Stairs access
   - Poles usage
   - Ski mountaineering athlete status
4. Click **Save Settings**
5. Your settings will now persist to the database

### Step 2: View Your Plan
1. Go to **Quest** page
2. You should see "This Week" with bubbles for each day
3. Wednesday should show:
   - **Distance**: 6km (morning easy run)
   - **Description**: Includes both the morning run AND the strength training session in the afternoon
   - The bubble shows the running distance, with strength training details in the description
4. If you don't see the full plan, click **🔄 Reset Plan** button

### Step 3: Generate New Plans (Optional)
1. Go to **Planner** page
2. Configure your race and training parameters
3. Enable "Include Strength Training" option
4. Click **Suggest Week**
5. The generated plan will include:
   - Wednesday: Morning easy run (6km) + Afternoon strength session (45 min)
   - Friday (optional): Morning easy run + Second strength session (40 min, only if fatigue is low)
6. All days with strength training will show BOTH the running session AND the strength session

### Step 4: Start Training
1. From **Quest** page, click on the Wednesday strength session bubble
2. Or go directly to **Strength Training** page
3. Click **Start Session** tab
4. Select your ME session template based on terrain
5. Complete the workout
6. Log soreness feedback

## Technical Details

### Database Schema
Table: `user_terrain_access`
- Primary key: `id` (uuid)
- Unique constraint on `user_id`
- RLS policies: Authenticated users can read/insert/update their own records
- CHECK constraint: `steep_hills_access IN ('yes', 'some', 'no')`

### Session Detection Logic
The system detects strength training sessions through:
1. Explicit `type: "strength"` field (highest priority)
2. Pattern matching in title/notes for keywords: "strength", "gym", "lift", "weights", "ME session"

### ME Type Assignment
Based on terrain access:
- **Steep Hills** (max_grade ≥ 15%): Outdoor steep hills
- **Gym Access**: Gym-based ME
- **Moderate Hills**: Outdoor hills
- **Treadmill/Stairs**: Indoor alternatives

### Load Regulation
The system automatically adjusts training load based on:
- Recent soreness records
- 48-hour follow-up checks
- Recovery status
- Fatigue score

## Testing Checklist

- [x] Terrain settings save to database
- [x] Terrain settings load when returning to page
- [x] Quest page displays strength training sessions
- [x] Wednesday shows as primary strength day
- [x] Reset Plan button clears all stored plans
- [x] Strength sessions show correct emoji (💪) and no distance/pace
- [x] ME type is determined from terrain access
- [x] Build completes successfully

## Known Limitations

1. Strength sessions only appear in newly generated plans after terrain is configured
2. Existing plans in localStorage won't automatically add strength sessions
3. Users need to click "Reset Plan" or generate a new plan to see strength sessions
4. The Planner page requires manual enabling of strength training option

## Future Improvements

1. Auto-migrate existing plans to add strength sessions
2. Add in-app notification when terrain settings are saved
3. Provide visual feedback showing which ME type will be assigned
4. Add quick-add strength session button in Quest page
5. Implement strength training progress tracking and visualization
