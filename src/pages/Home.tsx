// src/pages/Home.tsx
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

export default function Home() {
  const t = useT();

  // ---- state (persisted) ----
  const [streak, setStreak] = useState<number>(load("streak", 3));
  const [health, setHealth] = useState<HealthState>(load("health", "ok"));
  const [raceWeeks, setRaceWeeks] = useState<number>(load("raceWeeks", 8));
  const [weights, setWeights] = useState(load("weights", DEFAULT_WEIGHTS));
  const [recent, setRecent] = useState<Activity[]>(
    load("recentActivities", [
      { dateISO: "2025-10-01", km: 8, rpe: 5, sleepHours: 7.5, hrv: 58 },
      { dateISO: "2025-10-02", km: 10, rpe: 6, sleepHours: 7.0, hrv: 55 },
      { dateISO: "2025-10-03", km: 0, rpe: 7, sleepHours: 6.2, hrv: 49 },
    ])
  );
  const [radar, setRadar] = useState<RunCard[]>([]);

  // NEW: AI change history (persisted)
  const [history, setHistory] = useState<
    { date: string; fatigueScore: number; adjustments: any; reason: string }[]
  >(load("aiHistory", []));

  // ---- persist on change ----
  useEffect(() => save("streak", streak), [streak]);
  useEffect(() => save("health", health), [health]);
  useEffect(() => save("raceWeeks", raceWeeks), [raceWeeks]);
  useEffect(() => save("weights", weights), [weights]);
  useEffect(() => save("recentActivities", recent), [recent]);
  useEffect(() => save("aiHistory", history), [history]);

  // ---- effects ----
  useEffect(() => {
    getRunRadar(0, 0).then(setRadar);
  }, []);

  useEffect(() => {
    // show a friendly “plan ready” notification when the page loads
    mockMorningNotification();
  }, []);

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

  // record AI changes automatically when fatigueScore or adjustments differ
  useEffect(() => {
    const last = history.at(-1);
    const diff =
      !last ||
      last.fatigueScore !== ai.fatigueScore ||
      JSON.stringify(last.adjustments) !== JSON.stringify(ai.adjustments);
    if (diff) {
      const entry = {
        date: new Date().toISOString(),
        fatigueScore: ai.fatigueScore,
        adjustments: ai.adjustments,
        reason: ai.reason,
      };
      setHistory((h) => [...h, entry].slice(-20)); // keep last 20
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.fatigueScore, ai.adjustments]);

  // slowly learn weights when fatigue score changes
  useEffect(() => {
    setWeights(ai.updatedWeights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.fatigueScore]);

  const persona = getPersona("home", { rpe: recent.at(-1)?.rpe });
  const coins = rewardCoinsForStreak(streak);

  // ---- handlers (toast only inside handlers) ----
  function incStreak() {
    setStreak((s) => {
      const next = s + 1;
      if (next >= 2) {
        toast(t("home.toast_streak_kept", "🔥 Streak kept! +3 coins"), "success");
      }
      return next;
    });
  }
  function decStreak() {
    setStreak((s) => Math.max(0, s - 1));
  }

  // NEW: AI summary insight text
  const summary = useMemo(() => {
    let mood = "neutral";
    if (ai.fatigueScore > 0.7) mood = "tired";
    else if (ai.fatigueScore < 0.3) mood = "strong";

    if (mood === "tired") {
      return t(
        "home.summary_tired",
        "You’re carrying fatigue — keep most runs easy and extend sleep."
      );
    }
    if (mood === "strong") {
      return t(
        "home.summary_strong",
        "Readiness high — add hills or a short tempo this week."
      );
    }
    return t("home.summary_neutral", "Steady adaptation — stay consistent.");
  }, [ai.fatigueScore, t]);

  const trainingContext = useMemo(() => {
    const thisWeekKm = recent.reduce((sum, act) => sum + (act.km || 0), 0);
    const lastActivity = recent[recent.length - 1];
    let recentType: 'rest' | 'easy' | 'hard' | 'long' = 'easy';

    if (lastActivity) {
      if (lastActivity.km === 0) recentType = 'rest';
      else if (lastActivity.rpe >= 7) recentType = 'hard';
      else if (lastActivity.km > 15) recentType = 'long';
    }

    return {
      kmThisWeek: thisWeekKm,
      fatigueLevel: ai.fatigueScore,
      recentActivityType: recentType,
    };
  }, [recent, ai.fatigueScore]);

  const upcomingRace = useMemo(() => {
    if (raceWeeks > 0) {
      return {
        weeksAway: raceWeeks,
        distance: 'Marathon',
      };
    }
    return undefined;
  }, [raceWeeks]);

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* Motivation Header */}
      <MotivationHeader
        trainingContext={trainingContext}
        upcomingRace={upcomingRace}
      />

      {/* Daily Readiness Card */}
      <ReadinessCard />

      {/* Daily adaptive banner */}
      <DailyBanner />

      {/* NEW: Weekly Summary (AI) */}
      <section
        className="card"
        style={{ background: "var(--card)", borderLeft: "4px solid var(--brand)" }}
      >
        <h2 className="h2">{t("home.weekly_summary", "Weekly Summary")}</h2>
        <p className="small">{summary}</p>
        <div className="kv">
          <span>{t("home.fatigue_score", "Fatigue score")}</span>
          <b>{ai.fatigueScore.toFixed(2)}</b>
        </div>
        <div className="kv">
          <span>{t("home.health", "Health")}</span>
          <b>{health}</b>
        </div>
        <div className="kv">
          <span>{t("home.race_proximity", "Race proximity")}</span>
          <b>
            {raceWeeks} {t("home.weeks", "weeks")}
          </b>
        </div>
      </section>

      {/* AI insight + controls + streak + quick missions */}
      <section className="grid cols-3">
        {/* AI Insight */}
        <div className="card">
          <h2 className="h2">{t("home.ai_insight", "AI Insight")}</h2>
          <div className="small">{toneLine(persona, ai.reason)}</div>
          <hr />
          <div className="kv">
            <span>{t("home.fatigue_score", "Fatigue score")}</span>
            <b>{ai.fatigueScore.toFixed(2)}</b>
          </div>
          {"volumeCutPct" in ai.adjustments && (
            <div className="kv">
              <span>{t("home.adjustment", "Adjustment")}</span>
              <b>
                -{(ai.adjustments as any).volumeCutPct}% {t("home.volume", "volume")}
              </b>
            </div>
          )}
          {"volumeBoostPct" in ai.adjustments && (
            <div className="kv">
              <span>{t("home.adjustment", "Adjustment")}</span>
              <b>
                +{(ai.adjustments as any).volumeBoostPct}% {t("home.volume", "volume")}
              </b>
            </div>
          )}
          <div className="kv">
            <span>{t("home.race_proximity", "Race proximity")}</span>
            <b>
              {raceWeeks} {t("home.weeks", "weeks")}
            </b>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => setRaceWeeks((w) => Math.max(0, w - 1))}>
              – {t("home.week", "week")}
            </button>
            <button className="btn" onClick={() => setRaceWeeks((w) => w + 1)}>
              + {t("home.week", "week")}
            </button>
            <select
              onChange={(e) => setHealth(e.target.value as HealthState)}
              value={health}
            >
              <option value="ok">{t("settings.health_ok", "Health: OK")}</option>
              <option value="returning">
                {t("settings.health_returning", "Health: Returning")}
              </option>
              <option value="sick">{t("settings.health_sick", "Health: Sick")}</option>
            </select>
          </div>
        </div>

        {/* Streak & Coins */}
        <div className="card">
          <h2 className="h2">{t("home.streak_coins", "Streak & Coins")}</h2>
          <div className="row">
            <button className="btn" onClick={decStreak}>
              – {t("home.day", "day")}
            </button>
            <button className="btn" onClick={incStreak}>
              + {t("home.day", "day")}
            </button>
          </div>
          <div className="kv">
            <span>{t("home.streak", "Streak")}</span>
            <b>
              {streak} {t("home.days", "days")}
            </b>
          </div>
          <div className="kv">
            <span>{t("home.reward_this_week", "Reward this week")}</span>
            <b>
              {coins} {t("home.coins", "coins")}
            </b>
          </div>
        </div>

        {/* Quick missions selector */}
        <div className="card">
          <h2 className="h2">{t("home.select_mission", "Select Mission")}</h2>
          <div className="grid" style={{ gap: 8 }}>
            {MISSIONS.slice(0, 3).map((m) => (
              <div key={m.id} className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div>
                    <b>{m.title}</b>
                  </div>
                  <div className="small">{m.tagline}</div>
                </div>
                <button
                  className="btn primary"
                  onClick={() => alert(`${t("home.selected", "Selected")}: ${m.title}`)}
                >
                  {t("home.start", "Start")}
                </button>
              </div>
            ))}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            <a href="#missions">
              {t("home.see_all_missions", "See all missions in Dashboard below")}
            </a>
          </div>
        </div>
      </section>

      {/* NEW: AI Change History */}
      <section className="card">
        <h2 className="h2">{t("home.ai_change_history", "AI Change History")}</h2>
        {history.length === 0 ? (
          <div className="small">{t("home.no_ai_changes", "No AI changes recorded yet.")}</div>
        ) : (
          <div className="grid" style={{ gap: 8 }}>
            {history
              .slice()
              .reverse()
              .map((h, i) => (
                <div
                  key={i}
                  className="small"
                  style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
                >
                  <b>{new Date(h.date).toLocaleDateString()}</b>: {h.reason} (
                  {t("home.fatigue_score", "Fatigue score")} {h.fatigueScore.toFixed(2)})
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Readiness Trend Chart */}
      <ReadinessTrendChart />

      {/* Run Radar */}
      <section className="card">
        <h2 className="h2">{t("home.run_radar", "Run Radar Near You")}</h2>
        <div className="grid cols-2">
          {radar.map((r) => (
            <article key={r.id} className="card">
              <div className="h2">{r.title}</div>
              <div className="small">{r.region}</div>
              <div className="small" style={{ marginTop: 4 }}>
                {r.km} km • {r.surface} • {t("home.scenic", "Scenic")} {r.scenicScore}/10
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
