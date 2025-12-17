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
      <section style={{
        background: '#050a14',
        borderRadius: '16px',
        padding: '32px',
        border: '2px solid #22d3ee',
        boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        <h3 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '8px',
          textShadow: '0 0 10px rgba(34, 211, 238, 0.3)'
        }}>
          ACWR (Acute:Chronic Workload Ratio)
        </h3>
        <div style={{
          fontSize: '14px',
          color: '#cbd5e1',
          marginBottom: '24px'
        }}>
          {dateRangeLabel}
        </div>
        <div style={{
          padding: '48px',
          borderRadius: 12,
          textAlign: 'center',
          border: '2px solid rgba(34, 211, 238, 0.3)',
          background: 'rgba(34, 211, 238, 0.05)',
        }}>
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" style={{ margin: '0 auto 32px', opacity: 0.7, filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.4))' }}>
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
          <p style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            No training data available
          </p>
          <p style={{
            color: '#cbd5e1',
            fontSize: '16px',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            ACWR requires at least 4 weeks of consistent training data to calculate your acute vs chronic workload ratio. Log your runs regularly to see your workload trends and injury risk insights.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{
      background: '#050a14',
      borderRadius: '16px',
      padding: '32px',
      border: '2px solid #22d3ee',
      boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '8px',
            textShadow: '0 0 10px rgba(34, 211, 238, 0.3)'
          }}>
            ACWR (Acute:Chronic Workload Ratio)
          </h3>
          <div style={{
            fontSize: '14px',
            color: '#cbd5e1',
            marginBottom: '16px'
          }}>
            {dateRangeLabel} • Last {chartData.length} weeks
          </div>
        </div>
        {currentACWR !== null && (
          <div style={{
            padding: "10px 20px",
            borderRadius: '8px',
            background: 'rgba(34, 211, 238, 0.15)',
            border: '2px solid #22d3ee',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#ffffff',
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)'
          }}>
            Current: {currentACWR.toFixed(2)} {trendEmoji}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 30, right: 100, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="0" stroke="rgba(71, 85, 105, 0.4)" horizontal={true} vertical={false} />
          <XAxis
            dataKey="weekStart"
            stroke="rgba(148, 163, 184, 0.6)"
            style={{ fontSize: 13, fill: '#e2e8f0', fontWeight: '500' }}
            angle={-45}
            textAnchor="end"
            height={60}
            tickLine={false}
            axisLine={{ stroke: 'rgba(71, 85, 105, 0.5)', strokeWidth: 1 }}
          />
          <YAxis
            domain={[0, 2]}
            ticks={[0, 0.5, 1.0, 1.5, 2.0]}
            stroke="rgba(148, 163, 184, 0.6)"
            style={{ fontSize: 13, fill: '#e2e8f0', fontWeight: '500' }}
            tickLine={false}
            axisLine={false}
          />

          <ReferenceArea
            y1={0}
            y2={universalSweetMin}
            fill="rgba(34, 211, 238, 0.05)"
            fillOpacity={1}
            strokeOpacity={0}
          />
          <ReferenceArea
            y1={universalSweetMin}
            y2={universalSweetMax}
            fill="rgba(34, 211, 238, 0.08)"
            fillOpacity={1}
            strokeOpacity={0}
          />
          <ReferenceArea
            y1={universalSweetMax}
            y2={cautionMax}
            fill="rgba(249, 115, 22, 0.1)"
            fillOpacity={1}
            strokeOpacity={0}
          />
          <ReferenceArea
            y1={cautionMax}
            y2={riskMax}
            fill="rgba(239, 68, 68, 0.12)"
            fillOpacity={1}
            strokeOpacity={0}
          />

          <ReferenceLine
            y={universalSweetMin}
            stroke="#22d3ee"
            strokeWidth={2}
            strokeDasharray="0"
            label={{ value: 'Sweet Spot', position: 'right', fill: '#22d3ee', fontSize: 14, fontWeight: 700 }}
          />

          <ReferenceLine
            y={universalSweetMax}
            stroke="#F97316"
            strokeWidth={2}
            strokeDasharray="0"
            label={{ value: 'Caution', position: 'right', fill: '#F97316', fontSize: 14, fontWeight: 700 }}
          />

          <ReferenceLine
            y={cautionMax}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="0"
            label={{ value: 'High Risk', position: 'insideTopRight', fill: '#ef4444', fontSize: 14, fontWeight: 700 }}
          />

          {showPersonalZone && (
            <ReferenceArea
              y1={personalMin}
              y2={personalMax}
              fill="rgba(34, 211, 238, 0.15)"
              fillOpacity={1}
              stroke="#22d3ee"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}

          <Tooltip
            contentStyle={{
              background: "rgba(5, 10, 20, 0.95)",
              border: "2px solid #22d3ee",
              borderRadius: 12,
              fontSize: 14,
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
              padding: '16px',
            }}
            labelStyle={{ color: "#ffffff", fontWeight: 'bold', marginBottom: '8px' }}
            itemStyle={{ color: "#22d3ee" }}
            formatter={(value: number | null, name: string) => {
              if (value === null) return ['N/A', 'ACWR'];
              if (name === 'acwrDisplay') {
                const point = chartData.find(d => d.acwrDisplay === value);
                const rawValue = point?.acwr ?? value;
                return [<span style={{ color: '#F97316', fontWeight: 'bold' }}>{rawValue.toFixed(2)}</span>, 'ACWR'];
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
            stroke="#F97316"
            strokeWidth={4}
            dot={{
              r: 6,
              fill: '#F97316',
              stroke: '#ffffff',
              strokeWidth: 2,
            }}
            activeDot={{
              r: 8,
              fill: '#F97316',
              stroke: '#ffffff',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.8))',
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {feedback && (
        <div style={{
          marginTop: 24,
          padding: '20px',
          background: 'rgba(34, 211, 238, 0.05)',
          borderRadius: 12,
          border: '2px solid rgba(34, 211, 238, 0.3)',
        }}>
          <div style={{
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#cbd5e1',
            fontWeight: '500'
          }}>
            {feedback}
          </div>
          {trend !== 'stable' && (
            <div style={{
              fontSize: 14,
              marginTop: 12,
              color: '#94a3b8'
            }}>
              Trend: Your ACWR is {trendText} over the last 4 weeks.
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: 20 }}>
          <div style={{ marginTop: 4 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{
              color: '#22d3ee',
              fontWeight: 'bold',
              fontSize: '20px',
              marginBottom: '16px',
              textShadow: '0 0 8px rgba(34, 211, 238, 0.4)'
            }}>
              {showPersonalZone ? 'AI Coach Insight: Personalized Workload Zone' : 'AI Coach Insight: Workload Sweet Spot'}
            </h4>
            <p style={{
              color: '#cbd5e1',
              fontSize: '16px',
              lineHeight: 1.6,
              marginBottom: '16px'
            }}>
              {showPersonalZone ? (
                <>
                  Your ACWR is {currentACWR?.toFixed(2)} — within your personalized optimal zone ({personalMin.toFixed(1)}-{personalMax.toFixed(1)}). This zone has been adapted based on your training history and load patterns.
                </>
              ) : (
                <>
                  Your ACWR is {currentACWR?.toFixed(2)} — {zone === 'sweet-spot' ? 'within the optimal zone!' : zone === 'caution' ? 'in the caution zone.' : 'outside the optimal zone.'} Your current load ({currentMetric?.totalDistanceKm.toFixed(1)} km) promotes adaptation while minimizing injury risk.
                </>
              )}
            </p>
            <button
              onClick={() => {}}
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#22d3ee',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#67e8f9'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#22d3ee'}
            >
              What is ACWR? →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
