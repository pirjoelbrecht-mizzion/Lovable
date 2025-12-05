# Log Entries Column Name Fix

## Error
```
column log_entries.duration does not exist
```

Database query was failing because code tried to select `duration` column, but the actual column name is `duration_min`.

## Root Cause
In `src/lib/database.ts` line 509, the `syncLogEntries()` function was selecting old/incorrect column names that don't match the actual database schema.

## Fix

**File:** `src/lib/database.ts` - `syncLogEntries()` function

**Before:**
```typescript
.select(`
  id, user_id, date, type, duration, distance, distance_unit,
  avg_pace, elevation_gain, elevation_gain_unit, elevation_loss, elevation_loss_unit,
  // ... many columns that don't exist
`)
```

**After:**
```typescript
.select(`
  id, user_id, date, type, duration_min, km, hr_avg,
  source, created_at, updated_at, external_id, data_source,
  map_polyline, map_summary_polyline, elevation_gain, elevation_stream, distance_stream,
  temperature, weather_conditions, location_name, humidity, altitude_m, terrain_type,
  weather_data, elevation_loss, elevation_low
`)
```

## Database Schema (Actual Columns)
The `log_entries` table has:
- `duration_min` (not `duration`)
- `km` (not `distance`)
- `hr_avg` (not `avg_hr`)
- `elevation_gain` ✓
- `elevation_loss` ✓
- `elevation_low` ✓

## Mapping Function
The `fromDbLogEntry()` function correctly maps database columns to app format:
```typescript
{
  durationMin: db.duration_min, // ✓ Correct
  km: db.km,                     // ✓ Correct
  hrAvg: db.hr_avg,             // ✓ Correct
  elevationGain: db.elevation_gain, // ✓ Correct
  // ...
}
```

## Testing
After this fix:
1. Log entries sync without errors
2. No more "column does not exist" errors
3. All elevation data displays correctly
4. Duration values are properly retrieved

## Files Modified
- `src/lib/database.ts` - Fixed `syncLogEntries()` select query
