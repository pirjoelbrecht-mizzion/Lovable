// src/components/StravaImporter.tsx
import { useState } from "react";
import { toast } from "@/components/ToastHost";
import { bulkInsertLogEntries } from "@/lib/database";
import { updateFitnessForWeek } from "@/lib/fitnessCalculator";
import { emit } from "@/lib/bus";
import { updateClimatePerformance } from "@/services/locationAnalytics";

export type LogEntry = {
  title: string;
  dateISO: string;
  km: number;
  durationMin?: number;
  hrAvg?: number;
  source: string;
  temperature?: number;
  weather?: string;
  elevationGain?: number;
  location?: string;
};

export default function StravaImporter({
  onImported,
  onClose,
}: {
  onImported: (entries: LogEntry[]) => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast("Please select Strava's activities.csv (CSV file).", "error");
      return;
    }

    setUploading(true);
    console.log('[StravaImporter] Starting CSV import from file:', file.name);
    try {
      const text = await file.text();
      console.log('[StravaImporter] CSV text length:', text.length);

      const entries = parseStravaCSV(text);
      console.log('[StravaImporter] Parsed entries count:', entries.length);

      if (!entries.length) {
        toast("No runs found in CSV.", "error");
        setUploading(false);
        return;
      }

      console.log('[StravaImporter] Sample entry:', entries[0]);
      console.log('[StravaImporter] Calling onImported with', entries.length, 'entries');
      onImported(entries);
      setUploading(false);
      setSyncing(true);

      console.log('[StravaImporter] Starting bulkInsertLogEntries...');
      const inserted = await bulkInsertLogEntries(entries);
      console.log('[StravaImporter] bulkInsertLogEntries result:', inserted);

      if (inserted > 0) {
        const uniqueDates = new Set(entries.map(e => {
          const d = new Date(e.dateISO);
          d.setDate(d.getDate() - d.getDay());
          return d.toISOString().slice(0, 10);
        }));

        console.log('[StravaImporter] Updating fitness for', uniqueDates.size, 'weeks');
        for (const weekStart of uniqueDates) {
          await updateFitnessForWeek(weekStart);
        }

        console.log('[StravaImporter] Populating climate performance data...');
        await populateClimatePerformanceFromImport(entries);

        emit("log:import-complete", { count: entries.length });
        console.log('[StravaImporter] Emitted log:import-complete event with count:', entries.length);

        toast(`Imported and synced ${entries.length} runs to cloud!`, "success");
        console.log('[StravaImporter] Import completed successfully');
      } else {
        toast(`Imported ${entries.length} runs locally (cloud sync failed)`, "warning");
        console.warn('[StravaImporter] Cloud sync failed, no entries inserted');
      }

      onClose();
    } catch (err: any) {
      console.error('[StravaImporter] Import error:', err);
      toast(`Import failed: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setUploading(false);
      setSyncing(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        position: "fixed",
        inset: "10% 10% auto 10%",
        maxWidth: 600,
        margin: "0 auto",
        zIndex: 1000,
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Import Strava CSV</h3>
        <p className="small" style={{ marginTop: 8 }}>
          Select <b>activities.csv</b> from your Strava export (not the ZIP).
        </p>
        <div
          style={{
            border: "2px dashed var(--line)",
            padding: 24,
            textAlign: "center",
            marginTop: 12,
            borderRadius: 10,
            cursor: uploading ? "progress" : "pointer",
          }}
          onClick={() => !uploading && document.getElementById("csv-input")?.click()}
        >
          {uploading ? (
            <div className="small">Parsing CSV…</div>
          ) : syncing ? (
            <div className="small">Syncing to cloud…</div>
          ) : (
            <div className="small" style={{ color: "var(--muted)" }}>
              Click to choose <code>activities.csv</code>
            </div>
          )}
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose} disabled={uploading}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- CSV parsing ---------- */
function parseStravaCSV(text: string): LogEntry[] {
  console.log('[parseStravaCSV] Starting CSV parsing');
  const rows = csvToRows(text);
  console.log('[parseStravaCSV] Total rows:', rows.length);
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  console.log('[parseStravaCSV] Headers:', headers.join(', '));
  const data = rows.slice(1);
  const pick = (obj: Record<string, string>, keys: string[]) => {
    for (const k of keys) if (obj[k] != null && obj[k] !== "") return obj[k];
    return "";
  };

  const out: LogEntry[] = [];
  let skippedNonRun = 0;
  let skippedMissingData = 0;
  let skippedSuspicious = 0;

  for (const cols of data) {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => (rec[h] = (cols[i] ?? "").trim()));

    const type = pick(rec, ["activity type", "type"]).toLowerCase();
    if (type && !type.includes("run")) {
      skippedNonRun++;
      continue;
    }

    const name = pick(rec, ["activity name", "name"]) || "Run";
    const dateRaw = pick(rec, ["activity date", "start date local", "start_date_local"]);
    const distanceRaw = pick(rec, ["distance"]);
    const movingRaw = pick(rec, ["moving time", "moving_time"]);
    const hrRaw = pick(rec, ["average heart rate", "average_heartrate"]);
    const tempRaw = pick(rec, ["average temperature", "avg temp", "temperature"]);
    const weatherRaw = pick(rec, ["weather observation", "weather"]);
    const elevGainRaw = pick(rec, ["elevation gain", "total elevation gain"]);
    const locationRaw = pick(rec, ["location", "city"]);

    if (!dateRaw || !distanceRaw) {
      skippedMissingData++;
      continue;
    }

    const d = new Date(dateRaw);
    const dateISO = isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);

    const rawDist = Number(distanceRaw);
    const km = rawDist > 1000 ? Math.round((rawDist / 1000) * 10) / 10 : Math.round(rawDist * 10) / 10;

    if (!dateISO || !(km > 0)) {
      skippedMissingData++;
      continue;
    }

    if (km > 500) {
      console.warn(`⚠️ Suspicious distance value detected: ${km}km (raw: ${distanceRaw}). Skipping activity: ${name}`);
      skippedSuspicious++;
      continue;
    }

    if (out.length < 3) {
      console.log(`✓ Parsed activity ${out.length + 1}: "${name}" - ${km}km (raw: ${distanceRaw})`);
    }

    const temperature = tempRaw ? Number(tempRaw) : undefined;
    const weather = weatherRaw || undefined;
    const elevationGain = elevGainRaw ? Number(elevGainRaw) : undefined;
    const location = locationRaw || undefined;

    const entry: LogEntry = {
      title: name,
      dateISO,
      km,
      durationMin: movingRaw ? Math.round(Number(movingRaw) / 60) : 0,
      hrAvg: hrRaw ? Math.round(Number(hrRaw)) : undefined,
      source: "Strava",
    };

    if (temperature !== undefined && temperature !== 0) entry.temperature = temperature;
    if (weather) entry.weather = weather;
    if (elevationGain !== undefined && elevationGain > 0) entry.elevationGain = elevationGain;
    if (location) entry.location = location;

    out.push(entry);
  }

  console.log('[parseStravaCSV] Summary:');
  console.log(`  - Total runs parsed: ${out.length}`);
  console.log(`  - Skipped non-run activities: ${skippedNonRun}`);
  console.log(`  - Skipped due to missing data: ${skippedMissingData}`);
  console.log(`  - Skipped suspicious distances: ${skippedSuspicious}`);

  return out;
}

async function populateClimatePerformanceFromImport(entries: LogEntry[]): Promise<void> {
  const entriesWithWeather = entries.filter(e =>
    e.temperature && e.location && e.durationMin && e.km && e.hrAvg
  );

  console.log(`[populateClimatePerformance] Found ${entriesWithWeather.length} entries with weather data`);

  for (const entry of entriesWithWeather) {
    const pace = entry.durationMin! / entry.km;
    const humidity = entry.humidity || 50;

    await updateClimatePerformance(
      entry.location!,
      entry.temperature!,
      humidity,
      pace,
      entry.hrAvg!
    );
  }

  console.log('[populateClimatePerformance] Climate performance data populated');
}

function csvToRows(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += c;
    }
  }

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  return rows.filter((r) => r.some((x) => x.trim().length));
}