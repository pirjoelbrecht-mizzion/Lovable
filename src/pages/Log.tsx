// src/pages/Log.tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { load, save } from "@/utils/storage";
import type { LogEntry } from "@/types";
import ImportWizard from "@/components/ImportWizard";
import StravaImporter from "@/components/StravaImporter";
import SendToPlannerModal from "@/components/SendToPlannerModal";
import RunFeedbackModal from "@/components/RunFeedbackModal";
import { RacePerformanceFeedbackModal } from "@/components/RacePerformanceFeedbackModal";
import { DNFFeedbackModal } from "@/components/DNFFeedbackModal";
import { DNFConfirmDialog } from "@/components/DNFConfirmDialog";
import { exportLastRunPNG } from "@/utils/share";
import { toast } from "@/components/ToastHost";
import { adaptAfterLog } from "@/utils/adapt";
import { mergeDedup, totals } from "@/utils/log";
import { syncLogEntries } from "@/lib/database";
import { on } from "@/lib/bus";
import RouteMap from "@/components/RouteMap";
import { shouldPromptFeedback, detectDNF, determineAppropriateModal } from "@/utils/feedbackDetection";
import { saveRaceFeedback, saveDNFFeedback } from "@/services/feedbackService";
import type { RaceFeedback, DNFEvent } from "@/types/feedback";

type EditState = { open: boolean; idx: number; draft: LogEntry | null };

export default function Log() {
  const navigate = useNavigate();
  const [openImport, setOpenImport] = useState(false);
  const [openStrava, setOpenStrava] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>(load<LogEntry[]>("logEntries", []));
  const [edit, setEdit] = useState<EditState>({ open: false, idx: -1, draft: null });
  const [sendOpen, setSendOpen] = useState(false);
  const [toSend, setToSend] = useState<{ title: string; km?: number; notes?: string }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  // Feedback modal state
  const [fbOpen, setFbOpen] = useState(false);
  const [fbSeed, setFbSeed] = useState<{ dateISO: string; title: string; km?: number } | null>(null);

  // Smart feedback state
  const [showDNFConfirm, setShowDNFConfirm] = useState(false);
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [showDNFModal, setShowDNFModal] = useState(false);
  const [pendingActivity, setPendingActivity] = useState<LogEntry | null>(null);

  const sums = useMemo(() => totals(entries), [entries]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (e) =>
        (e.title || "").toLowerCase().includes(needle) ||
        (e.source || "").toLowerCase().includes(needle) ||
        (e.dateISO || "").includes(needle)
    );
  }, [entries, q]);

  function persistAndMaybeAdapt(next: LogEntry[], cause: string) {
    save("logEntries", next);
    setEntries(next);
    try {
      const res = adaptAfterLog(next);
      if (res?.changed) {
        toast(
          `Plan auto-adjusted (-${res.percent}%) on ${res.affectedDays} day(s) after ${cause}.`,
          "success"
        );
      }
    } catch {}
  }

  function clearAll() {
    persistAndMaybeAdapt([], "clear");
    toast("Cleared all log entries.", "success");
  }

  function exportLastPNG() {
    exportLastRunPNG(entries);
  }

  function onImported(newOnes: LogEntry[], label: string) {
    const merged = mergeDedup(entries, newOnes);
    persistAndMaybeAdapt(merged, label);
    toast(`Imported ${newOnes.length} runs (${label}).`, "success");

    // Smart feedback prompting for first imported run
    if (newOnes.length > 0) {
      const first = newOnes[0];
      setPendingActivity(first);

      // Determine appropriate modal
      const modalType = determineAppropriateModal(first, undefined, undefined, false);

      if (modalType === 'dnf') {
        setShowDNFConfirm(true);
      } else if (modalType === 'race') {
        setShowRaceModal(true);
      } else if (modalType === 'training') {
        setFbSeed({
          dateISO: first.dateISO,
          title: first.title || "Run",
          km: first.km,
        });
        setFbOpen(true);
      }
    }
  }

  // ----- Inline edit / delete -----
  function startEdit(i: number) {
    const e = entries[i];
    if (!e) return;
    setEdit({ open: true, idx: i, draft: { ...e } });
  }

  function cancelEdit() {
    setEdit({ open: false, idx: -1, draft: null });
  }

  function applyEdit() {
    if (!edit.open || edit.idx < 0 || !edit.draft) return;
    const next = entries.slice();
    next[edit.idx] = {
      ...edit.draft,
      title: edit.draft.title?.trim() || "Run",
      dateISO: edit.draft.dateISO.slice(0, 10),
      km: Math.max(0, Number(edit.draft.km) || 0),
      durationMin:
        edit.draft.durationMin != null ? Math.max(0, Math.round(Number(edit.draft.durationMin))) : undefined,
      hrAvg:
        edit.draft.hrAvg != null ? Math.max(0, Math.round(Number(edit.draft.hrAvg))) : undefined,
    };
    persistAndMaybeAdapt(mergeDedup([], next), "edit");
    cancelEdit();
  }

  function del(i: number) {
    const next = entries.slice();
    next.splice(i, 1);
    persistAndMaybeAdapt(mergeDedup([], next), "delete");
    toast("Deleted.", "success");
  }

  // ----- Send to Planner -----
  function openSendForOne(e: LogEntry) {
    setToSend([
      {
        title: e.title || "Run",
        km: e.km,
        notes: `From log ${e.dateISO}${e.durationMin ? ` • ${e.durationMin} min` : ""}${
          e.hrAvg ? ` • ${e.hrAvg} bpm` : ""
        }`,
      },
    ]);
    setSendOpen(true);
  }

  function openSendForSelected() {
    const cho = visible.filter((e, i) => selected[keyOf(e, i)]);
    if (cho.length === 0) {
      toast("Select at least one run.", "error");
      return;
    }
    const sessions = cho.map((e) => ({
      title: e.title || "Run",
      km: e.km,
      notes: `From log ${e.dateISO}${e.durationMin ? ` • ${e.durationMin} min` : ""}${
        e.hrAvg ? ` • ${e.hrAvg} bpm` : ""
      }`,
    }));
    setToSend(sessions);
    setSendOpen(true);
  }

  function keyOf(e: LogEntry, i: number) {
    return `${e.dateISO}-${e.km}-${i}`;
  }

  function toggleSel(e: LogEntry, i: number) {
    const k = keyOf(e, i);
    setSelected((s) => ({ ...s, [k]: !s[k] }));
  }

  function selectAllVisible(val: boolean) {
    const next: Record<string, boolean> = {};
    visible.forEach((e, i) => (next[keyOf(e, i)] = val));
    setSelected(next);
  }

  // Open feedback modal
  function openFeedback(e: LogEntry) {
    setFbSeed({
      dateISO: e.dateISO,
      title: e.title || "Run",
      km: e.km,
    });
    setFbOpen(true);
  }

  // Smart feedback handlers
  async function handleRaceFeedbackSubmit(data: Partial<RaceFeedback>) {
    if (!pendingActivity) return;
    const result = await saveRaceFeedback(
      { ...data, event_date: pendingActivity.dateISO, user_id: '' },
      pendingActivity.id
    );
    if (result.success) {
      toast("Race feedback saved. Coach updated with 5× learning weight.", "success");
    } else {
      toast("Failed to save race feedback.", "error");
    }
  }

  async function handleDNFFeedbackSubmit(data: Partial<DNFEvent>) {
    if (!pendingActivity) return;
    const result = await saveDNFFeedback(
      { ...data, event_date: pendingActivity.dateISO, user_id: '' },
      pendingActivity.id
    );
    if (result.success) {
      toast("Thanks for sharing. We'll adjust your plan to help you come back stronger.", "success");
    } else {
      toast("Failed to save DNF feedback.", "error");
    }
  }

  function handleDNFConfirmed() {
    setShowDNFConfirm(false);
    setShowDNFModal(true);
  }

  function handleDNFDenied() {
    setShowDNFConfirm(false);
    setShowRaceModal(true);
  }

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      console.log('[Log] Loading data from database on mount');
      const synced = await syncLogEntries();
      console.log('[Log] Loaded', synced.length, 'entries from database');
      setEntries(synced);
    };
    loadData();
  }, []);

  // Listen for import completion and sync from database
  useEffect(() => {
    const unsubscribe = on("log:import-complete", async ({ count }) => {
      console.log('[Log] Import complete event received, syncing data from database');
      const synced = await syncLogEntries();
      console.log('[Log] Synced', synced.length, 'entries from database');
      setEntries(synced);
    });
    return unsubscribe;
  }, []);

  // ----- Render -----
  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <h2 className="h2">Log</h2>
        <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn primary" onClick={() => setOpenStrava(true)}>
            Import Strava CSV
          </button>
          <button className="btn" onClick={() => setOpenImport(true)}>
            Import samples…
          </button>
          <button className="btn" onClick={exportLastPNG}>
            Share last run (PNG)
          </button>
          <button className="btn" onClick={clearAll}>Clear</button>
          <div className="row" style={{ gap: 6, marginLeft: "auto" }}>
            <input
              placeholder="Search (title/date/source)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button className="btn" onClick={() => selectAllVisible(true)}>Select all</button>
            <button className="btn" onClick={() => selectAllVisible(false)}>Clear selection</button>
            <button className="btn primary" onClick={openSendForSelected}>
              Send selected → Planner
            </button>
          </div>
          <div className="small" style={{ width: "100%", marginTop: 4 }}>
            Total: <b>{sums.totalKm.toFixed(1)} km</b>
            {sums.totalMin ? <> • Time: <b>{sums.totalMin} min</b></> : null}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">Entries</h2>
        {visible.length === 0 ? (
          <div className="small">No runs match. Try importing or clearing the search.</div>
        ) : (
          <div className="grid cols-3" style={{ marginTop: 10 }}>
            {visible.map((e, i) => {
              const k = keyOf(e, i);
              const checked = !!selected[k];
              return (
                <article key={k} className="card">
                  {(e.mapSummaryPolyline || e.mapPolyline) && (
                    <RouteMap
                      polyline={e.mapSummaryPolyline || e.mapPolyline}
                      width={280}
                      height={160}
                      className="mb-3"
                      elevationStream={e.elevationStream}
                      distanceStream={e.distanceStream}
                      showElevation={true}
                    />
                  )}
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", flex: 1 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSel(e, i)} />
                      <div
                        className="h2"
                        onClick={() => e.id && navigate(`/activity/${e.id}`)}
                        style={{
                          cursor: e.id ? 'pointer' : 'default',
                          textDecoration: e.id ? 'none' : 'none',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(el) => {
                          if (e.id) el.currentTarget.style.color = 'var(--bolt-teal)';
                        }}
                        onMouseLeave={(el) => {
                          el.currentTarget.style.color = 'var(--bolt-text)';
                        }}
                      >
                        {e.title || "Run"}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                      {e.id && <button className="btn primary" onClick={() => navigate(`/activity/${e.id}`)}>View</button>}
                      <button className="btn" onClick={() => openSendForOne(e)}>→ Planner</button>
                      <button className="btn" onClick={() => startEdit(entries.indexOf(e))}>Edit</button>
                      <button className="btn" onClick={() => del(entries.indexOf(e))}>Delete</button>
                      <button className="btn" onClick={() => openFeedback(e)}>Feedback</button>
                    </div>
                  </div>
                  <div className="small" style={{ color: "var(--muted)" }}>
                    {e.dateISO} • {e.km ?? "—"} km
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {e.durationMin ? `Duration: ${e.durationMin} min` : "Duration: —"}
                    {" • "}
                    {e.hrAvg ? `HR: ${e.hrAvg} bpm` : "HR: —"}
                    {" • "}
                    {e.source ?? "Manual"}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ImportWizard
        open={openImport}
        onClose={() => {
          setOpenImport(false);
          const next = mergeDedup(load<LogEntry[]>("logEntries", []), []);
          persistAndMaybeAdapt(next, "import");
        }}
      />

      {openStrava && (
        <StravaImporter
          onImported={(newOnes) => onImported(newOnes, "Strava")}
          onClose={() => setOpenStrava(false)}
        />
      )}

      <SendToPlannerModal open={sendOpen} onClose={() => setSendOpen(false)} sessions={toSend} />

      {edit.open && edit.draft && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
          }}
          onClick={cancelEdit}
        >
          <div
            className="card"
            style={{ width: 460, maxWidth: "92%", background: "var(--card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="h2">Edit Entry</h2>
            <label className="small" style={{ marginTop: 6 }}>Title</label>
            <input
              value={edit.draft.title}
              onChange={(e) =>
                setEdit((s) => (s.open ? { ...s, draft: { ...(s.draft as LogEntry), title: e.target.value } } : s))
              }
            />
            <label className="small" style={{ marginTop: 6 }}>Date</label>
            <input
              type="date"
              value={edit.draft.dateISO}
              onChange={(e) =>
                setEdit((s) => (s.open ? { ...s, draft: { ...(s.draft as LogEntry), dateISO: e.target.value } } : s))
              }
            />
            <label className="small" style={{ marginTop: 6 }}>Kilometers</label>
            <input
              type="number"
              step="0.1"
              value={String(edit.draft.km)}
              onChange={(e) =>
                setEdit((s) =>
                  s.open ? { ...s, draft: { ...(s.draft as LogEntry), km: Number(e.target.value) } } : s
                )
              }
            />
            <div className="grid" style={{ gap: 8, gridTemplateColumns: "1fr 1fr", marginTop: 6 }}>
              <div>
                <label className="small">Duration (min)</label>
                <input
                  type="number"
                  value={edit.draft.durationMin ?? ""}
                  onChange={(e) =>
                    setEdit((s) =>
                      s.open
                        ? {
                            ...s,
                            draft: {
                              ...(s.draft as LogEntry),
                              durationMin: e.target.value ? Number(e.target.value) : undefined,
                            },
                          }
                        : s
                    )
                  }
                />
              </div>
              <div>
                <label className="small">Avg HR</label>
                <input
                  type="number"
                  value={edit.draft.hrAvg ?? ""}
                  onChange={(e) =>
                    setEdit((s) =>
                      s.open
                        ? {
                            ...s,
                            draft: {
                              ...(s.draft as LogEntry),
                              hrAvg: e.target.value ? Number(e.target.value) : undefined,
                            },
                          }
                        : s
                    )
                  }
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={cancelEdit}>Cancel</button>
              <button className="btn primary" onClick={applyEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Run Feedback Modal */}
      {fbOpen && fbSeed && (
        <RunFeedbackModal
          open={fbOpen}
          seed={fbSeed}
          onClose={() => {
            setFbOpen(false);
            setFbSeed(null);
          }}
        />
      )}

      {/* DNF Confirmation Dialog */}
      {showDNFConfirm && pendingActivity && (
        <DNFConfirmDialog
          isOpen={showDNFConfirm}
          onConfirm={handleDNFConfirmed}
          onDeny={handleDNFDenied}
          activityTitle={pendingActivity.title || 'Run'}
          completionPercent={Math.round((pendingActivity.km / (pendingActivity.km || 1)) * 100)}
        />
      )}

      {/* Race Performance Feedback Modal */}
      {showRaceModal && pendingActivity && (
        <RacePerformanceFeedbackModal
          isOpen={showRaceModal}
          onClose={() => {
            setShowRaceModal(false);
            setPendingActivity(null);
          }}
          eventTitle={pendingActivity.title || 'Race'}
          eventType="race"
          eventDate={pendingActivity.dateISO}
          actualDistance={pendingActivity.km}
          actualDuration={pendingActivity.durationMin}
          onSubmit={handleRaceFeedbackSubmit}
        />
      )}

      {/* DNF Feedback Modal */}
      {showDNFModal && pendingActivity && (
        <DNFFeedbackModal
          isOpen={showDNFModal}
          onClose={() => {
            setShowDNFModal(false);
            setPendingActivity(null);
          }}
          eventTitle={pendingActivity.title || 'Race'}
          eventDate={pendingActivity.dateISO}
          actualDistance={pendingActivity.km}
          plannedDistance={pendingActivity.km * 1.5}
          autoDetected={true}
          onSubmit={handleDNFFeedbackSubmit}
        />
      )}
    </div>
  );
}