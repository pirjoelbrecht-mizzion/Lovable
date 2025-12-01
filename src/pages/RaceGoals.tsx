import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import {
  findBestBaselineRace,
  generateProjections,
  saveProjectionsLocal,
  loadProjectionsLocal,
  syncProjectionsToSupabase,
  formatTime,
  formatPace,
  getDistanceName,
  type BaselineRace,
  type RaceProjection
} from "@/utils/raceProjection";
import { load } from "@/utils/storage";
import type { LogEntry } from "@/types";

export default function RaceGoals() {
  const t = useT();
  const [baseline, setBaseline] = useState<BaselineRace | null>(null);
  const [projections, setProjections] = useState<RaceProjection[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualDistance, setManualDistance] = useState("");
  const [manualTime, setManualTime] = useState("");

  useEffect(() => {
    async function loadData() {
      const savedProjections = loadProjectionsLocal();
      if (savedProjections.length > 0) {
        setProjections(savedProjections);
      }

      const best = await findBestBaselineRace();
      if (best) {
        setBaseline(best);
        if (savedProjections.length === 0) {
          const newProjections = generateProjections(best);
          setProjections(newProjections);
          saveProjectionsLocal(newProjections);
          syncProjectionsToSupabase(newProjections);
        }
      }
    }
    loadData();
  }, []);

  async function refreshProjections() {
    const best = await findBestBaselineRace();
    if (!best) return;

    setBaseline(best);
    const newProjections = generateProjections(best);
    setProjections(newProjections);
    saveProjectionsLocal(newProjections);
    syncProjectionsToSupabase(newProjections);
  }

  function handleManualOverride() {
    const distance = parseFloat(manualDistance);
    const timeMinutes = parseFloat(manualTime);

    if (!manualName || !manualDate || isNaN(distance) || isNaN(timeMinutes)) {
      alert("Please fill in all fields with valid values");
      return;
    }

    const manualBaseline: BaselineRace = {
      id: `manual_${Date.now()}`,
      name: manualName,
      dateISO: manualDate,
      distanceKm: distance,
      timeMin: timeMinutes,
      paceMinPerKm: timeMinutes / distance,
      source: 'manual'
    };

    setBaseline(manualBaseline);
    const newProjections = generateProjections(manualBaseline);
    setProjections(newProjections);
    saveProjectionsLocal(newProjections);
    syncProjectionsToSupabase(newProjections);
    setShowManualModal(false);

    setManualName("");
    setManualDate("");
    setManualDistance("");
    setManualTime("");
  }

  function getActualRaceTime(distanceKm: number): number | null {
    const races = load<any[]>("races:list", []);
    const logEntries = load<LogEntry[]>("logEntries", []);

    for (const race of races) {
      if (!race.distanceKm || Math.abs(race.distanceKm - distanceKm) > 0.5) continue;

      const raceLog = logEntries.find(
        e => e.dateISO === race.dateISO &&
        Math.abs((e.km || 0) - distanceKm) < 0.5
      );

      if (raceLog?.durationMin) return raceLog.durationMin;
    }

    return null;
  }

  if (!baseline) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="h2">{t("racegoals.title", "Race Goals & Predictions")}</h2>
          <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
            No baseline race found. Add a race result to your Races page or log a race-distance run to see predictions.
          </p>
          <button
            className="btn primary"
            style={{ marginTop: 10 }}
            onClick={() => setShowManualModal(true)}
          >
            Add Manual Baseline
          </button>
        </section>

        {showManualModal && (
          <ManualBaselineModal
            name={manualName}
            date={manualDate}
            distance={manualDistance}
            time={manualTime}
            onNameChange={setManualName}
            onDateChange={setManualDate}
            onDistanceChange={setManualDistance}
            onTimeChange={setManualTime}
            onSave={handleManualOverride}
            onCancel={() => setShowManualModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="h2">{t("racegoals.title", "Race Goals & Predictions")}</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={refreshProjections}>
              Refresh Predictions
            </button>
            <button className="btn" onClick={() => setShowManualModal(true)}>
              Change Baseline
            </button>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: 12,
            background: "var(--bg-secondary)",
            border: "1px solid var(--line)"
          }}
        >
          <div className="small" style={{ color: "var(--muted)" }}>
            Based on your {getDistanceName(baseline.distanceKm)} race
          </div>
          <div className="h2" style={{ marginTop: 4 }}>
            {baseline.name}
          </div>
          <div className="row" style={{ gap: 16, marginTop: 8 }}>
            <div>
              <div className="small" style={{ color: "var(--muted)" }}>Date</div>
              <div><b>{baseline.dateISO}</b></div>
            </div>
            <div>
              <div className="small" style={{ color: "var(--muted)" }}>Time</div>
              <div><b>{formatTime(baseline.timeMin)}</b></div>
            </div>
            <div>
              <div className="small" style={{ color: "var(--muted)" }}>Pace</div>
              <div><b>{formatPace(baseline.paceMinPerKm)}/km</b></div>
            </div>
            {baseline.hrAvg && (
              <div>
                <div className="small" style={{ color: "var(--muted)" }}>Avg HR</div>
                <div><b>{Math.round(baseline.hrAvg)} bpm</b></div>
              </div>
            )}
            <div>
              <div className="small" style={{ color: "var(--muted)" }}>Confidence</div>
              <div>
                <b>{Math.round(baseline.confidenceScore || 1 * 100)}%</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="h2">Predicted Race Times</h3>
        <p className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
          These predictions use the Riegel formula (exponent 1.06) based on your baseline performance.
        </p>

        <div className="grid cols-3" style={{ gap: 12, marginTop: 16 }}>
          {projections.map(proj => {
            const actualTime = getActualRaceTime(proj.targetDistanceKm);
            const predictedPace = proj.predictedTimeMin / proj.targetDistanceKm;
            const isBaseline = Math.abs(proj.targetDistanceKm - baseline.distanceKm) < 0.5;

            return (
              <article
                key={proj.id}
                className="card"
                style={{
                  background: isBaseline ? "var(--bg-secondary)" : "var(--card)"
                }}
              >
                <div className="h2">{getDistanceName(proj.targetDistanceKm)}</div>

                <div style={{ marginTop: 12 }}>
                  <div className="small" style={{ color: "var(--muted)" }}>Predicted Time</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 4 }}>
                    {formatTime(proj.predictedTimeMin)}
                  </div>
                  <div className="small" style={{ color: "var(--muted)", marginTop: 2 }}>
                    {formatPace(predictedPace)}/km pace
                  </div>
                </div>

                {actualTime && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <div className="small" style={{ color: "var(--muted)" }}>Your Actual Time</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: 4 }}>
                      {formatTime(actualTime)}
                    </div>
                    <div className="small" style={{ marginTop: 4 }}>
                      {actualTime < proj.predictedTimeMin ? (
                        <span style={{ color: "var(--good)" }}>
                          {Math.round(((proj.predictedTimeMin - actualTime) / proj.predictedTimeMin) * 100)}% faster than predicted
                        </span>
                      ) : (
                        <span style={{ color: "var(--warn)" }}>
                          {Math.round(((actualTime - proj.predictedTimeMin) / proj.predictedTimeMin) * 100)}% slower than predicted
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className="small"
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                    color: "var(--muted)"
                  }}
                >
                  Confidence: {Math.round(proj.confidenceScore * 100)}%
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {showManualModal && (
        <ManualBaselineModal
          name={manualName}
          date={manualDate}
          distance={manualDistance}
          time={manualTime}
          onNameChange={setManualName}
          onDateChange={setManualDate}
          onDistanceChange={setManualDistance}
          onTimeChange={setManualTime}
          onSave={handleManualOverride}
          onCancel={() => setShowManualModal(false)}
        />
      )}
    </div>
  );
}

function ManualBaselineModal({
  name,
  date,
  distance,
  time,
  onNameChange,
  onDateChange,
  onDistanceChange,
  onTimeChange,
  onSave,
  onCancel
}: {
  name: string;
  date: string;
  distance: string;
  time: string;
  onNameChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onDistanceChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 100
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ width: 480, maxWidth: "90%", background: "var(--card)" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="h2">Set Manual Baseline</h2>
        <p className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
          Enter a race result or time trial to use as your baseline for predictions.
        </p>

        <label className="small" style={{ marginTop: 12 }}>Race Name</label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="e.g., Parkrun 5K"
        />

        <label className="small" style={{ marginTop: 12 }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
        />

        <label className="small" style={{ marginTop: 12 }}>Distance (km)</label>
        <input
          type="number"
          step="0.1"
          value={distance}
          onChange={e => onDistanceChange(e.target.value)}
          placeholder="e.g., 10"
        />

        <label className="small" style={{ marginTop: 12 }}>Time (minutes)</label>
        <input
          type="number"
          step="0.1"
          value={time}
          onChange={e => onTimeChange(e.target.value)}
          placeholder="e.g., 45.5"
        />

        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onSave}>Save Baseline</button>
        </div>
      </div>
    </div>
  );
}
