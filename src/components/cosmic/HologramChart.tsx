import React from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface HologramChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  color?: string;
  referenceLines?: Array<{ y: number; label: string; color?: string }>;
  height?: number;
}

export function HologramChart({
  data,
  dataKey,
  xAxisKey = 'time',
  title,
  color = 'var(--neon-orange)',
  referenceLines = [],
  height = 300,
}: HologramChartProps) {
  return (
    <div className="hologram-chart-wrapper">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="hologram-chart-container">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.15)"
              vertical={false}
            />
            <XAxis
              dataKey={xAxisKey}
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(11, 11, 18, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text)',
                backdropFilter: 'blur(12px)',
              }}
              labelStyle={{ color: 'var(--muted)' }}
            />
            {referenceLines.map((line, idx) => (
              <ReferenceLine
                key={idx}
                y={line.y}
                stroke={line.color || 'var(--neon-cyan)'}
                strokeDasharray="4 4"
                opacity={0.5}
                label={{
                  value: line.label,
                  fill: line.color || 'var(--neon-cyan)',
                  fontSize: 11,
                  position: 'right',
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={false}
              className="animate-chart-glow"
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .hologram-chart-wrapper {
          width: 100%;
        }

        .chart-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .hologram-chart-container {
          background: rgba(11, 11, 18, 0.5);
          backdrop-filter: blur(12px);
          border: 1px solid var(--hologram-border);
          border-radius: 16px;
          padding: 24px;
        }

        @media (max-width: 768px) {
          .hologram-chart-container {
            padding: 16px;
          }

          .chart-title {
            font-size: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-chart-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
