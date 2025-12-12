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
    return 'url(#tealGradient)';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const d = payload[0].payload as WeeklyLoad;

    return (
      <div
        style={{
          background: '#0b1221',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>
          {d.week}
        </div>
        <div style={{ color: 'rgb(148, 163, 184)', marginBottom: 4 }}>
          Distance: <span style={{ color: '#22d3ee' }}>{d.distance.toFixed(1)} km</span>
        </div>
        <div style={{ color: 'rgb(148, 163, 184)', marginBottom: 4 }}>
          Vertical: <span style={{ color: '#fb923c' }}>{d.vertical.toFixed(0)} m</span>
        </div>
        <div style={{ color: 'rgb(148, 163, 184)' }}>
          Combined Load: <span style={{ color: '#f43f5e' }}>{d.combinedLoad.toFixed(1)} km-eq</span>
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
          <defs>
            <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.08)" />
          <XAxis
            dataKey="week"
            stroke="rgb(148, 163, 184)"
            style={{ fontSize: 12, letterSpacing: '0.05em' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="rgb(148, 163, 184)"
            style={{ fontSize: 12, letterSpacing: '0.05em' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgb(148, 163, 184)"
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
            stroke="#fb923c"
            strokeWidth={3}
            dot={{
              r: 5,
              stroke: '#fb923c',
              strokeWidth: 2,
              fill: '#0b1221',
            }}
            activeDot={{
              r: 7,
              stroke: '#fb923c',
              strokeWidth: 2,
              fill: '#fb923c',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
