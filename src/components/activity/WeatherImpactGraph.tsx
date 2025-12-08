import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeatherDataPoint {
  stream_index: number;
  temperature_c: number;
  humidity_percent: number;
  heat_index_c: number;
  elevation_m: number;
}

interface WeatherImpactGraphProps {
  weatherData: WeatherDataPoint[];
  distance_km: number;
  duration_minutes: number;
}

export function WeatherImpactGraph({ weatherData, distance_km, duration_minutes }: WeatherImpactGraphProps) {
  if (weatherData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
        No weather data available
      </div>
    );
  }

  const chartData = weatherData.map((point, index) => {
    const progress = index / weatherData.length;
    const km = distance_km * progress;
    const minutes = duration_minutes * progress;

    return {
      index,
      km: parseFloat(km.toFixed(1)),
      time: `${Math.floor(minutes / 60)}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`,
      temperature: parseFloat(point.temperature_c.toFixed(1)),
      humidity: parseFloat(point.humidity_percent.toFixed(0)),
      heat_index: parseFloat(point.heat_index_c.toFixed(1)),
      elevation: parseFloat(point.elevation_m.toFixed(0))
    };
  });

  // Sample data if too many points (display every Nth point)
  const sampledData = chartData.length > 200
    ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 200) === 0)
    : chartData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">
            {data.km} km ({data.time})
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Temperature: {data.temperature}°C
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Humidity: {data.humidity}%
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Heat Index: {data.heat_index}°C
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Elevation: {data.elevation}m
          </p>
        </div>
      );
    }
    return null;
  };

  const maxHeatIndex = Math.max(...chartData.map(d => d.heat_index));
  const showDangerZone = maxHeatIndex > 32;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Environmental Conditions
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={sampledData}>
          <defs>
            <linearGradient id="heatIndexGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FF6B6B" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="km"
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
            stroke="#6B7280"
            className="dark:stroke-gray-400"
            tick={{ fill: '#6B7280' }}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            stroke="#6B7280"
            className="dark:stroke-gray-400"
            tick={{ fill: '#6B7280' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight' }}
            stroke="#6B7280"
            className="dark:stroke-gray-400"
            tick={{ fill: '#6B7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />

          {showDangerZone && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="heat_index"
              stroke="none"
              fill="url(#heatIndexGradient)"
              name="Heat Index Zone"
            />
          )}

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="#F97316"
            strokeWidth={2}
            dot={false}
            name="Temperature (°C)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="humidity"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Humidity (%)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {showDangerZone && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <span className="font-semibold">Heat Stress Detected:</span> Conditions reached caution or danger levels during this activity.
            Shaded areas indicate periods of elevated heat index.
          </p>
        </div>
      )}
    </div>
  );
}
