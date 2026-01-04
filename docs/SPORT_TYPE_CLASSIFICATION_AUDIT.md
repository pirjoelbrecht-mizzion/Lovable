# Sport Type Classification Audit

**Related Architecture Decision:** [ADR-001: Multi-Sport Load Normalization & Contribution Model](./architecture/decisions/ADR-001-multi-sport-load-normalization.md)

This document describes the legacy classification system. For the current multi-sport contribution model with Phase 2 governance, see the ADR above.

## Current State: Partially Correct

### ✅ What's Working

**Strava API Import** (`StravaProvider.ts:85`):
```typescript
const sportType = act.sport_type || act.type || 'Run';
const sportMapping = mapSportType(sportType);
```
- Correctly uses `sport_type` as primary
- Falls back to `type`
- Falls back to 'Run'
- Computes `internalSportCategory` and `countsForRunningLoad`

**CSV Import** (`stravaImport.ts:145-146`):
```typescript
const activityType = typeIdx !== -1 ? (cols[typeIdx] || "Run") : "Run";
const sportMapping = mapSportType(activityType);
```
- Reads "Activity Type" column from CSV
- Computes `internalSportCategory` and `countsForRunningLoad`

### ❌ What's Broken

**Database Read** (`database.ts:167`):
```typescript
function fromDbLogEntry(db: any): LogEntry {
  return {
    // ...
    sportType: db.sport_type,  // ❌ NO FALLBACK TO db.type
    // ...
    // ❌ internalSportCategory: NOT COMPUTED
    // ❌ countsForRunningLoad: NOT COMPUTED
  };
}
```

**Problems:**
1. **No fallback**: Old activities with only `type` will have `sportType = null`
2. **Missing classification**: `internalSportCategory` not computed from database data
3. **Missing load flag**: `countsForRunningLoad` not computed from database data

## Database Schema

### Timeline

1. **Dec 3, 2025** - Added `type` column:
   ```sql
   ALTER TABLE log_entries ADD COLUMN type text DEFAULT 'run';
   ```

2. **Dec 8, 2025** - Added `sport_type` column:
   ```sql
   ALTER TABLE log_entries ADD COLUMN sport_type text;
   ```

3. **Jan 3, 2026** - Added `counts_for_running_load` column:
   ```sql
   ALTER TABLE log_entries ADD COLUMN counts_for_running_load boolean DEFAULT true;
   ```

### Current Columns

```sql
log_entries (
  type text,                      -- Added first, default 'run'
  sport_type text,                -- Added later, no default, NULL for old records
  counts_for_running_load boolean -- Added latest, default true
)
```

### Data State Issues

**Scenario 1: Old Activities (before Dec 8)**
- `type` = 'run' (or other value)
- `sport_type` = NULL ❌
- `counts_for_running_load` = true

**Scenario 2: CSV Import (before multi-sport)**
- `type` = 'run'
- `sport_type` = NULL ❌
- `counts_for_running_load` = true

**Scenario 3: New Strava API Import**
- `type` = 'run'
- `sport_type` = 'Trail Run' ✅
- `counts_for_running_load` = true

## Impact Analysis

### High Impact
1. **Log page**: Uses `internalSportCategory` for icons/labels - will be undefined for old activities
2. **Filtering**: "Show All Activities" filter uses `countsForRunningLoad` - might be incorrect
3. **Weekly metrics**: Edge function filters by `counts_for_running_load = true` - correct for default, but won't adapt to sport type

### Medium Impact
4. **Activity detail**: Shows `sportType` - will be null for old activities
5. **Performance analysis**: May not correctly classify cross-training activities

## Required Fixes

### Fix 1: Add Fallback in `fromDbLogEntry`

```typescript
function fromDbLogEntry(db: any): LogEntry {
  // Determine sport type with fallback chain
  const sportType = db.sport_type || db.type || 'Run';
  const sportMapping = mapSportType(sportType);

  return {
    // ... existing fields ...
    sportType: sportType,
    // Compute derived fields
    internalSportCategory: sportMapping.sportCategory,
    countsForRunningLoad: sportMapping.countsForRunningLoad,
    // ... rest of fields ...
  };
}
```

### Fix 2: Backfill `sport_type` from `type`

```sql
-- Migration: Backfill sport_type from type for old records
UPDATE log_entries
SET sport_type = type
WHERE sport_type IS NULL
  AND type IS NOT NULL;
```

### Fix 3: Add Index for Sport Type Queries

```sql
-- Optimize sport-based filtering
CREATE INDEX IF NOT EXISTS idx_log_entries_sport_type
  ON log_entries(user_id, sport_type, date);
```

### Fix 4: Update `counts_for_running_load` Based on Sport Type

```sql
-- Recalculate counts_for_running_load based on actual sport type
UPDATE log_entries
SET counts_for_running_load = (
  sport_type IN (
    'Run', 'Trail Run', 'Treadmill', 'Virtual Run',
    'Track Run', 'Ultra Run', 'Marathon', 'Half Marathon'
  )
)
WHERE sport_type IS NOT NULL;
```

## Testing Strategy

### Before Fix
1. Import old CSV with mixed activity types
2. Check Log page - icons missing? ❌
3. Filter "Show All Activities" - works correctly? ❌
4. Check ActivityDetail - sportType shown? ❌

### After Fix
1. Re-import same CSV
2. All icons should appear ✅
3. Filtering should work correctly ✅
4. sportType should display correctly ✅

## Migration Priority

1. **Immediate** (Fix 1): Runtime fallback - zero breaking changes
2. **Next** (Fix 2): Backfill migration - improves data quality
3. **Optional** (Fix 3): Index optimization - performance improvement
4. **Phase 2** (Fix 4): Smart recalculation - when multi-sport is fully active

## Summary

**Current Pattern Correctness:**
- ✅ Import paths: Correctly using `sport_type || type`
- ✅ Read path: **FIXED** - Now includes fallback and runtime classification

**Applied Fixes:**
1. ✅ **Fix 1 Applied** - Added runtime fallback in `fromDbLogEntry()`:
   - Uses `sport_type || type || 'Run'` fallback chain
   - Computes `internalSportCategory` at runtime
   - Computes `countsForRunningLoad` at runtime
   - Zero breaking changes, backward compatible

**Remaining Actions:**
2. Schedule Fix 2 as a database migration (backfill sport_type from type)
3. Monitor performance, add Fix 3 if needed (index optimization)
4. Defer Fix 4 until Phase 2 (smart recalculation of counts_for_running_load)
