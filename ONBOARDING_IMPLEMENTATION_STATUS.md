# Onboarding System - Implementation Status

**Last Updated:** 2025-11-10
**Phase:** Intelligence Layer Complete ✅ | UI Components Remaining 🚧

---

## ✅ COMPLETED - Phase 1: Infrastructure & Intelligence

### 1. Type Definitions (`src/types/onboarding.ts`) ✅
- Complete TypeScript type system for onboarding flow
- `UserProfile` interface with 20+ fields
- Goal options with metadata: 5K, 10K, Half, Marathon, Ultra
- Activity level inference mapping
- Motivation options with AI personality hints
- Helper types: `OnboardingStep`, `CoachTone`, `PlanTemplate`
- Default values and validation functions

### 2. Database Schema ✅
**Migration:** `extend_user_profiles_for_onboarding`
- Extended existing `user_profiles` table with onboarding columns
- Fields added:
  - **Goal & Experience:** goal_type, experience_level, motivation
  - **Schedule:** days_per_week, rest_days, preferred_run_days
  - **Preferences:** surface, cross_training, strength_preference
  - **Fitness:** avg_mileage, long_run_distance, current_pace
  - **Device:** device_connected, device_type, device_data (JSONB)
  - **Race:** target_race (JSONB)
  - **Plan:** plan_template, plan_start_date, ai_adaptation_level
  - **Status:** onboarding_completed, onboarding_completed_at
- Check constraints for data validation
- Indexes: goal_type, onboarding_completed, JSONB fields
- RLS policies: users can only access own profile

### 3. AI Rules Engine (`src/lib/aiRules.ts`) ✅
**Complete decision logic for plan selection and personalization**

**Core Functions:**
- ✅ `determineFlow()` - Classify user journey: beginner/intermediate/advanced
- ✅ `pickTemplate()` - Select SWAP plan based on goal + experience
- ✅ `determineAdaptation()` - Set AI level: 0 (feel) / 1 (adaptive) / 2 (HR-driven)
- ✅ `inferExperienceFromActivity()` - Map activity description to experience level
- ✅ `calculateInitialVolume()` - Safe starting weekly mileage
- ✅ `recommendDaysPerWeek()` - Training frequency recommendation
- ✅ `recommendStrength()` - Strength training preference
- ✅ `getPlanDuration()` - Plan length in weeks
- ✅ `validateProfileForPlanCreation()` - Input validation
- ✅ `generatePlanSummary()` - Human-readable plan description
- ✅ `getMotivationalMessage()` - Personalized encouragement by goal

**Logic Matrix:**
| Goal     | Flow         | Template              | Duration | AI Level |
|----------|--------------|----------------------|----------|----------|
| 5K       | beginner     | swap_base_speed_6w   | 6-8w     | 0        |
| 10K      | beginner     | swap_base_speed_6w   | 8-10w    | 0-1      |
| Half     | intermediate | swap_speed_plan      | 10-12w   | 1        |
| Marathon | advanced     | swap_marathon_plan   | 12-16w   | 1-2      |
| Ultra    | advanced     | swap_50m/100m/200m   | 16-24w   | 2        |

### 4. AI Coach Prompts System (`src/hooks/useCoachPrompts.ts`) ✅
**Philosophy:** "Run like a puppy, train like a rockstar"

**Tone Adaptation:**
- **Friendly** (beginner): Supportive, playful, encouraging
- **Balanced** (intermediate): Practical, motivational
- **Focused** (advanced): Respectful, scientific, challenging

**Functions:**
- ✅ `useCoachPrompts(profile, step)` - Main hook, returns contextual prompts
- ✅ Step-specific messages for all 7 onboarding steps
- ✅ `getStepEncouragement()` - Goal-specific motivation after selection
- ✅ `getCelebrationMessage()` - Animated completion badges
- ✅ `getProgressText()` - Progress % messaging ("Almost done!")
- ✅ `getLoadingTip()` - Random training wisdom during waits
- ✅ `getWelcomeMessage()` - Personalized greeting after plan creation

**Step Prompts:**
1. **Goal:** "Big dreams start small! Pick the adventure that excites you..."
2. **Activity:** "Every runner starts somewhere. Tell me how active you've been..."
3. **Availability:** "Consistency beats intensity. How many days can you move?"
4. **Device:** "If you have a watch or Strava, let's sync it..."
5. **Surface:** "Roads, trails, or treadmill — wherever your feet are happiest..."
6. **Strength:** "A little strength goes a long way..."
7. **Summary:** "Amazing! I've got all I need to design your first week..."

### 5. Coach Bubble Components (`src/components/OnboardingCoachBubble.tsx`) ✅
**Animated, personality-driven UI components**

**Components:**
- ✅ `OnboardingCoachBubble` - Main message bubble with emoji, text, subtext
- ✅ `CoachTip` - Inline guidance (💡 icon + small text)
- ✅ `CelebrationBadge` - Animated completion badges (✨ + spring animation)
- ✅ `CoachLoading` - Loading state with rotating ⚡ + random tip

**Features:**
- 4 variants: default (orange), success (green), info (blue), tip (purple)
- Framer Motion animations: fade-in, scale, spring bounce
- Dark mode support
- Speech bubble tail with matching border

### 6. User Profile Database Helpers (`src/lib/userProfile.ts`) ✅
**Complete CRUD operations with Supabase**

**Functions:**
- ✅ `getUserProfile(userId)` - Fetch profile by user ID
- ✅ `getCurrentUserProfile()` - Get authenticated user's profile
- ✅ `saveUserProfile(profile)` - Create or update (upsert by user_id)
- ✅ `updateUserProfile(userId, updates)` - Partial field updates
- ✅ `completeOnboarding(userId)` - Mark as done with timestamp
- ✅ `hasCompletedOnboarding(userId)` - Boolean check
- ✅ `updateDeviceData(userId, type, data)` - Device connection updates
- ✅ `updateTargetRace(userId, race)` - Race goal updates
- ✅ `deleteUserProfile(userId)` - Profile deletion
- ✅ `getProfileCompleteness(profile)` - Calculate % complete (0-100)
- ✅ `isProfileValid(profile)` - Validation helper

**Database Transforms:**
- Automatic camelCase ↔ snake_case conversion
- JSONB field serialization for device_data and target_race
- Type-safe with full TypeScript support

### 7. Plan Templates Library (`src/lib/planTemplates.ts`) ✅
**SWAP-based training plan generation**

**Plan Catalog (7 templates):**
| Template Key          | Goal Types    | Duration | Days/Week | AI Level | Description                              |
|-----------------------|---------------|----------|-----------|----------|------------------------------------------|
| swap_base_plan        | 5K, 10K       | 8w       | 2-4       | 0        | Foundation for new runners               |
| swap_base_speed_6w    | 5K, 10K       | 6w       | 3-5       | 0        | Base + speed development                 |
| swap_speed_plan       | 10K, Half     | 10w      | 4-6       | 1        | VO2max + threshold intervals             |
| swap_marathon_plan    | Half, Marathon| 16w      | 4-6       | 1        | Progressive long runs + taper            |
| swap_50m_plan         | Ultra         | 20w      | 4-6       | 1        | Entry ultra with back-to-backs           |
| swap_100m_plan        | Ultra         | 20w      | 5-6       | 2        | Advanced ultra with vertical gain        |
| swap_200m_plan        | Ultra         | 24w      | 5-7       | 2        | Expert-level massive volume              |

**Functions:**
- ✅ `getPlanTemplateMetadata(key)` - Get template details
- ✅ `listAvailableTemplates(goalType?)` - Filter templates by goal
- ✅ `createTrainingPlan(config)` - Generate plan and save to `plan_weeks` table
- ✅ `generateWeeklyStructure()` - Build week-by-week progression
- ✅ `generateWeekDays()` - Create daily sessions with type, distance, description

**SWAP Methodology Applied:**
- 80% easy/aerobic running (Z2-Z3)
- 20% quality work (tempo, intervals, hills)
- Progressive overload: +5% volume per week
- Recovery weeks: every 4th week at 70% volume
- Taper: last 2 weeks at 50% volume
- Strength training integrated (Mountain Legs / Ultra Legs)
- Session types: easy, long, tempo, intervals, easy+strength

### 8. Documentation ✅
- ✅ **Figma Design Brief** (`FIGMA_DESIGN_BRIEF_RACE_MODE.md`) - Complete Race Mode UI spec
- ✅ **Race Plan V2 Guide** (`RACE_PLAN_V2_MIGRATION_GUIDE.md`) - Unified architecture
- ✅ **Implementation Summary** (`IMPLEMENTATION_SUMMARY.md`) - Technical overview
- ✅ **Architecture Diagram** (`ARCHITECTURE_DIAGRAM.md`) - System design
- ✅ **This Status Doc** - Comprehensive implementation tracker

---

## 🚧 REMAINING WORK - Phase 2: UI & Integration

### 9. Onboarding UI Components 🚧
**Status:** Not started
**Priority:** HIGH
**Estimated:** 8-10 hours

**Required Components:**
```
/src/pages/Onboarding/
  ├── index.tsx              - Main orchestrator, step navigation
  ├── StepGoal.tsx           - Goal selection (5K/10K/Half/Marathon/Ultra)
  ├── StepMotivation.tsx     - Optional motivation picker
  ├── StepActivity.tsx       - Activity level (sedentary → experienced)
  ├── StepAvailability.tsx   - Days per week + rest day picker
  ├── StepDevice.tsx         - Device connection (Strava, Garmin, skip)
  ├── StepSurface.tsx        - Surface preference (road/trail/mixed)
  ├── StepStrength.tsx       - Strength training (none/base/mountain/ultra)
  └── StepSummary.tsx        - Review, confirm, create plan
```

**Each Step Component Needs:**
- Import `OnboardingCoachBubble` and `useCoachPrompts`
- Display coach message with step-specific prompt
- Show options as buttons/cards with hover states
- Update profile state on selection
- Call `next()` to advance
- Show celebration badge on completion
- Mobile responsive layout

**Example Pattern:**
```tsx
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts, getStepEncouragement } from '@/hooks/useCoachPrompts';

export default function StepGoal({ profile, update, next }) {
  const { stepPrompts } = useCoachPrompts(profile, 'goal');
  const prompt = stepPrompts.find(p => p.title === 'goal');

  return (
    <div className="flex flex-col gap-4">
      <OnboardingCoachBubble text={prompt.text} subtext={prompt.subtext} emoji="🎯" />

      <div className="grid gap-2">
        {GOAL_OPTIONS.map(option => (
          <button
            key={option.key}
            onClick={() => {
              update({ goalType: option.key });
              next();
            }}
            className="btn-option"
          >
            {option.emoji} {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 10. Main Onboarding Page (`index.tsx`) 🚧
**Status:** Not started
**Priority:** HIGH

**Responsibilities:**
- State management for entire flow
- Step navigation (next/back)
- Progress indicator (step X of 7)
- Profile state accumulation
- Final plan creation and submission
- Redirect to dashboard on completion

**Structure:**
```tsx
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>(DEFAULT_PROFILE);
  const navigate = useNavigate();

  const steps = [
    <StepGoal ... />,
    <StepActivity ... />,
    <StepAvailability ... />,
    <StepDevice ... />,
    <StepSurface ... />,
    <StepStrength ... />,
    <StepSummary ... />,
  ];

  async function handleFinish() {
    // 1. Generate plan using aiRules
    const template = pickTemplate(profile.goalType, undefined, profile.experienceLevel);
    const aiLevel = determineAdaptation(profile);

    // 2. Save profile to DB
    await saveUserProfile({ ...profile, planTemplate: template, aiAdaptationLevel: aiLevel });

    // 3. Create training plan
    await createTrainingPlan({ userId, template, startDate, aiLevel, initialVolume });

    // 4. Mark onboarding complete
    await completeOnboarding(userId);

    // 5. Navigate to dashboard
    navigate('/planner');
  }

  return (
    <div className="onboarding-container">
      <ProgressBar step={step} total={steps.length} />
      {steps[step]}
    </div>
  );
}
```

### 11. Device Sync Integration (`src/lib/deviceSync.ts`) 🚧
**Status:** Not started
**Priority:** MEDIUM
**Estimated:** 4-6 hours

**Required Functions:**
```typescript
export async function analyzeDeviceData(): Promise<DeviceData> {
  // Fetch recent activities from connected device
  // Calculate: avgHR, recentMileage, longestRun, elevationGain
  // Return structured DeviceData object
}

export async function connectDevice(provider: string): Promise<ConnectionResult> {
  // Trigger OAuth flow for provider (Strava, Garmin, etc.)
  // Save connection to wearable_connections table
  // Return success/error status
}

export async function fetchRecentActivity(): Promise<ActivitySummary> {
  // Pull last 30 days of activities
  // Aggregate volume, pace, HR zones
  // Return summary for onboarding inference
}
```

**Integration Points:**
- Use existing wearable providers (`src/services/wearable/providers/`)
- Connect to `wearable_connections` table
- Call from `StepDevice.tsx` on connection attempt
- Populate `profile.deviceData` automatically
- Update `profile.avgMileage`, `profile.longRunDistance` from actual data

### 12. Routing Integration 🚧
**Status:** Not started
**Priority:** HIGH
**Estimated:** 1 hour

**Tasks:**
- Add `/onboarding` route to main router
- Create `<ProtectedRoute>` wrapper that checks `onboardingCompleted`
- Redirect unauthenticated users to `/login`
- Redirect users who haven't completed onboarding to `/onboarding`
- Allow direct access to `/onboarding` for re-onboarding

**Example:**
```tsx
<Route path="/onboarding" element={<Onboarding />} />
<Route path="/planner" element={
  <ProtectedRoute requiresOnboarding>
    <Planner />
  </ProtectedRoute>
} />
```

### 13. Styling & Responsiveness 🚧
**Status:** Not started
**Priority:** MEDIUM
**Estimated:** 2-3 hours

**Requirements:**
- Mobile-first responsive design
- Consistent spacing (8px grid)
- Smooth step transitions
- Button hover/focus states
- Loading states with spinners
- Error handling UI
- Accessibility (keyboard navigation, ARIA labels)

### 14. Testing 🚧
**Status:** Not started
**Priority:** MEDIUM
**Estimated:** 3-4 hours

**Test Coverage:**
- Unit tests for AI rules engine
- Integration tests for database helpers
- E2E test: Complete onboarding flow
- Test plan generation output
- Test device connection mock
- Test validation edge cases

---

## 📊 Progress Summary

| Phase | Component | Status | Progress |
|-------|-----------|--------|----------|
| **Phase 1** | **Infrastructure** | **✅ COMPLETE** | **100%** |
| | Type Definitions | ✅ | 100% |
| | Database Schema | ✅ | 100% |
| | AI Rules Engine | ✅ | 100% |
| | Coach Prompts | ✅ | 100% |
| | Coach Bubble UI | ✅ | 100% |
| | User Profile Helpers | ✅ | 100% |
| | Plan Templates | ✅ | 100% |
| | Documentation | ✅ | 100% |
| **Phase 2** | **UI & Integration** | **🚧 PENDING** | **0%** |
| | Onboarding Pages | 🚧 Not Started | 0% |
| | Main Orchestrator | 🚧 Not Started | 0% |
| | Device Sync | 🚧 Not Started | 0% |
| | Routing | 🚧 Not Started | 0% |
| | Styling | 🚧 Not Started | 0% |
| | Testing | 🚧 Not Started | 0% |

**Overall Completion:** 57% (8/14 modules)

---

## 🚀 Next Steps

1. **Start with StepGoal.tsx** - Simplest component, establishes pattern
2. **Build remaining step components** - Copy pattern from StepGoal
3. **Create main Onboarding/index.tsx** - Wire up navigation
4. **Add routing** - Integrate into app
5. **Test end-to-end** - Complete full flow
6. **Polish styling** - Mobile responsiveness
7. **Device sync** - Connect to existing wearable infrastructure

**Estimated Time to Completion:** 15-20 hours

---

## 🔗 Quick Reference

**Import Paths:**
```typescript
// Types
import type { UserProfile, GoalType } from '@/types/onboarding';

// AI Logic
import { determineFlow, pickTemplate, determineAdaptation } from '@/lib/aiRules';

// Coach Messages
import { useCoachPrompts, getCelebrationMessage } from '@/hooks/useCoachPrompts';

// UI Components
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';

// Database
import { saveUserProfile, completeOnboarding } from '@/lib/userProfile';

// Plan Creation
import { createTrainingPlan, PLAN_TEMPLATES } from '@/lib/planTemplates';
```

**Key Decisions Made:**
- ✅ SWAP methodology for all plans
- ✅ 80/20 intensity distribution
- ✅ 3 AI adaptation levels (feel / adaptive / HR-driven)
- ✅ 7-step onboarding flow (goal → activity → availability → device → surface → strength → summary)
- ✅ Personality-driven coach messaging with 3 tones
- ✅ Framer Motion for animations
- ✅ Dark mode support throughout

---

**Status:** ✅ Infrastructure complete. Ready for UI implementation.
