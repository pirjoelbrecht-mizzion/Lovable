# Multi-Sport Training Load: Future Enhancements

## Current Implementation (Phase 1)
Binary classification: activities either count fully toward running load or don't count at all.

- Running activities: Full contribution to metrics
- All other activities: Excluded from running metrics

## Planned Enhancement (Phase 2)
Multi-dimensional training load model that separates fatigue from performance gains.

### Training Load Components

#### 1. Fatigue Accumulation
All activities contribute to overall fatigue based on duration and intensity:

- **Running**: 100% fatigue contribution
- **Walking/Hiking**: 60-80% fatigue contribution (depends on terrain/elevation)
- **Cycling**: 40-60% fatigue contribution (less impact than running)
- **Swimming**: 30-50% fatigue contribution (non-weight bearing)
- **Strength Training**: 20-40% fatigue contribution (different energy systems)

#### 2. Running Performance Gains
Only running-specific activities improve running performance metrics:

- **Running**: 100% performance contribution
- **Walking/Hiking**: 0% performance contribution (maintains aerobic base only)
- **Cross-Training**: 0% performance contribution (general fitness, not running-specific)

### Implementation Approach

1. **Database Updates**
   - Add `fatigue_contribution_factor` (0.0-1.0) to sport type mapping
   - Add `performance_contribution_factor` (0.0-1.0) to sport type mapping
   - Keep `counts_for_running_load` for backward compatibility

2. **Metrics Calculation**
   - ACWR calculation uses fatigue-weighted load across all activities
   - Performance projections use running activities only
   - Readiness score considers total fatigue from all sources

3. **Adaptive Coach Integration**
   - Coach accounts for accumulated fatigue from all activities
   - Training plan adjusts if non-running activities push total load too high
   - Rest day recommendations consider total fatigue, not just running load

### Example Scenarios

**Scenario 1: Ultra runner with hiking**
- Monday: 10km run → 10km running load, 10km fatigue
- Tuesday: 15km hike with 1000m gain → 0km running load, 12km fatigue equivalent
- Result: Running performance calculations ignore hike, but readiness score reflects accumulated fatigue

**Scenario 2: Runner cross-training**
- Wednesday: 8km easy run → 8km running load, 8km fatigue
- Thursday: 60min cycling → 0km running load, 4km fatigue equivalent
- Result: ACWR shows lower running volume but fatigue score reflects both activities

### Benefits

1. **Better Recovery Management**: System knows you're tired from yesterday's hike
2. **Accurate Training Load**: Prevents overtraining from high non-running volume
3. **Smarter Recommendations**: Coach suggests easier runs after hard cross-training days
4. **Realistic Readiness**: Readiness score reflects all physical stress, not just running

### Migration Strategy

- Phase 1 (Current): Binary classification, backward compatible
- Phase 2 (Future): Add contribution factors, use weighted calculations
- Phase 3 (Advanced): Machine learning to personalize contribution factors per athlete

### Notes

The current implementation correctly excludes non-running activities from running performance metrics. The enhancement will add sophisticated fatigue tracking without breaking existing functionality.
