import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n";
import { MISSIONS } from "@/missions/catalog";
import { getRunRadar, type RunCard } from "@/routes/runRadar";
import { rewardCoinsForStreak } from "@/utils/rewards";
import {
  reasonWeekly,
  DEFAULT_WEIGHTS,
  type Activity,
  type HealthState,
} from "@/ai/brain";
import { getPersona, toneLine } from "@/ai/personality";
import { toast } from "@/components/ToastHost";
import { save, load } from "@/utils/storage";
import DailyBanner from "@/components/DailyBanner";
import ReadinessCard from "@/components/ReadinessCard";
import ReadinessTrendChart from "@/components/ReadinessTrendChart";
import MotivationHeader from "@/components/MotivationHeader";
import { mockMorningNotification } from "@/lib/notify";

type AIHistoryEntry = {
  date: string;
  fatigueScore: number;
  adjustments: Partial<{
    volumeCutPct: number;
    volumeBoostPct: number;
  }>;
  reason: string;
};

export default function Home() {
  const t = useT();

  // ---- persisted state ----
  const [streak, setStreak] = useState<number>(load("streak", 3));
  const [health, setHealth] = useState<HealthState>(load("health", "ok"));
  const [raceWeeks, setRaceWeeks] = useState<number>(load("raceWeeks", 8));
  const [weights, setWeights] = useState(load("weights", DEFAULT_WEIGHTS));

  const [recent] = useState<Activity[]>(
    load("recentActivities", [
      { dateISO: "2025-10-01", km: 8, rpe: 5, sleepHours: 7.5, hrv: 58 },
      { dateISO: "2025-10-02", km: 10, rpe: 6, sleepHours: 7.0, hrv: 55 },
      { dateISO: "2025-10-03", km: 0, rpe: 7, sleepHours: 6.2, hrv: 49 },
    ])
  );

  const [radar, setRadar] = useState<RunCard[]>([]);
  const [history, setHistory] = useState<AIHistoryEntry[]>(
    load("aiHistory", [])
  );

  // ---- persist ----
  useEffect(() => save("streak", streak), [streak]);
  useEffect(() => save("health", health), [health]);
  useEffect(() => save("raceWeeks", raceWeeks), [raceWeeks]);
  useEffect(() => save("weights", weights), [weights]);
  useEffect(() => save("aiHistory", history), [history]);

  // ---- effects ----
  useEffect(() => {
    getRunRadar(0, 0).then(setRadar);
  }, []);

  useEffect(() => {
    mockMorningNotification();
  }, []);

  // ---- AI decision (pure, no side-effects) ----
  const ai = useMemo(
    () =>
      reasonWeekly({
        recentActivities: recent,
        health,
        weights,
        raceProximityWeeks: raceWeeks,
        last4WeeksKm: [40, 46, 52, 48],
        thisWeekPlannedKm: 50,
      }),
    [recent, health, weights, raceWeeks]
  );

  // ---- AI history ----
  useEffect(() => {
    const last = history.at(-1);
    const changed =
      !last ||
      last.fatigueScore !== ai.fatigueScore ||
      JSON.stringify(last.adjustments) !== JSON.stringify(ai.adjustments) ||
      last.reason !== ai.reason;

    if (changed) {
      setHistory((h) =>
        [
          ...h,
          {
            date: new Date().toISOString(),
            fatigueScore: ai.fatigueScore,
            adjustments: ai.adjustments,
            reason: ai.reason,
          },
        ].slice(-20)
      );
    }
  }, [ai.fatigueScore, ai.adjustments, ai.reason, history]);

  const persona = getPersona("home", { rpe: recent.at(-1)?.rpe });
  const coins = rewardCoinsForStreak(streak);

  // ---- handlers ----
  function incStreak() {
    setStreak((s) => {
      const next = s + 1;
      if (next >= 2) {
        toast("🔥 Streak kept! +3 coins", "success");
      }
      return next;
    });
  }

  function decStreak() {
    setStreak((s) => Math.max(0, s - 1));
  }

  const summary = useMemo(() => {
    if (ai.fatigueScore > 0.7) {
      return "You’re carrying fatigue — keep most runs easy and extend sleep.";
    }
    if (ai.fatigueScore < 0.3) {
      return "Readiness high — add hills or a short tempo this week.";
    }
    return "Steady adaptation — stay consistent.";
  }, [ai.fatigueScore]);

  const trainingContext = useMemo(() => {
    const thisWeekKm = recent.reduce((s, a) => s + (a.km || 0), 0);
    const last = recent.at(-1);
    let recentType: "rest" | "easy" | "hard" | "long" = "easy";

    if (last) {
      if (last.km === 0) recentType = "rest";
      else if (last.rpe >= 7) recentType = "hard";
      else if (last.km > 15) recentType = "long";
    }

    return {
      kmThisWeek: thisWeekKm,
      fatigueLevel: ai.fatigueScore,
      recentActivityType: recentType,
    };
  }, [recent, ai.fatigueScore]);

  const upcomingRace = raceWeeks > 0
    ? { weeksAway: raceWeeks, distance: "Marathon" }
    : undefined;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <MotivationHeader trainingContext={trainingContext} upcomingRace={upcomingRace} />
      <ReadinessCard />
      <DailyBanner />

      <section className="card">
        <h2 className="h2">Weekly Summary</h2>
        <p className="small">{summary}</p>
        <div className="kv"><span>Fatigue score</span><b>{ai.fatigueScore.toFixed(2)}</b></div>
        <div className="kv"><span>Health</span><b>{health}</b></div>
        <div className="kv"><span>Race proximity</span><b>{raceWeeks} weeks</b></div>
      </section>

      <section className="grid cols-3">
        <div className="card">
          <h2 className="h2">AI Insight</h2>
          <div className="small">{toneLine(persona, ai.reason)}</div>
        </div>

        <div className="card">
          <h2 className="h2">Streak & Coins</h2>
          <div className="row">
            <button className="btn" onClick={decStreak}>– day</button>
            <button className="btn" onClick={incStreak}>+ day</button>
          </div>
          <div className="kv"><span>Streak</span><b>{streak} days</b></div>
          <div className="kv"><span>Reward</span><b>{coins} coins</b></div>
        </div>

        <div className="card">
          <h2 className="h2">Select Mission</h2>
          {MISSIONS.slice(0, 3).map((m) => (
            <div key={m.id} className="row">
              <b>{m.title}</b>
              <button className="btn primary">Start</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h2">AI Change History</h2>
        {history.length === 0 ? (
          <div className="small">No AI changes yet.</div>
        ) : (
          history.slice().reverse().map((h, i) => (
            <div key={i} className="small">
              <b>{new Date(h.date).toLocaleDateString()}</b>: {h.reason}
            </div>
          ))
        )}
      </section>

      <ReadinessTrendChart />

      <section className="card">
        <h2 className="h2">Run Radar</h2>
        <div className="grid cols-2">
          {radar.map((r) => (
            <article key={r.id} className="card">
              <div className="h2">{r.title}</div>
              <div className="small">{r.region}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
