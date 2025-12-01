# Figma Design Brief: Mirror Page

## Overview
The **Mirror Page** is a comprehensive performance analytics dashboard that provides athletes with deep insights into their training data, progress tracking, and predictive analytics. It serves as the primary hub for data visualization and performance analysis.

---

## Page Purpose
**Mirror** reflects your training back to you with intelligent analytics:
- View comprehensive training insights and trends
- Track performance metrics over customizable time periods
- Analyze training load and recovery patterns
- See recent activity logs with route maps
- Access race projections and pace predictions
- Monitor heart rate zones and efficiency metrics

---

## Information Architecture

### 1. Page Header
**Location:** Top of page
**Components:**
- **Page Title:** "Mirror" (H2, left-aligned)
- **Action Buttons Row** (right-aligned):
  - 📅 Calendar (secondary button)
  - 📊 Season Plan (secondary button)
  - 🎯 Race Goals (primary button - emphasis)

**Visual Style:**
- Clean, minimal header in card container
- Buttons with subtle spacing (gap: 8px)
- Responsive: buttons wrap on mobile

---

### 2. Insights Dashboard (Main Section)
This is a complex, data-rich section with multiple sub-components.

#### 2.1 Insights Header
**Components:**
- **Title:** "Insights" (H2)
- **Baseline Status:**
  - "Baselines updated [date]" (if available)
  - "Needs refresh" warning (if stale)
  - "Click Refresh Baselines to compute" (if never computed)
- **Action Buttons:**
  - ↻ Refresh Baselines (primary button)
  - 📊 Compute Metrics (if needed)
  - Time Frame Selector dropdown

#### 2.2 Training Profile Card
**Visual Style:**
- Gradient background: `linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)`
- Border: `1px solid rgba(59, 130, 246, 0.1)`
- Border radius: 12px
- Padding: 20px

**Components:**
- **Header Row:**
  - Title: "Your Training Profile"
  - Data Quality Indicator (right-aligned):
    - Colored dot (green 80%+, yellow 60-80%, red <60%)
    - Percentage text

- **Metrics Grid** (responsive grid, min 200px columns):
  1. **Baseline Heart Rate**
     - Label (muted, small)
     - Value (24px, bold, primary color) + "bpm"

  2. **Typical Pace**
     - Label (muted, small)
     - Value (24px, bold, primary color) + "/km"

  3. **Weekly Volume**
     - Label (muted, small)
     - Value (24px, bold, primary color) + "km"

  4. **Average HR**
     - Label (muted, small)
     - Value (24px, bold, primary color) + "bpm"

  5. **Longest Run**
     - Label (muted, small)
     - Value (24px, bold, primary color) + "km"

  6. **Total Activities**
     - Label (muted, small)
     - Value (24px, bold, primary color) + " runs"

**Mobile Behavior:**
- Grid collapses to 2 columns on tablets
- Single column on mobile phones

---

#### 2.3 Charts & Analytics Grid
**Layout:** 2-column grid (gap: 20px)
**Responsive:** Single column on mobile

**Chart Types & Data:**

##### A. Distance Over Time (Line Chart)
- **Title:** "Distance (km)"
- **Chart Type:** Recharts LineChart
- **Data:** Daily/weekly/monthly distance based on time frame
- **Colors:** Primary color line
- **Features:**
  - Smooth curves
  - Gradient fill under line
  - Tooltip on hover
  - Grid lines (subtle)

##### B. Weekly Distance & Vertical Gain (Combined Bar Chart)
- **Title:** "Weekly Distance & Vertical"
- **Component:** WeeklyDistanceVertChart
- **Chart Type:** Dual-axis bar chart
- **Data:**
  - Left axis: Distance (km)
  - Right axis: Vertical gain (m)
- **Colors:**
  - Distance: Primary color
  - Vertical: Accent color
- **Features:**
  - Grouped bars
  - Hover tooltips
  - Legend

##### C. ACWR (Acute:Chronic Workload Ratio)
- **Title:** "Training Load (ACWR)"
- **Component:** ACWRChart
- **Chart Type:** Line chart with zone overlays
- **Data:**
  - ACWR values over time
  - Safe zones highlighted (0.8-1.3)
- **Colors:**
  - Safe zone: Green overlay
  - Warning zone: Yellow overlay
  - Danger zone: Red overlay
- **Features:**
  - Reference zones
  - Current value indicator
  - Tooltips

##### D. Heart Rate Zones Distribution (Bar Chart)
- **Title:** "Heart Rate Zones"
- **Chart Type:** Horizontal stacked bar or grouped bars
- **Data:** Time spent in each HR zone (Z1-Z5)
- **Colors:**
  - Z1: Light blue
  - Z2: Green
  - Z3: Yellow
  - Z4: Orange
  - Z5: Red
- **Features:**
  - Percentage labels
  - Total time display

##### E. Pace vs Heart Rate (Scatter Plot)
- **Title:** "Efficiency: Pace vs HR"
- **Chart Type:** ScatterChart
- **Data:** Each run plotted (pace, HR)
- **Features:**
  - Trend line
  - Tooltips with run details
  - Color by date (gradient from old to new)

##### F. Long Run Progression (Bar Chart)
- **Title:** "Long Run Progression"
- **Chart Type:** Bar chart
- **Data:** Distance of longest runs over time
- **Colors:** Primary gradient
- **Features:**
  - Highlight longest run
  - Tooltips

---

#### 2.4 AI Insights Panel
**Component:** AIInsight
**Visual Style:**
- Card with gradient border
- Icon: 🤖 or ✨
- Background: Subtle gradient

**Content:**
- **Generated Insight:** AI-generated text based on:
  - Training trends
  - Workload patterns
  - Performance changes
  - Recommendations

**Examples:**
- "Your long runs have increased 15% this month - great base building!"
- "ACWR is elevated at 1.45 - consider adding recovery"
- "Heart rate efficiency improving: -3bpm at same pace"

---

#### 2.5 Race Projections Card
**Conditional:** Only shown if baseline race exists

**Visual Style:**
- Card with primary color accent
- Border: 2px solid primary

**Content:**
- **Header:**
  - Title: "Race Projections"
  - Based on: "Based on [distance] in [time]"

- **Projections Table:**
  - Columns: Distance | Projected Time | Pace
  - Rows: Common race distances (5K, 10K, Half Marathon, Marathon)
  - Visual: Clean table with hover effects

**Colors:**
- Faster than baseline: Green text
- Same level: Primary text
- Slower: Yellow text

---

#### 2.6 Trail Load Alert (Conditional)
**Shown:** Only for trail runners with load issues

**Component:** Alert banner
**Visual Style:**
- Warning background: Orange/yellow
- Icon: ⚠️
- Border radius: 8px
- Padding: 16px

**Content:**
- Alert message about trail load progression
- Link to detailed trail load tracking page

---

### 3. Recent Log Section
**Location:** Bottom of page

**Header:**
- Title: "Recent Log" (H2, left)
- "View All Runs" button (primary, right)

**Content:**
**Layout:** 3-column grid (responsive: 2 cols tablet, 1 col mobile)
**Shows:** Last 6 activities

**Each Activity Card:**
- **Route Map** (if available):
  - Width: 280px
  - Height: 160px
  - Component: RouteMap
  - Shows: Polyline route + elevation profile overlay

- **Activity Details:**
  - Title (H2): e.g., "Morning Run"
  - Date & Distance (small, muted): "2024-11-26 • 10.5 km"
  - Stats row (small):
    - Duration: "52 min"
    - Heart Rate: "145 bpm"

**Empty State:**
- Message: "No runs yet. Go to Settings to import your data or visit the Log page to add runs manually."
- Muted text color
- Center-aligned

---

## Design System

### Colors
```css
/* Primary Actions */
--primary: #3b82f6 (Blue)
--primary-hover: #2563eb

/* Accent/Secondary */
--accent: #ffb86b (Orange/Yellow)
--warning: #f59e0b (Yellow)
--success: #10b981 (Green)
--danger: #ef4444 (Red)

/* Text */
--text: #e5e7eb (Light gray)
--muted: #a4a6ad (Muted gray)

/* Backgrounds */
--card: #1a1b1e (Dark card)
--line: #26272b (Border line)
--bg: #0f1011 (Page background)

/* Chart Colors */
--chart-1: #3b82f6 (Primary blue)
--chart-2: #10b981 (Green)
--chart-3: #f59e0b (Yellow)
--chart-4: #ef4444 (Red)
--chart-5: #8b5cf6 (Purple)
```

### Typography
```css
/* Headings */
.h2 {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.h3 {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

/* Body */
.small {
  font-size: 14px;
  line-height: 1.5;
}

/* Labels */
.label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

### Spacing
```css
/* Consistent 8px grid system */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 20px;
--space-2xl: 24px;
--space-3xl: 32px;
```

### Cards
```css
.card {
  background: var(--card);
  border-radius: 12px;
  border: 1px solid var(--line);
  padding: 20px;
}
```

### Buttons
```css
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid var(--line);
  background: var(--card);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Interactions & States

### Time Frame Selector
**States:**
- 7 Days
- 30 Days
- 90 Days
- 6 Months
- 1 Year
- All Time
- Custom Range (opens modal)

**Behavior:**
- Updates all charts simultaneously
- Smooth transitions between views
- Persists selection in localStorage

### Refresh Baselines Button
**States:**
- Default: "↻ Refresh Baselines"
- Loading: "⏳ Computing..." (disabled)
- Success: Brief success toast, then default

**Behavior:**
- Triggers baseline computation
- Updates Training Profile card
- Refreshes all dependent charts

### Chart Interactions
**All Charts:**
- Hover tooltips with detailed data
- Smooth animations on load (fade in + slide up)
- Responsive resize
- Export button (optional)

**Scatter Plot:**
- Click point: Navigate to that specific run
- Tooltip shows: Date, distance, pace, HR

---

## Responsive Breakpoints

```css
/* Desktop: 1200px+ */
- 2-column chart grid
- 3-column recent log grid

/* Tablet: 768px - 1199px */
- 2-column chart grid (some full-width)
- 2-column recent log grid
- Buttons may wrap

/* Mobile: < 768px */
- Single column all sections
- Stacked buttons
- Full-width charts
- Single column recent log
```

---

## Empty States

### No Data Yet
**Message:** "No training data available. Import your activities from Settings or manually add runs in the Log page."
**Visual:**
- Large icon: 📊 or 🏃
- Center-aligned text
- Primary CTA button: "Go to Settings"

### No Baselines Computed
**Message:** "Click 'Refresh Baselines' to compute personalized insights from your training history."
**Visual:**
- Info icon: ℹ️
- Subtle blue background
- Clear CTA

---

## Loading States

### Initial Load
- Skeleton screens for all chart areas
- Pulsing animation
- Preserve layout (no content shift)

### Refresh/Compute
- Button shows loading spinner + text
- Existing content remains visible
- Success toast on completion

---

## Performance Considerations

### Optimization
- Lazy load charts below fold
- Memoize expensive calculations
- Debounce time frame changes
- Virtual scrolling for long lists

### Data Caching
- Cache baseline calculations
- Store aggregated metrics
- Invalidate on new data import

---

## Accessibility

### WCAG AA Compliance
- ✅ Color contrast ratios 4.5:1 minimum
- ✅ Keyboard navigation for all interactions
- ✅ ARIA labels on charts
- ✅ Screen reader friendly tooltips
- ✅ Focus indicators on interactive elements

### Chart Accessibility
- Alternative text descriptions
- Data tables available on request
- High contrast mode support

---

## Technical Implementation Notes

### Key Components
```typescript
// Main container
<TimeFrameProvider>
  <Mirror>
    <Insights />
    <RecentLog />
  </Mirror>
</TimeFrameProvider>

// Chart library
import { LineChart, BarChart, ScatterChart } from 'recharts';

// Data aggregation
import {
  filterEntriesByDateRange,
  aggregateByWeek,
  calculateACWR
} from '@/utils/dataAggregation';
```

### State Management
- Global time frame context
- Local state for baselines
- Async data loading from Supabase
- localStorage for user preferences

---

## Figma Design Checklist

### Artboards to Create
1. ✅ Desktop View (1440px width)
2. ✅ Tablet View (768px width)
3. ✅ Mobile View (375px width)
4. ✅ Empty States
5. ✅ Loading States
6. ✅ Error States

### Components to Design
1. ✅ Chart containers (6 types)
2. ✅ Time frame selector dropdown
3. ✅ Activity cards (with/without maps)
4. ✅ Training profile metrics grid
5. ✅ AI insight banner
6. ✅ Race projections table
7. ✅ Action buttons (all states)

### Interactive Prototype
- Show time frame selector interaction
- Demonstrate hover states on charts
- Show button loading states
- Mobile navigation flow

---

## Key User Flows

### 1. First Time User
1. Lands on Mirror page (empty state)
2. Sees message to import data
3. Clicks "Go to Settings"
4. Imports Strava data
5. Returns to Mirror
6. Clicks "Refresh Baselines"
7. Sees computed insights and charts

### 2. Regular User
1. Opens Mirror page
2. Scans training profile metrics
3. Changes time frame to "30 Days"
4. Reviews ACWR chart
5. Reads AI insight
6. Clicks on recent activity to view details

### 3. Advanced User
1. Opens Mirror page
2. Checks if baselines need refresh (stale indicator)
3. Clicks "Refresh Baselines"
4. Analyzes efficiency scatter plot
5. Checks race projections
6. Navigates to Race Goals page

---

## Notes for Designer

### Design Philosophy
- **Data-dense but not overwhelming:** Use whitespace and clear hierarchy
- **Professional athletic tool:** Not playful, but not cold/corporate
- **Trust through clarity:** All data sources and calculations transparent
- **Progressive disclosure:** Show overview first, details on interaction

### Visual Inspiration
- Strava analytics dashboards
- TrainingPeaks performance management charts
- Apple Health summaries
- Modern fintech dashboards (clean data viz)

### Motion Design
- **Chart animations:** Fade in + draw from left to right (0.5s ease-out)
- **Card entrance:** Stagger fade + slide up (50ms delay between)
- **Button interactions:** Lift on hover (2px translateY)
- **Transitions:** Smooth cross-fade when changing time frames (0.3s)

---

## Metrics to Display

### Primary Metrics (Always Visible)
- Weekly Distance
- Baseline HR
- Typical Pace
- Total Activities
- Longest Run
- Average HR

### Secondary Metrics (In Charts)
- Daily/Weekly/Monthly distance trends
- Vertical gain
- ACWR (training load)
- HR zone distribution
- Pace efficiency
- Long run progression

### Tertiary Metrics (On Demand)
- Race projections
- Predicted finish times
- VO2max estimates (if available)
- Training stress score

---

This design brief provides everything needed to create a professional, data-rich Mirror page in Figma that serves as the analytics hub for serious athletes.
