import type { LogEntry } from "@/types";
import type { BinnedDataPoint } from "@/types/timeframe";

export function filterEntriesByDateRange(
  entries: LogEntry[],
  startDate: string,
  endDate: string
): LogEntry[] {
  return entries.filter((e) => e.dateISO >= startDate && e.dateISO <= endDate);
}

export function aggregateByDay(entries: LogEntry[]): BinnedDataPoint[] {
  const map = new Map<string, LogEntry[]>();

  for (const entry of entries) {
    const date = entry.dateISO;
    if (!map.has(date)) {
      map.set(date, []);
    }
    map.get(date)!.push(entry);
  }

  const sorted = Array.from(map.keys()).sort();

  return sorted.map((date) => {
    const dayEntries = map.get(date)!;
    const totalKm = dayEntries.reduce((sum, e) => sum + (e.km || 0), 0);
    return {
      key: date,
      date,
      value: totalKm,
      count: dayEntries.length,
    };
  });
}

export function aggregateByWeek(entries: LogEntry[], weeksCount?: number): BinnedDataPoint[] {
  const map = new Map<string, LogEntry[]>();

  const sorted = entries
    .slice()
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1))
    .filter((e) => !!e.dateISO);

  for (const entry of sorted) {
    const weekKey = getISOWeekKey(new Date(entry.dateISO));
    if (!map.has(weekKey)) {
      map.set(weekKey, []);
    }
    map.get(weekKey)!.push(entry);
  }

  const keys = Array.from(map.keys()).sort();
  const selectedKeys = weeksCount ? keys.slice(-weeksCount) : keys;

  return selectedKeys.map((key) => {
    const weekEntries = map.get(key)!;
    const totalKm = weekEntries.reduce((sum, e) => sum + (e.km || 0), 0);
    const totalVertical = weekEntries.reduce((sum, e) => sum + (e.elevationGain || 0), 0);
    const firstDate = weekEntries[0]?.dateISO || key;
    return {
      key,
      date: firstDate,
      value: totalKm,
      count: weekEntries.length,
      vertical: totalVertical,
    };
  });
}

export function aggregateByMonth(entries: LogEntry[]): BinnedDataPoint[] {
  const map = new Map<string, LogEntry[]>();

  for (const entry of entries) {
    const monthKey = entry.dateISO.slice(0, 7);
    if (!map.has(monthKey)) {
      map.set(monthKey, []);
    }
    map.get(monthKey)!.push(entry);
  }

  const sorted = Array.from(map.keys()).sort();

  return sorted.map((key) => {
    const monthEntries = map.get(key)!;
    const totalKm = monthEntries.reduce((sum, e) => sum + (e.km || 0), 0);
    const firstDate = monthEntries[0]?.dateISO || `${key}-01`;
    return {
      key,
      date: firstDate,
      value: totalKm,
      count: monthEntries.length,
    };
  });
}

export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const diff = Number(d) - Number(jan4);
  const week = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function calculateRollingAverage(values: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < window) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += values[j];
    }
    result.push(sum / window);
  }
  return result;
}

export function calculateACWR(
  weeklyData: BinnedDataPoint[],
  chronicWindow: number = 4
): (number | null)[] {
  const weeklyKm = weeklyData.map((d) => d.value);
  const chronic = calculateRollingAverage(weeklyKm, chronicWindow);

  return weeklyKm.map((acute, i) => {
    const chronicLoad = chronic[i];
    if (chronicLoad == null || chronicLoad === 0) return null;
    return Math.max(0, Math.min(3, acute / chronicLoad));
  });
}

export function aggregateHRZones(entries: LogEntry[]): number[] {
  const mins = [0, 0, 0, 0, 0];

  for (const entry of entries) {
    const t = entry.durationMin || Math.max(5, Math.round((entry.km || 0) * 6));
    const hr = entry.hrAvg || 140;

    const bucket = hr < 130 ? 0 : hr < 145 ? 1 : hr < 160 ? 2 : hr < 175 ? 3 : 4;

    mins[bucket] += Math.round(t * 0.6);
    if (bucket > 0) mins[bucket - 1] += Math.round(t * 0.2);
    if (bucket < 4) mins[bucket + 1] += Math.round(t * 0.2);
  }

  return mins;
}

export function getEfficiencyData(entries: LogEntry[], limit?: number) {
  const filtered = entries
    .filter((e) => e.km && e.durationMin && e.hrAvg && e.km >= 3)
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

  const selected = limit ? filtered.slice(-limit) : filtered;

  return selected.map((e) => ({
    date: e.dateISO.slice(5),
    fullDate: e.dateISO,
    pace: Math.round((e.durationMin! / e.km!) * 10) / 10,
    hr: e.hrAvg!,
    efficiency: (e.hrAvg! / (e.durationMin! / e.km!)).toFixed(1),
  }));
}

export function getLongRunData(entries: LogEntry[], minKm: number = 12, limit?: number) {
  const filtered = entries
    .filter((e) => e.km && e.km >= minKm && e.dateISO)
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

  const selected = limit ? filtered.slice(-limit) : filtered;

  return selected.map((e) => ({
    date: e.dateISO.slice(5),
    fullDate: e.dateISO,
    km: e.km!,
    pace: e.durationMin ? (e.durationMin / e.km!).toFixed(2) : null,
    hr: e.hrAvg || null,
  }));
}
