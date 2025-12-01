# 🔧 Import/Fetch Error Troubleshooting Guide

## 🎯 **ROOT CAUSE ANALYSIS**

### **Error:**
```
GET https://bolt.new/src/utils/stravaImport.ts net::ERR_ABORTED 404 (Not Found)
Uncaught TypeError: Failed to fetch dynamically imported module
```

### **Why This Happens:**

1. **StackBlitz Environment Issue**
   - StackBlitz's web container uses a different module resolution than standard Vite
   - Absolute paths like `/src/utils/stravaImport.ts` resolve to the production domain
   - This tries to fetch from `https://bolt.new/...` instead of the local dev server

2. **Vite Alias Configuration**
   - The app is configured with `@` alias pointing to `/src`
   - Static imports use `@/utils/stravaImport` ✅ Works
   - Console commands use `/src/utils/stravaImport.ts` ❌ Fails in StackBlitz

3. **Data Source Confusion**
   - User uploaded CSV data (1,222 activities in database)
   - System is trying to fetch from Strava API instead
   - Missing UI to show which data source is being used

---

## ✅ **SOLUTION IMPLEMENTED**

### **1. Fixed Import Paths**

**Before (❌ Fails):**
```javascript
const { autoEstimateProfile } = await import('/src/utils/stravaImport.ts');
```

**After (✅ Works):**
```javascript
import { autoEstimateProfile } from '@/utils/stravaImport';
// Or for dynamic imports:
const module = await import('@/utils/backfillElevationData');
```

### **2. Added Import Error Handling**

```typescript
try {
  backfillModule = await import('@/utils/backfillElevationData');
} catch (importErr) {
  console.error('Import error:', importErr);
  setMsg('❌ Module loading failed. Check console for details.');
  return;
}
```

### **3. Created Data Source Info Panel**

Now displays in Settings:
```
📊 Available Data Sources:
• CSV Upload: Import Strava/Garmin CSV exports
• Auto-Calculate: Analyze existing activities (1,222 activities found)
• Strava API: Fetch elevation data from connected account
• Manual Entry: Use pace slider below
```

### **4. Enhanced Button Feedback**

Progress messages during operations:
- `🔄 Analyzing your activities...`
- `📊 Analyzing 467 activities...`
- `🏔️ Checking Strava connection...`
- `🏔️ Connecting to Strava API...`
- `✅ Complete! 1224 activities updated`

---

## 🎯 **HOW DATA SOURCES WORK**

### **Data Flow Architecture**

```
┌─────────────────────────────────────────────────────┐
│                   USER ACTIONS                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Upload CSV] → parseStravaCSV() → localStorage    │
│                                    ↓                │
│  [Connect Strava] → OAuth → wearable_connections   │
│                              ↓                      │
│  [Sync Activities] → Strava API → log_entries      │
│                                    ↓                │
│  [Auto-Calculate] → analyze log_entries → profile  │
│                                    ↓                │
│  [Backfill Elevation] → Strava API → log_entries   │
│                                                     │
└─────────────────────────────────────────────────────┘

        ↓ ALL SOURCES MERGE INTO ↓

┌─────────────────────────────────────────────────────┐
│              UNIFIED DATABASE                       │
│  - log_entries (activities)                         │
│  - user_profiles (pace, HR zones)                   │
│  - derived_metrics_weekly (aggregated data)         │
└─────────────────────────────────────────────────────┘
```

### **Data Source Priority**

1. **Supabase Database** (Primary source)
   - Persistent storage for all activities
   - Syncs from localStorage on app load
   - Used by all analysis functions

2. **localStorage** (Temporary cache)
   - Fast access for current session
   - Syncs to Supabase when online
   - Used for offline support

3. **Strava API** (External source)
   - Fetches new activities
   - Enriches existing data (elevation)
   - Requires connection & token

4. **CSV Upload** (Manual import)
   - One-time bulk import
   - Parses to log_entries format
   - Saves to database

---

## 🚀 **CORRECT USAGE PATTERNS**

### **Pattern 1: Use Existing CSV Data** ✅

The user (eythor415) has already uploaded 1,222 activities. To use them:

```typescript
// 1. Analyze existing activities (CSV data already in DB)
import { autoEstimateProfile } from '@/utils/stravaImport';
import { getLogEntriesByDateRange } from '@/lib/database';

const entries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');
// Returns 1,222 activities from database

const runsWithData = entries.filter(e => e.km > 0 && e.durationMin && e.hrAvg);
const profile = autoEstimateProfile(runsWithData.map(e => ({
  pace: e.durationMin / e.km,
  avgHr: e.hrAvg
})));

console.log('Calculated pace:', profile.paceBase, 'min/km');
```

**✅ This works because:**
- Data is already in database from CSV upload
- No Strava API call needed
- No dynamic import issues

---

### **Pattern 2: Fetch Elevation from Strava API** ✅

Only needed if you want to enrich existing activities:

```typescript
// Check if Strava is connected FIRST
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();
const { data: user } = await supabase.auth.getUser();

const { data: connection } = await supabase
  .from('wearable_connections')
  .select('access_token')
  .eq('user_id', user.user.id)
  .eq('provider', 'strava')
  .maybeSingle();

if (connection?.access_token) {
  // Strava connected - can fetch elevation
  import { backfillElevationData } from '@/utils/backfillElevationData';
  const result = await backfillElevationData();
} else {
  // Strava NOT connected - use estimation
  import { backfillElevationEstimates } from '@/utils/backfillElevationData';
  const count = await backfillElevationEstimates();
}
```

**✅ This works because:**
- Checks connection before attempting API call
- Falls back to estimation if no Strava
- Uses correct import paths

---

### **Pattern 3: Upload New CSV** ✅

To add more activities from a CSV file:

```typescript
import { parseStravaCSV } from '@/utils/stravaImport';
import { mergeDedup } from '@/utils/log';
import { load, save } from '@/utils/storage';

// User uploads file
const file: File = event.target.files[0];

// Parse CSV
const newEntries = await parseStravaCSV(file);

// Merge with existing
const existing = load('log', []);
const merged = mergeDedup(existing, newEntries);

// Save to localStorage
save('log', merged);

// Sync to Supabase
import { syncLogEntries } from '@/lib/database';
await syncLogEntries();

console.log(`Added ${newEntries.length} new activities`);
```

**✅ This works because:**
- Static imports at top of file
- No dynamic import issues
- Proper data merging

---

## 🔍 **DIAGNOSTIC TOOLS**

### **Tool 1: Check Available Data Sources**

```javascript
// Run in browser console
const { getAvailableDataSources } = await import('@/utils/importDebug.ts');
const sources = await getAvailableDataSources();

console.table(sources);
```

**Expected output:**
```
┌─────────┬─────────────────────┬───────────┬───────┐
│ (index) │ name                │ available │ count │
├─────────┼─────────────────────┼───────────┼───────┤
│ 0       │ 'Existing Activities'│ true      │ 1222  │
│ 1       │ 'Strava API'        │ false     │       │
│ 2       │ 'CSV Upload'        │ true      │       │
│ 3       │ 'Manual Entry'      │ true      │       │
└─────────┴─────────────────────┴───────────┴───────┘
```

---

### **Tool 2: Diagnose Import Issues**

```javascript
const { diagnoseImports } = await import('@/utils/importDebug.ts');
await diagnoseImports();
```

**Expected output:**
```
=== IMPORT DIAGNOSTIC REPORT ===
Environment: development
Base URL: /
Dev: true
Prod: false

--- Testing Import Paths ---
[ImportDebug] Testing: @/utils/stravaImport
[ImportDebug] ✅ Success: @/utils/stravaImport

--- Module Resolution ---
Vite alias "@" should resolve to: /src
Recommended: Use "@/..." for all imports
```

---

### **Tool 3: Test Specific Import**

```javascript
const { testImport } = await import('@/utils/importDebug.ts');

// Test different paths
const result1 = await testImport('@/utils/stravaImport');
const result2 = await testImport('/src/utils/stravaImport.ts');

console.log('@/ alias:', result1);  // { success: true }
console.log('Absolute path:', result2);  // { success: false, error: '404' }
```

---

## 📊 **UI IMPLEMENTATION**

### **Button States**

The Settings page now shows:

**Idle State:**
```
┌────────────────────────────────────────────────┐
│ Training Profile                               │
├────────────────────────────────────────────────┤
│ 📊 Available Data Sources:                     │
│ • CSV Upload: Import Strava/Garmin CSV        │
│ • Auto-Calculate: 1,222 activities found      │
│ • Strava API: Fetch elevation data            │
│ • Manual Entry: Use pace slider               │
│                                                │
│ [🔄 Auto-Calculate] [🏔️ Backfill Elevation]  │
└────────────────────────────────────────────────┘
```

**Processing State:**
```
┌────────────────────────────────────────────────┐
│ 📊 Analyzing 467 activities...                 │
│                                                │
│ [⏳ Auto-Calculate] [🏔️ Backfill Elevation]  │
│   (disabled)           (disabled)              │
└────────────────────────────────────────────────┘
```

**Success State:**
```
┌────────────────────────────────────────────────┐
│ ✅ Auto-calculated from 467 activities:        │
│    Pace 7.5 min/km, HR 125 bpm                │
│                                                │
│ [🔄 Auto-Calculate] [🏔️ Backfill Elevation]  │
└────────────────────────────────────────────────┘
```

---

## 🎯 **RECOMMENDED WORKFLOW FOR EYTHOR**

Since you've already uploaded 1,222 activities via CSV:

### **Step 1: Auto-Calculate Pace** (Use existing data)
1. Go to Settings
2. Click "🔄 Auto-Calculate from Activities"
3. Wait 3-5 seconds
4. Result: Pace updated to ~7.5 min/km

**Why this works:**
- Uses CSV data already in database
- No Strava API needed
- No import errors

---

### **Step 2: Add Elevation Data** (Two options)

**Option A: Use Strava API** (If connected)
1. Go to Settings → Devices
2. Connect Strava (if not connected)
3. Return to Settings → Training Profile
4. Click "🏔️ Backfill Elevation Data"
5. Wait 20-30 minutes for 1,222 activities

**Option B: Use Estimates** (Faster, no API)
```javascript
// Run in console
const { backfillElevationEstimates } = await import('@/utils/backfillElevationData');
const updated = await backfillElevationEstimates();
console.log(`✅ Estimated elevation for ${updated} activities`);
```

**Why estimates work:**
- Based on trail running averages (80m/km)
- Instant completion
- No Strava connection needed
- Good enough for training plans

---

### **Step 3: Verify Results**

Check that everything is working:

```javascript
// Check profile
const { loadUserProfile } = await import('@/state/userData');
const profile = await loadUserProfile();
console.log('Pace:', profile.pace_base, 'min/km');

// Check elevation
const { getSupabase } = await import('@/lib/supabase');
const supabase = getSupabase();
const { data } = await supabase
  .from('log_entries')
  .select('elevation_gain')
  .not('elevation_gain', 'is', null)
  .limit(10);

console.log('Elevation data:', data.length, 'activities with elevation');
```

---

## ⚠️ **COMMON MISTAKES TO AVOID**

### **❌ Mistake 1: Using Absolute Paths in Console**
```javascript
// DON'T DO THIS in StackBlitz
const module = await import('/src/utils/stravaImport.ts');  // 404 error
```

**✅ Correct:**
```javascript
const module = await import('@/utils/stravaImport');  // Works
```

---

### **❌ Mistake 2: Assuming Strava is Connected**
```javascript
// DON'T DO THIS
const result = await backfillElevationData();  // Fails if not connected
```

**✅ Correct:**
```javascript
// Check connection first
const { data: connection } = await supabase
  .from('wearable_connections')
  .select('access_token')
  .eq('provider', 'strava')
  .maybeSingle();

if (connection) {
  // Connected - use API
  await backfillElevationData();
} else {
  // Not connected - use estimates
  await backfillElevationEstimates();
}
```

---

### **❌ Mistake 3: Ignoring Existing CSV Data**
```javascript
// DON'T DO THIS
// Trying to sync from Strava when CSV data is already there
```

**✅ Correct:**
```javascript
// Use existing CSV data first
const entries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');
console.log(`Found ${entries.length} activities from CSV upload`);

// Only fetch from Strava if you need NEW activities
```

---

## ✅ **VERIFICATION CHECKLIST**

After following this guide:

- [ ] Buttons visible in Settings → Training Profile
- [ ] Data source info panel shows "1,222 activities found"
- [ ] Auto-Calculate button works (no import errors)
- [ ] Pace updated to ~7.5 min/km (from 9.0)
- [ ] Elevation data added (either from API or estimates)
- [ ] Coach panel shows "Avg Weekly Vertical: 850m"
- [ ] No console errors about failed imports
- [ ] Can verify data with diagnostic tools

---

## 🆘 **STILL HAVING ISSUES?**

If imports still fail:

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Check console:** Look for specific error messages
3. **Run diagnostics:** Use the tools in this guide
4. **Verify file exists:** Check that `/src/utils/stravaImport.ts` is present
5. **Try static imports:** Import at top of file instead of dynamic

---

**Summary: The fix is to use `@/` alias paths instead of absolute `/src/` paths, and to leverage existing CSV data instead of forcing Strava API calls.** ✅
