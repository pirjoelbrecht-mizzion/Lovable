import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { WeeklyLoad } from '@/utils/trailLoad';

interface Props {
  data: WeeklyLoad[];
}

export default function MirrorWeeklyChart({ data }: Props) {
  const getBarColor = (entry: WeeklyLoad) => {
    if (entry.overCombined || entry.overDist || entry.overVert) {
      return '#ef4444';
    }
    if (entry.combinedChangePercent !== undefined && entry.combinedChangePercent > 5) {
      return '#f97316';
    }
    return '#8ee6a1';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const d = payload[0].payload as WeeklyLoad;

    return (
      <div
        style={{
          background: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid var(--neon-cyan)',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: 8 }}>
          {d.week}
        </div>
        <div style={{ color: '#cbd5e1', marginBottom: 4 }}>
          Distance: <span style={{ color: '#8ee6a1' }}>{d.distance.toFixed(1)} km</span>
        </div>
        <div style={{ color: '#cbd5e1', marginBottom: 4 }}>
          Vertical: <span style={{ color: '#ff9b50' }}>{d.vertical.toFixed(0)} m</span>
        </div>
        <div style={{ color: '#cbd5e1' }}>
          Combined Load: <span style={{ color: '#ff76ac' }}>{d.combinedLoad.toFixed(1)} km-eq</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mirror-chart-legend">
        <div className="mirror-legend-item">
          <span className="mirror-legend-line cyan" />
          <span>Combined Load (km-eq)</span>
        </div>
        <div className="mirror-legend-item">
          <span className="mirror-legend-line orange" />
          <span>Distance (m) - Vertical Gain (m)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
          <XAxis
            dataKey="week"
            stroke="rgba(255, 255, 255, 0.55)"
            style={{ fontSize: 12, letterSpacing: '0.05em' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(255, 255, 255, 0.55)"
            style={{ fontSize: 12, letterSpacing: '0.05em' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(255, 255, 255, 0.55)"
            style={{ fontSize: 12, letterSpacing: '0.05em' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} m`}
          />
          <Tooltip content={<CustomTooltip />} />

          <Bar
            yAxisId="left"
            dataKey="distance"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Bar>

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="vertical"
            stroke="#ff9b50"
            strokeWidth={2.5}
            dot={{
              r: 5,
              stroke: '#ff9b50',
              strokeWidth: 2,
              fill: '#fff',
            }}
            activeDot={{
              r: 7,
              stroke: '#ff9b50',
              strokeWidth: 2,
              fill: '#fff',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
