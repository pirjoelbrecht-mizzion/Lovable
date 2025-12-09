import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HeatStressPoint {
  km: number;
  heatStress: number;
}

interface KeyEvent {
  km: number;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  icon: string;
}

interface HeatTimelineChartProps {
  data: HeatStressPoint[];
  keyEvents?: KeyEvent[];
}

export function HeatTimelineChart({ data, keyEvents = [] }: HeatTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No timeline data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {point.km.toFixed(1)} km
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Heat Stress: <span className="font-bold">{point.heatStress}/100</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getStressLevel = (value: number) => {
    if (value < 20) return 'Safe';
    if (value < 40) return 'Caution';
    if (value < 70) return 'High';
    return 'Danger';
  };

  return (
    <div className="w-full h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="heatStressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="30%" stopColor="#f97316" stopOpacity={0.6} />
              <stop offset="60%" stopColor="#eab308" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="km"
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            className="dark:stroke-gray-400"
          />
          <YAxis
            label={{ value: 'Heat Stress Index', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            className="dark:stroke-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for stress thresholds */}
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={40} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={20} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.5} />

          {/* Key event markers */}
          {keyEvents.map((event, idx) => (
            <ReferenceLine
              key={idx}
              x={event.km}
              stroke={event.severity === 'HIGH' ? '#ef4444' : event.severity === 'MODERATE' ? '#f97316' : '#22c55e'}
              strokeWidth={2}
              label={{
                value: event.icon,
                position: 'top',
                fill: '#6b7280'
              }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="heatStress"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#heatStressGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Safe (&lt;20)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Caution (20-40)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-gray-600 dark:text-gray-400">High (40-70)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Danger (70+)</span>
        </div>
      </div>
    </div>
  );
}
