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
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: '#fff',
          margin: 0,
        }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ width: 20, height: 3, background: '#FF5C7A', borderRadius: 2 }} />
            <span>Target Pace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ width: 20, height: 2, background: '#FFB74D', borderRadius: 2 }} />
            <span>Target HR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ width: 20, height: 2, background: 'rgba(255, 92, 122, 0.4)', borderRadius: 2 }} />
            <span>Average Pace</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" opacity={0.5} />

          <XAxis
            dataKey="distance"
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: 11 }}
            tick={{ fill: 'rgba(255,255,255,0.5)' }}
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />

          <YAxis
            yAxisId="pace"
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            reversed
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: 11 }}
            tick={{ fill: 'rgba(255,255,255,0.5)' }}
            tickFormatter={(value) => formatPace(value)}
            label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />

          <YAxis
            yAxisId="hr"
            orientation="right"
            domain={[100, 200]}
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: 11 }}
            tick={{ fill: 'rgba(255,255,255,0.5)' }}
            label={{ value: 'HR (bpm)', angle: 90, position: 'insideRight', fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />

          <ReferenceLine
            yAxisId="pace"
            y={avgPace}
            stroke="#FF5C7A"
            strokeDasharray="5 5"
            opacity={0.4}
            label={{ value: `Avg: ${formatPace(avgPace)}`, fill: '#FF5C7A', fontSize: 10 }}
          />

          <Tooltip
            contentStyle={{
              background: 'rgba(22, 24, 41, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'pace') return [formatPace(value), 'Target Pace'];
              if (name === 'hr') return [value ? `${value} bpm` : 'N/A', 'Target HR'];
              return [value, name];
            }}
            labelStyle={{ color: '#fff' }}
            labelFormatter={(label) => `${label} km`}
          />

          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            stroke="#FF5C7A"
            strokeWidth={3}
            dot={{ fill: '#FF5C7A', r: 4, strokeWidth: 2, stroke: 'rgba(255, 92, 122, 0.3)' }}
            activeDot={{ r: 6, fill: '#FF5C7A', stroke: '#fff', strokeWidth: 2 }}
            name="pace"
          />

          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke="#FFB74D"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ fill: '#FFB74D', r: 3 }}
            activeDot={{ r: 5, fill: '#FFB74D', stroke: '#fff', strokeWidth: 2 }}
            name="hr"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
