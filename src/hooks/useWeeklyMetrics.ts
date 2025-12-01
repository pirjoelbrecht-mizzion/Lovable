import { useState, useEffect, useMemo } from 'react';
import { getDerivedMetricsWeekly, saveDerivedMetricsWeekly, type DbDerivedMetricWeekly, getLogEntriesByDateRange } from '@/lib/database';
import { getSupabase, getCurrentUserId } from '@/lib/supabase';

export interface WeeklyMetric {
  weekStartDate: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  avgHr: number | null;
  avgPace: number | null;
  longRunKm: number;
  acuteLoad: number;
  chronicLoad: number | null;
  acwr: number | null;
  efficiencyScore: number | null;
  fatigueIndex: number | null;
  hrDriftPct: number | null;
  monotony: number | null;
  strain: number | null;
  elevationGainM: number;
  runCount: number;
  qualitySessions: number;
}

export function useWeeklyMetrics(startDate: string, endDate: string) {
  const [metrics, setMetrics] = useState<WeeklyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDerivedMetricsWeekly(startDate, endDate);

        const transformed: WeeklyMetric[] = data.map(d => ({
          weekStartDate: d.week_start_date,
          totalDistanceKm: d.total_distance_km,
          totalDurationMin: d.total_duration_min,
          avgHr: d.avg_hr ?? null,
          avgPace: d.avg_pace ?? null,
          longRunKm: d.long_run_km,
          acuteLoad: d.acute_load,
          chronicLoad: d.chronic_load ?? null,
          acwr: d.acwr ?? null,
          efficiencyScore: d.efficiency_score ?? null,
          fatigueIndex: d.fatigue_index ?? null,
          hrDriftPct: d.hr_drift_pct ?? null,
          monotony: d.monotony ?? null,
          strain: d.strain ?? null,
          elevationGainM: d.elevation_gain_m,
          runCount: d.run_count,
          qualitySessions: d.quality_sessions,
        }));

        setMetrics(transformed);
      } catch (err) {
        console.error('Error fetching weekly metrics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [startDate, endDate]);

  const refresh = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useWeeklyMetrics] Computing metrics client-side as fallback...');

      const allLogEntries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');

      if (allLogEntries.length === 0) {
        console.log('[useWeeklyMetrics] No log entries found');
        setMetrics([]);
        return;
      }

      const weeklyMap = new Map<string, typeof allLogEntries>();

      for (const entry of allLogEntries) {
        const date = new Date(entry.dateISO);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diff);
        const weekStart = monday.toISOString().split('T')[0];

        if (!weeklyMap.has(weekStart)) {
          weeklyMap.set(weekStart, []);
        }
        weeklyMap.get(weekStart)!.push(entry);
      }

      const sortedWeeks = Array.from(weeklyMap.keys()).sort();
      const weeklyLoads: number[] = [];
      const derivedMetrics: DbDerivedMetricWeekly[] = [];

      for (let idx = 0; idx < sortedWeeks.length; idx++) {
        const weekStart = sortedWeeks[idx];
        const entries = weeklyMap.get(weekStart)!;

        const totalKm = entries.reduce((sum, e) => sum + e.km, 0);
        const totalDuration = entries.reduce((sum, e) => sum + (e.durationMin || 0), 0);
        const entriesWithHR = entries.filter(e => e.hrAvg);
        const avgHr = entriesWithHR.length > 0
          ? entriesWithHR.reduce((sum, e) => sum + e.hrAvg!, 0) / entriesWithHR.length
          : null;

        const entriesWithPace = entries.filter(e => e.durationMin && e.km > 0);
        const avgPace = entriesWithPace.length > 0
          ? (() => {
              const pace = entriesWithPace.reduce((sum, e) => sum + (e.durationMin! / e.km), 0) / entriesWithPace.length;
              return (pace > 0 && pace < 15) ? pace : null;
            })()
          : null;

        const longRunKm = Math.max(...entries.map(e => e.km), 0);
        const elevationGain = 0;

        const acuteLoad = totalKm;
        weeklyLoads.push(acuteLoad);

        let chronicLoad = null;
        let acwr = null;
        if (idx >= 4) {
          chronicLoad = (weeklyLoads[idx-1] + weeklyLoads[idx-2] + weeklyLoads[idx-3] + weeklyLoads[idx-4]) / 4;
          if (chronicLoad > 0) {
            acwr = acuteLoad / chronicLoad;
          }
        }

        const efficiencyScore = avgHr && avgPace ? avgHr / avgPace : null;
        const fatigueIndex = 0;
        const paces = entriesWithPace.map(e => e.durationMin! / e.km);
        const monotony = paces.length > 2 ? (() => {
          const sum = paces.reduce((a, b) => a + b, 0);
          const mean = sum / paces.length;
          const variance = paces.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / paces.length;
          const stdDev = Math.sqrt(variance);
          return mean === 0 || stdDev === 0 ? 1.0 : mean / stdDev;
        })() : 1.0;
        const strain = totalKm * monotony;

        const qualitySessions = entries.filter(e =>
          e.hrAvg && e.hrAvg > 160 && e.km >= 5
        ).length;

        derivedMetrics.push({
          user_id: userId,
          week_start_date: weekStart,
          total_distance_km: totalKm,
          total_duration_min: totalDuration,
          avg_hr: avgHr,
          avg_pace: avgPace,
          long_run_km: longRunKm,
          acute_load: acuteLoad,
          chronic_load: chronicLoad,
          acwr: acwr,
          efficiency_score: efficiencyScore,
          fatigue_index: fatigueIndex,
          hr_drift_pct: null,
          cadence_avg: null,
          monotony: monotony,
          strain: strain,
          elevation_gain_m: elevationGain,
          run_count: entries.length,
          quality_sessions: qualitySessions,
          metadata: {},
        });
      }

      console.log(`[useWeeklyMetrics] Computed ${derivedMetrics.length} weeks of metrics`);

      await saveDerivedMetricsWeekly(derivedMetrics);
      console.log('[useWeeklyMetrics] Saved metrics to database');

      const data = await getDerivedMetricsWeekly(startDate, endDate);
      const transformed: WeeklyMetric[] = data.map(d => ({
        weekStartDate: d.week_start_date,
        totalDistanceKm: d.total_distance_km,
        totalDurationMin: d.total_duration_min,
        avgHr: d.avg_hr ?? null,
        avgPace: d.avg_pace ?? null,
        longRunKm: d.long_run_km,
        acuteLoad: d.acute_load,
        chronicLoad: d.chronic_load ?? null,
        acwr: d.acwr ?? null,
        efficiencyScore: d.efficiency_score ?? null,
        fatigueIndex: d.fatigue_index ?? null,
        hrDriftPct: d.hr_drift_pct ?? null,
        monotony: d.monotony ?? null,
        strain: d.strain ?? null,
        elevationGainM: d.elevation_gain_m,
        runCount: d.run_count,
        qualitySessions: d.quality_sessions,
      }));

      setMetrics(transformed);
    } catch (err) {
      console.error('Error refreshing weekly metrics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const acwrValues = useMemo(
    () => metrics.map(m => m.acwr).filter((v): v is number => v !== null),
    [metrics]
  );

  const fatigueValues = useMemo(
    () => metrics.map(m => m.fatigueIndex).filter((v): v is number => v !== null),
    [metrics]
  );

  const efficiencyValues = useMemo(
    () => metrics.map(m => m.efficiencyScore).filter((v): v is number => v !== null),
    [metrics]
  );

  return {
    metrics,
    loading,
    error,
    refresh,
    acwrValues,
    fatigueValues,
    efficiencyValues,
  };
}
