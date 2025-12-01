# Motivation-Aware Coaching System

## Overview

The Motivation-Aware Coaching System automatically detects and tracks runner motivation archetypes based on training behavior, preferences, and self-reported motivations. It adapts the UI theme, coach tone, and training recommendations to match each user's unique running identity.

## Architecture

### Database Layer

#### Tables

1. **user_profiles** (extended)
   - `motivation_archetype` (JSONB): Scores for all 6 archetypes (0-1 scale)
   - `dominant_archetype` (TEXT): Primary archetype
   - `archetype_confidence` (NUMERIC): Classification confidence (0-1)
   - `archetype_last_updated` (TIMESTAMPTZ): Last recalculation date
   - `onboarding_responses` (JSONB): Raw onboarding data
   - `coach_tone_preference` (TEXT): Optional user override

2. **motivation_history**
   - Historical snapshots of archetype evolution
   - Enables "motivation evolution timeline" visualization
   - Tracks trigger events and training context

3. **training_analysis_cache**
   - Pre-computed training metrics from log_entries
   - Refreshed daily for fast archetype detection
   - Aggregates: km, sessions, HR zones, rest patterns

#### Functions

- `record_motivation_snapshot()`: Records archetype snapshot
- `get_archetype_evolution()`: Retrieves archetype history

### Core Libraries

#### 1. Motivation Detection (`src/lib/motivationDetection.ts`)

**Main Functions:**
```typescript
// Detect user's motivation archetype
detectMotivationArchetype(userId, onboardingResponses?)

// Get current motivation profile
getUserMotivationProfile(userId)

// Save profile to database
saveMotivationProfile(userId, profile, triggerEvent)

// Fetch training metrics from log_entries
fetchTrainingMetrics(userId, weeksBack)
```

**Types:**
```typescript
type ArchetypeType = 'performer' | 'adventurer' | 'mindful' | 'health' | 'transformer' | 'connector'

interface MotivationProfile {
  scores: ArchetypeScores;
  dominant: ArchetypeType;
  confidence: number;
  lastUpdated: string;
}
```

#### 2. Coach Message Generator (`src/lib/motivationCoach.ts`)

**Main Functions:**
```typescript
// Get inspirational quote for archetype
getArchetypeQuote(archetype)

// Generate contextual coach message
generateCoachMessage(context)

// Get welcome message for onboarding reveal
generateWelcomeMessage(archetype, confidence)

// Get archetype description
getArchetypeDescription(archetype)

// Get CSS styles for archetype theme
getArchetypeStyles(archetype)
```

**Themes:**
Each archetype has:
- Primary color
- Accent color
- Gradient
- Icon
- Sound motif (optional)

#### 3. Training Analyzer (`src/lib/trainingAnalyzer.ts`)

**Main Functions:**
```typescript
// Update training metrics cache
updateTrainingCache(userId, weeksBack)

// Check if archetype should be recalculated
shouldRecalculateArchetype(userId, currentProfile)

// Main analysis function
analyzeUserTraining(userId)

// Scheduled batch analysis
runScheduledAnalysis()
```

### React Components

#### 1. MotivationHeader (`src/components/MotivationHeader.tsx`)

Dynamic header with:
- Archetype-specific gradient background
- Personalized quote
- Contextual coach message
- Hybrid archetype display

**Usage:**
```tsx
<MotivationHeader
  trainingContext={{
    kmThisWeek: 45,
    fatigueLevel: 0.6,
    recentActivityType: 'hard'
  }}
  upcomingRace={{
    weeksAway: 2,
    distance: 'Marathon'
  }}
/>
```

#### 2. ArchetypeReveal (`src/components/ArchetypeReveal.tsx`)

Beautiful reveal animation showing:
1. "Analyzing" stage with spinner
2. "Revealing" stage with icon animation
3. "Complete" stage with full details

**Usage:**
```tsx
<ArchetypeReveal
  profile={motivationProfile}
  onComplete={() => navigate('/dashboard')}
/>
```

### Custom Hooks

#### useMotivation (`src/hooks/useMotivation.ts`)

**API:**
```typescript
const {
  profile,           // Current motivation profile
  loading,           // Loading state
  error,             // Error message
  detectArchetype,   // Function to detect archetype
  refreshProfile,    // Function to reload profile
  hasProfile,        // Boolean: has valid profile
  isConfident,       // Boolean: confidence >= 0.6
} = useMotivation({ autoLoad: true });
```

**Usage:**
```tsx
function Dashboard() {
  const { profile, detectArchetype } = useMotivation();

  // Detect archetype after onboarding
  const handleCompleteOnboarding = async (responses) => {
    await detectArchetype(responses);
  };

  return (
    <div>
      {profile && <MotivationHeader />}
    </div>
  );
}
```

### AI Personality Integration

The existing `src/ai/personality.ts` has been extended with archetype-aware functions:

```typescript
// Blend persona with archetype
getArchetypeAwareTone(persona, archetype, base)

// Get archetype-specific encouragement
getEncouragement(archetype, context)

// Get archetype icon prefix
getArchetypePrefix(archetype)
```

**Example:**
```tsx
const persona = getPersona('home', { rpe: 5 });
const message = getArchetypeAwareTone(
  persona,
  'performer',
  'You crushed this week'
);
// → "⚡ You crushed this week Let's sharpen that edge!"
```

## The Six Archetypes

### 1. Performer ⚡
- **Driven by:** Results, goals, measurable progress
- **Traits:** Structured, competitive, data-focused
- **Theme:** Red-orange gradient, bold contrast
- **Coach Tone:** Assertive, goal-focused

### 2. Adventurer 🏔️
- **Driven by:** Exploration, endurance, new horizons
- **Traits:** Curious, trail-loving, freedom-seeking
- **Theme:** Forest green-blue gradient, nature-inspired
- **Coach Tone:** Poetic, exploratory

### 3. Mindful Mover 🧘
- **Driven by:** Balance, presence, stress relief
- **Traits:** Reflective, intuitive, recovery-focused
- **Theme:** Purple-gray gradient, calming
- **Coach Tone:** Supportive, introspective

### 4. Health Builder 💚
- **Driven by:** Wellness, energy, sustainable habits
- **Traits:** Consistent, wise, long-term focused
- **Theme:** Mint green-white gradient, clean
- **Coach Tone:** Encouraging, balanced

### 5. Transformer 💪
- **Driven by:** Personal growth, reinvention, overcoming
- **Traits:** Resilient, milestone-driven, purpose-focused
- **Theme:** Gold-blue gradient, sunrise aesthetic
- **Coach Tone:** Inspirational, emotionally charged

### 6. Connector 🤝
- **Driven by:** Community, shared progress, belonging
- **Traits:** Social, team-oriented, supportive
- **Theme:** Blue-pink gradient, vibrant
- **Coach Tone:** Collective, affirmational

## Integration Guide

### Step 1: Add to Onboarding

Add `StepMotivation` to the onboarding flow:

```tsx
// src/pages/Onboarding/index.tsx
import StepMotivation from './StepMotivation';

const steps = [
  // ... other steps
  <StepMotivation profile={profile} update={update} next={next} back={back} />,
  <StepSummary profile={profile} update={update} next={next} back={back} />,
];
```

### Step 2: Detect Archetype After Onboarding

```tsx
// src/pages/Onboarding/StepSummary.tsx
import { useMotivation } from '@/hooks/useMotivation';
import { useState } from 'react';
import ArchetypeReveal from '@/components/ArchetypeReveal';

export default function StepSummary({ profile, next }) {
  const { detectArchetype } = useMotivation({ autoLoad: false });
  const [detectedProfile, setDetectedProfile] = useState(null);
  const [showReveal, setShowReveal] = useState(false);

  const handleComplete = async () => {
    const result = await detectArchetype(profile.onboarding_responses);
    if (result) {
      setDetectedProfile(result);
      setShowReveal(true);
    }
  };

  if (showReveal && detectedProfile) {
    return (
      <ArchetypeReveal
        profile={detectedProfile}
        onComplete={() => navigate('/home')}
      />
    );
  }

  return (
    <div>
      {/* Summary content */}
      <button onClick={handleComplete}>Complete Onboarding</button>
    </div>
  );
}
```

### Step 3: Add to Dashboard

```tsx
// src/pages/Home.tsx or Dashboard
import MotivationHeader from '@/components/MotivationHeader';
import { useMotivation } from '@/hooks/useMotivation';

export default function Home() {
  const { profile } = useMotivation();

  return (
    <div>
      {profile && (
        <MotivationHeader
          trainingContext={{
            kmThisWeek: 45,
            fatigueLevel: 0.6,
          }}
        />
      )}
      {/* Rest of dashboard */}
    </div>
  );
}
```

### Step 4: Scheduled Analysis (Optional)

For periodic archetype recalculation, set up a daily job:

```typescript
// Somewhere in your app initialization or scheduled task
import { runScheduledAnalysis } from '@/lib/trainingAnalyzer';

// Run once per day
setInterval(async () => {
  const results = await runScheduledAnalysis();
  console.log(`Analyzed ${results.processed} users, ${results.changed} archetypes changed`);
}, 24 * 60 * 60 * 1000);
```

## Data Flow

```
1. User completes onboarding
   ↓
2. StepMotivation collects responses
   ↓
3. detectMotivationArchetype() analyzes:
   - Onboarding keywords (60% weight)
   - Historical training data (80% weight)
   ↓
4. Archetype scores calculated and normalized
   ↓
5. Dominant archetype determined (highest score)
   ↓
6. Confidence calculated (delta between top 2)
   ↓
7. Profile saved to database
   ↓
8. ArchetypeReveal shows personalized identity
   ↓
9. Dashboard loads with MotivationHeader
   ↓
10. Training metrics updated daily
   ↓
11. Archetype recalculated every 30 days or on pattern shift
```

## Behavioral Analysis

### Keyword Weighting

Each keyword in onboarding responses contributes to archetype scores:

- "fast", "goal", "race" → Performer +0.4
- "nature", "trail", "explore" → Adventurer +0.5
- "balance", "peace", "calm" → Mindful +0.5
- "healthy", "energy", "routine" → Health +0.5
- "change", "stronger", "rebuild" → Transformer +0.5
- "together", "team", "community" → Connector +0.5

### Training Pattern Signals

From `log_entries` analysis:

- High HR zones (Z4/Z5 >25%) → Performer +0.3
- Long runs (>25km) → Adventurer +0.4
- High rest days (≥4/week) → Mindful +0.3, Health +0.3
- Consistent volume (variance <20%) → Health +0.3
- High frequency (≥5 runs/week) → Performer +0.3

## Testing

### Manual Testing

1. **Complete onboarding** with different motivation selections
2. **Verify archetype** matches expected type
3. **Check theme** colors and gradients display correctly
4. **Test coach messages** update based on training context
5. **Verify hybrid display** when scores are close

### Database Testing

```sql
-- View user's current archetype
SELECT
  user_id,
  dominant_archetype,
  archetype_confidence,
  motivation_archetype
FROM user_profiles
WHERE user_id = 'your-user-id';

-- View archetype history
SELECT * FROM get_archetype_evolution('your-user-id', 10);

-- View training cache
SELECT * FROM training_analysis_cache
WHERE user_id = 'your-user-id'
ORDER BY period_end DESC;
```

## Performance Considerations

- Training metrics cached daily (not computed on every request)
- Archetype recalculation throttled to 30-day intervals
- JSONB indexes on archetype scores for fast queries
- Batch analysis for multiple users to prevent API overload

## Future Enhancements

1. **Voice/Audio Integration**: Archetype-specific audio cues
2. **Social Features**: Find companions with compatible archetypes
3. **Plan Templates**: Auto-select training plans by archetype
4. **Evolution Timeline**: Visualize archetype changes over months
5. **Hybrid Optimization**: Better support for multi-archetype blends
6. **Machine Learning**: Train ML model on successful archetype-plan combinations

## Troubleshooting

### Profile Not Detecting

- Ensure user has `log_entries` data (at least 2-3 weeks)
- Check onboarding responses saved correctly
- Verify database migration applied
- Check console for error messages

### Confidence Too Low

- Add more training data (>4 weeks recommended)
- Ensure HR data available from wearables
- Check for mixed signals in onboarding responses

### Archetype Not Updating

- Verify `archetype_last_updated` timestamp
- Check if pattern change threshold met (>30% variance)
- Run `analyzeUserTraining()` manually
- Check RLS policies allow updates

## Support

For issues or questions:
- Check console logs for error details
- Review database tables for data integrity
- Ensure Supabase environment variables configured
- Test with mock data first before production
