import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { PacingSegment } from '@/types/pacing';
import { formatPace } from '@/types/pacing';

interface PacingChartProps {
  segments: PacingSegment[];
  title?: string;
}

export default function PacingChart({ segments, title = 'Pacing Strategy' }: PacingChartProps) {
  const chartData = segments.map((segment, idx) => ({
    distance: segment.distanceKm,
    pace: segment.targetPace,
    hr: segment.targetHR || null,
    paceLabel: formatPace(segment.targetPace),
  }));

  const avgPace = segments.reduce((sum, s) => sum + s.targetPace, 0) / segments.length;

  return (
    <div className="card">
      <h3 className="h2" style={{ marginBottom: 16 }}>{title}</h3>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.3} />

          <XAxis
            dataKey="distance"
            stroke="var(--muted)"
            style={{ fontSize: 12 }}
            tick={{ fill: 'var(--muted)' }}
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5, fill: 'var(--muted)' }}
          />

          <YAxis
            yAxisId="pace"
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            reversed
            stroke="var(--muted)"
            style={{ fontSize: 12 }}
            tick={{ fill: 'var(--muted)' }}
            tickFormatter={(value) => formatPace(value)}
            label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft', fill: 'var(--muted)' }}
          />

          <YAxis
            yAxisId="hr"
            orientation="right"
            domain={[100, 200]}
            stroke="var(--muted)"
            style={{ fontSize: 12 }}
            tick={{ fill: 'var(--muted)' }}
            label={{ value: 'HR (bpm)', angle: 90, position: 'insideRight', fill: 'var(--muted)' }}
          />

          <ReferenceLine
            yAxisId="pace"
            y={avgPace}
            stroke="var(--brand)"
            strokeDasharray="5 5"
            opacity={0.4}
            label={{ value: `Avg: ${formatPace(avgPace)}`, fill: 'var(--brand)', fontSize: 11 }}
          />

          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any, name: string) => {
              if (name === 'pace') return [formatPace(value), 'Target Pace'];
              if (name === 'hr') return [value ? `${value} bpm` : 'N/A', 'Target HR'];
              return [value, name];
            }}
            labelStyle={{ color: 'var(--text)' }}
            labelFormatter={(label) => `${label} km`}
          />

          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            stroke="#46E7B1"
            strokeWidth={3}
            dot={{ fill: '#46E7B1', r: 4 }}
            activeDot={{ r: 6 }}
            name="pace"
          />

          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ fill: '#3b82f6', r: 3 }}
            activeDot={{ r: 5 }}
            name="hr"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="row" style={{ gap: 20, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div className="row small" style={{ gap: 6, alignItems: 'center' }}>
          <div style={{ width: 16, height: 3, background: '#46E7B1', borderRadius: 2 }} />
          <span>Target Pace</span>
        </div>
        <div className="row small" style={{ gap: 6, alignItems: 'center' }}>
          <div style={{ width: 16, height: 2, background: '#3b82f6', borderRadius: 2 }} />
          <span>Target HR</span>
        </div>
        <div className="row small" style={{ gap: 6, alignItems: 'center' }}>
          <div style={{ width: 16, height: 2, background: 'var(--brand)', borderRadius: 2, opacity: 0.4 }} />
          <span>Average Pace</span>
        </div>
      </div>
    </div>
  );
}
