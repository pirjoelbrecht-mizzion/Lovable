# Phase 2 Activation Checklist

This document provides a step-by-step checklist for activating Phase 2 of the multi-sport contribution model. Phase 2 introduces weighted contribution factors for more accurate multi-sport training load calculations.

## Prerequisites

Before activating Phase 2, ensure the following are complete:

- [ ] All sport types in database have accurate contribution factors defined
- [ ] Development and staging environments tested with Phase 2 enabled
- [ ] Product team approval obtained
- [ ] Engineering team review completed
- [ ] Rollback plan documented and understood
- [ ] Monitoring dashboards configured
- [ ] Support team briefed on changes

## Pre-Activation Testing

### 1. Verify Canary Sport Type Behavior

Test the canary sport type to confirm governance system works correctly:

```sql
-- Enable Phase 2 temporarily
UPDATE system_config
SET config_value = 'true'::jsonb
WHERE config_key = 'phase_2_enabled';

-- Check canary returns weighted values
SELECT
  sport_type,
  fatigue_contribution,
  cardio_contribution,
  neuromuscular_contribution,
  phase_2_active
FROM v_active_sport_factors
WHERE sport_type = 'CanaryTestSport';
```

**Expected Results:**
- `phase_2_active` = `true`
- `fatigue_contribution` = `0.42`
- `cardio_contribution` = `0.73`
- `neuromuscular_contribution` = `0.58`

```sql
-- Disable Phase 2
UPDATE system_config
SET config_value = 'false'::jsonb
WHERE config_key = 'phase_2_enabled';

-- Check canary returns binary Phase 1 values
SELECT
  sport_type,
  fatigue_contribution,
  cardio_contribution,
  phase_2_active
FROM v_active_sport_factors
WHERE sport_type = 'CanaryTestSport';
```

**Expected Results:**
- `phase_2_active` = `false`
- `fatigue_contribution` = `0.0` (because counts_for_running_load = false)
- `cardio_contribution` = `0.0`

- [ ] Canary test passed in staging environment

### 2. Baseline Telemetry Collection

Establish baseline metrics before activation:

```sql
-- Check current fallback rate
SELECT
  COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') as fallback_count,
  COUNT(*) FILTER (WHERE event_type = 'database_lookup_success') as success_count,
  COUNT(*) as total_events,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') / NULLIF(COUNT(*), 0),
    2
  ) as fallback_rate_percent
FROM system_telemetry
WHERE event_category = 'sport_mapping'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Acceptable Baseline:**
- Fallback rate < 1% over 7 days
- If fallback rate is higher, investigate and fix issues before proceeding

- [ ] Baseline fallback rate < 1%
- [ ] No unexpected database errors in telemetry

### 3. Validate All Sport Types Have Factors

Ensure no sport types are missing from the database:

```sql
-- Check for sport types in activities that aren't in contribution factors
SELECT DISTINCT type as sport_type
FROM log_entries
WHERE type NOT IN (
  SELECT sport_type FROM sport_contribution_factors
)
LIMIT 10;
```

If any sport types are missing, add them to `sport_contribution_factors` before proceeding.

- [ ] All active sport types have contribution factors defined

### 4. Test Load Calculations

Run load calculations with Phase 2 enabled in staging:

1. Select a test user with diverse activity types
2. Enable Phase 2 in staging
3. Calculate weekly load metrics
4. Verify results are reasonable and expected
5. Compare Phase 1 vs Phase 2 calculations for same data

- [ ] Load calculations produce reasonable results with Phase 2
- [ ] No unexpected errors or crashes
- [ ] Cross-training activities properly contribute to load

## Activation Steps

### Step 1: Enable Phase 2 in Staging

```sql
-- In staging database
UPDATE system_config
SET config_value = 'true'::jsonb,
    updated_at = NOW()
WHERE config_key = 'phase_2_enabled';
```

- [ ] Phase 2 enabled in staging
- [ ] Staging environment tested for 24-48 hours
- [ ] No critical issues found

### Step 2: Monitor Staging Behavior

During the staging period, monitor:

1. **Telemetry Dashboard:**
   - Fallback rate remains stable
   - Database query performance acceptable
   - No unexpected errors

2. **User Feedback:**
   - Test users report accurate load calculations
   - Multi-sport athletes see expected cross-training contributions
   - No confusion about new behavior

3. **Load Metrics:**
   - ACWR calculations remain in normal ranges
   - Training plans adapt appropriately
   - No sudden spikes or drops in calculated load

- [ ] 24-48 hour staging period completed
- [ ] No critical issues identified
- [ ] Metrics look healthy

### Step 3: Enable Phase 2 in Production

Once staging validation is complete:

```sql
-- In production database
-- IMPORTANT: Take a backup first!

UPDATE system_config
SET config_value = 'true'::jsonb,
    updated_at = NOW(),
    updated_by = '[YOUR_USER_ID]'
WHERE config_key = 'phase_2_enabled';
```

- [ ] Production database backup taken
- [ ] Phase 2 enabled in production
- [ ] Timestamp of activation recorded: _______________

### Step 4: Post-Activation Monitoring

For the first 7 days after activation:

**Daily Checks:**
- [ ] Day 1: Check telemetry fallback rate
- [ ] Day 1: Monitor error logs
- [ ] Day 1: Review user feedback channels
- [ ] Day 2: Verify load calculations stable
- [ ] Day 3: Check ACWR distributions
- [ ] Day 4: Review training plan adjustments
- [ ] Day 5: Analyze multi-sport user metrics
- [ ] Day 6: Check support ticket volume
- [ ] Day 7: Final validation review

**Key Metrics to Monitor:**

```sql
-- Daily telemetry check
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') as fallbacks,
  COUNT(*) FILTER (WHERE event_type = 'database_lookup_success') as successes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') / NULLIF(COUNT(*), 0),
    2
  ) as fallback_rate_percent
FROM system_telemetry
WHERE event_category = 'sport_mapping'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Rollback Plan

If critical issues are discovered after activation:

### Immediate Rollback (Emergency)

```sql
-- Disable Phase 2 immediately
UPDATE system_config
SET config_value = 'false'::jsonb,
    updated_at = NOW()
WHERE config_key = 'phase_2_enabled';
```

This immediately reverts all users to Phase 1 binary behavior.

- [ ] Rollback performed: _______________
- [ ] Incident report created
- [ ] Root cause analysis scheduled

### Conditions Requiring Rollback

Roll back immediately if any of these occur:

1. **Critical Errors:**
   - Database query failures spike
   - Application crashes related to contribution factors
   - Data corruption detected

2. **Metrics Degradation:**
   - Fallback rate exceeds 5%
   - Load calculation errors increase significantly
   - Performance degradation beyond acceptable levels

3. **User Impact:**
   - High volume of support tickets related to load calculations
   - User reports of clearly incorrect training load values
   - Training plans become unstable or erratic

## Success Criteria

Phase 2 activation is considered successful if after 7 days:

- [ ] Fallback rate remains < 1%
- [ ] No critical errors or bugs reported
- [ ] Multi-sport users report improved accuracy
- [ ] Training plan quality maintained or improved
- [ ] Support ticket volume normal
- [ ] Database performance stable
- [ ] Telemetry shows healthy system behavior

## Post-Activation Tasks

After successful activation:

- [ ] Update user documentation to reflect Phase 2 behavior
- [ ] Announce Phase 2 activation to users (blog post, email, etc.)
- [ ] Archive Phase 1 transition documentation
- [ ] Schedule Phase 1 code deprecation (consider timeline)
- [ ] Update ADR-001 with actual activation date
- [ ] Celebrate successful deployment!

## Notes

- **Activation Date:** _______________
- **Activated By:** _______________
- **Issues Encountered:** _______________
- **Rollback Date (if applicable):** _______________
- **Rollback Reason (if applicable):** _______________

## References

- [ADR-001: Multi-Sport Load Normalization](./architecture/decisions/ADR-001-multi-sport-load-normalization.md)
- [SPORT_TYPE_CLASSIFICATION_AUDIT.md](../SPORT_TYPE_CLASSIFICATION_AUDIT.md)
- [LOAD_ARCHITECTURE.md](./LOAD_ARCHITECTURE.md)
- [System Telemetry Dashboard](https://app.supabase.com/project/[PROJECT_ID]/database/telemetry)
