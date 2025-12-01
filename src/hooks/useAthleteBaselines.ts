import { useState, useEffect } from 'react';
import { getAthleteLearningState, type DbAthleteLearningState } from '@/lib/database';
import { getSupabase } from '@/lib/supabase';

export interface AthleteBaselines {
  baselineHr: number;
  baselinePace: number;
  baselineEfficiency: number;
  acwrMean: number;
  acwrStdDev: number;
  acwrLowerBound: number;
  acwrUpperBound: number;
  efficiencyTrendSlope: number;
  fatigueThreshold: number;
  hrDriftBaseline: number;
  cadenceStability: number;
  dataQualityScore: number;
  lastComputedAt: string | null;
  isStale: boolean;
}

export function useAthleteBaselines() {
  const [baselines, setBaselines] = useState<AthleteBaselines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchBaselines = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getAthleteLearningState();
        console.log('[useAthleteBaselines] Fetched data:', data);

        if (data) {
          const lastComputed = data.last_computed_at ? new Date(data.last_computed_at) : null;
          const isStale = lastComputed
            ? (Date.now() - lastComputed.getTime()) > 7 * 24 * 60 * 60 * 1000
            : true;

          const rawLowerBound = data.acwr_mean - data.acwr_std_dev;
          const rawUpperBound = data.acwr_mean + data.acwr_std_dev;

          const acwrLowerBound = Math.max(0.8, Math.min(rawLowerBound, 1.2));
          const acwrUpperBound = Math.min(1.5, Math.max(rawUpperBound, 0.9));

          const baselines = {
            baselineHr: data.baseline_hr,
            baselinePace: data.baseline_pace,
            baselineEfficiency: data.baseline_efficiency,
            acwrMean: data.acwr_mean,
            acwrStdDev: data.acwr_std_dev,
            acwrLowerBound,
            acwrUpperBound,
            efficiencyTrendSlope: data.efficiency_trend_slope,
            fatigueThreshold: data.fatigue_threshold,
            hrDriftBaseline: data.hr_drift_baseline,
            cadenceStability: data.cadence_stability,
            dataQualityScore: data.data_quality_score,
            lastComputedAt: data.last_computed_at || null,
            isStale,
          };
          console.log('[useAthleteBaselines] Setting baselines:', baselines);
          setBaselines(baselines);
        } else {
          console.log('[useAthleteBaselines] No data, setting baselines to null');
          setBaselines(null);
        }
      } catch (err) {
        console.error('Error fetching athlete baselines:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBaselines();
  }, [refreshKey]);

  const refresh = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/compute-learning-state`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': anonKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compute learning state');
      }

      const result = await response.json();

      if (result.success && result.learningState) {
        const data = result.learningState;
        const lastComputed = new Date(data.last_computed_at);
        const isStale = false;

        const rawLowerBound = data.acwr_mean - data.acwr_std_dev;
        const rawUpperBound = data.acwr_mean + data.acwr_std_dev;

        const acwrLowerBound = Math.max(0.8, Math.min(rawLowerBound, 1.2));
        const acwrUpperBound = Math.min(1.5, Math.max(rawUpperBound, 0.9));

        setBaselines({
          baselineHr: data.baseline_hr,
          baselinePace: data.baseline_pace,
          baselineEfficiency: data.baseline_efficiency,
          acwrMean: data.acwr_mean,
          acwrStdDev: data.acwr_std_dev,
          acwrLowerBound,
          acwrUpperBound,
          efficiencyTrendSlope: data.efficiency_trend_slope,
          fatigueThreshold: data.fatigue_threshold,
          hrDriftBaseline: data.hr_drift_baseline,
          cadenceStability: data.cadence_stability,
          dataQualityScore: data.data_quality_score,
          lastComputedAt: data.last_computed_at,
          isStale,
        });
      }

      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Error refreshing baselines:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { baselines, loading, error, refresh };
}
