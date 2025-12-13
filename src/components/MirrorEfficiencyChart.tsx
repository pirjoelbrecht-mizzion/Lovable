import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';
import type { LogEntry } from '@/types';

interface MirrorEfficiencyChartProps {
  entries: LogEntry[];
  timeRange: string;
}

function calculateEfficiency(entry: LogEntry): number | null {
  if (!entry.hrAvg || !entry.km || !entry.durationMin) return null;
  const paceMinPerKm = entry.durationMin / entry.km;
  return entry.hrAvg / paceMinPerKm;
}

function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  data.forEach(point => {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export default function MirrorEfficiencyChart({ entries, timeRange }: MirrorEfficiencyChartProps) {
  const { chartData, baseline, trend, trendPercent, recommendation } = useMemo(() => {
    const validEntries = entries
      .filter(e => e.hrAvg && e.km && e.durationMin)
      .map((e, idx) => {
        const eff = calculateEfficiency(e);
        const paceMinPerKm = e.durationMin! / e.km;
        return {
          date: e.dateISO,
          hr: e.hrAvg!,
          efficiency: eff,
          pace: paceMinPerKm,
          index: idx,
          label: `${e.km.toFixed(1)}km @ ${Math.floor(paceMinPerKm)}:${String(Math.round((paceMinPerKm % 1) * 60)).padStart(2, '0')}/km`,
        };
      })
      .filter(e => e.efficiency !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (validEntries.length === 0) {
      return { chartData: [], baseline: 0, trend: 'stable' as const, trendPercent: 0, recommendation: '' };
    }

    const regressionData = validEntries.map((e, idx) => ({ x: idx, y: e.hr }));
    const { slope } = linearRegression(regressionData);

    const avgHR = validEntries.reduce((sum, e) => sum + e.hr, 0) / validEntries.length;

    let trendType: 'improving' | 'declining' | 'stable';
    const slopeThreshold = 0.1;

    if (slope < -slopeThreshold) {
      trendType = 'improving';
    } else if (slope > slopeThreshold) {
      trendType = 'declining';
    } else {
      trendType = 'stable';
    }

    const percentChange = Math.abs((slope * validEntries.length) / avgHR * 100);

    let rec = '';
    if (trendType === 'declining') {
      rec = 'Efficiency is declining by ' + percentChange.toFixed(0) + '%. Check hydration, nutrition, and consider adding easy aerobic base work.';
    } else if (trendType === 'improving') {
      rec = 'Your efficiency is trending upward by ' + percentChange.toFixed(0) + '% (week). Aerobic adaptations are progressing well.';
    } else {
      rec = 'Efficiency is stable. Continue current training approach while monitoring for signs of improvement or fatigue.';
    }

    return {
      chartData: validEntries,
      baseline: parseFloat(avgHR.toFixed(1)),
      trend: trendType,
      trendPercent: parseFloat(percentChange.toFixed(1)),
      recommendation: rec,
    };
  }, [entries]);

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Activity style={{ width: '64px', height: '64px', color: 'rgb(148, 163, 184)', margin: '0 auto 24px', opacity: 0.5 }} />
        <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          No efficiency data available
        </p>
        <p style={{ color: 'rgb(148, 163, 184)', fontSize: '16px', lineHeight: '1.65' }}>
          Efficiency tracking requires activities with both pace and heart rate data.
        </p>
      </div>
    );
  }

  const trendColor = trend === 'improving' ? '#10b981' : trend === 'declining' ? '#ef4444' : '#eab308';
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {timeRange}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', marginBottom: '4px' }}>
            TREND
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            <TrendIcon style={{ width: '20px', height: '20px', color: trendColor }} />
            <span style={{ color: trendColor, fontSize: '16px', fontWeight: '600', textTransform: 'uppercase' }}>
              {trend}
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
          <XAxis
            type="number"
            dataKey="index"
            name="Activity"
            stroke="rgb(148, 163, 184)"
            tick={{ fill: 'rgb(148, 163, 184)', fontSize: 12 }}
            tickFormatter={(value) => `${value + 1}`}
          />
          <YAxis
            type="number"
            dataKey="hr"
            name="Heart Rate"
            unit=" bpm"
            stroke="rgb(148, 163, 184)"
            tick={{ fill: 'rgb(148, 163, 184)', fontSize: 12 }}
            domain={['dataMin - 10', 'dataMax + 10']}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      {data.label}
                    </p>
                    <p style={{ color: 'rgb(148, 163, 184)', fontSize: '13px' }}>
                      HR: {data.hr} bpm
                    </p>
                    <p style={{ color: 'rgb(148, 163, 184)', fontSize: '12px', marginTop: '4px' }}>
                      {new Date(data.date).toLocaleDateString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine
            y={baseline}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `BASELINE: ${baseline}`,
              fill: '#f59e0b',
              fontSize: 12,
              position: 'right',
            }}
          />
          <Scatter
            data={chartData}
            fill="#22d3ee"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div
        style={{
          marginTop: '32px',
          padding: '24px',
          borderRadius: '12px',
          background: 'rgba(34, 211, 238, 0.05)',
          border: '1px solid rgba(34, 211, 238, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
          <Activity style={{ width: '24px', height: '24px', color: '#22d3ee', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ color: '#22d3ee', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              AI Coach Insight: Efficiency
            </h4>
            <p style={{ color: 'rgb(226, 232, 240)', fontSize: '15px', lineHeight: '1.65', marginBottom: '12px' }}>
              {recommendation}
            </p>
            <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', lineHeight: '1.5' }}>
              <strong style={{ color: '#ffffff' }}>About Efficiency:</strong> This metric tracks your heart rate response to running pace.
              Lower HR at the same pace indicates improving aerobic efficiency and cardiovascular adaptation.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}
        >
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', marginBottom: '8px' }}>
            Average Heart Rate
          </div>
          <div style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700' }}>
            {baseline}
          </div>
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '12px' }}>bpm</div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}
        >
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', marginBottom: '8px' }}>
            Trend Change
          </div>
          <div style={{ color: trendColor, fontSize: '28px', fontWeight: '700' }}>
            {trend === 'improving' ? '-' : trend === 'declining' ? '+' : '±'}{trendPercent}%
          </div>
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '12px' }}>
            {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable'}
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}
        >
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', marginBottom: '8px' }}>
            Activities Analyzed
          </div>
          <div style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700' }}>
            {chartData.length}
          </div>
          <div style={{ color: 'rgb(148, 163, 184)', fontSize: '12px' }}>runs</div>
        </div>
      </div>
    </div>
  );
}
