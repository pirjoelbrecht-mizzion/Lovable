// src/pages/Races.tsx
import { useMemo, useState, useEffect } from "react";
import QuickAddRace, { type UserRace } from "@/components/QuickAddRace";
import RaceFeedbackModal from "@/components/RaceFeedbackModal";
import { getLessons, summarizeLessons } from "@/ai/experience";
import { listRaces, type Race } from "@/utils/races";
import { deleteEvent } from "@/lib/database";
import { useT } from "@/i18n";

// Helper: strip time from date
function stripTime(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Helper: weeks to race
function weeksToRace(race: Race | null, today = new Date()): number | null {
  if (!race) return null;
  const start = stripTime(today);
  const raceDay = stripTime(new Date(race.dateISO));
  const diffMs = raceDay.getTime() - start.getTime();
  return Math.round(diffMs / (7 * 24 * 3600 * 1000));
}

// CSV export/import
function toCSV(rows: Race[]) {
  const head = "name,dateISO,distanceKm,elevM,location,priority,surface,goal,notes";
  const esc = (s: any) => {
    const v = s == null ? "" : String(s);
    return `"${v.replace(/"/g, '""')}"`;
  };
  const lines = rows.map(r => [
    esc(r.name), esc(r.dateISO), esc(r.distanceKm ?? ""),
    esc(r.elevationM ?? ""), esc(r.location ?? ""), esc(r.priority ?? "B"),
    esc(r.surface ?? "road"), esc(r.goal ?? ""), esc(r.notes ?? "")
  ].join(","));
  return [head, ...lines].join("\n");
}

export default function Races() {
  const t = useT();
  const [openQuick, setOpenQuick] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
  const [fbRace, setFbRace] = useState<Race | null>(null);
  const [list, setList] = useState<Race[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRaces() {
      setLoading(true);
      const races = await listRaces();
      setList(races);
      setLoading(false);
    }
    loadRaces();
  }, []);

  const view = useMemo(() => {
    const n = q.trim().toLowerCase();
    const arr = list.slice().sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
    if (!n) return arr;
    return arr.filter(r =>
      r.name.toLowerCase().includes(n) ||
      (r.location || "").toLowerCase().includes(n) ||
      (r.surface || "").toLowerCase().includes(n) ||
      (r.priority || "").toLowerCase().includes(n) ||
      r.dateISO.includes(n)
    );
  }, [list, q]);

  const lessons = getLessons();
  const lessonLines = summarizeLessons();

  async function add(r: UserRace) {
    const races = await listRaces();
    setList(races);
  }

  async function del(id: string) {
    await deleteEvent(id);
    const races = await listRaces();
    setList(races);
  }

  function exportCsv() {
    const blob = new Blob([toCSV(list)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "races.csv" });
    a.click(); URL.revokeObjectURL(url);
  }

  // Check if race is in the past
  const isPast = (dateISO: string) => {
    const raceDate = new Date(dateISO + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return raceDate < today;
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* Coach Memory Panel */}
      {lessonLines.length > 0 && (
        <section className="card">
          <h3 className="h2">Coach memory from past races</h3>
          <ul className="small">
            {lessonLines.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <div className="small" style={{ color: "var(--muted)" }}>
            These lessons will gently bias taper, heat prep, fueling rehearsal, and specificity in future plans.
          </div>
        </section>
      )}

      {/* Header */}
      <section className="card">
        <h2 className="h2">{t("races.title", "Race calendar")}</h2>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button className="btn primary" onClick={() => setOpenQuick(true)}>
            {t("races.quick_add", "Quick add race")}
          </button>
          <button className="btn" onClick={exportCsv}>{t("races.export_csv", "Export CSV")}</button>
          <input
            placeholder={t("races.search", "Search (name/date/location)…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginLeft: "auto", minWidth: 240 }}
          />
        </div>
        <p className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
          <b>A/B/C guide:</b> A = peak goal (full taper). B = rehearsal / tune-up (partial taper). C = training/social (no taper).
        </p>
      </section>

      {/* Race List */}
      <section className="card">
        <h3 className="h2">{t("races.upcoming", "Upcoming races")}</h3>
        {loading ? (
          <div className="small" style={{ color: "var(--muted)" }}>Loading races...</div>
        ) : view.length === 0 ? (
          <div className="small" style={{ color: "var(--muted)" }}>{t("races.none", "No races yet.")}</div>
        ) : (
          <div className="grid cols-3" style={{ gap: 12, marginTop: 10 }}>
            {view.map(r => {
              const past = isPast(r.dateISO);
              return (
                <article key={r.id} className="card">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="h2">{r.name}</div>
                    <span className="tag">{r.priority || 'B'}</span>
                  </div>
                  <div className="small" style={{ color: "var(--muted)" }}>
                    {r.dateISO} • {r.location || "—"} • {r.surface || "road"}
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {r.distanceKm ? `${r.distanceKm} km` : "—"}
                    {r.surface === "trail" && r.elevationM != null ? ` • ${r.elevationM} m+` : ""}
                  </div>
                  {r.goal && <div className="small" style={{ marginTop: 6 }}><b>Goal:</b> {r.goal}</div>}
                  {r.notes && <div className="small" style={{ marginTop: 6 }}>{r.notes}</div>}
                  <div className="row" style={{ gap: 6, marginTop: 10 }}>
                    <button className="btn" onClick={() => del(r.id)}>Delete</button>
                    {past && (
                      <button className="btn" onClick={() => { setFbRace(r); setFbOpen(true); }}>
                        Feedback
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <QuickAddRace open={openQuick} onClose={() => setOpenQuick(false)} onAdded={add} />
      {fbOpen && fbRace && (
        <RaceFeedbackModal
          open={fbOpen}
          defaultRace={{
            id: fbRace.id,
            name: fbRace.name,
            dateISO: fbRace.dateISO,
            distanceKm: fbRace.distanceKm,
            elevationM: fbRace.elevationM,
            surface: fbRace.surface,
            priority: fbRace.priority
          }}
          onClose={() => { setFbOpen(false); setFbRace(null); }}
        />
      )}
    </div>
  );
}