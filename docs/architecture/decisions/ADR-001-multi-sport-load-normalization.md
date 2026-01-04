# ADR-001: Multi-Sport Load Normalization & Contribution Model

**Status:** Accepted

**Date:** 2026-01-04

**Supersedes:** Legacy type-based classification in `sportTypeMapping.ts`

## Context

The application originally used a binary classification system for activities: either they "counted for running load" (value = 1.0) or they didn't (value = 0.0). This worked well for runners who occasionally cross-trained, but created problems as the user base diversified:

1. **Multi-Sport Athletes:** Triathletes, adventure racers, and cross-training runners needed accurate representation of how cycling, swimming, and strength training contributed to their overall training load.

2. **Load Calculation Inaccuracy:** A 3-hour bike ride contributed nothing to fatigue calculations, while a 30-minute easy run contributed fully. This didn't match physiological reality.

3. **Training Plan Rigidity:** The adaptive planning system couldn't properly account for cross-training days when adjusting training plans.

4. **Extensibility:** Adding new sport types (e.g., trail running with different specificity than road running) required code changes rather than configuration changes.

## Decision

We will implement a **two-phase multi-dimensional contribution model** with explicit governance controls:

### Phase 1: Binary Model (Current State)
- Activities are classified as "counts for running load" (1.0) or "doesn't count" (0.0)
- Simple, predictable behavior
- Default state for all new users
- Proven system that works well for focused runners

### Phase 2: Weighted Contribution Model (Future State)
- Five dimensions of contribution:
  - **Fatigue Contribution** (0.0-1.0): How much the activity contributes to overall fatigue
  - **Cardio Contribution** (0.0-1.0): Cardiovascular system stress
  - **Neuromuscular Contribution** (0.0-1.0): Neuromuscular load (running-specific movement patterns)
  - **Metabolic Contribution** (0.0-1.0): Metabolic system stress
  - **Running Specificity** (0.0-1.0): How directly the activity transfers to running performance

- Database-driven configuration via `sport_contribution_factors` table
- Per-sport-type customization
- Examples:
  - **TrailRun:** `{fatigue: 1.0, cardio: 1.0, neuromuscular: 1.0, metabolic: 1.0, specificity: 1.0}`
  - **Cycling:** `{fatigue: 0.6, cardio: 0.8, neuromuscular: 0.3, metabolic: 0.7, specificity: 0.4}`
  - **Swimming:** `{fatigue: 0.7, cardio: 0.9, neuromuscular: 0.2, metabolic: 0.7, specificity: 0.3}`
  - **Strength:** `{fatigue: 0.4, cardio: 0.2, neuromuscular: 0.6, metabolic: 0.3, specificity: 0.5}`

### Governance Architecture

To prevent the three identified failure modes, we implement:

1. **Feature Flag Control:** `system_config.phase_2_enabled` boolean flag (default: false)
2. **Governance View:** `v_active_sport_factors` view that:
   - Returns Phase 1 binary values when `phase_2_enabled = false`
   - Returns actual weighted values when `phase_2_enabled = true`
   - Ensures no accidental Phase 2 activation through database changes
3. **Telemetry System:** Tracks fallback usage, database performance, and governance checks
4. **Data Integrity:** CHECK constraints ensure all factors remain in [0.0, 1.0] range

### Fallback Strategy

The system implements a comprehensive fallback hierarchy:

1. **Primary:** Query `v_active_sport_factors` view (respects governance flag)
2. **Fallback Level 1:** Use hardcoded defaults if database unavailable
3. **Fallback Level 2:** Use Phase 1 binary mapping if sport type not found
4. **Telemetry:** All fallbacks are logged for monitoring and alerting

## Architectural Components

### Database Schema

```sql
-- Contribution factors (source of truth)
sport_contribution_factors
  - sport_type (text, primary key)
  - counts_for_running_load (boolean)
  - fatigue_contribution (numeric 0.0-1.0)
  - cardio_contribution (numeric 0.0-1.0)
  - neuromuscular_contribution (numeric 0.0-1.0)
  - metabolic_contribution (numeric 0.0-1.0)
  - running_specificity (numeric 0.0-1.0)

-- Governance config
system_config
  - config_key (text, unique)
  - config_value (jsonb)
  - description (text)

-- Telemetry tracking
system_telemetry
  - event_type (text)
  - event_category (text)
  - metadata (jsonb)
  - created_at (timestamptz)

-- Governance-aware view
v_active_sport_factors
  - Returns Phase 1 values when phase_2_enabled = false
  - Returns actual values when phase_2_enabled = true
  - Single source of truth for application queries
```

### Application Layer

```typescript
// Primary API (src/utils/sportTypeMapping.ts)
getSportContributionFactors(sportType: string): Promise<ExtendedSportMapping>
  - Queries v_active_sport_factors view
  - Tracks telemetry on success/failure
  - Falls back to Phase 1 mapping on error

// Governance check
checkPhase2Enabled(): Promise<boolean>
  - Reads system_config.phase_2_enabled
  - Tracks check via telemetry
  - Returns false if unavailable (safe default)

// Telemetry (src/lib/telemetry/systemTelemetry.ts)
trackSportMappingFallback(sportType, reason)
trackDatabaseLookup(sportType, success, executionTimeMs)
trackPhase2Check(enabled)
getTelemetryStats(days): Promise<TelemetryStats>
checkFallbackThreshold(thresholdPercent): Promise<ThresholdCheck>
```

## Consequences

### Positive

1. **Safe Phased Rollout:** Phase 1 remains active until explicit Phase 2 activation
2. **Observability:** Telemetry provides visibility into system health and fallback usage
3. **Data Safety:** Cannot accidentally activate Phase 2 through database changes alone
4. **Flexibility:** New sport types can be added via database configuration
5. **Accuracy:** Better represents physiological reality for multi-sport training
6. **Maintainability:** Clear separation between Phase 1 and Phase 2 behavior

### Negative

1. **Increased Complexity:** More moving parts compared to simple binary system
2. **Configuration Management:** Administrators must manage `phase_2_enabled` flag
3. **Potential Confusion:** Users might not understand why contribution factors don't match database values (if Phase 2 disabled)
4. **Performance:** Additional database queries for contribution factors (mitigated by view optimization)

### Migration Path

When activating Phase 2:

1. **Validate Data:** Ensure all sport types have accurate contribution factors in database
2. **Test Canary:** Use canary sport type to verify Phase 2 behavior in staging
3. **Monitor Telemetry:** Check baseline fallback rates before activation
4. **Enable Flag:** Set `system_config.phase_2_enabled = true`
5. **Verify View:** Confirm `v_active_sport_factors` returns weighted values
6. **Monitor Impact:** Track changes in load calculations and user feedback
7. **Rollback Plan:** Can disable Phase 2 by setting flag back to false

## Alternatives Considered

### Alternative 1: Pure Hardcoded Approach
Keep all sport mappings in TypeScript code without database.

**Rejected because:**
- Requires code deployment for new sport types
- No way to customize per-user or per-organization
- Difficult to A/B test different contribution models

### Alternative 2: Immediate Phase 2 Activation
Skip Phase 1, implement weighted model immediately.

**Rejected because:**
- Too risky for existing users with established training plans
- No way to validate behavior before affecting all users
- Breaks existing load calculations without migration path

### Alternative 3: Per-User Feature Flag
Allow each user to opt into Phase 2 individually.

**Rejected because:**
- Increases complexity significantly
- Harder to maintain two parallel systems long-term
- Makes it difficult to eventually deprecate Phase 1

## Related Documents

- `SPORT_TYPE_CLASSIFICATION_AUDIT.md`: Detailed audit of sport type mappings
- `docs/LOAD_ARCHITECTURE.md`: Overall load calculation architecture
- `MULTI_SPORT_DATA_NORMALIZATION_COMPLETE.md`: Implementation summary

## Implementation References

- **Database Migration:** `supabase/migrations/*_create_sport_contribution_tables.sql`
- **Governance Migration:** `supabase/migrations/*_create_system_telemetry_and_config_tables.sql`
- **TypeScript Implementation:** `src/utils/sportTypeMapping.ts`
- **Telemetry Module:** `src/lib/telemetry/systemTelemetry.ts`
- **Tests:** `src/tests/phase2Governance.test.ts`

## Notes

- This ADR documents a decision made on 2026-01-04 after the initial implementation
- Phase 2 activation date: TBD (requires approval from product and engineering)
- Expected timeline for Phase 2 activation: 2-4 weeks after telemetry baseline established
- Fallback threshold recommendation: Alert if fallback rate exceeds 1% over 7 days

## Approval

This architecture decision has been reviewed and approved by the engineering team responsible for the multi-sport load normalization system.
