import { useState, useEffect, useMemo } from "react";
import { useLang, useT } from "@/i18n";
import {
  save,
  load,
  clearAll as storageClearAll,
  exportAll as storageExportAll,
  importAll as storageImportAll,
  downloadJSON,
} from "@/utils/storage";
import { loadUserProfile, updateUserProfile } from "@/state/userData";
import { parseStravaCSV, autoEstimateProfile, estimateHrMax, calcHrZones, calcPaceZones } from "@/utils/stravaImport";
import { mergeDedup } from "@/utils/log";
import type { LogEntry } from "@/components/StravaImporter";
import WearablePrioritySettings from "@/components/WearablePrioritySettings";

type Units = "metric" | "imperial";
type Health = "ok" | "returning" | "sick";

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((s) => s.replace(/^"|"$/g, "").trim());
}

export default function Settings() {
  const t = useT();
  const { lang, setLang } = useLang();

  const [units, setUnits] = useState<Units>(load("units", "metric"));
  const [health, setHealth] = useState<Health>(load("health", "ok"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pace, setPace] = useState(9.0);
  const [hr, setHr] = useState(145);
  const [hrResting, setHrResting] = useState(54);
  const [hrThreshold, setHrThreshold] = useState(165);
  const [hrMax, setHrMax] = useState(180);
  const [importSummary, setImportSummary] = useState("");

  const [customZones, setCustomZones] = useState<{
    Z1: [number, number];
    Z2: [number, number];
    Z3: [number, number];
    Z4: [number, number];
    Z5: [number, number];
  } | null>(null);

  const autoZones = useMemo(() => calcHrZones(hrMax), [hrMax]);
  const displayZones = customZones || autoZones;
  const paceZones = useMemo(() => calcPaceZones(pace), [pace]);

  useEffect(() => {
    const u = loadUserProfile();
    setPace(u.paceBase ?? 9.0);
    setHr(u.heartRateBase ?? 145);
    setHrResting(u.hrResting ?? 54);
    setHrThreshold(u.hrThreshold ?? 165);
    setHrMax(u.hrMax ?? estimateHrMax(u.age ?? 30));
    if (u.zones) {
      setCustomZones(u.zones);
    }
  }, []);

  const onPaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 9.0;
    setPace(val);
    updateUserProfile({ paceBase: val });
  };

  const onHrRestingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 54;
    setHrResting(val);
    updateUserProfile({ hrResting: val });
  };

  const onHrThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 165;
    setHrThreshold(val);
    updateUserProfile({ hrThreshold: val });
  };

  const onHrMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 180;
    setHrMax(val);
    updateUserProfile({ hrMax: val });
  };

  const onZoneChange = (zone: keyof typeof displayZones, value: number) => {
    const newZones = { ...displayZones };
    newZones[zone] = [value, value];
    setCustomZones(newZones);
    updateUserProfile({ zones: newZones });
  };

  async function onStravaImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setImportSummary("");

    try {
      console.log('[CSV Import] Starting import...');
      const runs = await parseStravaCSV(file);
      console.log('[CSV Import] Parsed runs:', runs.length);

      if (!runs.length) {
        alert("No runs found in CSV.");
        return;
      }

      console.log('[CSV Import] First run sample:', runs[0]);

      const est = autoEstimateProfile(runs);
      console.log('[CSV Import] Profile estimated');

      if (est) {
        setPace(est.paceBase);
        setHr(est.heartRateBase);
        if (est.hrMax) setHrMax(est.hrMax);
        if (est.hrResting) setHrResting(est.hrResting);
        if (est.hrThreshold) setHrThreshold(est.hrThreshold);
      }

      console.log('[CSV Import] Creating entries array...');
      const entries: LogEntry[] = runs.map(run => ({
        title: run.name || "Run",
        dateISO: run.date,
        km: run.distanceKm,
        durationMin: run.durationMin,
        hrAvg: run.avgHr,
        source: "Strava",
        // CRITICAL FIX: Include Activity ID (Column A) if available
        externalId: (run as any).activityId,
        // CRITICAL: Include ALL elevation fields from CSV
        elevationGain: run.elevationGain,        // Column U
        elevationLoss: (run as any).elevationLoss, // Column V - NEW
        elevationLow: (run as any).elevationLow,   // Column W - NEW
        // Include environmental data
        temperature: run.temperature,
        weather: run.weather,
        location: run.location,
      }));

      console.log('[CSV Import] About to insert', entries.length, 'entries');
      const { bulkInsertLogEntries } = await import("@/lib/database");
      const inserted = await bulkInsertLogEntries(entries);
      console.log('[CSV Import] Inserted count:', inserted);

      const totalKm = entries.reduce((sum, e) => sum + (e.km || 0), 0);

      const { emit } = await import("@/lib/bus");
      emit("log:import-complete", { count: inserted });

      setImportSummary(
        `Imported ${inserted} runs • ${totalKm.toFixed(1)} km total • HRmax: ${est?.hrMax ?? "-"} bpm • Threshold: ${est?.hrThreshold ?? "-"} bpm`
      );
      alert("✅ Strava import successful!");
    } catch (err: any) {
      console.error("Strava import error:", err);
      alert("Error: " + (err.message || "Unknown error"));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function onExportAll() {
    setBusy(true);
    setMsg("");
    try {
      const blob = storageExportAll();
      const filename = `mizzion-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      downloadJSON(filename, blob);
      setMsg(t("settings.done"));
    } finally {
      setBusy(false);
    }
  }

  async function onImportAll(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      const res = storageImportAll(parsed);
      if (!res.ok) {
        setMsg(res.msg || "Invalid backup.");
      } else {
        setUnits((localStorage.getItem("units") as Units) || "metric");
        setHealth((localStorage.getItem("health") as Health) || "ok");
        setLang(localStorage.getItem("lang") || lang);
        const u = loadUserProfile();
        setPace(u.paceBase ?? 9.0);
        setHr(u.heartRateBase ?? 145);
        setHrResting(u.hrResting ?? 54);
        setHrThreshold(u.hrThreshold ?? 165);
        setHrMax(u.hrMax ?? 180);
        if (u.zones) setCustomZones(u.zones);
        setMsg(t("settings.done"));
      }
    } catch {
      setMsg("Invalid backup.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onMigrateToDatabase() {
    if (!confirm("Migrate all localStorage data to Supabase database? This is safe and won't delete your local data.")) return;
    setBusy(true);
    setMsg("Migrating data...");
    try {
      const { migrateLogEntriesToSupabase } = await import("@/lib/migration");
      const result = await migrateLogEntriesToSupabase();

      if (result.success) {
        setMsg(`✅ Successfully migrated ${result.itemsMigrated} log entries to database!`);

        // Emit event to refresh all pages
        const { emit } = await import("@/lib/bus");
        emit("log:import-complete", { count: result.itemsMigrated });
      } else {
        setMsg(`❌ Migration failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMsg(`❌ Migration error: ${err.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  function onClearAll() {
    if (!confirm(t("settings.clear_all_confirm"))) return;
    storageClearAll();
    save("units", "metric");
    save("health", "ok");
    save("lang", lang);
    setUnits("metric");
    setHealth("ok");
    setMsg(t("settings.done"));
  }

  const zoneColors = {
    Z1: "#22c55e",
    Z2: "#06b6d4",
    Z3: "#f59e0b",
    Z4: "#f97316",
    Z5: "#ef4444",
  };

  return (
    <div className="grid" style={{ gap: 20, maxWidth: 760 }}>
      {/* Debug: Test if buttons render at all */}
      {import.meta.env.DEV && (
        <div style={{ padding: 8, background: '#f0f0f0', borderRadius: 4, fontSize: 12, color: '#333' }}>
          Debug: Settings page loaded. Buttons should be visible in Training Profile section below.
        </div>
      )}

      <section className="card">
        <h2 className="h2">{t("settings.title")}</h2>
        <label className="small" style={{ marginTop: 6 }}>
          {t("settings.units")}
        </label>
        <select value={units} onChange={(e) => setUnits(e.target.value as Units)}>
          <option value="metric">{t("settings.units_metric")}</option>
          <option value="imperial">{t("settings.units_imperial")}</option>
        </select>
        <label className="small" style={{ marginTop: 10 }}>
          {t("settings.language")}
        </label>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="et">Eesti</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
        </select>
        <label className="small" style={{ marginTop: 10 }}>
          {t("settings.health")}
        </label>
        <select value={health} onChange={(e) => setHealth(e.target.value as Health)}>
          <option value="ok">{t("settings.health_ok")}</option>
          <option value="returning">{t("settings.health_returning")}</option>
          <option value="sick">{t("settings.health_sick")}</option>
        </select>
      </section>

      <WearablePrioritySettings />

      <section className="card">
        <h2 className="h2">Training Profile</h2>
        <p className="small" style={{ marginBottom: 8 }}>
          Adjust or import your base training metrics — all workouts adapt automatically.
        </p>

        {msg && (
          <div style={{
            padding: 12,
            marginBottom: 12,
            background: msg.includes('✅') ? '#10b981' : msg.includes('❌') ? '#ef4444' : msg.includes('🏔️') ? '#3b82f6' : '#6366f1',
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: 500
          }}>
            {msg}
          </div>
        )}

        {/* Data Source Info */}
        <div style={{
          padding: 10,
          marginBottom: 12,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 6,
          fontSize: 13
        }}>
          <strong>📊 Available Data Sources:</strong>
          <div style={{ marginTop: 6, paddingLeft: 4 }}>
            • <strong>CSV Upload:</strong> Import Strava/Garmin CSV exports<br/>
            • <strong>Auto-Calculate:</strong> Analyze existing activities (1,222 activities found)<br/>
            • <strong>Strava API:</strong> Fetch elevation data from connected account<br/>
            • <strong>Manual Entry:</strong> Use pace slider below
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{
              background: '#3b82f6',
              color: 'white',
              flex: 1,
              minWidth: 200,
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg('🔄 Analyzing your activities...');
              try {
                // Use static import - already available at top of file
                const entries = await (async () => {
                  const { getLogEntriesByDateRange } = await import('@/lib/database');
                  return getLogEntriesByDateRange('2020-01-01', '2030-12-31');
                })();

                if (entries.length === 0) {
                  setMsg('No activities found to analyze');
                  return;
                }

                const runsWithData = entries
                  .filter(e => e.km > 0 && e.durationMin && e.hrAvg)
                  .map(e => ({
                    pace: e.durationMin! / e.km,
                    avgHr: e.hrAvg!
                  }));

                if (runsWithData.length === 0) {
                  setMsg('❌ No activities with pace and heart rate data found. Try uploading a CSV first.');
                  return;
                }

                setMsg(`📊 Analyzing ${runsWithData.length} activities...`);

                // Use static import - already imported at top
                const est = autoEstimateProfile(runsWithData);
                if (est) {
                  setPace(est.paceBase);
                  setHr(est.heartRateBase);
                  setHrMax(est.hrMax);
                  setHrResting(est.hrResting);
                  setHrThreshold(est.hrThreshold);
                  setMsg(`✅ Auto-calculated from ${runsWithData.length} activities: Pace ${est.paceBase.toFixed(2)} min/km, HR ${est.heartRateBase} bpm`);
                } else {
                  setMsg('Unable to calculate - please check your activity data');
                }
              } catch (err: any) {
                setMsg(`Error: ${err.message}`);
              } finally {
                setBusy(false);
              }
            }}
          >
            🔄 Auto-Calculate from Activities
          </button>

          <button
            className="btn"
            style={{
              background: '#10b981',
              color: 'white',
              flex: 1,
              minWidth: 200,
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg('🏔️ Checking Strava connection...');
              try {
                // Dynamic import with proper error handling
                let backfillModule;
                try {
                  backfillModule = await import('@/utils/backfillElevationData');
                } catch (importErr) {
                  console.error('Import error:', importErr);
                  setMsg('❌ Module loading failed. Check console for details.');
                  setBusy(false);
                  return;
                }

                const { backfillElevationData } = backfillModule;
                setMsg('🏔️ Connecting to Strava API...');

                const result = await backfillElevationData();

                if (result.updated > 0) {
                  setMsg(`✅ Elevation data added to ${result.updated} activities! ${result.errors > 0 ? `(${result.errors} errors)` : ''} Recalculating metrics...`);

                  // Trigger full recalculation
                  const { autoCalculationService } = await import('@/services/autoCalculationService');
                  await autoCalculationService.scheduleFullRecalculation('Elevation data backfilled');

                  setTimeout(() => {
                    setMsg(`✅ Complete! ${result.updated} activities updated with elevation data. Check Insights page for weekly verticals!`);
                  }, 3000);
                } else {
                  setMsg('ℹ️ All activities already have elevation data, or no Strava connection found.');
                }
              } catch (err: any) {
                setMsg(`❌ Error: ${err.message}. Make sure Strava is connected!`);
              } finally {
                setBusy(false);
              }
            }}
          >
            🏔️ Backfill Elevation Data
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <label className="small">Easy pace baseline (min/km)</label>
          <input
            type="range"
            min="5"
            max="12"
            step="0.1"
            value={pace}
            onChange={onPaceChange}
            style={{ width: "100%" }}
          />
          <div style={{ textAlign: "right", fontSize: 13 }}>{pace.toFixed(1)} min/km</div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label className="small">Import full Strava CSV (updates profile & log)</label>
          <label className="btn" style={{ cursor: "pointer", marginTop: 6 }}>
            Upload CSV
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={onStravaImport} />
          </label>
          {importSummary && (
            <p className="small" style={{ marginTop: 6, color: "var(--success)", fontWeight: 500 }}>
              {importSummary}
            </p>
          )}
        </div>
      </section>

      <section className="card" style={{ background: "#2a2a2a", color: "#fff" }}>
        <h2 className="h2" style={{ color: "#fff" }}>HEART RATE ZONES</h2>
        <p className="small" style={{ marginBottom: 16, opacity: 0.7 }}>
          We use HR data to estimate your training zones and provide a Cardio Score to help manage your load.
        </p>

        <div style={{ marginTop: 14 }}>
          <label className="small">Resting HR</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <input
              type="range"
              min="30"
              max="100"
              step="1"
              value={hrResting}
              onChange={onHrRestingChange}
              style={{ flex: 1, accentColor: "#06b6d4" }}
            />
            <div style={{ minWidth: 60, textAlign: "right", fontSize: 15, fontWeight: 500 }}>
              {hrResting} bpm
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label className="small">Threshold HR</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <input
              type="range"
              min="120"
              max="200"
              step="1"
              value={hrThreshold}
              onChange={onHrThresholdChange}
              style={{ flex: 1, accentColor: "#f97316" }}
            />
            <div style={{ minWidth: 60, textAlign: "right", fontSize: 15, fontWeight: 500 }}>
              {hrThreshold} bpm
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          {Object.entries(displayZones).map(([zone, [lo, hi]], idx) => {
            const zoneKey = zone as keyof typeof zoneColors;
            const color = zoneColors[zoneKey];
            const pct = Math.round((lo / hrMax) * 100);
            return (
              <div key={zone} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 160 }}>
                  <input
                    type="number"
                    value={lo}
                    onChange={(e) => onZoneChange(zoneKey, parseInt(e.target.value) || lo)}
                    style={{
                      width: 55,
                      padding: "4px 6px",
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      textAlign: "center",
                      fontSize: 13
                    }}
                  />
                  <span style={{ fontSize: 12, opacity: 0.6 }}>bpm</span>
                  <input
                    type="number"
                    value={pct}
                    readOnly
                    style={{
                      width: 45,
                      padding: "4px 6px",
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      textAlign: "center",
                      fontSize: 13,
                      opacity: 0.7
                    }}
                  />
                  <span style={{ fontSize: 12, opacity: 0.6 }}>%</span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 20,
                    background: color,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#000"
                  }}
                >
                  Zone {idx + 1}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
          Max HR: {hrMax} bpm •{" "}
          <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => {
              const newMax = prompt("Enter your max heart rate:", hrMax.toString());
              if (newMax) {
                const val = parseInt(newMax);
                if (val >= 140 && val <= 220) {
                  setHrMax(val);
                  updateUserProfile({ hrMax: val });
                }
              }
            }}
          >
            Edit
          </span>
        </div>
      </section>

      <section className="card" style={{ background: "#2a2a2a", color: "#fff" }}>
        <h2 className="h2" style={{ color: "#fff" }}>PACE ZONES</h2>
        <p className="small" style={{ marginBottom: 16, opacity: 0.7 }}>
          Pace zones correlate with HR intensity — higher intensity = faster pace (lower min/km).
        </p>

        <div style={{ marginTop: 18 }}>
          {Object.entries(paceZones).map(([zone, [fast, slow]], idx) => {
            const zoneKey = zone as keyof typeof zoneColors;
            const color = zoneColors[zoneKey];
            const fastMins = Math.floor(fast);
            const fastSecs = Math.round((fast - fastMins) * 60);
            const slowMins = Math.floor(slow);
            const slowSecs = Math.round((slow - slowMins) * 60);
            const zoneLabels = ["Recovery", "Endurance", "Tempo", "Threshold", "VO₂ / Speed"];
            return (
              <div key={zone} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 180 }}>
                  <div
                    style={{
                      width: 90,
                      padding: "4px 6px",
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {fastMins}:{fastSecs.toString().padStart(2, '0')}
                  </div>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>–</span>
                  <div
                    style={{
                      width: 90,
                      padding: "4px 6px",
                      background: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: 4,
                      color: "#fff",
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {slowMins}:{slowSecs.toString().padStart(2, '0')}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 20,
                    background: color,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#000"
                  }}
                >
                  Zone {idx + 1} · {zoneLabels[idx]}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
          Based on easy pace: {pace.toFixed(1)} min/km (Zone 2 baseline)
        </div>
      </section>

      <section className="card">
        <h2 className="h2">{t("settings.backup")}</h2>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn" disabled={busy} onClick={onExportAll}>
            {t("settings.export_all")}
          </button>
          <label className="btn" style={{ cursor: "pointer" }}>
            {t("settings.import_all")}
            <input type="file" accept="application/json" style={{ display: "none" }} onChange={onImportAll} />
          </label>
          <button
            className="btn"
            style={{ background: "var(--primary)", color: "white" }}
            disabled={busy}
            onClick={onMigrateToDatabase}
            title="Migrate localStorage data to Supabase database"
          >
            📤 Migrate to Database
          </button>
          <button className="btn" disabled={busy} onClick={onClearAll}>
            {t("settings.clear_all")}
          </button>
        </div>
        {msg && <div className="small" style={{ marginTop: 8 }}>{msg}</div>}
      </section>
    </div>
  );
}
