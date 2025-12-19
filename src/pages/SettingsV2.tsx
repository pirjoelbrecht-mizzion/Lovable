import { useState, useEffect, useMemo } from "react";
import { useLang, useT } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { getUserSettings, updateUserSettings } from "@/lib/userSettings";
import { clearConversationHistory } from "@/lib/coachMessages";
import { loadUserProfile, updateUserProfile } from "@/state/userData";
import { parseStravaCSV, autoEstimateProfile, estimateHrMax, calcHrZones, calcPaceZones } from "@/utils/stravaImport";
import { mergeDedup } from "@/utils/log";
import type { LogEntry } from "@/components/StravaImporter";
import { backfillPhotoFlags } from "@/utils/backfillPhotoFlags";
import WearablePrioritySettings from "@/components/WearablePrioritySettings";
import ConnectProviders from "@/components/ConnectProviders";
import { PaceProfileCard } from "@/components/PaceProfileCard";
import {
  save,
  load,
  clearAll as storageClearAll,
  exportAll as storageExportAll,
  importAll as storageImportAll,
  downloadJSON,
} from "@/utils/storage";
import { toast } from "@/components/ToastHost";
import type { UserSettings } from "@/lib/userSettings";
import { supabase } from "@/lib/supabase";

type TabType = 'profile' | 'training' | 'pace' | 'devices' | 'data' | 'preferences';

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

export default function SettingsV2() {
  const t = useT();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [pace, setPace] = useState(9.0);
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const userSettings = await getUserSettings();
      setSettings(userSettings);

      const profile = loadUserProfile();
      setPace(profile.paceBase ?? 9.0);
      setHrResting(profile.hrResting ?? 54);
      setHrThreshold(profile.hrThreshold ?? 165);
      setHrMax(profile.hrMax ?? estimateHrMax(profile.age ?? 30));
      if (profile.zones) {
        setCustomZones(profile.zones);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    await updateUserSettings({ [key]: value });

    if (key === 'language') setLang(value as string);
  };

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
      const runs = await parseStravaCSV(file);
      if (!runs.length) {
        toast("No runs found in CSV", "error");
        return;
      }

      const est = autoEstimateProfile(runs);
      if (est) {
        setPace(est.paceBase);
        if (est.hrMax) setHrMax(est.hrMax);
        if (est.hrResting) setHrResting(est.hrResting);
        if (est.hrThreshold) setHrThreshold(est.hrThreshold);
      }

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;

      const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
      const idxType = header.lastIndexOf("activity type");
      const idxName = header.lastIndexOf("activity name");
      const idxDate = header.lastIndexOf("activity date");
      const idxDist = header.lastIndexOf("distance");
      const idxMove = header.lastIndexOf("moving time");
      const idxHr = header.lastIndexOf("average heart rate");

      const toNumber = (v?: string): number =>
        v ? parseFloat(v.replace(/[^\d.]/g, "")) || 0 : 0;

      const entries: LogEntry[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i]);
        if (!cols.length) continue;

        const type = (cols[idxType] || "").toLowerCase();
        if (!type.includes("run")) continue;

        const name = cols[idxName] || "Run";
        const dateRaw = cols[idxDate];
        if (!dateRaw) continue;

        const rawDist = toNumber(cols[idxDist]);
        const distKm = rawDist > 1000 ? rawDist / 1000 : rawDist;
        if (distKm < 0.1) continue;

        const moveSec = toNumber(cols[idxMove]);
        const hrVal = toNumber(cols[idxHr]);

        const d = new Date(dateRaw);
        if (isNaN(d.getTime())) continue;
        const dateISO = d.toISOString().slice(0, 10);

        // Find optional column indices (once per loop is inefficient, but keeps code simple)
        const idxActivityId = header.indexOf("activity id");
        const idxElevGain = header.indexOf("elevation gain");
        const idxElevLoss = header.indexOf("elevation loss");
        const idxElevLow = header.indexOf("elevation low");
        const idxTemp = header.indexOf("average temperature");
        const idxWeather = header.indexOf("weather observation");
        const idxLocation = header.indexOf("location");

        const entry: LogEntry = {
          title: name,
          dateISO,
          km: Math.round(distKm * 10) / 10,
          durationMin: moveSec > 0 ? Math.round(moveSec / 60) : undefined,
          hrAvg: hrVal > 0 ? Math.round(hrVal) : undefined,
          source: "Strava",
        };

        // CRITICAL FIX: Add Activity ID (Column A) if available
        if (idxActivityId !== -1 && cols[idxActivityId]) {
          entry.externalId = cols[idxActivityId].trim();
        }

        // CRITICAL FIX: Add ALL elevation fields if available in CSV
        if (idxElevGain !== -1 && cols[idxElevGain]) {
          const elevGain = toNumber(cols[idxElevGain]);
          if (elevGain > 0) entry.elevationGain = elevGain;
        }
        if (idxElevLoss !== -1 && cols[idxElevLoss]) {
          const elevLoss = toNumber(cols[idxElevLoss]);
          if (elevLoss > 0) entry.elevationLoss = elevLoss;  // Column V - NEW
        }
        if (idxElevLow !== -1 && cols[idxElevLow]) {
          const elevLow = toNumber(cols[idxElevLow]);
          entry.elevationLow = elevLow;  // Column W - NEW (can be negative)
        }

        // Add environmental data
        if (idxTemp !== -1 && cols[idxTemp]) {
          const temp = toNumber(cols[idxTemp]);
          if (temp !== 0) entry.temperature = temp;
        }
        if (idxWeather !== -1 && cols[idxWeather]) {
          entry.weather = cols[idxWeather];
        }
        if (idxLocation !== -1 && cols[idxLocation]) {
          entry.location = cols[idxLocation];
        }

        entries.push(entry);
      }

      console.log('[SettingsV2] Parsed', entries.length, 'entries from CSV');
      console.log('[SettingsV2] Sample entry:', entries[0]);

      // Filter out invalid entries that would violate database constraints
      const validEntries = entries.filter(e => {
        if (!e.km || e.km <= 0 || e.km > 500) {
          console.warn('[SettingsV2] Skipping invalid entry with km:', e.km, 'entry:', e);
          return false;
        }
        return true;
      });

      console.log('[SettingsV2] Valid entries:', validEntries.length, 'of', entries.length);

      // CRITICAL: Apply 2-year import limitation
      const { filterByImportDateLimit, logImportFilterStats, getImportLimitMessage } = await import("@/utils/importDateLimits");
      const filterResult = filterByImportDateLimit(validEntries, (entry) => entry.dateISO);

      logImportFilterStats('SettingsV2 CSV Import', filterResult.stats);

      if (filterResult.rejected.length > 0) {
        const limitMessage = getImportLimitMessage(filterResult.rejected.length, filterResult.stats.oldestRejected);
        console.warn(limitMessage);
        toast(limitMessage, "warning");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const filteredEntries = filterResult.accepted;

      if (filteredEntries.length === 0) {
        toast('All entries were older than 2 years and were filtered out', 'error');
        return;
      }

      console.log('[SettingsV2] After 2-year filter:', filteredEntries.length, 'entries');

      const cur = load<LogEntry[]>("logEntries", []);
      const merged = mergeDedup(cur, filteredEntries);
      const added = Math.max(merged.length - cur.length, 0);
      const totalKm = merged.reduce((sum, e) => sum + (e.km || 0), 0);

      save("logEntries", merged);

      console.log('[SettingsV2] Inserting', filteredEntries.length, 'filtered entries to database...');
      const { bulkInsertLogEntries, updateEntriesWithElevationData } = await import("@/lib/database");
      const inserted = await bulkInsertLogEntries(filteredEntries);
      console.log('[SettingsV2] Inserted', inserted, 'entries to database');

      // CRITICAL: Update existing entries with missing elevation data
      console.log('[SettingsV2] Checking for existing entries with missing elevation data...');
      const updated = await updateEntriesWithElevationData(filteredEntries);
      console.log('[SettingsV2] Updated', updated, 'entries with elevation data');

      const totalProcessed = inserted + updated;

      const { emit } = await import("@/lib/bus");
      emit("log:import-complete", { count: totalProcessed });
      console.log('[SettingsV2] Emitted log:import-complete event with count:', totalProcessed);

      const statusMessage = inserted > 0 && updated > 0
        ? `Imported ${inserted} new + updated ${updated} existing with elevation data`
        : inserted > 0
        ? `Imported ${inserted} new runs`
        : updated > 0
        ? `Updated ${updated} runs with elevation data`
        : `All ${filteredEntries.length} runs already up-to-date`;

      setImportSummary(
        `${statusMessage} • ${totalKm.toFixed(1)} km total • HRmax: ${est?.hrMax ?? "-"} bpm • Threshold: ${est?.hrThreshold ?? "-"} bpm`
      );

      const toastMessage = updated > 0
        ? `Updated ${updated} runs with elevation data!`
        : inserted > 0
        ? "Strava import successful!"
        : "All runs already imported";

      toast(toastMessage, "success");
    } catch (err: any) {
      console.error("Strava import error:", err);
      toast("Error: " + (err.message || "Unknown error"), "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function onExportAll() {
    setBusy(true);
    try {
      const blob = storageExportAll();
      const filename = `mizzion-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      downloadJSON(filename, blob);
      toast("Data exported successfully", "success");
    } finally {
      setBusy(false);
    }
  }

  async function onImportAll(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      const res = storageImportAll(parsed);
      if (!res.ok) {
        toast(res.msg || "Invalid backup", "error");
      } else {
        await loadSettings();
        toast("Data imported successfully", "success");
      }
    } catch {
      toast("Invalid backup file", "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function onClearAll() {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    storageClearAll();
    toast("All data cleared", "success");
    setTimeout(() => window.location.reload(), 500);
  }

  async function onClearCoachHistory() {
    if (!confirm("Clear all AI Coach conversation history?")) return;
    const success = await clearConversationHistory();
    if (success) {
      toast("Coach history cleared", "success");
    } else {
      toast("Failed to clear history", "error");
    }
  }

  async function onBackfillPhotos() {
    if (!confirm("Update photo/segment flags for all Strava activities?\n\nThis will fetch data from Strava and may take a few minutes.")) return;

    setBusy(true);
    toast("Starting backfill...", "info");

    try {
      const result = await backfillPhotoFlags();

      if (result.updated > 0) {
        toast(`Successfully updated ${result.updated} activities!`, "success");
        // Trigger a page reload to refresh the UI
        setTimeout(() => window.location.reload(), 1000);
      } else if (result.errors > 0) {
        toast("Failed to update activities. Make sure Strava is connected above.", "error");
      } else {
        toast("No Strava activities found to update", "info");
      }
    } catch (error) {
      console.error('[SettingsV2] Backfill error:', error);
      toast("Failed to backfill photo flags. Check Strava connection.", "error");
    } finally {
      setBusy(false);
    }
  }

  const zoneColors = {
    Z1: "#22c55e",
    Z2: "#06b6d4",
    Z3: "#f59e0b",
    Z4: "#f97316",
    Z5: "#ef4444",
  };

  if (loading || !settings) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="h2">Loading settings...</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20, maxWidth: 900 }}>
      <section className="card">
        <h1 className="h2" style={{ marginBottom: 8 }}>Settings</h1>
        <p className="small" style={{ color: "var(--muted)" }}>
          Manage your preferences, training profile, and connected devices
        </p>
      </section>

      <section className="card">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            className={activeTab === 'profile' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button
            className={activeTab === 'training' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('training')}
          >
            🏃 Training
          </button>
          <button
            className={activeTab === 'pace' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('pace')}
          >
            📊 Pace
          </button>
          <button
            className={activeTab === 'devices' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('devices')}
          >
            ⌚ Devices
          </button>
          <button
            className={activeTab === 'data' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('data')}
          >
            💾 Data
          </button>
          <button
            className={activeTab === 'preferences' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('preferences')}
          >
            ⚙️ Preferences
          </button>
        </div>

        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Profile Settings</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Basic profile information and account details
              </p>

              <label className="small" style={{ marginTop: 16 }}>Language</label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                style={{ marginTop: 6 }}
              >
                <option value="en">English</option>
                <option value="et">Eesti</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>

              <label className="small" style={{ marginTop: 16 }}>Units</label>
              <select
                value={settings.units}
                onChange={(e) => updateSetting('units', e.target.value as 'metric' | 'imperial')}
                style={{ marginTop: 6 }}
              >
                <option value="metric">Metric (km, kg)</option>
                <option value="imperial">Imperial (miles, lbs)</option>
              </select>

              <label className="small" style={{ marginTop: 16 }}>Health Status</label>
              <select
                value={settings.health_status}
                onChange={(e) => updateSetting('health_status', e.target.value as any)}
                style={{ marginTop: 6 }}
              >
                <option value="ok">Healthy</option>
                <option value="returning">Returning from injury</option>
                <option value="sick">Currently sick/injured</option>
              </select>
            </div>

            <div style={{
              padding: 20,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: 12,
              border: "1px solid rgba(59, 130, 246, 0.3)"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#fff" }}>
                🎯 Complete Your Training Profile
              </h3>
              <p className="small" style={{ color: "rgba(255,255,255,0.9)", marginBottom: 16, lineHeight: 1.6 }}>
                Set up your training experience, goals, and preferences to unlock the AI Adaptive Coach and personalized training plans.
              </p>
              <button
                className="btn"
                onClick={() => navigate('/onboarding')}
                style={{
                  background: "white",
                  color: "#2563eb",
                  fontWeight: 600,
                  border: "none"
                }}
              >
                Start Training Profile Setup
              </button>
            </div>

            <div style={{
              padding: 20,
              background: "var(--card)",
              borderRadius: 12,
              border: "1px solid var(--line)"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Account</h3>
              <p className="small" style={{ color: "var(--muted)", marginBottom: 16 }}>
                Manage your account and session
              </p>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                    toast('Signed out successfully', 'success');
                    navigate('/auth');
                  } catch (error) {
                    console.error('Sign out error:', error);
                    toast('Failed to sign out', 'error');
                  }
                }}
                style={{
                  background: "#ef4444",
                  color: "white",
                  fontWeight: 600
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Training Profile</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Adjust your base training metrics — all workouts adapt automatically
              </p>

              {/* Data Source Info Panel */}
              <div style={{
                padding: 12,
                marginBottom: 16,
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 8,
                fontSize: 13
              }}>
                <strong>📊 Available Data Sources:</strong>
                <div style={{ marginTop: 8, paddingLeft: 4 }}>
                  • <strong>Auto-Calculate:</strong> Analyze your existing activities<br/>
                  • <strong>Strava API:</strong> Fetch elevation data from connected account<br/>
                  • <strong>CSV Upload:</strong> Import Strava/Garmin exports<br/>
                  • <strong>Manual Entry:</strong> Use pace slider below
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
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
                    try {
                      const { getLogEntriesByDateRange } = await import('@/lib/database');
                      const entries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');

                      if (entries.length === 0) {
                        toast('No activities found to analyze', 'error');
                        return;
                      }

                      const runsWithData = entries
                        .filter(e => e.km > 0 && e.durationMin && e.hrAvg)
                        .map(e => ({
                          pace: e.durationMin! / e.km,
                          avgHr: e.hrAvg!
                        }));

                      if (runsWithData.length === 0) {
                        toast('No activities with pace and heart rate data found', 'error');
                        return;
                      }

                      const est = autoEstimateProfile(runsWithData);
                      if (est) {
                        setPace(est.paceBase);
                        setHrResting(est.hrResting);
                        setHrThreshold(est.hrThreshold);
                        setHrMax(est.hrMax);

                        await updateUserProfile({
                          pace_base: est.paceBase,
                          hr_base: est.heartRateBase,
                          hr_max: est.hrMax,
                          hr_resting: est.hrResting,
                          hr_threshold: est.hrThreshold
                        });

                        toast(`✅ Auto-calculated from ${runsWithData.length} activities: Pace ${est.paceBase.toFixed(2)} min/km, HR ${est.heartRateBase} bpm`, 'success');
                      } else {
                        toast('Unable to calculate - please check your activity data', 'error');
                      }
                    } catch (err: any) {
                      toast(`Error: ${err.message}`, 'error');
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
                    try {
                      let backfillModule;
                      try {
                        backfillModule = await import('@/utils/backfillElevationData');
                      } catch (importErr) {
                        console.error('Import error:', importErr);
                        toast('Module loading failed. Check console for details.', 'error');
                        return;
                      }

                      const { backfillElevationData } = backfillModule;
                      toast('🏔️ Connecting to Strava API...', 'info');

                      const result = await backfillElevationData();

                      if (result.updated > 0) {
                        toast(`✅ Elevation data added to ${result.updated} activities!`, 'success');

                        // Trigger full recalculation
                        const { autoCalculationService } = await import('@/services/autoCalculationService');
                        await autoCalculationService.scheduleFullRecalculation('Elevation data backfilled');
                      } else {
                        toast('ℹ️ All activities already have elevation data, or no Strava connection found.', 'info');
                      }
                    } catch (err: any) {
                      toast(`❌ Error: ${err.message}. Make sure Strava is connected!`, 'error');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  🏔️ Backfill Elevation Data
                </button>
              </div>

              <label className="small">Easy pace baseline (min/km)</label>
              <input
                type="range"
                min="5"
                max="12"
                step="0.1"
                value={pace}
                onChange={onPaceChange}
                style={{ width: "100%", marginTop: 8 }}
              />
              <div style={{ textAlign: "right", fontSize: 13, marginTop: 4 }}>{pace.toFixed(1)} min/km</div>
            </div>

            <div style={{ background: "#2a2a2a", color: "#fff", padding: 20, borderRadius: 12 }}>
              <h3 className="h2" style={{ color: "#fff", marginBottom: 12 }}>Heart Rate Zones</h3>
              <p className="small" style={{ marginBottom: 16, opacity: 0.7 }}>
                We use HR data to estimate your training zones and provide a Cardio Score
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
                {Object.entries(displayZones).map(([zone, [lo]], idx) => {
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
            </div>

            <div style={{ background: "#2a2a2a", color: "#fff", padding: 20, borderRadius: 12 }}>
              <h3 className="h2" style={{ color: "#fff", marginBottom: 12 }}>Pace Zones</h3>
              <p className="small" style={{ marginBottom: 16, opacity: 0.7 }}>
                Pace zones correlate with HR intensity — higher intensity = faster pace
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
            </div>

            {/* Strength Training Section */}
            <div style={{
              marginTop: 24,
              padding: 20,
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 12,
            }}>
              <h3 className="h2" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                💪 Adaptive Strength Training
              </h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Terrain-based ME assignment with automatic load regulation. Track soreness,
                adjust training load, and resolve ME vs Z3 conflicts automatically.
              </p>
              <button
                className="btn"
                style={{
                  background: '#8b5cf6',
                  color: 'white',
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={() => navigate('/strength-training')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#7c3aed';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#8b5cf6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🚀 Open Strength Training System
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pace' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PaceProfileCard />
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <h3 className="h2" style={{ marginBottom: 12 }}>Connected Devices</h3>
            <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
              Connect your wearable devices and activity trackers
            </p>
            <ConnectProviders />

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #333' }}>
              <h3 className="h2" style={{ marginBottom: 12 }}>Sync Priority</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                When multiple devices provide the same data, which one should we trust?
              </p>
              <WearablePrioritySettings />
            </div>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #333' }}>
              <h3 className="h2" style={{ marginBottom: 12 }}>📸 Strava Activity Photos</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Download and store photos from all your Strava activities. This makes photos appear in Mirror and activity detail pages. May take several minutes for many activities.
              </p>
              <button className="btn" disabled={busy} onClick={onBackfillPhotos}>
                {busy ? 'Downloading Photos...' : 'Download All Activity Photos'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Import Training Data</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Import your training history from Strava or other sources
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="small" style={{ display: 'block', marginBottom: 8 }}>
                  📊 Import Strava CSV (updates profile & log)
                </label>
                <label className="btn" style={{ cursor: "pointer", display: 'inline-block' }}>
                  Upload Strava CSV
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={onStravaImport} />
                </label>
                {importSummary && (
                  <p className="small" style={{ marginTop: 8, color: "var(--success)", fontWeight: 500 }}>
                    {importSummary}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Data Management</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Export, import, or clear your training data
              </p>

              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <button className="btn" disabled={busy} onClick={onExportAll}>
                  📤 Export All Data
                </button>
                <label className="btn" style={{ cursor: "pointer" }}>
                  📥 Import Data
                  <input type="file" accept="application/json" style={{ display: "none" }} onChange={onImportAll} />
                </label>
                <button className="btn" disabled={busy} onClick={onClearAll} style={{ background: '#ef4444', color: '#fff' }}>
                  🗑️ Clear All Data
                </button>
              </div>
            </div>

            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>AI Coach Data</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Manage your AI Coach conversation history
              </p>
              <button className="btn" onClick={onClearCoachHistory}>
                Clear Coach History
              </button>
            </div>

            <div style={{
              padding: 20,
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              borderRadius: 12,
              border: "1px solid rgba(14, 165, 233, 0.3)"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#fff" }}>
                📍 Fetch GPS Streams from Strava
              </h3>
              <p className="small" style={{ color: "rgba(255,255,255,0.9)", marginBottom: 16, lineHeight: 1.6 }}>
                Download detailed GPS data for all your Strava activities. Required for heat impact analysis, elevation profiles, and route recommendations.
              </p>
              <button
                className="btn"
                disabled={busy}
                onClick={async () => {
                  if (!confirm('This will fetch GPS streams for all your Strava activities. This may take several minutes. Continue?')) {
                    return;
                  }
                  setBusy(true);
                  try {
                    const { backfillActivityStreams } = await import('@/utils/backfillActivityStreams');
                    let completed = 0;
                    let totalActivities = 0;

                    const result = await backfillActivityStreams((current, total, activityName) => {
                      totalActivities = total;
                      completed = current;
                      toast(`Fetching GPS: ${current}/${total} - ${activityName}`, 'info');
                    });

                    const message = `GPS Backfill Complete!\n✓ Fetched: ${result.fetched}\n↷ Skipped: ${result.skipped}\n✗ Failed: ${result.failed}`;
                    toast(message, result.failed > 0 ? 'warning' : 'success');
                  } catch (err: any) {
                    console.error('GPS backfill error:', err);
                    toast(err.message || 'Failed to fetch GPS streams', 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{
                  background: "white",
                  color: "#0284c7",
                  fontWeight: 600,
                  border: "none"
                }}
              >
                {busy ? "Fetching GPS..." : "Fetch GPS for All Activities"}
              </button>
            </div>

            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Environmental Learning</h3>
              <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                View AI-powered insights about how temperature, altitude, and time of day affect your performance
              </p>
              <button className="btn" onClick={() => navigate('/environmental')}>
                🌡️ View Environmental Insights
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Quick Links</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => navigate('/races')}
                  style={{ justifyContent: 'flex-start' }}
                >
                  🏁 Race Calendar & Feedback
                </button>
                <p className="small" style={{ color: 'var(--muted)', marginLeft: 8 }}>
                  Log your races and provide post-race feedback to help the AI coach learn from your experiences
                </p>
              </div>
            </div>

            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Notifications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) => updateSetting('notifications_enabled', e.target.checked)}
                  />
                  <span className="small">Enable all notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                  <input
                    type="checkbox"
                    checked={settings.coach_notifications}
                    onChange={(e) => updateSetting('coach_notifications', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                  />
                  <span className="small">AI Coach tips and suggestions</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                  <input
                    type="checkbox"
                    checked={settings.training_reminders}
                    onChange={(e) => updateSetting('training_reminders', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                  />
                  <span className="small">Training reminders</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                  <input
                    type="checkbox"
                    checked={settings.race_alerts}
                    onChange={(e) => updateSetting('race_alerts', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                  />
                  <span className="small">Race day alerts</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>AI Coach Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.coach_proactive_tips}
                    onChange={(e) => updateSetting('coach_proactive_tips', e.target.checked)}
                  />
                  <span className="small">Proactive training tips</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.voice_output_enabled}
                    onChange={(e) => updateSetting('voice_output_enabled', e.target.checked)}
                  />
                  <span className="small">Voice output (text-to-speech)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.voice_input_enabled}
                    onChange={(e) => updateSetting('voice_input_enabled', e.target.checked)}
                  />
                  <span className="small">Voice input (speech-to-text)</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="h2" style={{ marginBottom: 12 }}>Privacy</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="small" style={{ marginBottom: 4 }}>Profile Visibility</label>
                <select
                  value={settings.profile_visibility}
                  onChange={(e) => updateSetting('profile_visibility', e.target.value as any)}
                >
                  <option value="private">Private (only me)</option>
                  <option value="community">Community (Unity members)</option>
                  <option value="public">Public</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.share_progress}
                    onChange={(e) => updateSetting('share_progress', e.target.checked)}
                  />
                  <span className="small">Share training progress with community</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
