import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LogEntry {
  date: string;
  km: number;
  duration_min?: number;
  hr_avg?: number;
  elevation_gain?: number;
}

function getWeekStartDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function calculateFatigueIndex(
  weeklyKm: number,
  avgHr: number | null,
  runCount: number,
  acwr: number | null
): number {
  let fatigueScore = 0;

  if (weeklyKm > 80) fatigueScore += 30;
  else if (weeklyKm > 60) fatigueScore += 20;
  else if (weeklyKm > 40) fatigueScore += 10;

  if (avgHr && avgHr > 160) fatigueScore += 20;
  else if (avgHr && avgHr > 150) fatigueScore += 10;

  if (acwr && acwr > 1.5) fatigueScore += 30;
  else if (acwr && acwr > 1.3) fatigueScore += 15;
  else if (acwr && acwr < 0.7) fatigueScore += 10;

  if (runCount > 6) fatigueScore += 10;
  else if (runCount < 3 && weeklyKm > 20) fatigueScore += 5;

  return Math.min(100, Math.max(0, fatigueScore));
}

function calculateMonotony(paces: number[]): number {
  if (paces.length < 3) return 1.0;

  const sum = paces.reduce((a, b) => a + b, 0);
  const mean = sum / paces.length;
  const variance = paces.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / paces.length;
  const stdDev = Math.sqrt(variance);

  if (mean === 0 || stdDev === 0) return 1.0;
  return mean / stdDev;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace('Bearer ', '');

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.error("[derive-weekly-metrics] Auth error:", userError);
      throw new Error("Unauthorized");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const startTime = Date.now();
    console.log(`[derive-weekly-metrics] Starting computation for user ${user.id}`);

    const { data: logEntries, error: logError } = await supabase
      .from('log_entries')
      .select('date, km, duration_min, hr_avg, elevation_gain')
      .eq('user_id', user.id)
      .eq('counts_for_running_load', true)
      .order('date', { ascending: true });

    if (logError) throw logError;

    if (!logEntries || logEntries.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No log entries found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const weeklyMap = new Map<string, LogEntry[]>();
    for (const entry of logEntries) {
      const weekStart = getWeekStartDate(entry.date);
      if (!weeklyMap.has(weekStart)) {
        weeklyMap.set(weekStart, []);
      }
      weeklyMap.get(weekStart)!.push(entry);
    }

    const sortedWeeks = Array.from(weeklyMap.keys()).sort();
    const weeklyLoads: number[] = [];
    const derivedMetrics = [];

    for (const [idx, weekStart] of sortedWeeks.entries()) {
      const entries = weeklyMap.get(weekStart)!;

      const totalKm = entries.reduce((sum, e) => sum + e.km, 0);
      const totalDuration = entries.reduce((sum, e) => sum + (e.duration_min || 0), 0);
      const entriesWithHR = entries.filter(e => e.hr_avg);
      const avgHr = entriesWithHR.length > 0
        ? entriesWithHR.reduce((sum, e) => sum + e.hr_avg!, 0) / entriesWithHR.length
        : null;

      const entriesWithPace = entries.filter(e => e.duration_min && e.km > 0);
      const avgPace = entriesWithPace.length > 0
        ? entriesWithPace.reduce((sum, e) => sum + (e.duration_min! / e.km), 0) / entriesWithPace.length
        : null;

      const longRunKm = Math.max(...entries.map(e => e.km), 0);
      const elevationGain = entries.reduce((sum, e) => sum + (e.elevation_gain || 0), 0);

      const acuteLoad = totalKm;
      weeklyLoads.push(acuteLoad);

      let chronicLoad = null;
      let acwr = null;
      if (idx >= 4) {
        chronicLoad = (weeklyLoads[idx-1] + weeklyLoads[idx-2] + weeklyLoads[idx-3] + weeklyLoads[idx-4]) / 4;
        if (chronicLoad > 0) {
          acwr = acuteLoad / chronicLoad;
        }
      }

      const efficiencyScore = avgHr && avgPace ? avgHr / avgPace : null;
      const fatigueIndex = calculateFatigueIndex(totalKm, avgHr, entries.length, acwr);

      const paces = entriesWithPace.map(e => e.duration_min! / e.km);
      const monotony = calculateMonotony(paces);
      const strain = totalKm * monotony;

      const qualitySessions = entries.filter(e =>
        e.hr_avg && e.hr_avg > 160 && e.km >= 5
      ).length;

      derivedMetrics.push({
        user_id: user.id,
        week_start_date: weekStart,
        total_distance_km: totalKm,
        total_duration_min: totalDuration,
        avg_hr: avgHr,
        avg_pace: avgPace,
        long_run_km: longRunKm,
        acute_load: acuteLoad,
        chronic_load: chronicLoad,
        acwr: acwr,
        efficiency_score: efficiencyScore,
        fatigue_index: fatigueIndex,
        hr_drift_pct: null,
        cadence_avg: null,
        monotony: monotony,
        strain: strain,
        elevation_gain_m: elevationGain,
        run_count: entries.length,
        quality_sessions: qualitySessions,
        metadata: {},
      });
    }

    const { error: upsertError } = await supabase
      .from('derived_metrics_weekly')
      .upsert(derivedMetrics, { onConflict: 'user_id,week_start_date' });

    if (upsertError) throw upsertError;

    const computationDuration = Date.now() - startTime;

    await supabase.from('metric_computation_log').insert([{
      user_id: user.id,
      computation_type: 'weekly',
      status: 'success',
      records_processed: logEntries.length,
      computation_duration_ms: computationDuration,
      triggered_by: 'manual',
    }]);

    console.log(`[derive-weekly-metrics] Completed ${derivedMetrics.length} weeks in ${computationDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        weeksProcessed: derivedMetrics.length,
        computationDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[derive-weekly-metrics] Error:", error);

    let errorMessage = "Unknown error";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    console.error("[derive-weekly-metrics] Message:", errorMessage);
    console.error("[derive-weekly-metrics] Details:", errorDetails);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});