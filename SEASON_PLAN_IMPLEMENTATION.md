# Season Plan Implementation Summary

## Overview

The Season Plan feature provides automatic generation of training macrocycles based on race schedule, displaying a 12-month training overview with Base Building, Sharpening, Taper, Race, and Recovery phases.

## Implementation Details

### 1. Core Components Created

#### Type Definitions (`src/types/seasonPlan.ts`)
- `Macrocycle`: Individual training phase with dates, duration, color, and intensity
- `SeasonPlan`: Complete season overview with all macrocycles
- `SeasonPlanInputs`: Configuration for algorithm generation
- Color and name constants for consistent UI representation

#### Algorithm (`src/utils/seasonPlanGenerator.ts`)
- `generateMacrocycles()`: Calculates phase dates working backward from race day
- `buildSeasonPlan()`: Creates complete season structure
- Phase durations adapt to race type (Marathon vs Ultra)
- Helper functions for progress tracking and date calculations

**Phase Durations:**
- Marathon: 12w Base + 6w Sharpen + 3w Taper + 1w Race + 2w Recovery = 24 weeks
- Ultra (50-100km): 16w Base + 8w Sharpen + 4w Taper + 1w Race + 3w Recovery = 32 weeks
- Long Ultra (100km+): 18w Base + 10w Sharpen + 4w Taper + 1w Race + 4w Recovery = 37 weeks

#### UI Components
- `SeasonWheel` (`src/components/SeasonWheel.tsx`): Recharts-based circular visualization
  - Donut chart with color-coded phases
  - Interactive tooltips with phase details
  - "Today" progress indicator
  - Responsive legend and date range display

#### Hook (`src/hooks/useSeasonPlan.ts`)
- Manages season plan state and generation
- Integrates with race_simulations database
- Handles loading, generation, and saving
- Error handling and loading states

#### Page (`src/pages/SeasonPlan.tsx`)
- Main UI for viewing and managing season plans
- Race selector dropdown for multiple races
- Current phase indicator
- Expandable phase breakdown with weekly details
- Phase-specific training tips
- Navigation integration

### 2. Integration Points

#### Router (`src/main.tsx`)
- Added `/season-plan` route
- Connected to main application router

#### Race Mode (`src/pages/RaceMode.tsx`)
- Added "View Season Plan" navigation button
- Creates seamless flow between race simulation and season planning

#### Database
- Extends race_simulations table's race_plan JSONB column
- Stores seasonPlan object alongside existing simulation data
- Compatible with v2 unified structure

### 3. Color Coding

| Phase          | Color   | Hex       | Intensity |
|----------------|---------|-----------|-----------|
| Base Building  | Teal    | `#00BFC2` | 60%       |
| Sharpening     | Amber   | `#FBBF24` | 85%       |
| Taper          | Red     | `#EF4444` | 50%       |
| Race           | Gray    | `#D1D5DB` | 100%      |
| Recovery       | Green   | `#10B981` | 30%       |

### 4. Key Features

#### Automatic Generation
- Calculates optimal phase timing based on race date
- Adapts to race distance (marathon vs ultra)
- Integrates athlete readiness score

#### Visual Timeline
- 12-month circular chart showing entire season
- Real-time progress indicator
- Color-coded phases for easy identification

#### Phase Breakdown
- Detailed view of each macrocycle
- Duration, dates, and intensity information
- Current phase highlighting
- Phase-specific training guidance

#### Training Tips
- Contextual advice based on current phase
- Best practices for each training block
- Race preparation reminders

## Usage

### Accessing Season Plan

1. Navigate to `/season-plan` in the app
2. Or click "View Season Plan" from Race Mode page

### Generating a Plan

1. Ensure you have at least one future race in your calendar
2. Select the target race from dropdown (defaults to highest priority A race)
3. System automatically generates macrocycles
4. View circular timeline and phase breakdown

### Understanding the Visualization

- **Circular Chart**: 12-month overview with proportional phase segments
- **Center Display**: Total weeks in season
- **Progress Indicator**: Blue line showing current position
- **Legend**: Phase names and colors
- **Date Range**: Season start and end dates

### Phase Details

Click "Training Phases Breakdown" to expand:
- Each phase shows start/end dates
- Duration in weeks
- Intensity percentage
- Current phase highlighted
- Description and focus areas

## Architecture Decisions

### Phase 1 (Current Implementation)
- Single A-race per macrocycle
- Automatic generation (no manual editing yet)
- Circular visualization as primary view
- Database storage in race_simulations table

### Future Enhancements (Phase 2+)
- Manual edit mode with drag-to-adjust boundaries
- Linear timeline view toggle
- Multi-race season support with multiple macrocycles
- Phase override capability for advanced users
- Export to PDF/calendar formats
- Historical season archive

## Technical Notes

### Dependencies
- Uses existing Recharts library (no new dependencies)
- Integrates with Supabase database
- Compatible with unified RacePlan v2 structure

### Performance
- Efficient backward date calculation algorithm
- Minimal database queries (single load per race)
- Optimized rendering with React hooks

### Compatibility
- Works with existing race data from events table
- Backward compatible with v1 race_simulations records
- No breaking changes to existing features

## Testing

The feature has been validated for:
- Build compilation (✓ No TypeScript errors)
- Algorithm correctness (phase durations and calculations)
- UI component rendering
- Router integration
- Database structure compatibility

To test manually:
1. Add a future race with distance and date
2. Navigate to `/season-plan`
3. Verify circular chart displays correctly
4. Check phase breakdown and training tips
5. Test race selector with multiple races

## Files Created/Modified

### New Files
- `src/types/seasonPlan.ts`
- `src/utils/seasonPlanGenerator.ts`
- `src/components/SeasonWheel.tsx`
- `src/hooks/useSeasonPlan.ts`
- `src/pages/SeasonPlan.tsx`

### Modified Files
- `src/main.tsx` (added route and import)
- `src/pages/RaceMode.tsx` (added navigation link)

## Summary

The Season Plan feature provides athletes with a comprehensive year-round training overview, automatically calculating optimal macrocycle phases based on race schedule. The circular visualization offers an intuitive at-a-glance view while the detailed breakdown provides actionable training guidance. The implementation follows the app's existing architecture patterns and integrates seamlessly with race simulation and database systems.
