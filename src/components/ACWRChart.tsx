import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend } from "recharts";
import type { AthleteBaselines } from "@/hooks/useAthleteBaselines";
import type { WeeklyMetric } from "@/hooks/useWeeklyMetrics";
import { getACWRZoneStatus, generateACWRZoneFeedback, getACWRTrendDirection } from "@/utils/acwrZones";

interface ACWRChartProps {
  weeklyMetrics: WeeklyMetric[];
  baselines: AthleteBaselines | null;
  dateRangeLabel: string;
}

export default function ACWRChart({ weeklyMetrics, baselines, dateRangeLabel }: ACWRChartProps) {
  const chartData = useMemo(() => {
    const last12Weeks = weeklyMetrics.slice(-12);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return last12Weeks.map((metric, index) => {
      const isLastWeek = index === last12Weeks.length - 1;
      const weekStart = new Date(metric.weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      const isIncomplete = isLastWeek && todayStr <= weekEndStr;

      return {
        weekStart: isIncomplete ? 'Current' : metric.weekStartDate.slice(5),
        fullDate: metric.weekStartDate,
        acwr: metric.acwr,
        acwrDisplay: metric.acwr !== null ? Math.min(2.0, metric.acwr) : null,
        isCurrentWeek: isIncomplete,
        totalKm: metric.totalDistanceKm,
      };
    });
  }, [weeklyMetrics]);

  const universalSweetMin = 0.8;
  const universalSweetMax = 1.3;
  const cautionMax = 1.5;
  const riskMax = 2.0;

  let personalMin = universalSweetMin;
  let personalMax = universalSweetMax;
  let showPersonalZone = false;

  if (baselines && baselines.dataQualityScore >= 0.6) {
    personalMin = Math.max(0.8, Math.min(baselines.acwrLowerBound, 1.2));
    personalMax = Math.min(1.5, Math.max(baselines.acwrUpperBound, 0.9));
    showPersonalZone = Math.abs(personalMin - universalSweetMin) > 0.05 || Math.abs(personalMax - universalSweetMax) > 0.05;
  }

  const currentMetric = weeklyMetrics[weeklyMetrics.length - 1];
  const currentACWR = currentMetric?.acwr ?? null;
  const acwrValues = weeklyMetrics.slice(-12).map(m => m.acwr).filter((v): v is number => v !== null);
  const trend = getACWRTrendDirection(acwrValues);

  const zone = currentACWR !== null ? getACWRZoneStatus(currentACWR, personalMin, personalMax) : null;
  const feedback = currentACWR !== null && zone && currentMetric
    ? generateACWRZoneFeedback(currentACWR, zone, currentMetric.totalDistanceKm)
    : null;

  const trendEmoji = trend === 'rising' ? '↗️' : trend === 'falling' ? '↘️' : '→';
  const trendText = trend === 'rising' ? 'rising' : trend === 'falling' ? 'declining' : 'stable';

  if (chartData.length === 0 || chartData.every(d => d.acwr === null)) {
    return (
      <section className="card">
        <h3 className="h2">ACWR (Workload Ratio)</h3>
        <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
          {dateRangeLabel}
        </div>
        <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
          Not enough weekly data to calculate ACWR. Log runs consistently for at least 4 weeks to see this chart.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 className="h2">ACWR (Acute:Chronic Workload Ratio)</h3>
          <div className="small" style={{ color: "var(--muted)" }}>
            {dateRangeLabel} • Last {chartData.length} weeks
          </div>
        </div>
        {currentACWR !== null && (
          <div style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: zone === 'sweet-spot' ? 'var(--acwr-sweet)' :
                       zone === 'caution' ? 'var(--acwr-caution)' :
                       zone === 'high-risk' || zone === 'extreme-risk' ? 'var(--acwr-risk)' :
                       'var(--card)',
            border: '1px solid var(--line)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            Current: {currentACWR.toFixed(2)} {trendEmoji}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.3} />
          <XAxis
            dataKey="weekStart"
            stroke="var(--muted)"
            style={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            domain={[0, 2]}
            ticks={[0, 0.5, 1.0, 1.5, 2.0]}
            stroke="var(--muted)"
            style={{ fontSize: 11 }}
          />

          <ReferenceArea
            y1={universalSweetMin}
            y2={universalSweetMax}
            fill="var(--acwr-sweet)"
            fillOpacity={0.15}
            strokeOpacity={0}
          />
          <ReferenceArea
            y1={universalSweetMax}
            y2={cautionMax}
            fill="var(--acwr-caution)"
            fillOpacity={0.15}
            strokeOpacity={0}
          />
          <ReferenceArea
            y1={cautionMax}
            y2={riskMax}
            fill="var(--acwr-risk)"
            fillOpacity={0.15}
            strokeOpacity={0}
          />

          {showPersonalZone && (
            <ReferenceArea
              y1={personalMin}
              y2={personalMax}
              fill="var(--acwr-personal)"
              fillOpacity={0.1}
              stroke="var(--acwr-personal-border)"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}

          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text)", fontWeight: 600 }}
            itemStyle={{ color: "var(--primary)" }}
            formatter={(value: number | null, name: string) => {
              if (value === null) return ['N/A', 'ACWR'];
              if (name === 'acwrDisplay') {
                const point = chartData.find(d => d.acwrDisplay === value);
                const rawValue = point?.acwr ?? value;
                return [rawValue.toFixed(2), 'ACWR'];
              }
              return [value.toFixed(2), name];
            }}
            labelFormatter={(label) => {
              const point = chartData.find(d => d.weekStart === label);
              return point ? `Week of ${point.fullDate}` : label;
            }}
          />

          <Line
            type="monotone"
            dataKey="acwrDisplay"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const r = payload.isCurrentWeek ? 6 : 4;
              const fill = payload.isCurrentWeek ? "var(--accent)" : "var(--primary)";
              return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="var(--card)" strokeWidth={2} />;
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 8, background: 'var(--acwr-sweet)', border: '1px solid rgba(42, 198, 113, 0.3)', borderRadius: 2 }} />
          <span>Sweet Spot (0.8-1.3)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 8, background: 'var(--acwr-caution)', border: '1px solid rgba(255, 209, 102, 0.3)', borderRadius: 2 }} />
          <span>Caution (1.3-1.5)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 8, background: 'var(--acwr-risk)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: 2 }} />
          <span>High Risk (&gt;1.5)</span>
        </div>
        {showPersonalZone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 8, background: 'var(--acwr-personal)', border: '2px dashed var(--acwr-personal-border)', borderRadius: 2 }} />
            <span>Your Zone ({personalMin.toFixed(1)}-{personalMax.toFixed(1)})</span>
          </div>
        )}
      </div>

      {feedback && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: zone === 'sweet-spot' ? 'var(--acwr-sweet)' :
                     zone === 'caution' ? 'var(--acwr-caution)' :
                     zone === 'high-risk' || zone === 'extreme-risk' ? 'var(--acwr-risk)' :
                     'var(--card)',
          borderRadius: 8,
          border: '1px solid var(--line)',
        }}>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{feedback}</div>
          {trend !== 'stable' && (
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)' }}>
              Trend: Your ACWR is {trendText} over the last 4 weeks.
            </div>
          )}
        </div>
      )}

      <details style={{ marginTop: 16, fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--primary)', userSelect: 'none' }}>
          ℹ️ What is ACWR?
        </summary>
        <div style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.6 }}>
          <p>ACWR (Acute:Chronic Workload Ratio) compares your current week's training load to your 4-week average.</p>
          <p style={{ marginTop: 8 }}>
            <strong>Sweet Spot (0.8-1.3):</strong> Optimal zone for adaptation with minimal injury risk. Continue progressive training.
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>Caution Zone (1.3-1.5):</strong> Elevated load. Monitor recovery and consider extra rest days.
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>High Risk (&gt;1.5):</strong> Rapid load increase significantly elevates injury risk. Reduce volume or add recovery.
          </p>
          <p style={{ marginTop: 8, fontSize: 11 }}>
            Note: Display capped at 2.0 for clarity. Hover over chart points to see exact values. Based on research by Gabbett (2016) and Malone et al. (2018).
          </p>
        </div>
      </details>
    </section>
  );
}
