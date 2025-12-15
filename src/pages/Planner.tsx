// src/pages/Planner.tsx
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n";
import { load, save } from "@/utils/storage";
import {
  reasonWeekly,
  DEFAULT_WEIGHTS,
  type Activity,
  type HealthState,
} from "@/ai/brain";
import { askCoach } from "@/ai/coach";
import { toast } from "@/components/ToastHost";
import { downloadWeekPNG } from "@/utils/weekImage";
import { buildWeekIcs, type IcsItem } from "@/utils/ics";
import { getActivePriorityRace } from "@/utils/races";
import { applyRaceLessonsToPlan } from "@/ai/experience";

// NEW: weather + location utilities/components
import WeatherDot from "@/components/WeatherDot";
import SessionWxTip from "@/components/SessionWxTip";
import { fetchDailyWeather } from "@/utils/weather";
import { getSavedLocation, detectLocation, saveLocation } from "@/utils/location";
import WorkoutGenerator from "@/components/WorkoutGenerator";
import { generateWorkout } from "@/utils/workoutGenerator";
import CoachSummary from "@/components/CoachSummary";
import AdaptiveCoachPanel from "@/components/AdaptiveCoachPanel";

/** ---------- Local types ---------- */
type Session = {
  title: string;
  km?: number;
  notes?: string;
  durationMin?: number;
  elevationGain?: number;
  type?: string;
  distanceKm?: number;
};
type PlanDay = { dateISO: string; sessions: Session[] };
export type PlanWeek = PlanDay[];

/** ---------- Helpers ---------- */
function isoOfOffset(offset: number) {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() + offset
  );
  return start.toISOString().slice(0, 10);
}

function makeEmptyWeek(): PlanWeek {
  return Array.from({ length: 7 }, (_, i) => ({
    dateISO: isoOfOffset(i),
    sessions: [],
  }));
}

function isSession(x: any): x is Session {
  return x && typeof x === "object" && typeof x.title === "string";
}

function isPlanDay(x: any): x is PlanDay {
  return (
    x &&
    typeof x === "object" &&
    typeof x.dateISO === "string" &&
    Array.isArray(x.sessions)
  );
}

function normalizeWeek(maybe: any): PlanWeek {
  if (!Array.isArray(maybe) || maybe.length !== 7) return makeEmptyWeek();
  const week = maybe.map((d, i) => {
    if (!isPlanDay(d)) return { dateISO: isoOfOffset(i), sessions: [] };
    const sessions = Array.isArray(d.sessions)
      ? d.sessions
          .filter(isSession)
          .map((s: any) => ({
            title: String(s.title),
            km:
              s.km == null
                ? undefined
                : typeof s.km === "number"
                ? s.km
                : Number(s.km) || undefined,
            notes: s.notes == null ? undefined : String(s.notes),
            durationMin: s.durationMin != null ? Number(s.durationMin) : undefined,
            elevationGain: s.elevationGain != null ? Number(s.elevationGain) : undefined,
            type: s.type != null ? String(s.type) : undefined,
            distanceKm: s.distanceKm != null ? Number(s.distanceKm) : undefined,
          }))
      : [];
    const dateISO =
      typeof d.dateISO === "string" && d.dateISO.length >= 10
        ? d.dateISO.slice(0, 10)
        : isoOfOffset(i);
    return { dateISO, sessions };
  });
  return week.length === 7 ? week : makeEmptyWeek();
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** ---------- Build Plan with Optional Taper Override ---------- */
function buildPlanFromAI(
  ai: ReturnType<typeof reasonWeekly>,
  raceWeeks: number,
  opts?: { taperCutPct?: number }
): PlanWeek {
  const base = makeEmptyWeek();
  const volPercent = ai.fatigueScore > 0.7 ? 0.8 : ai.fatigueScore < 0.3 ? 1.1 : 1.0;
  let targetKm = Math.round(50 * volPercent);

  if (raceWeeks <= 3) {
    const taperPct = raceWeeks === 0 ? 0.6 : raceWeeks === 1 ? 0.7 : 0.85;
    targetKm = Math.round(targetKm * taperPct);
  }

  if (opts?.taperCutPct != null) {
    const cut = Math.max(0, Math.min(0.9, opts.taperCutPct));
    targetKm = Math.round(targetKm * (1 - cut));
  }

  const longKm = clamp(
    Math.round(targetKm * (ai.fatigueScore > 0.7 ? 0.22 : 0.28)),
    10,
    35
  );
  const midKm = clamp(Math.round(targetKm * 0.16), 6, 16);
  const ezKm = clamp(Math.round((targetKm - longKm - midKm) / 4), 4, 12);
  const hasQuality = ai.fatigueScore <= 0.7;

  base[0].sessions.push({
    title: "Easy",
    km: ezKm,
    notes: "Z2. Strides optional.",
  });
  if (ai.fatigueScore > 0.7)
    base[1].sessions.push({
      title: "Rest / Mobility",
      notes: "Light walk + mobility 15–20’",
    });
  else
    base[1].sessions.push({
      title: "Easy",
      km: ezKm,
      notes: "Z2. Optional strides.",
    });
  if (hasQuality)
    base[2].sessions.push({
      title: "Quality",
      km: midKm,
      notes: "Controlled tempo or short hills. WU/CD.",
    });
  else base[2].sessions.push({ title: "Easy", km: ezKm, notes: "Z2 only." });
  base[3].sessions.push({
    title: "Easy",
    km: ezKm,
    notes: "Z2. Cadence focus.",
  });
  base[4].sessions.push({
    title: hasQuality ? "Moderate" : "Easy",
    km: hasQuality ? midKm : ezKm,
    notes: hasQuality ? "Progress to steady." : "Keep easy.",
  });
  base[5].sessions.push({
    title: ai.fatigueScore > 0.7 ? "Rest" : "Shake-out",
    km: ai.fatigueScore > 0.7 ? undefined : 4,
    notes: ai.fatigueScore > 0.7 ? "Extra recovery day." : "Very easy.",
  });
  base[6].sessions.push({
    title: "Long Run",
    km: longKm,
    notes:
      raceWeeks <= 3
        ? "Taper long-run. Relaxed."
        : "Time-on-feet. Add climbs if trail.",
  });

  return base;
}

/** ---------- Taper Override Calculator ---------- */
function computeTaperOverride() {
  const { race, days } = getActivePriorityRace(new Date());
  if (!race || days == null)
    return { cut: undefined as number | undefined, reason: null as string | null };

  const pr = (race.priority || "B").toUpperCase() as "A" | "B" | "C";
  let baseCut = days <= 3 ? 0.6 : days <= 7 ? 0.4 : days <= 14 ? 0.3 : days <= 21 ? 0.15 : 0.0;
  const mul = pr === "A" ? 1.0 : pr === "B" ? 0.65 : 0.4;
  let cut = +(baseCut * mul).toFixed(2);

  const biased = applyRaceLessonsToPlan({ taperCutPct: cut });
  cut = +(biased.taperCutPct ?? cut).toFixed(2);

  const reason = `${pr}-race "${race.name}" in ${days} day(s)`;
  return { cut: cut > 0 ? cut : undefined, reason };
}

/** ---------- Modal components ---------- */
function Confirm({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ width: 420, maxWidth: "90%", background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="h2">{title}</h2>
        <p className="small" style={{ marginTop: 6 }}>
          {message}
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={onConfirm}>
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionEditor({
  open,
  initial,
  onCancel,
  onSave,
}: {
  open: boolean;
  initial?: Session;
  onCancel: () => void;
  onSave: (s: Session) => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [km, setKm] = useState(initial?.km != null ? String(initial.km) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setKm(initial?.km != null ? String(initial.km) : "");
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ width: 480, maxWidth: "92%", background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="h2">{t("planner.edit_session", "Edit Session")}</h2>
        <label className="small" style={{ marginTop: 6 }}>
          {t("planner.title_label", "Title")}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Easy / Quality / Long / Rest"
        />
        <label className="small" style={{ marginTop: 6 }}>
          {t("planner.km_label", "Kilometers")}
        </label>
        <input
          type="number"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="e.g. 10"
        />
        <label className="small" style={{ marginTop: 6 }}>
          {t("planner.notes_label", "Notes")}
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Z2, strides, fueling…"
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={onCancel}>
            {t("planner.cancel", "Cancel")}
          </button>
          <button
            className="btn primary"
            onClick={() =>
              onSave({
                title: title.trim() || "Session",
                km: km.trim() ? Number(km) || undefined : undefined,
                notes: notes.trim() || undefined,
              })
            }
          >
            {t("planner.save", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ---------- Page ---------- */
export default function Planner() {
  const t = useT();
  const [week, setWeek] = useState<PlanWeek>(() =>
    normalizeWeek(load<any>("planner:week", makeEmptyWeek()))
  );
  const [pending, setPending] = useState<PlanWeek | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [coachText, setCoachText] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editDay, setEditDay] = useState(0);
  const [editIdx, setEditIdx] = useState(0);
  const [editInitial, setEditInitial] = useState<Session | undefined>(undefined);

  const inbox = load<{ title: string; notes?: string }>(
    "planner:inboxSession",
    null as any
  );

  // NEW: daily weather cache for displayed days + geolocate state
  const [dailyWx, setDailyWx] = useState<Record<string, any>>({});
  const [geoReady, setGeoReady] = useState<boolean>(!!getSavedLocation());

  // User context
  const health = load<HealthState>("health", "ok");
  const recent = load<Activity[]>("recentActivities", []);
  const last4WeeksKm = load<number[]>("insights:last4", [40, 46, 52, 48]);
  const thisWeekPlannedKm = 50;

  // Active race
  const { race: activeRace, wTo } = getActivePriorityRace(new Date());
  const weeksLeftNum = wTo != null ? Math.max(0, Math.round(wTo)) : null;

  // AI view
  const aiView = useMemo(
    () =>
      reasonWeekly({
        recentActivities: recent,
        health,
        weights: DEFAULT_WEIGHTS,
        last4WeeksKm,
        thisWeekPlannedKm,
        activeRace:
          activeRace && wTo != null
            ? { name: activeRace.name, priority: activeRace.priority, weeksTo: wTo }
            : null,
      }),
    [
      recent,
      health,
      last4WeeksKm,
      thisWeekPlannedKm,
      activeRace?.name,
      activeRace?.priority,
      wTo,
    ]
  );

  // Persist + normalize once
  useEffect(() => {
    save("planner:week", week);
  }, [week]);
  useEffect(() => {
    setWeek((w) => normalizeWeek(w));
  }, []);

  useEffect(() => {
    const handlePlanUpdate = () => {
      const updated = normalizeWeek(load<any>("planner:week", makeEmptyWeek()));
      setWeek(updated);
    };
    window.addEventListener("plan:updated", handlePlanUpdate);
    return () => window.removeEventListener("plan:updated", handlePlanUpdate);
  }, []);

  // Auto-adapt vs actual logged KM
  useEffect(() => {
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const start = new Date(todayISO);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const doneKm = (load<any[]>("logEntries", []) || [])
        .filter(
          (e: any) =>
            e?.dateISO &&
            new Date(e.dateISO) >= start &&
            new Date(e.dateISO) < end
        )
        .reduce((acc: number, e: any) => acc + (Number(e.km) || 0), 0);
      const plannedKm = week.reduce(
        (acc, d) => acc + d.sessions.reduce((s, x) => s + (x.km || 0), 0),
        0
      );
      if (!plannedKm) return;
      const ratio = doneKm / plannedKm;
      if (ratio > 1.15 || ratio < 0.85) {
        const scale = clamp(ratio > 1 ? 0.9 : 1.08, 0.8, 1.15);
        setWeek((w) =>
          w.map((d) => ({
            ...d,
            sessions: d.sessions.map((s) => ({
              ...s,
              km: s.km ? Math.max(2, Math.round(s.km * scale)) : s.km,
            })),
          }))
        );
        toast(
          t("planner.adapted", "Plan auto-adapted to your logged runs."),
          "success"
        );
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(load<any[]>("logEntries", []))]);

  // Suggest Week (uses taper override)
  async function suggestWeek() {
    const { cut: taperCutPct, reason: taperReason } = computeTaperOverride();
    const text = await askCoach("Suggest a safe training week", {
      health,
      recent,
      thisWeekPlannedKm,
      last4WeeksKm,
      activeRace: activeRace
        ? {
            name: activeRace.name,
            priority: activeRace.priority,
            weeksTo: wTo ?? 99,
          }
        : null,
      taperNote: taperReason ?? undefined,
    });
    setCoachText(text);
    toast(`${t("planner.coach_says", "Coach says")}: ${text}`, "success");

    const plan = buildPlanFromAI(aiView, Math.max(0, Math.round(wTo ?? 99)), {
      taperCutPct: taperCutPct,
    });
    setPending(plan);
    setShowConfirm(true);
  }

  function replaceWeek() {
    if (!pending) return;
    setWeek(pending);
    setPending(null);
    setShowConfirm(false);
    toast(t("planner.replaced", "Plan replaced."), "success");
  }

  function resetWeek() {
    setWeek(makeEmptyWeek());
    toast(t("planner.reset", "Week reset."), "success");
  }

  function addQuick(dayIdx: number, s: Session) {
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      copy[dayIdx].sessions.push(s);
      return copy;
    });
  }

  function clearDay(dayIdx: number) {
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      copy[dayIdx].sessions = [];
      return copy;
    });
  }

  function openEdit(dayIdx: number, idx: number) {
    const s = week[dayIdx]?.sessions[idx];
    if (!s) return;
    setEditDay(dayIdx);
    setEditIdx(idx);
    setEditInitial(s);
    setEditOpen(true);
  }

  function saveEdit(newS: Session) {
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      if (copy[editDay] && copy[editDay].sessions[editIdx])
        copy[editDay].sessions[editIdx] = newS;
      return copy;
    });
    setEditOpen(false);
  }

  function duplicateSession(dayIdx: number, idx: number) {
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      const s = copy[dayIdx]?.sessions[idx];
      if (!s) return w;
      copy[dayIdx].sessions.splice(idx + 1, 0, { ...s });
      return copy;
    });
  }

  function deleteSession(dayIdx: number, idx: number) {
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      if (!copy[dayIdx]) return w;
      copy[dayIdx].sessions.splice(idx, 1);
      return copy;
    });
  }

  const [dragSrc, setDragSrc] = useState<{ day: number; idx: number } | null>(
    null
  );
  function onDragStart(day: number, idx: number) {
    setDragSrc({ day, idx });
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(targetDay: number, targetIdx?: number) {
    if (!dragSrc) return;
    const { day: srcDay, idx: srcIdx } = dragSrc;
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      if (!copy[srcDay]?.sessions[srcIdx]) return w;
      const moving = copy[srcDay].sessions.splice(srcIdx, 1)[0];
      if (typeof targetIdx === "number")
        copy[targetDay].sessions.splice(targetIdx, 0, moving);
      else copy[targetDay].sessions.push(moving);
      return copy;
    });
    setDragSrc(null);
  }

  const totals = useMemo(() => {
    const byDay = week.map((d) =>
      d.sessions.reduce((acc, s) => acc + (s.km || 0), 0)
    );
    return { byDay, total: byDay.reduce((a, b) => a + b, 0) };
  }, [week]);

  function exportPNG() {
    downloadWeekPNG(week, "mizzion-week.png");
  }

  function exportICS() {
    const items: IcsItem[] = [];
    week.forEach((d, i) => {
      d.sessions.forEach((s) => {
        items.push({
          title: s.km ? `${s.title} — ${s.km} km` : s.title,
          notes: s.notes,
          dayIndex: i,
        });
      });
    });
    buildWeekIcs(items, "mizzion-week.ics");
  }

  function insertInbox(dayIdx: number) {
    if (!inbox) return;
    setWeek((w) => {
      const copy = w.map((d) => ({ ...d, sessions: [...d.sessions] }));
      copy[dayIdx].sessions.push({ title: inbox.title, notes: inbox.notes });
      return copy;
    });
    toast(t("planner.inbox_inserted", "Inserted coach advice."), "success");
    save("planner:inboxSession", null as any);
  }

  const { cut: taperCutPct, reason: taperReason } = computeTaperOverride();

  // --------- NEW: fetch DAILY weather for the week in view ----------
  useEffect(() => {
    let alive = true;
    async function run() {
      const loc = getSavedLocation();
      if (!loc) return;
      const dates = Array.from(new Set(week.map((d) => d.dateISO))).sort();
      if (!dates.length) return;
      try {
        const days = await fetchDailyWeather(loc.lat, loc.lon, dates[0], 7);
        if (!alive) return;
        const map: Record<string, any> = {};
        days.forEach((d) => {
          map[d.dateISO] = d;
        });
        setDailyWx(map);
      } catch {
        /* ignore */
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [week.map((d) => d.dateISO).join("|")]);

  // --------- Render ----------
  if (!Array.isArray(week)) {
    return (
      <section className="card">
        <h2 className="h2">{t("planner.title", "Planner")}</h2>
        <p className="small" style={{ color: "var(--bad)" }}>
          Stored plan invalid.
        </p>
        <button className="btn primary" onClick={resetWeek}>
          {t("planner.reset", "Reset week")}
        </button>
      </section>
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <CoachSummary />

      <AdaptiveCoachPanel
        onPlanGenerated={(plan) => {
          // Save the adaptive plan for DailyBanner integration
          save("adaptive:weeklyPlan", plan);
          save("adaptive:weeklyPlanDate", new Date().toISOString());

          const newWeek = week.map((day, i) => ({
            ...day,
            sessions: plan.days[i] ? [{
              title: plan.days[i].workout.title || plan.days[i].workout.type,
              type: plan.days[i].workout.type,
              km: plan.days[i].workout.distanceKm,
              distanceKm: plan.days[i].workout.distanceKm,
              durationMin: plan.days[i].workout.durationMin,
              elevationGain: plan.days[i].workout.verticalGain || undefined,
              notes: plan.days[i].workout.description
            }] : day.sessions
          }));
          setWeek(newWeek);
          save("plan", newWeek);
          toast("Adaptive plan loaded into weekly schedule!", "success");
        }}
      />

      <section className="card">
        <h2 className="h2">{t("planner.title", "Planner")}</h2>
        <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
          <button className="btn primary" onClick={suggestWeek}>
            {t("planner.suggest_ai", "Suggest week (AI)")}
          </button>
          <button className="btn" onClick={resetWeek}>
            {t("planner.reset", "Reset week")}
          </button>
          <button className="btn" onClick={exportPNG}>
            {t("planner.export_png", "Save as image")}
          </button>
          <button className="btn" onClick={exportICS}>
            {t("planner.export_ics", "Save as ICS")}
          </button>

          {/* NEW: enable/refresh location for weather */}
          <button
            className="btn"
            onClick={async () => {
              try {
                const loc = await detectLocation();
                saveLocation(loc);
                setGeoReady(true);
                toast(t("planner.geo_ok", "Location saved for weather"), "success");
              } catch {
                toast(t("planner.geo_fail", "Couldn't get location"), "error");
              }
            }}
          >
            {geoReady
              ? t("planner.geo_refresh", "Refresh weather")
              : t("planner.geo_enable", "Enable weather")}
          </button>

          <div className="small" style={{ marginLeft: "auto" }}>
            {t("home.health", "Health")}: <b>{health}</b>
            {" • "}
            {t("home.race_proximity", "Race proximity")}:{" "}
            <b>
              {weeksLeftNum != null
                ? `${weeksLeftNum} ${t("home.weeks", "weeks")}`
                : t("planner.no_race", "no race")}
            </b>
            {" • "}
            {t("home.fatigue_score", "Fatigue score")}:{" "}
            <b>{aiView.fatigueScore.toFixed(2)}</b>
            {taperCutPct != null ? (
              <>
                {" • "}
                <span>
                  {t("planner.taper", "Taper")}: -{Math.round(taperCutPct * 100)}%{" "}
                  {taperReason ? `(${taperReason})` : ""}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {coachText && (
          <p className="small" style={{ marginTop: 10 }}>
            <b>{t("planner.coach_says", "Coach says")}:</b> {coachText}
          </p>
        )}
      </section>

      {inbox && (
        <section className="card">
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <div className="small">
              <b>{t("planner.inbox_title", "Coach suggestion ready:")}</b>{" "}
              {inbox.title}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  className="btn"
                  onClick={() => insertInbox(d)}
                  title={
                    t("planner.insert_into_day", "Insert into day") + " " + (d + 1)
                  }
                >
                  {t("planner.insert_day_short", "D")}
                  {d + 1}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}


      <section className="card">
        <h2 className="h2">{t("planner.this_week", "This Week")}</h2>
        <div className="grid cols-3" style={{ gap: 12, marginTop: 10 }}>
          {week.map((d, dayIdx) => (
            <article
              key={d.dateISO}
              className="card"
              onDragOver={onDragOver}
              onDrop={() => onDrop(dayIdx)}
            >
              <div
                className="row"
                style={{ justifyContent: "space-between", alignItems: "baseline" }}
              >
                <div className="h2" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>
                    {new Date(d.dateISO).toLocaleDateString()} •{" "}
                    <span className="small" style={{ color: "var(--muted)" }}>
                      {totals.byDay[dayIdx]} km
                    </span>
                  </span>
                  {/* NEW: daily weather dot */}
                  <WeatherDot dayWx={dailyWx[d.dateISO]} dateISO={d.dateISO} />
                </div>
                <button className="btn" onClick={() => clearDay(dayIdx)}>
                  {t("planner.clear_day", "Clear")}
                </button>
              </div>

              {d.sessions.length === 0 ? (
                <div className="small" style={{ color: "var(--muted)", minHeight: 30 }}>
                  {t("planner.no_sessions", "No sessions")}
                </div>
              ) : (
                <ul className="small" style={{ margin: 0, paddingLeft: 16 }}>
                  {d.sessions.map((s, idx) => {
                    const isQuality = /quality|hills|tempo|interval|moderate/i.test(
                      s.title
                    );
                    return (
                      <li
                        key={idx}
                        draggable
                        onDragStart={() => onDragStart(dayIdx, idx)}
                        onDragOver={onDragOver}
                        onDrop={(e) => {
                          e.stopPropagation();
                          onDrop(dayIdx, idx);
                        }}
                        style={{
                          cursor: "grab",
                          userSelect: "none",
                          padding: "6px 0",
                          borderBottom: "1px solid var(--line)",
                        }}
                        title={t(
                          "planner.drag_tip",
                          "Drag to reorder or move between days"
                        )}
                      >
                        <div className="row" style={{ justifyContent: "space-between" }}>
                          <div>
                            <b>{s.title}</b>
                            {(s.km || s.distanceKm) ? ` — ${(s.distanceKm || s.km)?.toFixed(1)} km` : ""}
                            {s.durationMin ? ` • ${Math.floor(s.durationMin / 60)}:${String(Math.floor(s.durationMin % 60)).padStart(2, '0')}h` : ""}
                            {s.elevationGain ? ` • ${Math.round(s.elevationGain)}m↑` : ""}
                            {s.notes && !s.notes.includes('Est.') && !s.notes.includes('gain') ? ` • ${s.notes}` : ""}
                          </div>
                          <div className="row" style={{ gap: 6 }}>
                            <button className="btn" onClick={() => openEdit(dayIdx, idx)}>
                              {t("planner.edit", "Edit")}
                            </button>
                            <button
                              className="btn"
                              onClick={() => duplicateSession(dayIdx, idx)}
                            >
                              {t("planner.duplicate", "Duplicate")}
                            </button>
                            <button
                              className="btn"
                              onClick={() => deleteSession(dayIdx, idx)}
                            >
                              {t("planner.delete", "Delete")}
                            </button>
                          </div>
                        </div>

                        {/* NEW: hourly heat/wind tip for quality sessions */}
                        <div style={{ marginTop: 4 }}>
                          <SessionWxTip dateISO={d.dateISO} quality={isQuality} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="row" style={{ gap: 6, marginTop: 10 }}>
                <button
                  className="btn"
                  onClick={() => addQuick(dayIdx, { title: "Easy", km: 6, notes: "Z2" })}
                >
                  + Easy
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    addQuick(dayIdx, { title: "Hills", km: 8, notes: "Short reps" })
                  }
                >
                  + Hills
                </button>
                <button
                  className="btn"
                  onClick={() => addQuick(dayIdx, { title: "Rest" })}
                >
                  + Rest
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Confirm
        open={showConfirm}
        title={t("planner.confirm_title", "Replace current week?")}
        message={t(
          "planner.confirm_msg",
          "This will overwrite your current sessions with the AI suggestion."
        )}
        onCancel={() => {
          setPending(null);
          setShowConfirm(false);
        }}
        onConfirm={replaceWeek}
      />

      <SessionEditor
        open={editOpen}
        initial={editInitial}
        onCancel={() => setEditOpen(false)}
        onSave={saveEdit}
      />
    </div>
  );
}
