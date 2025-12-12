import { useState, useEffect, useMemo } from 'react';
import { useWeeklyMetrics } from './useWeeklyMetrics';
import { useAthleteBaselines } from './useAthleteBaselines';
import { on } from '@/lib/bus';

export type TimeFrame = '7d' | '14d' | '4w' | '3m' | '12m';

export interface ACWRData {
  date: string;
  acwr: number;
  acute: number;
  chronic: number;
}

export interface ACWRZoneInfo {
  personalMin: number;
  personalMax: number;
  universalMin: number;
  universalMax: number;
  hasPersonalZone: boolean;
}

function getDateRange(timeFrame: TimeFrame): { startDate: string; endDate: string; weeksToShow: number } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  let daysBack: number;
  let weeksToShow: number;

  switch (timeFrame) {
    case '7d':
      daysBack = 7;
      weeksToShow = 1;
      break;
    case '14d':
      daysBack = 14;
      weeksToShow = 2;
      break;
    case '4w':
      daysBack = 28;
      weeksToShow = 4;
      break;
    case '3m':
      daysBack = 90;
      weeksToShow = 12;
      break;
    case '12m':
      daysBack = 365;
      weeksToShow = 52;
      break;
    default:
      daysBack = 84;
      weeksToShow = 12;
  }

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate,
    weeksToShow
  };
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

export function useACWRData(timeFrame: TimeFrame = '4w') {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { startDate, endDate, weeksToShow } = useMemo(
    () => getDateRange(timeFrame),
    [timeFrame]
  );

  const { metrics: weeklyMetrics, loading, error, refresh } = useWeeklyMetrics(startDate, endDate);
  const { baselines, loading: baselinesLoading } = useAthleteBaselines();

  useEffect(() => {
    const unsubscribe = on('log:import-complete', async () => {
      setIsRefreshing(true);
      try {
        await refresh();
      } finally {
        setIsRefreshing(false);
      }
    });

    return () => unsubscribe();
  }, [refresh]);

  const acwrData = useMemo(() => {
    const metricsToShow = weeklyMetrics.slice(-weeksToShow);

    return metricsToShow
      .filter(m => m.acwr !== null)
      .map(m => ({
        date: formatDateForDisplay(m.weekStartDate),
        acwr: m.acwr ?? 0,
        acute: m.acuteLoad,
        chronic: m.chronicLoad ?? 0,
      }));
  }, [weeklyMetrics, weeksToShow]);

  const currentACWR = useMemo(() => {
    if (weeklyMetrics.length === 0) return null;
    const latest = weeklyMetrics[weeklyMetrics.length - 1];
    return latest.acwr;
  }, [weeklyMetrics]);

  const zoneInfo = useMemo((): ACWRZoneInfo => {
    const universalMin = 0.8;
    const universalMax = 1.3;

    let personalMin = universalMin;
    let personalMax = universalMax;
    let hasPersonalZone = false;

    if (baselines && baselines.dataQualityScore >= 0.6) {
      personalMin = Math.max(0.8, Math.min(baselines.acwrLowerBound, 1.2));
      personalMax = Math.min(1.5, Math.max(baselines.acwrUpperBound, 0.9));
      hasPersonalZone = Math.abs(personalMin - universalMin) > 0.05 || Math.abs(personalMax - universalMax) > 0.05;
    }

    return {
      personalMin,
      personalMax,
      universalMin,
      universalMax,
      hasPersonalZone
    };
  }, [baselines]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasData = acwrData.length > 0;
  const needsMoreData = weeklyMetrics.length < 4;

  return {
    acwrData,
    currentACWR,
    zoneInfo,
    loading: loading || baselinesLoading,
    error,
    isRefreshing,
    hasData,
    needsMoreData,
    totalWeeks: weeklyMetrics.length,
    refresh: handleRefresh,
  };
}
