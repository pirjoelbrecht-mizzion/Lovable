# Figma Design Brief: Race Mode Simulation

## 📋 Overview

**Page Name:** Race Mode Simulation
**Purpose:** Predict race performance based on conditions, training data, and pacing strategy
**User Goal:** Get accurate race time prediction with AI-powered insights and scenario analysis
**Complexity Level:** High (multiple sub-sections and interactive components)

---

## 🎨 Design System Requirements

### Color Palette

**Primary Colors:**
- Brand Blue: `#3b82f6` (primary actions, highlights)
- Background Dark: `#1e3a5f` to `#2a4a6f` (gradient for hero section)
- Background: `#0f1419` (main background)
- Background Secondary: `#1a1f2e` (card backgrounds)

**Status Colors:**
- Good/Success: `#22c55e` (green)
- Warning: `#f59e0b` (amber/orange)
- Bad/Error: `#ef4444` (red)
- Muted Text: `#94a3b8` (light gray)

**Semantic Colors:**
- High Confidence: Green (`#22c55e`)
- Medium Confidence: Orange (`#f59e0b`)
- Low Confidence: Red (`#ef4444`)

### Typography

**Headings:**
- H1 (Page Title): 32px, Bold, Color: White
- H2 (Section Title): 24px, Bold, Color: White
- H3 (Card Title): 20px, Semi-Bold, Color: White

**Body Text:**
- Regular: 16px, Normal, Color: White
- Small: 14px, Normal, Color: Muted (`#94a3b8`)
- Large Stats: 32px, Bold, Color: White or Status Color

**Font Family:** System UI (San Francisco, Segoe UI, Roboto)

### Spacing

- Grid Gap: 20px between major sections
- Card Padding: 24px
- Small Gaps: 8px, 12px, 16px
- Section Margins: 16px, 20px

### Border Radius

- Cards: 12px
- Buttons: 8px
- Small Elements: 6px
- Pills/Badges: 16px (fully rounded)

---

## 📱 Layout Structure

### Main Page Container

```
┌────────────────────────────────────────────────┐
│  Page Title + Race Selector (if multiple)      │  ← Section 1
├────────────────────────────────────────────────┤
│  Hero Card (Race Overview + Stats)             │  ← Section 2
├────────────────────────────────────────────────┤
│  What-If Simulator (Expandable)                │  ← Section 3
├────────────────────────────────────────────────┤
│  Simulation Factors (Expandable)               │  ← Section 4
├────────────────────────────────────────────────┤
│  Pacing Strategy (Expandable)                  │  ← Section 5
├────────────────────────────────────────────────┤
│  Race Day Tips                                 │  ← Section 6
└────────────────────────────────────────────────┘
```

**Spacing:** 20px gap between all sections

---

## 📦 Section Breakdown

---

### **SECTION 1: Page Header**

**Layout:** Horizontal row with space-between alignment

**Elements:**

1. **Page Title**
   - Text: "Race Mode Simulation"
   - Style: H2 (24px, Bold)
   - Color: White

2. **Race Selector Dropdown** (conditional - only if user has multiple races)
   - Type: Select dropdown
   - Style: Button style (padding: 8px 16px, border-radius: 8px)
   - Options:
     - Default: "Next Priority Race"
     - Each race: "{Race Name} - {Date}"
   - Width: Auto (min 200px)

**Spacing:**
- Internal padding: 24px
- Background: Card style (`#1a1f2e`)
- Border radius: 12px

---

### **SECTION 2: Hero Card - Race Overview**

**Container Style:**
- Background: Linear gradient `#1e3a5f` → `#2a4a6f`
- Border: 2px solid Brand Blue (`#3b82f6`)
- Padding: 24px
- Border radius: 12px

**Layout - Part A: Race Header**

**Elements:**

1. **Race Icon Emoji**
   - Symbol: 🏁
   - Size: 32px (2rem)
   - Position: Left aligned

2. **Race Title & Info**
   - Race Name: H2 (24px, Bold, White)
   - Race Details (below name):
     - Text: "{Distance} km • {Date} • {Weeks} weeks away"
     - Style: Small (14px, Muted color)
     - Spacing: 4px top margin

**Spacing:** 12px gap between icon and text

---

**Layout - Part B: Stats Grid (3 columns)**

**Container:**
- Grid: 3 equal columns
- Gap: 16px
- Margin top: 20px

**Card Style for Each Stat:**
- Background: `#1a1f2e` (secondary background)
- Padding: 16px
- Border radius: 8px
- Text alignment: Center

**Stat Card 1: Predicted Time**

1. Label: "Predicted Time" (small, muted)
2. Value: "{HH}h {MM}m" (32px, Bold, White)
3. Subtext: "{M:SS}/km avg" (small, muted, 4px top margin)

**Stat Card 2: Confidence**

1. Label: "Confidence" (small, muted)
2. Value: "HIGH" / "MEDIUM" / "LOW" (32px, Bold, Status Color)
   - HIGH = Green
   - MEDIUM = Orange
   - LOW = Red
3. Subtext: "{XX}% certainty" (small, muted, 4px top margin)

**Stat Card 3: Readiness**

1. Label: "Readiness" (small, muted)
2. Value: "{Score}/100" (32px, Bold, Status Color)
   - 80+: Green
   - 60-79: Orange
   - <60: Red
3. Subtext: "high" / "moderate" / "low" (small, muted, 4px top margin)

---

**Layout - Part C: AI Message Box**

**Container:**
- Margin top: 20px
- Padding: 16px
- Background: `#0f1419` (main bg)
- Border radius: 8px
- Border left: 4px solid Brand Blue

**Content:**
- Text: AI-generated race prediction message
- Style: 16px, Normal, White
- Line height: 1.6

**Example Message:**
> "Peak form - projected 3h 45m with high confidence. Strong fitness and recovery."

---

**Layout - Part D: Performance Factors (Optional)**

**Conditional:** Only shown if performance factors exist

**Container:**
- Margin top: 20px
- Full width component

**Component:** FactorBreakdown
- Title: "Multi-Factor Performance Analysis"
- Displays list of factors grouped by impact (positive/negative)
- Each factor shows:
  - Category badge (Training/Recovery/Environment)
  - Factor name
  - Value with color coding
  - Impact percentage

---

**Layout - Part E: Weather Impact (Optional)**

**Conditional:** Only shown if weather description exists

**Container:**
- Margin top: 16px
- Padding: 12px
- Background: `#1a1f2e`
- Border radius: 8px
- Border left: 3px solid Warning (`#f59e0b`)

**Content:**

1. Label: "Weather Impact" (14px, semi-bold, 4px bottom margin)
2. Description: Weather text (14px, muted, line-height 1.5)

---

### **SECTION 3: What-If Simulator (Expandable)**

**Container Style:**
- Background: Default = `#0f1419`, With overrides = Brand Blue tint (`#3b82f61a`)
- Padding: 24px
- Border radius: 12px

**Header (Always Visible):**

**Layout:** Horizontal row, space-between

1. **Left Side:**
   - Icon + Title: "🔮 Unified What-If Simulator ✨" (if overrides active)
   - Subtitle: "Comprehensive race simulation with conditions, nutrition, and strategy analysis"
   - Title color: Brand Blue if overrides active, White otherwise

2. **Right Side:**
   - Toggle button: "▲" (expanded) or "▼" (collapsed)
   - Style: Button (padding: 8px 16px)

**Expanded Content:**

This section contains multiple sub-components organized in tabs:

**Tab Navigation:**
- Tabs: "Conditions" | "Nutrition" | "Strategy"
- Style: Pills/Buttons with active state highlight
- Active tab: Brand Blue background
- Inactive tabs: Transparent with border

**Tab 1: Conditions**

**Form Controls:**

1. **Temperature**
   - Label: "Temperature (°C)"
   - Input: Number slider or input field
   - Range: -20 to 45
   - Default: 20

2. **Humidity**
   - Label: "Humidity (%)"
   - Input: Number slider or input field
   - Range: 0 to 100
   - Default: 50

3. **Elevation Gain**
   - Label: "Elevation Gain (m)"
   - Input: Number field
   - Default: From race data

4. **Readiness Score**
   - Label: "Readiness (0-100)"
   - Input: Number slider or input field
   - Range: 0 to 100
   - Default: 80

5. **Surface Type**
   - Label: "Surface"
   - Input: Radio buttons or dropdown
   - Options: Road / Trail / Mixed

**Tab 2: Nutrition**

**Form Controls:**

1. **Fueling Rate**
   - Label: "Fueling Rate (g/hr)"
   - Input: Number field
   - Range: 0 to 120
   - Default: 60

2. **Fluid Intake**
   - Label: "Fluid Intake (ml/hr)"
   - Input: Number field
   - Range: 0 to 1200
   - Default: 700

3. **Sodium Intake**
   - Label: "Sodium (mg/hr)"
   - Input: Number field
   - Range: 0 to 1500
   - Default: 800

**Visual Component:** Energy/Fatigue Dynamics Chart
- Line chart showing energy % and fatigue % over distance
- X-axis: Distance (km)
- Y-axis: Percentage (0-100%)
- Two lines: Energy (blue), Fatigue (red)

**Gauges/Cards:**
- Time to Exhaustion Gauge (circular progress)
- Hydration & Electrolytes Card
- GI Distress Risk Card
- Performance Impact Summary

**Tab 3: Strategy**

**Form Controls:**

1. **Start Strategy**
   - Label: "Start Strategy"
   - Input: Radio buttons with emojis
   - Options:
     - 🐢 Conservative
     - 🎯 Target Pace
     - 🚀 Aggressive

2. **Pacing Segments** (if available)
   - Visual: Pacing chart (bar chart by segment)
   - X-axis: Distance markers
   - Y-axis: Pace (min/km)
   - Button: "Edit Pacing Plan"

**Results Display:**

After simulation runs, show:

1. **Comparison Card**
   - Shows baseline vs what-if prediction
   - Time difference (e.g., "+5m 30s slower")
   - Color coded (green=faster, red=slower)

2. **AI Coach Insights**
   - Feed of recommendations
   - Each insight: Icon + Text + Confidence tag

3. **Save Scenario Button**
   - Text: "Save Scenario"
   - Style: Primary button
   - Opens dialog to name scenario

**Button Row:**
- "Reset to Baseline" (secondary button)
- "Save Scenario" (primary button)

---

### **SECTION 4: Simulation Factors (Expandable)**

**Container Style:**
- Background: `#1a1f2e`
- Padding: 24px
- Border radius: 12px

**Header (Always Visible):**

**Layout:** Horizontal row, space-between

1. **Title:** "📊 Simulation Factors" (H3)
2. **Toggle:** "▲" / "▼" button

**Expanded Content:**

**Factor List** (4 items in vertical list):

**Layout for Each Factor:**

```
┌────────────────────────────────────────────────┐
│  [Icon]  [Factor Name]           [Value] [Badge] │
│          [Description]           [Impact Text]   │
└────────────────────────────────────────────────┘
```

**Factor 1: Terrain**
- Icon: 🗺️ (24px)
- Name: "Terrain" (16px, Semi-bold)
- Description: "Flat road" / "Light trail" / etc (14px, muted)
- Value: "1.000×" (18px, Bold, Color based on severity)
- Badge: "Neutral" / "Minor" / "Moderate" / "Significant" (pill style)
- Impact: "No impact" / "+2.5% slower" (14px, muted)

**Factor 2: Elevation**
- Icon: ⛰️
- Name: "Elevation"
- Description: "{X}m climb" or "Flat course"
- Value: "1.050×"
- Badge: Status badge
- Impact: Impact text

**Factor 3: Climate**
- Icon: 🌡️
- Name: "Climate"
- Description: "{Temp}°C - hot" / "Ideal conditions"
- Value: "1.025×"
- Badge: Status badge
- Impact: Impact text

**Factor 4: Fatigue**
- Icon: 💀
- Name: "Fatigue"
- Description: "Readiness {score}"
- Value: "1.015×"
- Badge: Status badge
- Impact: Impact text

**Visual Design for Factors:**
- Each factor: padding 12px top/bottom, border-bottom 1px
- Left side: Icon (40px fixed) + Text (flex 1)
- Right side: Value + Badge (min-width 140px, right-aligned)
- Hover state: Slight background highlight

**Combined Impact Summary Card:**

**Container:**
- Margin top: 20px
- Padding: 16px
- Background: Color based on penalty (green < 2%, orange 2-5%, red > 5%)
- Border radius: 8px
- Border left: 4px solid matching color

**Content:**
- Icon: ⚡ (20px)
- Label: "Combined Impact:" (16px, Bold)
- Value: "+8.5%" (18px, Bold, Status Color)
- Description: "Total Performance Penalty" / "Optimal Conditions"

---

### **SECTION 5: Pacing Strategy (Expandable)**

**Container Style:**
- Background: `#1a1f2e`
- Padding: 24px
- Border radius: 12px

**Header (Always Visible):**

**Layout:** Horizontal row, space-between

1. **Title:** "Pacing Strategy" (H3)
2. **Action Buttons:**
   - "Edit Plan" (if strategy exists, view mode)
   - "Create Plan" (if no strategy)
   - Toggle "▲" / "▼"

**Expanded Content - 3 States:**

---

**State 1: No Strategy (Empty)**

**Display:**
- Icon: Large emoji (e.g., ⏱️, 40px)
- Message: "No custom pacing strategy yet. Create one to personalize your race plan."
- Button: "Create Pacing Strategy" (primary, center aligned)
- Padding: 40px top/bottom

---

**State 2: View Strategy**

**Components:**

1. **Pacing Chart**
   - Type: Bar chart or line graph
   - X-axis: Distance segments (km)
   - Y-axis: Target pace (min/km)
   - Bars/points for each segment
   - Color: Brand Blue
   - Height: 300px

2. **Strategy Info Card**
   - Margin top: 16px
   - Background: `#0f1419`
   - Padding: 12px
   - Border radius: 8px

**Content:**
- Strategy Name (bold)
- Segment count: "{X} segments"
- Mode: "Auto-generated" / "Custom plan"
- Example: "Marathon Pacing • 8 segments • Custom plan"

---

**State 3: Edit Strategy (Form)**

**Components:**

1. **Strategy Name**
   - Input: Text field
   - Placeholder: "My Pacing Plan"

2. **Mode Selector**
   - Radio: Auto-Generated / Manual Segments
   - Style: Button group

3. **Segment Builder** (if Manual)
   - Table or list of segments
   - Columns: Start (km), End (km), Target Pace (min/km)
   - Button: "+ Add Segment"
   - Each segment: Remove button (trash icon)

4. **Auto-Generate Options** (if Auto)
   - Segment Length: Dropdown (1km, 5km, 10km)
   - Strategy: Conservative / Balanced / Aggressive
   - Button: "Generate Auto Pacing"

5. **Action Buttons**
   - Row at bottom
   - "Cancel" (secondary, left)
   - "Save Strategy" (primary, right)

---

### **SECTION 6: Race Day Tips**

**Container Style:**
- Background: `#1a1f2e`
- Padding: 24px
- Border radius: 12px

**Elements:**

1. **Title:** "Race Day Tips" (H3)

2. **Tips List**
   - HTML List (ul/li)
   - Margin: 0
   - Padding left: 20px
   - Line height: 1.8
   - Font size: 16px

**Default Tips (Always Shown):**
- Start conservatively - aim for Z3 in the first 20%
- Fuel every 30-45 min (200-250 kcal/hour for ultras)
- Monitor HR drift - if zones climb, ease off pace

**Conditional Tips:**
- If elevation > 500m: "Power-hike steep climbs to preserve leg strength"
- If climate factor > 1.03: "Hot conditions expected - increase hydration by 20-30%"

**Icon Style (Optional):**
- Add small icons next to each tip (e.g., 💡, ⚡, 🏃, ⛰️, 💧)

---

## 🎯 Interactive States

### Expandable Sections

**Collapsed State:**
- Header visible
- Content hidden
- Toggle shows "▼"
- Cursor: pointer
- Slight hover effect on header

**Expanded State:**
- Header visible
- Content visible below
- Toggle shows "▲"
- Smooth expand animation (0.2s ease)

### Loading State

**Full Page Loading:**
- Show card with title
- Message: "Loading race simulation..."
- Style: Centered, muted text
- Optional: Loading spinner

**Empty State (No Race):**
- Message: "No upcoming races found. Add a race to your calendar to enable simulation."
- Button: "Go to Race Calendar" (primary, centered)

### Error State

**Display:**
- Same as empty state
- Different message based on error type
- Optional: Retry button

---

## 📐 Responsive Behavior

### Desktop (> 1024px)
- Full 3-column stat grid
- Side-by-side layouts where applicable
- Generous spacing (20px gaps)

### Tablet (768px - 1024px)
- 3-column stat grid maintained
- Reduced padding (16px)
- Collapsible sections default to collapsed

### Mobile (< 768px)
- Single column layout
- Stats stack vertically or 2-column
- Reduced font sizes:
  - H2: 20px
  - Large stats: 24px
  - Regular: 14px
- Padding: 16px
- Gap: 16px between sections
- Tabs become scrollable horizontal list

---

## 🎨 Component Library Needed

### Buttons
- Primary: Filled, Brand Blue, White text
- Secondary: Outline, Brand Blue border
- Small: Reduced padding (6px 12px)
- Icon button: Square, icon only

### Form Controls
- Text Input: Dark bg, border, padding 12px, rounded 8px
- Number Input: Same as text + spinner controls
- Slider: Brand Blue track, white thumb
- Radio: Custom styled circles
- Dropdown/Select: Button style, chevron icon

### Cards
- Default: `#1a1f2e` background, 12px radius, 24px padding
- Hero: Gradient background, border
- Nested: `#0f1419` background

### Badges/Pills
- Padding: 4px 12px
- Border radius: 16px (fully rounded)
- Font size: 12px, Bold
- Border: 1px solid matching color
- Background: Color with 20% opacity

### Charts
- Line charts: 2-color lines, grid background
- Bar charts: Brand Blue bars, axis labels
- Gauges: Circular progress, percentage center
- Height: 200-400px depending on content

### Icons
- Emoji-based (primary)
- Size: 20px (small), 32px (medium), 48px (large)
- SVG icons (secondary): Chevrons, arrows, close (X)

---

## ✅ Design Checklist

**Must Have:**
- [ ] Dark theme throughout (no light backgrounds)
- [ ] Consistent spacing (8px, 12px, 16px, 20px, 24px)
- [ ] Status colors properly applied (green/orange/red)
- [ ] All text readable on dark backgrounds
- [ ] Hover states on interactive elements
- [ ] Expandable sections with smooth animations
- [ ] Loading and empty states designed
- [ ] Mobile responsive layout
- [ ] Form validation error states
- [ ] Button disabled states

**Nice to Have:**
- [ ] Smooth transitions on stat changes
- [ ] Microinteractions (button press, toggle flip)
- [ ] Skeleton loading states
- [ ] Tooltip explanations for factors
- [ ] Chart hover states with data points
- [ ] Copy to clipboard for stats
- [ ] Share race prediction feature

---

## 📱 Figma File Structure Suggestion

```
📁 Race Mode Simulation Page
  ├── 🎨 Design System
  │   ├── Colors
  │   ├── Typography
  │   ├── Spacing
  │   └── Components Library
  │
  ├── 📱 Screens
  │   ├── Desktop (1440px)
  │   ├── Tablet (768px)
  │   └── Mobile (375px)
  │
  ├── 🔄 States
  │   ├── Loading State
  │   ├── Empty State
  │   ├── Error State
  │   ├── With Data (All Collapsed)
  │   ├── With Data (All Expanded)
  │   └── What-If Active State
  │
  └── 🧩 Components
      ├── Section 1: Page Header
      ├── Section 2: Hero Card
      ├── Section 3: What-If Simulator
      ├── Section 4: Factors Card
      ├── Section 5: Pacing Strategy
      └── Section 6: Race Tips
```

---

## 📊 Example Data for Design

**Sample Race:**
- Name: "Boston Marathon 2025"
- Distance: 42.2 km
- Date: 2025-04-21
- Weeks to race: 12.5 weeks

**Sample Stats:**
- Predicted Time: 3h 45m
- Average Pace: 5:20 /km
- Confidence: HIGH (85% certainty)
- Readiness: 82 (high)

**Sample Factors:**
- Terrain: 1.000× (Flat road, Neutral, No impact)
- Elevation: 1.030× (180m climb, Minor, +3.0% slower)
- Climate: 1.025× (22°C - warm, Minor, +2.5% slower)
- Fatigue: 1.015× (Readiness 82, Minor, +1.5% slower)
- Combined: +7.0% Total Performance Penalty

**Sample AI Message:**
> "Peak form - projected 3h 45m with high confidence. Strong fitness and recovery. The course elevation and mild warmth will add approximately 7% to your baseline pace. Focus on consistent fueling and conservative starts on uphills."

---

## 🎯 Key Design Principles

1. **Clarity First:** Data should be scannable and digestible
2. **Progressive Disclosure:** Collapsed sections reduce overwhelm
3. **Visual Hierarchy:** Important stats (time, confidence) largest
4. **Consistent Feedback:** All actions should have visual confirmation
5. **Accessible:** High contrast, readable fonts, clear labels
6. **Trust-Building:** Show confidence levels, explain factors
7. **Performance-Focused:** Loading states, smooth animations

---

This brief should provide everything needed for a Figma designer to create a complete, production-ready design for the Race Mode Simulation page. All measurements, colors, content, and interactions are specified.
