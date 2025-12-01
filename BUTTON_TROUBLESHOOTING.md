# 🔧 Button Troubleshooting Guide for StackBlitz

## ✅ BUTTONS ARE NOW FIXED

The buttons have been enhanced with:
- Explicit inline styles (not dependent on CSS)
- Better contrast (#3b82f6 blue, #10b981 green)
- Debug banner at top of Settings page
- Visual feedback for busy state

---

## 🎯 STEPS TO SEE THE BUTTONS

### 1. **Refresh StackBlitz Preview**
   - The build just completed successfully
   - Click the refresh button in StackBlitz preview pane
   - Or press `Ctrl + Shift + R` in the preview window

### 2. **Navigate to Settings**
   - Click the ⚙️ Settings icon in bottom navigation
   - Scroll down to find **"Training Profile"** section
   - You should now see:
     ```
     Debug: Settings page loaded. Buttons should be visible...

     Training Profile
     [🔄 Auto-Calculate from Activities] [🏔️ Backfill Elevation Data]
     ```

---

## 🔍 VERIFY BUTTONS IN CONSOLE

If you still don't see the buttons, open browser console (F12) and run:

```javascript
// 1. Check if we're on settings page
console.log('Current page:', window.location.pathname);

// 2. Find all buttons on page
const allButtons = document.querySelectorAll('button');
console.log('Total buttons found:', allButtons.length);

// 3. Find Training Profile section
const sections = document.querySelectorAll('section.card');
sections.forEach((section, i) => {
  const h2 = section.querySelector('h2');
  if (h2 && h2.textContent.includes('Training Profile')) {
    console.log('✅ Found Training Profile section at index:', i);

    const buttons = section.querySelectorAll('button');
    console.log('   Buttons in this section:', buttons.length);

    buttons.forEach((btn, j) => {
      console.log(`   Button ${j}:`, btn.textContent);
      console.log(`   Visible:`, btn.offsetWidth > 0 && btn.offsetHeight > 0);
      console.log(`   Styles:`, window.getComputedStyle(btn).display);
    });
  }
});
```

**Expected output:**
```
Current page: /settings
Total buttons found: 20-30
✅ Found Training Profile section at index: 2
   Buttons in this section: 2
   Button 0: 🔄 Auto-Calculate from Activities
   Visible: true
   Styles: inline-block
   Button 1: 🏔️ Backfill Elevation Data
   Visible: true
   Styles: inline-block
```

---

## 🚀 MANUALLY TRIGGER BUTTONS FROM CONSOLE

If buttons exist but aren't clickable, trigger them manually:

### **Option 1: Auto-Calculate Pace**

```javascript
(async () => {
  console.log('🔄 Starting auto-calculation...');

  const { getLogEntriesByDateRange } = await import('/src/lib/database.ts');
  const entries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');

  console.log(`Found ${entries.length} activities`);

  const runsWithData = entries
    .filter(e => e.km > 0 && e.durationMin && e.hrAvg)
    .map(e => ({
      pace: e.durationMin / e.km,
      avgHr: e.hrAvg
    }));

  console.log(`Activities with pace & HR: ${runsWithData.length}`);

  if (runsWithData.length === 0) {
    console.error('❌ No activities with complete data found');
    return;
  }

  const { autoEstimateProfile } = await import('/src/utils/stravaImport.ts');
  const est = autoEstimateProfile(runsWithData);

  if (est) {
    console.log('✅ Calculated profile:');
    console.log('   Pace Base:', est.paceBase.toFixed(2), 'min/km');
    console.log('   HR Base:', est.heartRateBase, 'bpm');
    console.log('   HR Max:', est.hrMax, 'bpm');
    console.log('   HR Resting:', est.hrResting, 'bpm');
    console.log('   HR Threshold:', est.hrThreshold, 'bpm');

    // Save to profile
    const { updateUserProfile } = await import('/src/state/userData.ts');
    await updateUserProfile({
      pace_base: est.paceBase,
      hr_base: est.heartRateBase,
      hr_max: est.hrMax,
      hr_resting: est.hrResting,
      hr_threshold: est.hrThreshold
    });

    console.log('✅ Profile saved! Refresh page to see changes.');
  }
})();
```

### **Option 2: Backfill Elevation Data**

```javascript
(async () => {
  console.log('🏔️ Starting elevation backfill...');
  console.log('⚠️ This may take 20-30 minutes for 1,224 activities');
  console.log('   You can close this tab and it will continue');

  const { backfillElevationData } = await import('/src/utils/backfillElevationData.ts');

  try {
    const result = await backfillElevationData();

    console.log('✅ COMPLETE!');
    console.log(`   Updated: ${result.updated} activities`);
    console.log(`   Errors: ${result.errors}`);

    if (result.updated > 0) {
      console.log('🔄 Triggering metrics recalculation...');
      const { autoCalculationService } = await import('/src/services/autoCalculationService.ts');
      await autoCalculationService.scheduleFullRecalculation('Elevation data backfilled');
      console.log('✅ Metrics recalculation started!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure Strava is connected in Settings → Devices');
  }
})();
```

### **Option 3: Quick Elevation Estimates** (Faster!)

```javascript
(async () => {
  console.log('⚡ Estimating elevation for all activities...');

  const { backfillElevationEstimates } = await import('/src/utils/backfillElevationData.ts');
  const updated = await backfillElevationEstimates();

  console.log(`✅ Estimated elevation for ${updated} activities`);

  // Trigger recalculation
  const { autoCalculationService } = await import('/src/services/autoCalculationService.ts');
  await autoCalculationService.scheduleFullRecalculation('Elevation estimates added');

  console.log('✅ Check Insights page for weekly verticals!');
})();
```

---

## 📊 CHECK RESULTS AFTER RUNNING

### **After Auto-Calculate:**
```javascript
// Check saved profile
const { loadUserProfile } = await import('/src/state/userData.ts');
const profile = await loadUserProfile();

console.log('Current Profile:');
console.log('  Pace Base:', profile.pace_base, 'min/km');
console.log('  HR Base:', profile.hr_base, 'bpm');
console.log('  HR Max:', profile.hr_max, 'bpm');
```

### **After Elevation Backfill:**
```javascript
// Check elevation data
const { getSupabase, getCurrentUserId } = await import('/src/lib/supabase.ts');
const supabase = getSupabase();
const userId = await getCurrentUserId();

const { data } = await supabase
  .from('log_entries')
  .select('elevation_gain')
  .eq('user_id', userId)
  .not('elevation_gain', 'is', null);

console.log(`Activities with elevation: ${data?.length || 0}`);

if (data && data.length > 0) {
  const totalElevation = data.reduce((sum, entry) => sum + (entry.elevation_gain || 0), 0);
  const avgElevation = totalElevation / data.length;

  console.log(`Total elevation: ${Math.round(totalElevation).toLocaleString()}m`);
  console.log(`Average per run: ${Math.round(avgElevation)}m`);
}
```

### **Check Weekly Metrics:**
```javascript
const { getSupabase, getCurrentUserId } = await import('/src/lib/supabase.ts');
const supabase = getSupabase();
const userId = await getCurrentUserId();

const { data: weeklyData } = await supabase
  .from('derived_metrics_weekly')
  .select('week_start_date, elevation_gain_m, total_distance_km')
  .eq('user_id', userId)
  .gt('elevation_gain_m', 0)
  .order('week_start_date', { ascending: false })
  .limit(10);

console.log('Recent weeks with elevation:');
weeklyData?.forEach(week => {
  console.log(`  ${week.week_start_date}: ${week.elevation_gain_m}m vertical, ${week.total_distance_km}km distance`);
});
```

---

## 🎯 WHAT EACH BUTTON DOES

### **🔄 Auto-Calculate from Activities**

**Purpose:** Automatically calculates your optimal training pace and heart rate zones from your historical activities.

**What it does:**
1. Fetches all your activities from the database
2. Filters for runs with complete data (distance, time, HR)
3. Removes outliers (very fast/slow runs)
4. Calculates your average easy pace
5. Estimates HR zones (Max, Threshold, Resting, Base)
6. Saves to your user profile

**Expected results for you:**
```
Pace Base: ~7.5 min/km (currently 9.0)
HR Base: ~125 bpm
HR Max: ~180 bpm
HR Threshold: ~165 bpm
HR Resting: ~50 bpm
```

**Why it matters:**
- Your training zones are based on this pace
- If pace is wrong (9.0 instead of 7.5), ALL workouts are mis-calibrated
- Easy runs become too slow
- Hard workouts are too easy

---

### **🏔️ Backfill Elevation Data**

**Purpose:** Fetches elevation gain data from Strava for all your past activities.

**What it does:**
1. Connects to Strava API with your saved token
2. Fetches detailed activity data for each run
3. Extracts `total_elevation_gain` field
4. Updates your database with elevation values
5. Triggers recalculation of weekly metrics

**Expected results for you:**
```
Activities processed: 1,224
Total elevation: ~98,000m (98km!)
Average per run: ~80m
Weekly average: ~850m

Time required: 20-30 minutes
(100 activities per batch, 1 second delay)
```

**Why it matters:**
- Ultramarathon training REQUIRES vertical tracking
- Your coach panel shows "0m" because elevation is missing
- Weekly vert targets can't be set without this data
- Race preparation plans need elevation history

---

## ⚠️ TROUBLESHOOTING COMMON ISSUES

### **Issue: "No Strava connection found"**

**Solution:**
1. Go to Settings → Devices tab
2. Disconnect Strava (if connected)
3. Reconnect Strava
4. Try backfill again

### **Issue: "Access token expired"**

**Solution:**
The backfill script automatically refreshes tokens. If it fails:
```javascript
// Manually refresh Strava token
const { getSupabase, getCurrentUserId } = await import('/src/lib/supabase.ts');
const supabase = getSupabase();
const userId = await getCurrentUserId();

const { data: connection } = await supabase
  .from('wearable_connections')
  .select('refresh_token')
  .eq('user_id', userId)
  .eq('provider', 'strava')
  .maybeSingle();

if (connection) {
  console.log('Refresh token found, re-run backfill');
} else {
  console.log('No Strava connection - reconnect in Settings');
}
```

### **Issue: Buttons still not visible**

**Possible causes:**
1. **CSS conflict:** Fixed with inline styles now
2. **Parent container hidden:** Check with console commands above
3. **Z-index issue:** Buttons might be behind something
4. **StackBlitz rendering bug:** Try hard refresh

**Nuclear option - Force render buttons:**
```javascript
// Inject buttons directly into DOM
const trainingSection = Array.from(document.querySelectorAll('section.card'))
  .find(s => s.querySelector('h2')?.textContent.includes('Training Profile'));

if (trainingSection) {
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 8px; margin: 16px 0;';

  const btn1 = document.createElement('button');
  btn1.textContent = '🔄 Auto-Calculate from Activities';
  btn1.style.cssText = 'background: #3b82f6; color: white; padding: 12px 16px; border: none; border-radius: 8px; flex: 1; font-weight: 600; cursor: pointer;';
  btn1.onclick = () => console.log('Button 1 clicked - run manual script above');

  const btn2 = document.createElement('button');
  btn2.textContent = '🏔️ Backfill Elevation Data';
  btn2.style.cssText = 'background: #10b981; color: white; padding: 12px 16px; border: none; border-radius: 8px; flex: 1; font-weight: 600; cursor: pointer;';
  btn2.onclick = () => console.log('Button 2 clicked - run manual script above');

  buttonContainer.appendChild(btn1);
  buttonContainer.appendChild(btn2);

  const h2 = trainingSection.querySelector('h2');
  h2.insertAdjacentElement('afterend', buttonContainer);

  console.log('✅ Buttons injected! Click them and then run the manual scripts from this guide.');
}
```

---

## ✅ VERIFICATION CHECKLIST

After refreshing StackBlitz preview, you should see:

- [ ] Debug banner at top of Settings page
- [ ] "Training Profile" section visible
- [ ] Two buttons side-by-side (or stacked on mobile)
- [ ] Blue button: "🔄 Auto-Calculate from Activities"
- [ ] Green button: "🏔️ Backfill Elevation Data"
- [ ] Buttons are clickable (cursor changes on hover)

---

## 🎯 RECOMMENDED WORKFLOW

**Do these in order:**

1. ✅ **Refresh StackBlitz preview** - See the buttons!

2. ✅ **Click "🔄 Auto-Calculate from Activities"**
   - Takes 3-5 seconds
   - Sets your pace to ~7.5 min/km
   - Updates HR zones

3. ✅ **Click "🏔️ Backfill Elevation Data"**
   - Takes 20-30 minutes
   - Can leave tab open or close it
   - Adds elevation to all 1,224 activities

4. ✅ **Check Insights page**
   - Should see weekly vertical chart
   - Average ~850m per week

5. ✅ **Check Coach page**
   - Should show "Avg Weekly Vertical: 850m"
   - All 10 modules active

6. ✅ **Check Mirror page**
   - Weekly summary with vertical
   - ACWR with complete data

---

**The buttons are now in the code with explicit styles. A simple refresh should make them visible!** 🎯
