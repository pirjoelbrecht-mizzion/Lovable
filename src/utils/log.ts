// src/utils/log.ts
import type { LogEntry } from "@/types";

/** Normalize fields (safe numbers, 0.1 km rounding, trimmed strings) */
export function normalizeEntry(e: LogEntry): LogEntry {
  const dateISO = (e.dateISO || "").slice(0, 10);
  const km = Math.max(0, Number.isFinite(Number(e.km)) ? Number(e.km) : 0);
  const kmRounded = Math.round(km * 10) / 10;
  const durationMin =
    e.durationMin != null && !Number.isNaN(Number(e.durationMin))
      ? Math.max(0, Math.round(Number(e.durationMin)))
      : undefined;
  const hrAvg =
    e.hrAvg != null && !Number.isNaN(Number(e.hrAvg))
      ? Math.max(0, Math.round(Number(e.hrAvg)))
      : undefined;
  return {
    ...e,
    title: (e.title || "Run").trim(),
    dateISO,
    km: kmRounded,
    durationMin,
    hrAvg,
    source: e.source || "Manual",
  };
}

/** Key not including title (users often rename). Date + duration only (km excluded to handle unit conversion issues). */
export function makeKey(e: LogEntry) {
  const dur = e.durationMin ? `-${e.durationMin}` : "";
  return `${e.dateISO}${dur}`;
}

/** Merge, normalize, deduplicate, sort desc by date. Latest wins. Prefers entries with reasonable km values. */
export function mergeDedup(current: LogEntry[], incoming: LogEntry[]): LogEntry[] {
  const map = new Map<string, LogEntry>();
  let mapReplacements = 0;
  for (const raw of [...current, ...incoming]) {
    const n = normalizeEntry(raw);
    const key = makeKey(n);
    const existing = map.get(key);

    if (existing) {
      if (n.km > 100 && existing.km < 100) {
        continue;
      }
      if (existing.km > 100 && n.km < 100) {
        map.set(key, n);
        continue;
      }

      if ((n.mapPolyline || n.mapSummaryPolyline) && !existing.mapPolyline && !existing.mapSummaryPolyline) {
        mapReplacements++;
        map.set(key, n);
        continue;
      }
      if ((existing.mapPolyline || existing.mapSummaryPolyline) && !n.mapPolyline && !n.mapSummaryPolyline) {
        continue;
      }
    }
    map.set(key, n);
  }
  if (mapReplacements > 0) {
    console.log('[mergeDedup] Replaced', mapReplacements, 'entries with map data');
  }
  return Array.from(map.values()).sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

/** Totals (km and minutes). */
export function totals(entries: LogEntry[]) {
  return entries.reduce(
    (acc, e) => {
      const n = normalizeEntry(e);
      acc.totalKm += n.km || 0;
      if (n.durationMin) acc.totalMin += n.durationMin;
      return acc;
    },
    { totalKm: 0, totalMin: 0 }
  );
}

/** Clean up duplicate entries with incorrect distance values (> 100 km). */
export function cleanupDuplicates(entries: LogEntry[]): LogEntry[] {
  return mergeDedup([], entries);
}