# Differentiated Feedback System - Implementation Guide

## Overview

This system implements intelligent, weighted feedback collection based on the principle that **different types of activities provide different quality signals** for adaptive training.

## Core Principles

### Feedback Weighting (Sports Science Based)

| Activity Type | Weight | Reason |
|--------------|--------|---------|
| Normal Training | 1.0× | Baseline - useful but variable |
| Key Workout | 1.5× | Higher quality - controlled stress |
| Race Simulation | 3.0× | High quality - near-race conditions |
| Race | 5.0× | Highest quality - true performance |
| DNF | 8.0× | Critical learning - structural changes needed |

### Smart Prompting Strategy

**Only prompt for feedback when it matters:**

- Long runs (>60 min)
- Key workouts (tempo, intervals, threshold)
- Race simulations
- Races
- Heat/humidity training
- Back-to-back long runs
- Unexpectedly difficult easy runs

**Do NOT prompt for:**
- Normal easy runs
- Recovery runs
- Short sessions

## Architecture

### Database Schema

**Tables Created:**
- `race_feedback` - Captures race-specific performance data
- `dnf_events` - Records DNF situations with detailed analysis
- `feedback_weights` - Lookup table for learning multipliers
- Extended `daily_feedback` with session importance classification

**Key Fields:**
```typescript
race_feedback: {
  climbing_difficulty: 1-5
  downhill_difficulty: 1-5
  heat_perception: 1-5
  technicality: 1-5
  biggest_limiter: legs | stomach | heat | pacing | mindset | equipment
  fuel_log: string
  issues_start_km: number
}

dnf_events: {
  dnf_cause: injury | heat | stomach | pacing | mental | equipment
  km_stopped: number
  had_warning_signs: boolean
  what_would_change: string
  what_went_well: string
  recovery_protocol_activated_at: timestamp
}
```

### Components

#### 1. RacePerformanceFeedbackModal
**When to use:** After races and race simulations

**Captures:**
- Difficulty ratings (climbing, downhills, heat, technicality)
- Primary limiter identification
- Fuel log
- Performance strengths

**Example usage:**
```tsx
import { RacePerformanceFeedbackModal } from '@/components/RacePerformanceFeedbackModal';

<RacePerformanceFeedbackModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  eventTitle="UTMB 100K"
  eventType="race"
  eventDate="2025-08-27"
  actualDistance={100}
  actualDuration={720}
  onSubmit={handleSubmit}
/>
```

#### 2. DNFFeedbackModal
**When to use:** After DNF detection or manual DNF flagging

**Captures:**
- Primary DNF cause
- Distance completed
- Warning signs presence
- Lessons learned (what would change, what went well)

**Tone:** Supportive and non-judgmental. Every DNF is a learning opportunity.

**Example usage:**
```tsx
import { DNFFeedbackModal } from '@/components/DNFFeedbackModal';

<DNFFeedbackModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  eventTitle="Mountain 50K"
  eventDate="2025-12-07"
  actualDistance={32.5}
  plannedDistance={50}
  autoDetected={true}
  onSubmit={handleDNFSubmit}
/>
```

#### 3. DNFConfirmDialog
**When to use:** After automatic DNF detection

**Purpose:** Confirm with user before assuming DNF status

**Example usage:**
```tsx
import { DNFConfirmDialog } from '@/components/DNFConfirmDialog';

<DNFConfirmDialog
  isOpen={showConfirm}
  onConfirm={() => openDNFModal()}
  onDeny={() => openRaceModal()}
  activityTitle="Trail Race"
  completionPercent={65}
/>
```

### Services

#### feedbackService.ts

**Core Functions:**

```typescript
// Save race feedback with 3-5× weight
await saveRaceFeedback(raceFeedback, logEntryId);

// Save DNF with 8× weight and activate recovery
await saveDNFFeedback(dnfEvent, logEntryId);

// Save daily training feedback with 1-1.5× weight
await saveDailyFeedback(feedback, sessionImportance);

// Check if feedback exists for date
const hasFeedback = await hasFeedbackForDate(date);

// Get race feedback trends
const races = await getRaceFeedbackTrend(90); // last 90 days

// Get DNF history
const dnfs = await getDNFHistory(365); // last year

// Calculate completion rate
const stats = await calculateFeedbackCompletionRate(startDate, endDate);
```

**Events Emitted:**
- `feedback:training-saved` - Micro adjustments
- `feedback:race-saved` - Macro model updates
- `feedback:dnf-saved` - Recovery protocol + structural changes

### Detection Logic

#### feedbackDetection.ts

**Key Functions:**

```typescript
// Determine if feedback should be prompted
const criteria = shouldPromptFeedback(
  logEntry,
  plannedDistance,
  plannedType,
  previousDayLongRun
);

// Detect potential DNF
const dnfResult = detectDNF(
  logEntry,
  plannedDistance,
  plannedType
);

// Classify session importance
const importance = classifySessionImportance(
  logEntry,
  plannedDistance,
  plannedType,
  previousDayLongRun
);
```

**DNF Detection Criteria:**
- Actual distance < 70% of planned
- Activity type is race or simulation
- No completion flag exists
- Abrupt ending (no cooldown pattern)

### Adaptive Response

#### adaptive-response.ts

**Response Types:**

**1. Micro Adjustments (Training Feedback)**
- 5-10% volume changes
- Intensity tweaks
- Rest day additions
- Target: Next 7 days

**2. Macro Adjustments (Race Feedback)**
- Entire plan structure updates
- Taper model refinement
- Training emphasis shifts
- Terrain exposure adjustments
- Target: Next 8 weeks

**3. DNF Recovery (DNF Events)**
- Week 1: 40% volume, recovery focus
- Week 2: 60% volume, gradual return
- Root cause protocol activation
- 14-day structured return

**Example:**
```typescript
// Generate micro adjustment from training
const microAdj = generateMicroAdjustment(feedback, athlete);

// Generate macro adjustment from race
const macroAdj = generateMacroAdjustment(raceFeedback, athlete);

// Generate DNF recovery plan
const recovery = generateDNFRecoveryPlan(dnfEvent, athlete);
```

## Integration Points

### Log Page Integration

**Recommended Flow:**

1. After activity import/creation:
```typescript
import { shouldPromptFeedback, detectDNF } from '@/utils/feedbackDetection';

const criteria = shouldPromptFeedback(logEntry, plannedKm, plannedType);

if (criteria.shouldPrompt) {
  // Check for DNF first
  const dnfResult = detectDNF(logEntry, plannedKm, plannedType);

  if (dnfResult.detected && dnfResult.confidence > 0.7) {
    // Show DNF confirmation dialog
    setShowDNFConfirm(true);
  } else if (criteria.modalType === 'race') {
    // Show race feedback modal
    setShowRaceModal(true);
  } else {
    // Show training feedback modal (existing PostWorkoutFeedbackModal)
    setShowTrainingModal(true);
  }
}
```

2. Handle DNF confirmation:
```typescript
function onDNFConfirmed() {
  setShowDNFConfirm(false);
  setShowDNFModal(true);
}

function onDNFDenied() {
  setShowDNFConfirm(false);
  // If it's a race, show race feedback instead
  if (plannedType === 'race' || plannedType === 'simulation') {
    setShowRaceModal(true);
  }
}
```

### Insights Page Integration

**Add feedback insights card:**

```tsx
import { FeedbackInsightsCard } from '@/components/FeedbackInsightsCard';

// In Insights page
<FeedbackInsightsCard />
```

**Shows:**
- Feedback completion rate
- Most common race limiter
- DNF analysis and preventive recommendations
- Educational content about feedback weighting

### Event Bus Listeners

**Listen for feedback events in adaptive coach:**

```typescript
import { bus } from '@/lib/bus';

bus.on('feedback:training-saved', ({ feedback, weight }) => {
  // Apply micro adjustments
});

bus.on('feedback:race-saved', ({ feedback, weight }) => {
  // Apply macro adjustments
  // Update pacing models
  // Update nutrition models
});

bus.on('feedback:dnf-saved', ({ dnfEvent, weight }) => {
  // Activate recovery protocol
  // Generate DNF recovery plan
  // Update risk models
});
```

## User Experience Guidelines

### Messaging

**Training Feedback:**
- Button: "Save & Adapt"
- Toast: "Feedback saved. Plan adjusted for next week."

**Race Feedback:**
- Button: "Save & Learn"
- Toast: "Race feedback saved. Coach updated with 5× learning weight."

**DNF Feedback:**
- Header: "We're here with you"
- Subtitle: "Every DNF is a learning opportunity"
- Button: "Save & Adjust Plan"
- Toast: "Thanks for sharing. We'll adjust your plan to help you come back stronger."

### Feedback Skip Button

Always provide a "Skip" option. Track skips:

```typescript
// Log skip event
await logFeedbackSkip(date, sessionType);
```

### First-Time User Experience

**Show tooltip on first feedback prompt:**

"Your feedback helps your AI coach learn what makes you strong. Race feedback is 5× more valuable than training feedback for improving predictions."

## Testing Checklist

### Functional Tests

- [ ] DNF detection works for activities < 70% planned distance
- [ ] DNF confirmation dialog appears correctly
- [ ] Race feedback modal captures all difficulty ratings
- [ ] DNF feedback modal has supportive tone
- [ ] Training feedback only prompts for key sessions
- [ ] Feedback weights are applied correctly
- [ ] Event bus events trigger adaptive responses

### Integration Tests

- [ ] Feedback saves to Supabase correctly
- [ ] RLS policies restrict access appropriately
- [ ] Feedback links to log entries via foreign keys
- [ ] Recovery protocol activates after DNF
- [ ] Macro adjustments trigger after race feedback

### UX Tests

- [ ] Modals are easy to complete
- [ ] Skip button works without data loss
- [ ] Toast messages are encouraging
- [ ] Loading states show during saves
- [ ] Error handling provides clear feedback

## Performance Considerations

**Feedback Collection Rate:**
- Target: 80%+ completion for key sessions
- Measure: `calculateFeedbackCompletionRate()`
- Monitor: Weekly dashboard review

**Database Optimization:**
- Indexes on (user_id, date) for fast lookups
- Foreign keys for data integrity
- RLS for security

**Event Bus:**
- Async processing of feedback
- Non-blocking UI during saves
- Background model updates

## Future Enhancements

1. **Automatic Recovery Protocol Completion Detection**
   - Monitor training volume post-DNF
   - Auto-mark protocol complete when volume returns to baseline

2. **Feedback Reminders**
   - Gentle nudge for missed key session feedback
   - Weekly summary of feedback completion rate

3. **Pattern Visualization**
   - Chart showing race limiters over time
   - DNF cause trends
   - Model confidence evolution

4. **Predictive Alerts**
   - "Based on past DNFs, watch for [warning signs] in this race"
   - "Your GI system has been reliable in similar conditions"

## Support & Documentation

**For questions or issues:**
- Review this guide
- Check console logs for debugging
- Verify database migrations applied successfully
- Ensure RLS policies are active

**Key Files:**
- Types: `src/types/feedback.ts`
- Detection: `src/utils/feedbackDetection.ts`
- Services: `src/services/feedbackService.ts`
- Components: `src/components/[RacePerformanceFeedbackModal|DNFFeedbackModal|DNFConfirmDialog].tsx`
- Processor: `src/lib/adaptive-coach/weighted-feedback-processor.ts`
- Response: `src/lib/adaptive-coach/adaptive-response.ts`

---

**Implementation Status:** Core system complete. Ready for Log page integration and testing.
