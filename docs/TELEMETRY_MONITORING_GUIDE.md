# Telemetry & Monitoring Guide

This guide explains how to use the system telemetry to monitor the health of the multi-sport contribution system.

## Overview

The telemetry system tracks three main categories of events:

1. **Sport Mapping Events:** Database lookups, fallbacks, and contribution factor queries
2. **Governance Events:** Phase 2 flag checks and configuration reads
3. **Performance Events:** Query execution times and system health metrics

## Key Metrics

### Fallback Rate

The percentage of sport type lookups that fall back to hardcoded defaults instead of using database values.

**Target:** < 1% over 7 days

**Query:**
```sql
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

**What it means:**
- **< 1%:** Healthy system, database lookups working as expected
- **1-5%:** Warning zone, investigate potential issues
- **> 5%:** Critical, indicates database connectivity or data issues

### Database Query Performance

Average execution time for sport contribution factor queries.

**Target:** < 50ms average

**Query:**
```sql
SELECT
  AVG((metadata->>'executionTimeMs')::numeric) as avg_execution_time_ms,
  MIN((metadata->>'executionTimeMs')::numeric) as min_execution_time_ms,
  MAX((metadata->>'executionTimeMs')::numeric) as max_execution_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'executionTimeMs')::numeric) as p95_execution_time_ms
FROM system_telemetry
WHERE event_type IN ('database_lookup_success', 'database_lookup_failure')
  AND metadata->>'executionTimeMs' IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';
```

**What it means:**
- **< 50ms:** Excellent performance
- **50-100ms:** Acceptable performance
- **> 100ms:** Poor performance, investigate database indexes or connection pooling

### Sport Type Coverage

Percentage of unique sport types that have database entries vs. fallback defaults.

**Query:**
```sql
WITH sport_type_events AS (
  SELECT
    metadata->>'sportType' as sport_type,
    event_type
  FROM system_telemetry
  WHERE event_category = 'sport_mapping'
    AND created_at > NOW() - INTERVAL '7 days'
)
SELECT
  COUNT(DISTINCT sport_type) FILTER (WHERE event_type = 'database_lookup_success') as covered_types,
  COUNT(DISTINCT sport_type) FILTER (WHERE event_type = 'sport_mapping_fallback') as fallback_types,
  COUNT(DISTINCT sport_type) as total_types,
  ROUND(
    100.0 * COUNT(DISTINCT sport_type) FILTER (WHERE event_type = 'database_lookup_success') / NULLIF(COUNT(DISTINCT sport_type), 0),
    2
  ) as coverage_percent
FROM sport_type_events;
```

### Phase 2 Activation Status

Current state of the Phase 2 governance flag.

**Query:**
```sql
SELECT
  config_key,
  config_value,
  description,
  updated_at,
  CASE
    WHEN (config_value)::boolean = true THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END as status
FROM system_config
WHERE config_key = 'phase_2_enabled';
```

## Monitoring Dashboards

### Daily Health Check

Run this query daily to get an overview of system health:

```sql
WITH recent_events AS (
  SELECT * FROM system_telemetry
  WHERE created_at > NOW() - INTERVAL '24 hours'
),
fallback_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') as fallbacks,
    COUNT(*) FILTER (WHERE event_type = 'database_lookup_success') as successes,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') / NULLIF(COUNT(*), 0),
      2
    ) as fallback_rate
  FROM recent_events
  WHERE event_category = 'sport_mapping'
),
performance_stats AS (
  SELECT
    AVG((metadata->>'executionTimeMs')::numeric) as avg_query_time,
    MAX((metadata->>'executionTimeMs')::numeric) as max_query_time
  FROM recent_events
  WHERE metadata->>'executionTimeMs' IS NOT NULL
),
phase_status AS (
  SELECT (config_value)::boolean as phase_2_enabled
  FROM system_config
  WHERE config_key = 'phase_2_enabled'
)
SELECT
  f.fallbacks,
  f.successes,
  f.fallback_rate as fallback_rate_percent,
  ROUND(p.avg_query_time::numeric, 2) as avg_query_time_ms,
  ROUND(p.max_query_time::numeric, 2) as max_query_time_ms,
  ph.phase_2_enabled,
  CASE
    WHEN f.fallback_rate < 1 AND p.avg_query_time < 50 THEN 'HEALTHY'
    WHEN f.fallback_rate < 5 AND p.avg_query_time < 100 THEN 'WARNING'
    ELSE 'CRITICAL'
  END as system_status
FROM fallback_stats f, performance_stats p, phase_status ph;
```

### Fallback Reasons Analysis

Understand why fallbacks are occurring:

```sql
SELECT
  metadata->>'reason' as fallback_reason,
  COUNT(*) as occurrences,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percent_of_fallbacks,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM system_telemetry
WHERE event_type = 'sport_mapping_fallback'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY metadata->>'reason'
ORDER BY occurrences DESC;
```

**Common Fallback Reasons:**
- `no_data_found`: Sport type exists but not in database (add to `sport_contribution_factors`)
- `database_error: [message]`: Database connectivity or query error (investigate connection)
- `supabase_not_available`: Supabase client initialization failed (check environment config)
- `exception: [message]`: Unexpected error (investigate error logs)

### Top Sport Types by Query Volume

Identify which sport types are queried most frequently:

```sql
SELECT
  metadata->>'sportType' as sport_type,
  COUNT(*) as query_count,
  COUNT(*) FILTER (WHERE event_type = 'database_lookup_success') as successful_queries,
  COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') as fallback_queries,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'database_lookup_success') / NULLIF(COUNT(*), 0),
    2
  ) as success_rate_percent
FROM system_telemetry
WHERE event_category = 'sport_mapping'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY metadata->>'sportType'
ORDER BY query_count DESC
LIMIT 20;
```

## Alerting Rules

### Critical Alerts (Immediate Response Required)

1. **High Fallback Rate**
   - Condition: Fallback rate > 5% over 1 hour
   - Action: Check database connectivity, investigate recent changes
   - Query:
   ```sql
   SELECT
     ROUND(
       100.0 * COUNT(*) FILTER (WHERE event_type = 'sport_mapping_fallback') / NULLIF(COUNT(*), 0),
       2
     ) as fallback_rate
   FROM system_telemetry
   WHERE event_category = 'sport_mapping'
     AND created_at > NOW() - INTERVAL '1 hour'
   HAVING COUNT(*) > 100 AND fallback_rate > 5;
   ```

2. **Database Query Failures**
   - Condition: > 10 lookup failures in 5 minutes
   - Action: Check database health, connection pool, network
   - Query:
   ```sql
   SELECT COUNT(*) as failure_count
   FROM system_telemetry
   WHERE event_type = 'database_lookup_failure'
     AND created_at > NOW() - INTERVAL '5 minutes'
   HAVING COUNT(*) > 10;
   ```

### Warning Alerts (Investigate Soon)

1. **Elevated Fallback Rate**
   - Condition: Fallback rate 1-5% over 24 hours
   - Action: Review fallback reasons, consider adding missing sport types

2. **Slow Query Performance**
   - Condition: Average query time > 100ms over 1 hour
   - Action: Check database load, review indexes, investigate queries

## Troubleshooting Guide

### Problem: High Fallback Rate

**Diagnosis Steps:**

1. Check fallback reasons:
   ```sql
   SELECT metadata->>'reason', COUNT(*)
   FROM system_telemetry
   WHERE event_type = 'sport_mapping_fallback'
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY metadata->>'reason';
   ```

2. Identify missing sport types:
   ```sql
   SELECT DISTINCT metadata->>'sportType'
   FROM system_telemetry
   WHERE event_type = 'sport_mapping_fallback'
     AND metadata->>'reason' = 'no_data_found'
     AND created_at > NOW() - INTERVAL '7 days';
   ```

3. Add missing sport types to database:
   ```sql
   INSERT INTO sport_contribution_factors (sport_type, counts_for_running_load, ...)
   VALUES ('[SportType]', false, 0.5, 0.6, 0.4, 0.5, 0.3)
   ON CONFLICT (sport_type) DO NOTHING;
   ```

### Problem: Slow Query Performance

**Diagnosis Steps:**

1. Check query distribution:
   ```sql
   SELECT
     (metadata->>'executionTimeMs')::numeric as execution_time,
     metadata->>'sportType' as sport_type,
     created_at
   FROM system_telemetry
   WHERE event_type IN ('database_lookup_success', 'database_lookup_failure')
     AND (metadata->>'executionTimeMs')::numeric > 100
   ORDER BY execution_time DESC
   LIMIT 20;
   ```

2. Verify indexes exist:
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE tablename IN ('sport_contribution_factors', 'v_active_sport_factors');
   ```

3. Check database connection pool settings

### Problem: Unexpected Phase 2 Behavior

**Diagnosis Steps:**

1. Verify Phase 2 flag state:
   ```sql
   SELECT * FROM system_config WHERE config_key = 'phase_2_enabled';
   ```

2. Test canary sport type:
   ```sql
   SELECT * FROM v_active_sport_factors WHERE sport_type = 'CanaryTestSport';
   ```

3. Check recent phase_2_check events:
   ```sql
   SELECT metadata, created_at
   FROM system_telemetry
   WHERE event_type = 'phase_2_check'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## Performance Optimization

### Caching Recommendations

Consider implementing application-level caching for:
- System config values (Phase 2 flag)
- Frequently queried sport types
- Contribution factors that don't change often

**Cache TTL Suggestions:**
- System config: 5 minutes
- Sport contribution factors: 1 hour
- Phase 2 flag: 5 minutes

### Query Optimization

The `v_active_sport_factors` view already implements the governance check. Ensure:
- Database indexes on `sport_type` column exist
- Connection pooling is configured
- Query results are cached in application layer when appropriate

## References

- [ADR-001: Multi-Sport Load Normalization](./architecture/decisions/ADR-001-multi-sport-load-normalization.md)
- [Phase 2 Activation Checklist](./PHASE_2_ACTIVATION_CHECKLIST.md)
- [System Telemetry Module](../src/lib/telemetry/systemTelemetry.ts)
