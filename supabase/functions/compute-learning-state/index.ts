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
}

interface WeeklyMetric {
  week_start_date: string;
  total_distance_km: number;
  avg_hr?: number;
  avg_pace?: number;
}

function calculateLinearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } | null {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    return null;
  }

  const n = xValues.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
    sumXY += xValues[i] * yValues[i];
    sumX2 += xValues[i] * xValues[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const denominator = sumX2 - n * meanX * meanX;

  if (denominator === 0) return null;

  const slope = (sumXY - n * meanX * meanY) / denominator;
  const intercept = meanY - slope * meanX;

  return { slope, intercept };
}

function calculateStatistics(values: number[]): { mean: number; stdDev: number; percentile90: number } | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const p90Index = Math.ceil(n * 0.9) - 1;
  const percentile90 = sorted[Math.max(0, Math.min(p90Index, n - 1))];

  return { mean, stdDev, percentile90 };
}

function getWeekStartDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const startTime = Date.now();
    console.log(`[compute-learning-state] Starting computation for user ${user.id}`);

    const { data: logEntries, error: logError } = await supabase
      .from('log_entries')
      .select('date, km, duration_min, hr_avg')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (logError) throw logError;

    if (!logEntries || logEntries.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Insufficient data for baseline computation (minimum 10 runs required)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const entriesWithHR = logEntries.filter(e => e.hr_avg && e.duration_min && e.km >= 3);
    const hrValues = entriesWithHR.map(e => e.hr_avg!);
    const paceValues = entriesWithHR.map(e => e.duration_min! / e.km);
    const efficiencyValues = entriesWithHR.map(e => e.hr_avg! / (e.duration_min! / e.km));

    const hrStats = hrValues.length >= 5 ? calculateStatistics(hrValues) : null;
    const paceStats = paceValues.length >= 5 ? calculateStatistics(paceValues) : null;
    const efficiencyStats = efficiencyValues.length >= 5 ? calculateStatistics(efficiencyValues) : null;

    const efficiencyTrend = efficiencyValues.length >= 5
      ? calculateLinearRegression(
          efficiencyValues.map((_, i) => i),
          efficiencyValues
        )
      : null;

    const weeklyMap = new Map<string, { km: number; count: number }>();
    for (const entry of logEntries) {
      const weekStart = getWeekStartDate(entry.date);
      if (!weeklyMap.has(weekStart)) {
        weeklyMap.set(weekStart, { km: 0, count: 0 });
      }
      const week = weeklyMap.get(weekStart)!;
      week.km += entry.km;
      week.count += 1;
    }

    const weeklyLoads = Array.from(weeklyMap.values()).map(w => w.km);
    const acwrValues: number[] = [];

    for (let i = 3; i < weeklyLoads.length; i++) {
      const acute = weeklyLoads[i];
      const chronic = (weeklyLoads[i-1] + weeklyLoads[i-2] + weeklyLoads[i-3] + weeklyLoads[i-4]) / 4;
      if (chronic > 0) {
        acwrValues.push(acute / chronic);
      }
    }

    const acwrStats = acwrValues.length >= 4 ? calculateStatistics(acwrValues) : null;

    const fatigueValues = weeklyLoads.map(km => {
      let score = 0;
      if (km > 80) score += 30;
      else if (km > 60) score += 20;
      else if (km > 40) score += 10;
      return score;
    });
    const fatigueStats = fatigueValues.length > 0 ? calculateStatistics(fatigueValues) : null;

    const learningState = {
      user_id: user.id,
      baseline_hr: hrStats?.mean ?? 140,
      baseline_pace: paceStats?.mean ?? 6.0,
      baseline_efficiency: efficiencyStats?.mean ?? 23.3,
      acwr_mean: acwrStats?.mean ?? 1.0,
      acwr_std_dev: acwrStats?.stdDev ?? 0.2,
      efficiency_trend_slope: efficiencyTrend?.slope ?? 0,
      fatigue_threshold: fatigueStats?.percentile90 ?? 70,
      hr_drift_baseline: 5.0,
      cadence_stability: 0.85,
      injury_risk_factors: {},
      computation_metadata: {
        total_runs: logEntries.length,
        runs_with_hr: entriesWithHR.length,
        weeks_analyzed: weeklyLoads.length,
        acwr_samples: acwrValues.length,
      },
      last_computed_at: new Date().toISOString(),
      data_quality_score: Math.min(1, entriesWithHR.length / Math.max(1, logEntries.length)),
    };

    const { error: upsertError } = await supabase
      .from('athlete_learning_state')
      .upsert([learningState], { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    const computationDuration = Date.now() - startTime;

    await supabase.from('metric_computation_log').insert([{
      user_id: user.id,
      computation_type: 'baseline',
      status: 'success',
      records_processed: logEntries.length,
      computation_duration_ms: computationDuration,
      triggered_by: 'manual',
    }]);

    console.log(`[compute-learning-state] Completed in ${computationDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        learningState,
        computationDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[compute-learning-state] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
