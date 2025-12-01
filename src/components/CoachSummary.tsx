import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { load, save } from "@/utils/storage";
import { askCoach } from "@/ai/coach";
import { getSupabase, getCurrentUserId } from "@/lib/supabase";
import type { LogEntry } from "@/types";
import { getActivePriorityRace } from "@/utils/races";

export type CoachSummaryData = {
  id?: string;
  userId?: string;
  summaryText: string;
  weekStartDate: string;
  generatedAt: string;
  isDismissed: boolean;
};

function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  const weekStart = new Date(today.setDate(diff));
  return weekStart.toISOString().slice(0, 10);
}

function calculateDominantZone(entries: LogEntry[]): string {
  const zoneCounts = [0, 0, 0, 0, 0];

  for (const e of entries) {
    const hr = e.hrAvg || 140;
    const bucket = hr < 130 ? 0 : hr < 145 ? 1 : hr < 160 ? 2 : hr < 175 ? 3 : 4;
    zoneCounts[bucket]++;
  }

  const maxIdx = zoneCounts.indexOf(Math.max(...zoneCounts));
  return `Z${maxIdx + 1}`;
}

function buildTrainingContext(entries: LogEntry[]) {
  const last7Days = entries.filter(e => {
    const d = new Date(e.dateISO);
    return Date.now() - d.getTime() <= 7 * 24 * 3600 * 1000;
  });

  const totalKm = last7Days.reduce((acc, e) => acc + (e.km || 0), 0);
  const dominantZone = calculateDominantZone(last7Days);
  const avgPace = last7Days.length > 0
    ? last7Days.reduce((acc, e) => acc + (e.durationMin || 0) / (e.km || 1), 0) / last7Days.length
    : 0;
  const avgHR = last7Days.length > 0
    ? last7Days.reduce((acc, e) => acc + (e.hrAvg || 0), 0) / last7Days.length
    : 0;

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    runCount: last7Days.length,
    dominantZone,
    avgPace: avgPace > 0 ? Math.round(avgPace * 10) / 10 : null,
    avgHR: avgHR > 0 ? Math.round(avgHR) : null
  };
}

async function generateAISummary(entries: LogEntry[]): Promise<string> {
  const context = buildTrainingContext(entries);
  const { race, wTo } = getActivePriorityRace(new Date());
  const health = load<string>("health", "ok");
  const last4WeeksKm = load<number[]>("insights:last4", [40, 46, 52, 48]);

  const prompt = `Generate a brief, conversational coach summary for this week's training plan:

Last week: ${context.totalKm}km over ${context.runCount} runs
Dominant training zone: ${context.dominantZone}
${context.avgPace ? `Average pace: ${context.avgPace} min/km` : ''}
${context.avgHR ? `Average heart rate: ${context.avgHR} bpm` : ''}
Health status: ${health}
Recent weekly volumes: ${last4WeeksKm.join(', ')}km
${race && wTo != null ? `Upcoming race: ${race.name} in ${Math.round(wTo)} weeks (${race.priority}-priority)` : 'No upcoming race'}

Give specific, actionable guidance for this week. If Z2 dominant, suggest adding controlled tempo. If high volume, remind about recovery. Be encouraging but realistic. 2-3 sentences max.`;

  try {
    const summary = await askCoach(prompt, {
      health,
      recent: [],
      thisWeekPlannedKm: context.totalKm,
      last4WeeksKm,
      activeRace: race && wTo != null ? {
        name: race.name || "Race",
        priority: (race.priority as "A" | "B" | "C") || "B",
        weeksTo: wTo
      } : null
    });

    return summary;
  } catch (err) {
    console.error('Failed to generate AI summary:', err);
    return generateFallbackSummary(context, race, wTo);
  }
}

function generateFallbackSummary(
  context: ReturnType<typeof buildTrainingContext>,
  race: any,
  weeksTo: number | null
): string {
  let summary = `You logged ${context.totalKm}km last week with ${context.runCount} runs (${context.dominantZone} dominant). `;

  if (context.dominantZone === 'Z2' || context.dominantZone === 'Z1') {
    summary += "Strong base building. Consider adding a controlled tempo session this week to sharpen leg turnover. ";
  } else if (context.dominantZone === 'Z3' || context.dominantZone === 'Z4') {
    summary += "Good intensity work. Balance with easy recovery runs to absorb the training load. ";
  }

  if (race && weeksTo != null && weeksTo <= 2) {
    summary += `With ${race.name} approaching in ${Math.round(weeksTo)} weeks, focus on freshness and specificity.`;
  } else if (context.totalKm > 50) {
    summary += "Volume is solid. Prioritize recovery and sleep to maximize adaptation.";
  } else {
    summary += "Keep building gradually and listen to your body.";
  }

  return summary;
}

async function saveSummaryToSupabase(summary: CoachSummaryData): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await supabase.from('coach_summaries').insert({
      user_id: userId,
      summary_text: summary.summaryText,
      training_context: buildTrainingContext(load<LogEntry[]>("logEntries", [])),
      week_start_date: summary.weekStartDate,
      is_dismissed: summary.isDismissed
    });
  } catch (err) {
    console.error('Failed to save summary:', err);
  }
}

async function loadSummaryFromSupabase(weekStart: string): Promise<CoachSummaryData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('coach_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      summaryText: data.summary_text,
      weekStartDate: data.week_start_date,
      generatedAt: data.generated_at,
      isDismissed: data.is_dismissed
    };
  } catch (err) {
    console.error('Failed to load summary:', err);
    return null;
  }
}

export default function CoachSummary() {
  const t = useT();
  const [summary, setSummary] = useState<CoachSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const weekStart = getWeekStart();

  useEffect(() => {
    async function loadOrGenerate() {
      setLoading(true);

      const localKey = `coach:summary:${weekStart}`;
      const cached = load<CoachSummaryData | null>(localKey, null);

      if (cached && !cached.isDismissed) {
        setSummary(cached);
        setLoading(false);
        return;
      }

      const remote = await loadSummaryFromSupabase(weekStart);
      if (remote && !remote.isDismissed) {
        setSummary(remote);
        save(localKey, remote);
        setLoading(false);
        return;
      }

      const entries = load<LogEntry[]>("logEntries", []);
      const summaryText = await generateAISummary(entries);

      const newSummary: CoachSummaryData = {
        summaryText,
        weekStartDate: weekStart,
        generatedAt: new Date().toISOString(),
        isDismissed: false
      };

      setSummary(newSummary);
      save(localKey, newSummary);
      await saveSummaryToSupabase(newSummary);
      setLoading(false);
    }

    loadOrGenerate();
  }, [weekStart]);

  async function handleDismiss() {
    if (!summary) return;

    const updated = { ...summary, isDismissed: true };
    setSummary(updated);
    save(`coach:summary:${weekStart}`, updated);

    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    if (supabase && userId && summary.id) {
      try {
        await supabase
          .from('coach_summaries')
          .update({ is_dismissed: true, read_at: new Date().toISOString() })
          .eq('id', summary.id)
          .eq('user_id', userId);
      } catch (err) {
        console.error('Failed to update summary:', err);
      }
    }
  }

  async function handleRefresh() {
    setLoading(true);
    const entries = load<LogEntry[]>("logEntries", []);
    const summaryText = await generateAISummary(entries);

    const newSummary: CoachSummaryData = {
      summaryText,
      weekStartDate: weekStart,
      generatedAt: new Date().toISOString(),
      isDismissed: false
    };

    setSummary(newSummary);
    save(`coach:summary:${weekStart}`, newSummary);
    await saveSummaryToSupabase(newSummary);
    setLoading(false);
  }

  if (summary?.isDismissed) return null;

  return (
    <section
      className="card"
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%)",
        border: "1px solid #3a5a7f",
        position: "relative"
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "1.5rem" }}>🏃</span>
            <h3 className="h2" style={{ margin: 0 }}>
              {t("coach.summary_title", "This Week's Coaching Guidance")}
            </h3>
          </div>

          {!collapsed && (
            <>
              {loading ? (
                <div
                  className="small"
                  style={{ marginTop: 12, fontStyle: "italic", color: "#a4c3e8" }}
                >
                  Analyzing your training data...
                </div>
              ) : (
                <p style={{ marginTop: 12, fontSize: "1rem", lineHeight: 1.6, color: "#e8f0f8" }}>
                  {summary?.summaryText || "Generate a summary to see your coaching guidance."}
                </p>
              )}
            </>
          )}
        </div>

        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "▼" : "▲"}
          </button>
          {!loading && (
            <>
              <button className="btn" onClick={handleRefresh} title="Refresh">
                🔄
              </button>
              <button className="btn" onClick={handleDismiss} title="Dismiss">
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
