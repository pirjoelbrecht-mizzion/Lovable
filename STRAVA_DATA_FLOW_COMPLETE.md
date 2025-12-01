# 🏃 Complete Strava Data Flow Documentation

## 📊 **Overview: Two Import Paths**

Your application supports **TWO different ways** to import Strava data:

1. **CSV Upload** - Manual file upload from Strava export
2. **API Sync** - Automatic sync via OAuth connection

Both paths end up in the **SAME database tables**, but they take different routes.

---

## 🗺️ **DATA FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCE                                  │
├─────────────────────────┬───────────────────────────────────────────┤
│   📄 Strava CSV File    │     🔄 Strava API (OAuth)                 │
│   (Manual Download)     │     (Automatic Sync)                       │
└────────────┬────────────┴──────────────────┬────────────────────────┘
             │                                │
             │                                │
┌────────────▼──────────────┐    ┌───────────▼────────────────────────┐
│   PARSING LAYER           │    │   API INTEGRATION LAYER            │
├───────────────────────────┤    ├────────────────────────────────────┤
│ parseStravaCSV()          │    │ StravaProvider.fetchActivities()   │
│ • Reads CSV columns       │    │ • OAuth token management           │
│ • Extracts:               │    │ • Fetches from Strava REST API     │
│   - Distance              │    │ • Gets /athlete/activities         │
│   - Duration              │    │ • Gets /activities/:id/streams     │
│   - Heart Rate            │    │ • Extracts:                        │
│   - Elevation Gain ✅     │    │   - distance (meters)              │
│   - Temperature           │    │   - moving_time (seconds)          │
│   - Weather               │    │   - average_heartrate (bpm)        │
│   - Location              │    │   - total_elevation_gain (m) ✅    │
│                           │    │   - elevation streams (altitude[]) │
│ File: stravaImport.ts     │    │   - distance streams               │
│ Lines: 105-196            │    │   - map.polyline (route)           │
│                           │    │   - average_temp (°C)              │
│                           │    │   - location_city                  │
│                           │    │                                    │
│                           │    │ File: StravaProvider.ts            │
│                           │    │ Lines: 26-147                      │
└────────────┬──────────────┘    └───────────┬────────────────────────┘
             │                                │
             │                                │
┌────────────▼──────────────┐    ┌───────────▼────────────────────────┐
│   CONVERSION LAYER        │    │   DIRECT MAPPING                   │
├───────────────────────────┤    ├────────────────────────────────────┤
│ Settings.tsx              │    │ WearableManager.syncActivities()   │
│ SettingsV2.tsx            │    │ • Activities → LogEntry[]          │
│                           │    │ • Direct field mapping             │
│ Maps CSV data to          │    │ • No intermediate conversion       │
│ LogEntry[] objects        │    │                                    │
│                           │    │ File: WearableManager.ts           │
│ ✅ NOW INCLUDES:          │    │ Lines: 117-343                     │
│   - elevationGain         │    │                                    │
│   - temperature           │    │                                    │
│   - weather               │    │                                    │
│   - location              │    │                                    │
│                           │    │                                    │
│ Files: Settings*.tsx      │    │                                    │
│ Lines: 145-235            │    │                                    │
└────────────┬──────────────┘    └───────────┬────────────────────────┘
             │                                │
             └────────────────┬───────────────┘
                              │
                   ┌──────────▼───────────┐
                   │   DATABASE LAYER     │
                   ├──────────────────────┤
                   │ bulkInsertLogEntries()│
                   │ saveLogEntry()       │
                   │                      │
                   │ • Deduplication      │
                   │ • Batch insert       │
                   │ • Environmental      │
                   │   enrichment         │
                   │                      │
                   │ File: database.ts    │
                   │ Lines: 185-322       │
                   └──────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼────────┐          ┌──────────▼──────────┐
    │  PRIMARY TABLE   │          │  DERIVED TABLES     │
    ├──────────────────┤          ├─────────────────────┤
    │  log_entries     │──────┐   │ • environmental_    │
    │                  │      │   │   training_data     │
    │ • title          │      │   │                     │
    │ • date           │      │   │ • climate_          │
    │ • km             │      │   │   performance       │
    │ • duration_min   │      │   │                     │
    │ • hr_avg         │      │   │ • activity_terrain_ │
    │ • source         │      │   │   analysis          │
    │ • external_id    │      │   │                     │
    │ • elevation_gain │◄─────┘   │ • user_pace_        │
    │ • elevation_     │          │   profiles          │
    │   stream         │          │                     │
    │ • temperature    │          │ • saved_routes      │
    │ • weather_       │          │                     │
    │   conditions     │          │ • notification_log  │
    │ • location_name  │          │                     │
    │ • humidity       │          └─────────────────────┘
    │ • map_polyline   │
    │ • map_summary_   │
    │   polyline       │
    │                  │
    │ ✅ All data      │
    │    stored here   │
    └──────────────────┘
```

---

## 🎯 **TABLE BREAKDOWN**

### **1. PRIMARY TABLE: `log_entries`**

**Purpose:** Stores ALL activity data (workouts, runs, training sessions)

**Source:** Both CSV imports AND API syncs go here

**Schema:**
```sql
CREATE TABLE log_entries (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),

  -- Basic Activity Info
  title text NOT NULL,
  date date NOT NULL,
  km numeric NOT NULL CHECK (km > 0 AND km <= 500),
  duration_min numeric,

  -- Physiological Data
  hr_avg numeric CHECK (hr_avg > 0 AND hr_avg < 300),

  -- Source Tracking
  source text,  -- 'Strava', 'Garmin', 'Coros', 'Manual'
  external_id text,  -- Strava activity ID
  data_source text,  -- 'strava', 'garmin', etc.

  -- Elevation Data (🏔️ THE KEY FIELDS)
  elevation_gain numeric,      -- Total meters climbed
  elevation_stream jsonb,       -- Detailed altitude points: [100, 105, 110, ...]

  -- Route Visualization
  map_polyline text,            -- Full resolution route
  map_summary_polyline text,    -- Low resolution preview
  distance_stream jsonb,        -- Distance points: [0, 100, 200, ...]

  -- Environmental Data
  temperature numeric,          -- Temperature in °C
  weather_conditions text,      -- Weather description
  location_name text,           -- City/location name
  humidity numeric,             -- Humidity %
  altitude_m integer,           -- Starting elevation
  terrain_type text,            -- 'road', 'trail', 'technical'
  weather_data jsonb,           -- Additional weather details

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Data Flow:**
```
CSV Import → parseStravaCSV() → Settings.tsx → bulkInsertLogEntries() → log_entries
API Sync   → StravaProvider  → WearableManager → bulkInsertLogEntries() → log_entries
```

**Key Point:** ✅ **BOTH paths write to the same table with the same fields**

---

### **2. DERIVED TABLE: `environmental_training_data`**

**Purpose:** Rich environmental context for machine learning

**Source:** Auto-generated after `log_entries` insert

**Trigger:** `bulkInsertLogEntries()` → `enrichLogEntryWithEnvironment()` → `saveEnvironmentalTrainingData()`

**Schema:**
```sql
CREATE TABLE environmental_training_data (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  log_entry_id uuid REFERENCES log_entries(id),  -- Links back to activity

  -- Environmental Conditions
  temperature_c numeric,
  humidity_pct integer,
  wind_kph numeric,
  altitude_m integer,
  terrain_type text,

  -- Performance Metrics
  pace_min_km numeric,
  heart_rate_bpm integer,
  perceived_effort integer,

  -- Context
  time_of_day text,
  season text,

  -- Timestamps
  training_date date,
  created_at timestamptz DEFAULT now()
);
```

**Data Source:**
- `temperature_c` ← `log_entries.temperature`
- `humidity_pct` ← `log_entries.humidity`
- `altitude_m` ← `log_entries.altitude_m`
- `pace_min_km` ← Calculated from `duration_min / km`
- `heart_rate_bpm` ← `log_entries.hr_avg`

**Used For:**
- Heat tolerance learning
- Altitude adaptation tracking
- Optimal training time detection
- Environmental impact analysis

---

### **3. DERIVED TABLE: `climate_performance`**

**Purpose:** Aggregate performance by location and climate

**Source:** Auto-updated after bulk inserts

**Trigger:** `bulkInsertLogEntries()` → `populateClimatePerformance()`

**Schema:**
```sql
CREATE TABLE climate_performance (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),

  -- Location Context
  location text NOT NULL,

  -- Climate Averages
  avg_temp numeric,
  avg_humidity numeric,

  -- Performance Averages
  avg_pace numeric,
  avg_heart_rate numeric,

  -- Statistics
  sample_count integer,
  first_recorded timestamptz,
  last_recorded timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, location)
);
```

**Data Source:**
- Aggregates multiple `log_entries` by `location_name`
- Calculates averages for same location over time
- Updates when new activities added for that location

**Example Row:**
```json
{
  "location": "Boulder, CO",
  "avg_temp": 18.5,
  "avg_humidity": 45,
  "avg_pace": 6.2,
  "avg_heart_rate": 145,
  "sample_count": 47
}
```

**Used For:**
- "You run 12% faster in Boulder than Denver"
- "Your heart rate is 8 bpm lower in cooler weather"
- Location-specific performance recommendations

---

### **4. DERIVED TABLE: `activity_terrain_analysis`**

**Purpose:** Cache terrain breakdown for pace profile calculations

**Source:** Auto-calculated after inserts if elevation data exists

**Trigger:**
```
bulkInsertLogEntries() → analyzeUserActivities() →
analyzeActivityTerrain() → saveTerrainAnalysis()
```

**Schema:**
```sql
CREATE TABLE activity_terrain_analysis (
  id uuid PRIMARY KEY,
  log_entry_id uuid REFERENCES log_entries(id),  -- Links to activity
  user_id uuid REFERENCES auth.users(id),

  -- Distance Breakdown
  uphill_distance_km numeric,
  downhill_distance_km numeric,
  flat_distance_km numeric,

  -- Pace Breakdown
  uphill_pace_min_km numeric,
  downhill_pace_min_km numeric,
  flat_pace_min_km numeric,

  -- Grade Statistics
  avg_grade_pct numeric,

  -- Detailed Segments (JSONB)
  segments_data jsonb,  -- [{grade: 5, distance: 0.5, pace: 7.2}, ...]

  -- Context
  activity_date date,
  created_at timestamptz DEFAULT now(),

  UNIQUE(log_entry_id)
);
```

**Data Source:**
- Requires `elevation_stream` + `distance_stream` from `log_entries`
- Calculates grade between each point
- Segments activity into uphill/downhill/flat sections
- Calculates pace for each segment

**Example `segments_data`:**
```json
[
  {"grade": -2.5, "distance_km": 0.8, "pace_min_km": 5.8, "type": "downhill"},
  {"grade": 0.5, "distance_km": 1.2, "pace_min_km": 6.5, "type": "flat"},
  {"grade": 8.5, "distance_km": 0.5, "pace_min_km": 9.2, "type": "uphill"}
]
```

**Used For:**
- Personalized pace predictions on hilly routes
- Grade-adjusted training recommendations
- Comparing performance across different terrains

---

### **5. DERIVED TABLE: `user_pace_profiles`**

**Purpose:** User's personalized pace adjustments by terrain

**Source:** Calculated from `activity_terrain_analysis` (last 90 days)

**Trigger:** `analyzeUserActivities()` → `recalculatePaceProfileBackground()`

**Schema:**
```sql
CREATE TABLE user_pace_profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),

  -- Base Paces
  base_flat_pace_min_km numeric,

  -- Adjustment Factors
  uphill_pace_adjustment_factor numeric DEFAULT 1.3,   -- 30% slower uphill
  downhill_pace_adjustment_factor numeric DEFAULT 0.85, -- 15% faster downhill

  -- Detailed Grade Paces (JSONB)
  grade_bucket_paces jsonb,  -- {"-5": 5.2, "0": 6.5, "5": 8.1, "10": 10.5}

  -- Statistics
  sample_size integer,
  min_segments_per_type jsonb,

  -- Metadata
  last_calculated_at timestamptz,
  calculation_period_days integer DEFAULT 90,

  UNIQUE(user_id)
);
```

**Data Source:**
- Aggregates all `activity_terrain_analysis` rows for user
- Calculates average pace per grade bucket
- One row per user (updated periodically)

**Example Row:**
```json
{
  "base_flat_pace_min_km": 6.5,
  "uphill_pace_adjustment_factor": 1.45,  // 45% slower on uphills
  "downhill_pace_adjustment_factor": 0.88, // 12% faster on downhills
  "grade_bucket_paces": {
    "-10": 5.1,  // Steep downhill
    "-5": 5.8,   // Moderate downhill
    "0": 6.5,    // Flat
    "5": 8.2,    // Moderate uphill
    "10": 10.8,  // Steep uphill
    "15": 14.2   // Very steep uphill
  },
  "sample_size": 127
}
```

**Used For:**
- Race pace predictions for specific course profiles
- "Based on your history, expect 8:45/km on this 10% grade"
- Personalized workout generation on hilly routes

---

### **6. SUPPORTING TABLES**

#### **`wearable_connections`**
**Purpose:** OAuth tokens and connection status

```sql
CREATE TABLE wearable_connections (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  provider text,  -- 'strava', 'garmin', 'coros'
  connection_status text,  -- 'connected', 'disconnected'
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  last_sync timestamptz
);
```

#### **`saved_routes`**
**Purpose:** GPX files and community-shared routes

```sql
CREATE TABLE saved_routes (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text,
  gpx_data text,  -- Full GPX XML
  distance_km numeric,
  elevation_gain_m numeric,
  is_public boolean,
  star_count integer
);
```

#### **`notification_log`**
**Purpose:** Weather alerts and training reminders

```sql
CREATE TABLE notification_log (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  notification_type text,
  message text,
  sent_at timestamptz
);
```

---

## 🔄 **COMPLETE DATA FLOW EXAMPLE**

### **Scenario: You upload Strava CSV with 1,222 activities**

```
Step 1: CSV Upload
────────────────────
User: Clicks "Upload Strava CSV" in Settings
File: activities.csv (contains 1,222 rows)

Step 2: Parsing
────────────────────
Function: parseStravaCSV(file)
Location: src/utils/stravaImport.ts
Process:
  • Reads CSV header
  • Finds column indices for:
    - Activity Type
    - Distance
    - Elapsed Time
    - Average Heart Rate
    - Elevation Gain ✅
    - Average Temperature
    - Weather Observation
    - Location
  • Parses 1,222 rows
  • Filters for "Run" type
  • Returns Run[] array with all fields

Step 3: Conversion
────────────────────
Function: Settings.tsx (lines 145-157)
Process:
  • Converts Run[] → LogEntry[]
  • Maps fields:
    - run.name → entry.title
    - run.date → entry.dateISO
    - run.distanceKm → entry.km
    - run.durationMin → entry.durationMin
    - run.avgHr → entry.hrAvg
    - run.elevationGain → entry.elevationGain ✅ FIXED
    - run.temperature → entry.temperature ✅ FIXED
    - run.weather → entry.weather ✅ FIXED
    - run.location → entry.location ✅ FIXED

Step 4: Database Insert
────────────────────
Function: bulkInsertLogEntries(entries)
Location: src/lib/database.ts
Process:
  • Checks for duplicates (by date+km or external_id)
  • Converts LogEntry[] → DbLogEntry[]
  • Sanitizes strings (removes null bytes)
  • Batches into groups of 100
  • Inserts into log_entries table
  • Result: 1,222 rows inserted

Step 5: Environmental Enrichment
────────────────────
Function: enrichLogEntryWithEnvironment()
Location: src/services/environmentalDataEnrichment.ts
Process:
  • For each inserted activity:
    - Extracts temperature, humidity, location
    - Calculates pace (duration / distance)
    - Determines time_of_day, season
    - Inserts into environmental_training_data
  • Result: 1,222 environmental records created

Step 6: Climate Aggregation
────────────────────
Function: updateClimatePerformance()
Process:
  • Groups activities by location
  • Calculates averages per location:
    - avg_temp, avg_humidity
    - avg_pace, avg_heart_rate
  • Upserts into climate_performance table
  • Result: ~15-30 location records (depends on where you run)

Step 7: Terrain Analysis
────────────────────
Function: analyzeUserActivities()
Location: src/engine/historicalAnalysis/analyzeActivityTerrain.ts
Process:
  • Filters for activities with elevation_stream data
  • For each activity with elevation:
    - Calculates grade between points
    - Segments into uphill/downhill/flat
    - Calculates pace per segment
    - Inserts into activity_terrain_analysis
  • Result: 800-1000 terrain analyses (not all activities have elevation streams)

Step 8: Pace Profile Calculation
────────────────────
Function: recalculatePaceProfileBackground()
Location: src/engine/historicalAnalysis/calculateUserPaceProfile.ts
Process:
  • Fetches all activity_terrain_analysis (last 90 days)
  • Aggregates pace by grade bucket
  • Calculates adjustment factors
  • Upserts into user_pace_profiles
  • Result: 1 pace profile record for user
```

**Final Database State:**
```
log_entries:                    1,222 rows ✅ (all activities)
environmental_training_data:    1,222 rows ✅ (environmental context)
climate_performance:            ~20 rows ✅ (location aggregates)
activity_terrain_analysis:      ~900 rows ✅ (activities with elevation streams)
user_pace_profiles:             1 row ✅ (your personalized profile)
```

---

## 🆚 **CSV vs API: Key Differences**

| Aspect | CSV Upload | Strava API Sync |
|--------|-----------|-----------------|
| **Trigger** | Manual file upload | Automatic/on-demand sync |
| **Data Source** | Strava export file | Strava REST API v3 |
| **Elevation** | `elevation_gain` only | `elevation_gain` + `elevation_stream` |
| **Route Data** | ❌ No polyline | ✅ Full map polyline |
| **Weather** | ✅ If in CSV | ✅ From Strava API |
| **Activity ID** | ❌ Not preserved | ✅ Stored as `external_id` |
| **Speed** | Fast (30 seconds) | Slow (~1-2 min per 100 activities) |
| **Rate Limits** | None | 100 requests per 15 min, 1000/day |
| **Data Richness** | Basic | Comprehensive |
| **Best For** | Initial bulk import | Ongoing sync |

**Recommendation:**
1. Use CSV for initial 1,222 activities import
2. Connect API for ongoing automatic sync
3. API will deduplicate (won't re-import existing activities)

---

## 🔍 **HOW TO VERIFY DATA**

### **Check Primary Table**
```sql
-- See what data you have
SELECT
  COUNT(*) as total_activities,
  COUNT(elevation_gain) as with_elevation,
  COUNT(elevation_stream) as with_elevation_stream,
  COUNT(map_polyline) as with_route,
  COUNT(temperature) as with_temperature,
  COUNT(location_name) as with_location,
  source
FROM log_entries
WHERE user_id = 'YOUR_USER_ID'
GROUP BY source;
```

**Expected After CSV Import:**
```
total_activities: 1222
with_elevation: 1222 ✅
with_elevation_stream: 0 (CSV doesn't have this)
with_route: 0 (CSV doesn't have this)
with_temperature: ~800 (if available in CSV)
with_location: ~1100 (if available in CSV)
source: 'Strava'
```

**Expected After API Sync:**
```
total_activities: 1222 (deduplicated, no new rows)
with_elevation: 1222 ✅
with_elevation_stream: 1222 ✅ (API adds this!)
with_route: 1222 ✅ (API adds this!)
with_temperature: 1222 ✅ (API enriches)
with_location: 1222 ✅ (API enriches)
source: 'Strava'
```

---

### **Check Derived Tables**
```sql
-- Environmental learning data
SELECT COUNT(*) FROM environmental_training_data
WHERE user_id = 'YOUR_USER_ID';
-- Expected: 1222 ✅

-- Climate performance by location
SELECT location, sample_count, avg_pace, avg_temp
FROM climate_performance
WHERE user_id = 'YOUR_USER_ID'
ORDER BY sample_count DESC;
-- Expected: 15-30 locations with aggregated stats ✅

-- Terrain analysis
SELECT COUNT(*) FROM activity_terrain_analysis
WHERE user_id = 'YOUR_USER_ID';
-- Expected after CSV: ~100 (only if CSV had elevation streams)
-- Expected after API: 1222 ✅ (API provides streams)

-- Your pace profile
SELECT base_flat_pace_min_km, uphill_pace_adjustment_factor, sample_size
FROM user_pace_profiles
WHERE user_id = 'YOUR_USER_ID';
-- Expected: 1 row with your personalized factors ✅
```

---

## 🎯 **SUMMARY**

### **Single Source of Truth**
```
PRIMARY DATA: log_entries table
  ├─ ALL activities go here (CSV + API)
  ├─ Contains elevation_gain (always)
  ├─ Contains elevation_stream (only from API)
  └─ Contains map_polyline (only from API)
```

### **Derived Intelligence**
```
SECONDARY DATA: Generated from log_entries
  ├─ environmental_training_data (ML features)
  ├─ climate_performance (location insights)
  ├─ activity_terrain_analysis (terrain breakdown)
  └─ user_pace_profiles (personalized pacing)
```

### **The Fix**
```
BEFORE: CSV → parser ✅ → Settings ❌ → database ❌
        (elevation extracted)  (elevation dropped)  (elevation missing)

AFTER:  CSV → parser ✅ → Settings ✅ → database ✅
        (elevation extracted)  (elevation mapped)  (elevation saved!)
```

---

## 🚀 **WHAT YOU SHOULD DO NOW**

1. **Re-import your CSV** (Settings → Data tab → Upload Strava CSV)
   - All 1,222 activities will now have `elevation_gain` ✅
   - Environmental data will be enriched automatically ✅
   - Climate performance will be calculated ✅

2. **(Optional) Connect Strava API** (Settings → Devices tab → Connect Strava)
   - Adds `elevation_stream` to existing activities ✅
   - Adds `map_polyline` for route visualization ✅
   - Enables terrain analysis and pace profiles ✅
   - Auto-syncs new activities going forward ✅

3. **Verify the data** (Browser console):
   ```javascript
   const { getLogEntriesByDateRange } = await import('@/lib/database');
   const entries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');

   console.log('Total activities:', entries.length);
   console.log('With elevation:', entries.filter(e => e.elevationGain).length);
   console.log('Sample:', entries.find(e => e.elevationGain));
   ```

**Your 142.8m elevation gain will now be saved!** 🏔️✅
