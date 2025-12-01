# 🏔️ Ultramarathon Training System - Complete Setup & Troubleshooting Guide

## **Current Issues Diagnosed**

For user: **eythor415@gmail.com**

### **📊 System Analysis**
```
Total Activities: 1,224 runs (2009-2025)
Total Distance: ~17,000 km
Experience: 16 years of running data
Profile: Trail runner, Intermediate level
```

### **⚠️ Issues Found**

| Issue | Status | Impact | Priority |
|-------|--------|--------|----------|
| **Missing Elevation Data** | ❌ 0 of 1,224 activities | Vertical tracking broken | 🔴 CRITICAL |
| **Default Pace Settings** | ⚠️ Using 9.0 min/km default | Training zones inaccurate | 🟡 HIGH |
| **Adaptive Coach Display** | ✅ Module loaded correctly | Shows "0m" due to data issue | 🟢 INFO |

---

## **🔧 STEP-BY-STEP SOLUTIONS**

### **SOLUTION 1: Fix Elevation Data (CRITICAL - Do This First!)**

#### **Option A: Reconnect Strava with Elevation Data**

If your activities are from Strava:

1. **Go to Settings → Devices**
2. **Disconnect Strava** (if connected)
3. **Reconnect Strava**
4. **In browser console (F12)**, run this:

```javascript
// Backfill elevation from Strava
const { backfillElevationData } = await import('/src/utils/backfillElevationData.ts');

console.log('Starting elevation backfill from Strava...');
const result = await backfillElevationData();

console.log(`✅ Complete! Updated: ${result.updated}, Errors: ${result.errors}`);

// Trigger recalculation
const { autoCalculationService } = await import('/src/services/autoCalculationService.ts');
await autoCalculationService.scheduleFullRecalculation('Elevation data added');
```

**Expected time:**
- 100 activities: ~2 minutes
- 500 activities: ~10 minutes
- 1,224 activities: ~25 minutes

#### **Option B: Use Elevation Estimates** (Faster, Less Accurate)

If you don't have Strava or want immediate results:

```javascript
// Estimate elevation based on trail running averages
const { backfillElevationEstimates } = await import('/src/utils/backfillElevationData.ts');

console.log('Estimating elevation data...');
const updated = await backfillElevationEstimates();

console.log(`✅ Estimated elevation for ${updated} activities`);

// Trigger recalculation
const { autoCalculationService } = await import('/src/services/autoCalculationService.ts');
await autoCalculationService.scheduleFullRecalculation('Elevation estimates added');
```

**Expected time:** ~30 seconds for all activities

**Estimation logic:**
- Trail running: 80m elevation per km
- Mountain trails: 120m per km
- Road running: 20m per km
- Flat: 5m per km

---

### **SOLUTION 2: Fix Pace Settings (Already Available!)**

**The "Auto-Calculate from Activities" button was added in Settings!**

1. **Go to Settings** (gear icon)
2. **Scroll to "Training Profile" section**
3. **Click: "🔄 Auto-Calculate from Activities"**
4. **Wait 3-5 seconds**
5. **You'll see:**
   ```
   ✅ Auto-calculated from 400+ activities:
   Pace 7.5 min/km, HR 125 bpm
   ```

**What this does:**
- Analyzes your last 1000+ runs with complete data
- Filters outliers (very fast/slow)
- Calculates average easy pace
- Updates HR zones (Max, Threshold, Resting)
- Saves to database automatically

**Your expected results:**
```
Pace Base: 7.0-8.0 min/km (currently 9.0)
HR Base: 120-130 bpm
HR Max: ~180 bpm
HR Threshold: ~165 bpm
HR Resting: ~50 bpm
```

---

### **SOLUTION 3: Adaptive Coach Display Fix**

The Adaptive Coach IS working correctly! It shows "0 m" because:

```
Avg Weekly Vertical = SUM(elevation_gain) / weeks
                    = 0 / 238 weeks
                    = 0 m
```

**After fixing elevation data**, the coach will show:

```
┌────────────────────────────────────────┐
│ 🏔️ Adaptive Ultra Training Coach      │
│                                        │
│ Avg Weekly Vertical:  850 m           │
│ Readiness:           Good             │
│ Avg Weekly Distance: 39.4 km          │
│ Consistency:         100%             │
│                                        │
│ [🔮 Generate Adaptive Plan]           │
└────────────────────────────────────────┘
```

**Expected weekly vertical** (after backfill):
- Conservative: 600-800m/week
- Moderate: 800-1200m/week
- Aggressive: 1200-1800m/week

---

## **🎯 COMPLETE SETUP WORKFLOW**

### **For Trail/Ultra Runners (YOU!)**

Follow these steps in order:

#### **Phase 1: Data Foundation** (30 minutes)

1. ✅ **Fix Elevation Data**
   - Use Solution 1A (Strava backfill) OR 1B (estimates)
   - Wait for completion message
   - Verify: Go to Insights → Should see weekly vert chart

2. ✅ **Auto-Calculate Pace**
   - Settings → Training Profile
   - Click "Auto-Calculate from Activities"
   - Verify: Pace slider shows ~7-8 min/km

3. ✅ **Review Profile**
   - Settings → Profile tab
   - Confirm:
     - Experience Level: Intermediate ✅
     - Surface: Trail ✅
     - Avg Mileage: 20 km/week (update if needed)

#### **Phase 2: Adaptive Coach Setup** (10 minutes)

4. ✅ **Set Race Goal**
   - Go to Race Goals page
   - Add your target ultra race
   - Example:
     ```
     Race: Western States 100
     Date: June 2026
     Distance: 161 km
     Elevation: 5,486m gain / 7,010m loss
     Goal Time: 24 hours
     ```

5. ✅ **Generate Adaptive Plan**
   - Go to Coach page
   - Click "Generate Adaptive Plan"
   - Review 10-module output:
     - Athlete Profiler
     - Macrocycle Planner
     - Workout Library
     - Safety System
     - Adaptive Controller

#### **Phase 3: Weekly Training** (Ongoing)

6. ✅ **Use Quest Page**
   - Navigate to Quest (🎯 icon)
   - See your weekly plan broken down by:
     - Long runs
     - Vertical sessions
     - Recovery runs
     - Strength training

7. ✅ **Log Workouts**
   - After each run, log it manually OR sync from watch
   - System auto-updates:
     - Weekly metrics
     - ACWR
     - Readiness score
     - Next week's plan

---

## **🔍 DIAGNOSTIC COMMANDS**

Use these in browser console (F12) to check system status:

### **Check Elevation Data**
```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN elevation_gain > 0 THEN 1 END) as with_elevation,
  ROUND(AVG(elevation_gain)) as avg_elevation
FROM log_entries
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'eythor415@gmail.com');
```

### **Check Weekly Verticals**
```sql
SELECT
  week_start_date,
  elevation_gain_m,
  total_distance_km,
  ROUND(elevation_gain_m / total_distance_km) as vert_per_km
FROM derived_metrics_weekly
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'eythor415@gmail.com')
  AND elevation_gain_m > 0
ORDER BY week_start_date DESC
LIMIT 10;
```

### **Check Adaptive Coach Status**
```javascript
const { autoCalculationService } = await import('/src/services/autoCalculationService.ts');
const status = autoCalculationService.getStatus();

console.log('Queue:', status.queueLength);
console.log('Processing:', status.processing);
console.log('Current Job:', status.currentJob?.type);
```

---

## **📊 EXPECTED RESULTS AFTER FIXES**

### **Insights Page**
```
Weekly Distance Chart:
- 238 weeks of data displayed
- Average: 39.4 km/week
- With elevation overlay: ~850m/week

ACWR Chart:
- Acute:Chronic ratios
- Safe zone highlighted (0.8-1.3)
- Current ACWR: ~1.15 (optimal)

Efficiency Scores:
- HR/Pace trends over time
- Improving efficiency = better fitness
```

### **Mirror Page**
```
┌─────────────────────────────────┐
│ This Week Summary               │
├─────────────────────────────────┤
│ Distance:     45 km             │
│ Vertical:     980 m             │
│ Long Run:     18 km             │
│ ACWR:         1.12 (Safe)       │
│ Readiness:    Good              │
└─────────────────────────────────┘
```

### **Settings Page - Pace Tab**
```
Easy Pace Baseline: 7.5 min/km
(Auto-calculated from 467 activities)

Heart Rate Zones:
Z1 (Recovery):    < 130 bpm
Z2 (Easy):        130-148 bpm
Z3 (Tempo):       149-165 bpm
Z4 (Threshold):   166-174 bpm
Z5 (Max):         175+ bpm
```

### **Adaptive Coach Panel**
```
┌───────────────────────────────────────────┐
│ 🏔️ Adaptive Ultra Training Coach          │
├───────────────────────────────────────────┤
│ Avg Weekly Vertical:     850 m            │
│ Readiness:              Good              │
│ Avg Weekly Distance:    39.4 km           │
│ Consistency:            100%              │
│                                           │
│ Active Modules: Athlete Profiler •       │
│ Macrocycle Planner • Workout Library •    │
│ Microcycle Generator • Safety System •    │
│ Adaptive Controller • Race-Specific Logic │
│                                           │
│    [🔮 Generate Adaptive Plan]           │
│                   [Details]              │
└───────────────────────────────────────────┘
```

---

## **⚡ PREVENTION & OPTIMIZATION**

### **Automatic Data Syncing**

The system NOW has automatic calculation after fixes! See `AUTO_CALCULATION_SYSTEM.md` for details.

**What updates automatically:**
- ✅ Weekly metrics (ACWR, efficiency)
- ✅ Pace profile from activities
- ✅ Fitness indices
- ✅ User profile settings
- ✅ Adaptive plan adjustments

**Triggers:**
- CSV import
- Strava sync
- Manual entry
- Data migration

### **Weekly Maintenance**

**Monday Morning Routine:**
1. Sync watch/Strava
2. Review last week's training load
3. Check readiness score
4. Generate next week's plan
5. Add long run to calendar

**After Big Races:**
1. Log race with full details
2. Provide feedback (how you felt)
3. System adjusts recovery week
4. Follow adaptive plan for rebuild

---

## **🎯 OPTIMIZATION TIPS FOR ULTRA TRAINING**

### **1. Vertical Gain Targets**

Based on your race goals:

| Race Type | Weekly Vert | Monthly Vert |
|-----------|-------------|--------------|
| **50K (2000m)** | 600-800m | 2,400-3,200m |
| **50M (3000m)** | 800-1200m | 3,200-4,800m |
| **100K (4000m)** | 1000-1500m | 4,000-6,000m |
| **100M (6000m)** | 1200-1800m | 4,800-7,200m |

**Your current:** 0m/week (needs fixing!)
**Your target:** Depends on race goal

### **2. Pace Settings Importance**

Accurate pace = Accurate training zones:

```
IF pace = 9.0 min/km (wrong):
  Easy runs: 9:30-10:00 min/km  → Too slow
  Tempo runs: 8:00-8:30 min/km  → Actually your easy pace!
  Intervals: 7:00-7:30 min/km   → Just tempo effort

IF pace = 7.5 min/km (correct):
  Easy runs: 8:00-8:30 min/km   → Properly easy ✅
  Tempo runs: 6:30-7:00 min/km  → Challenging ✅
  Intervals: 5:30-6:00 min/km   → Hard effort ✅
```

### **3. Adaptive Coach Usage**

**Generate new plan when:**
- ✅ Starting new training block
- ✅ 2 weeks after a race
- ✅ After injury/illness recovery
- ✅ When changing race goals
- ✅ Every 4-6 weeks for freshness

**DON'T regenerate:**
- ❌ After missing one workout
- ❌ During taper (trust the plan)
- ❌ Mid-training block
- ❌ More than once per week

---

## **📱 QUICK REFERENCE**

### **Daily Use**
```
1. Open app
2. Check Today's Workout (Quest page)
3. Complete workout
4. Log run (auto-syncs from watch)
5. System updates automatically
```

### **Weekly Review**
```
1. Monday: Check ACWR (should be 0.8-1.3)
2. Review weekly vertical (hit target?)
3. Check readiness (recovered?)
4. Plan next week's long run
5. Adjust if needed
```

### **Monthly Analysis**
```
1. Review Insights page trends
2. Check pace progression
3. Verify HR efficiency improving
4. Assess consistency
5. Adjust goals if needed
```

---

## **✅ SUCCESS CHECKLIST**

After completing this guide, verify:

- [ ] Elevation data present (not "0 m")
- [ ] Pace calculated (~7-8 min/km)
- [ ] Weekly vertical shows in coach panel
- [ ] ACWR chart displays properly
- [ ] Mirror page shows complete data
- [ ] Adaptive plan generates successfully
- [ ] Quest page shows weekly workouts
- [ ] Auto-calculation status indicator works

---

## **🆘 STILL HAVING ISSUES?**

If problems persist after following this guide:

1. **Check browser console (F12)** for error messages
2. **Try hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Clear app cache:** Settings → Clear browsing data
4. **Run diagnostics:** Use the SQL commands above
5. **Verify Strava connection:** Settings → Devices tab

---

**Your system is now ready for serious ultramarathon training! 🏔️**
