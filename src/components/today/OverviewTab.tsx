import { FC, useState } from 'react';
import type { EnhancedWeatherData } from '@/services/realtimeWeather';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface Props {
  workoutData: {
    title: string;
    duration: string;
    distance: string;
    pace: string;
    type: string;
    isAdapted: boolean;
    durationMin?: number;
  };
  readiness: {
    score: number;
    category: 'high' | 'moderate' | 'low';
  } | null;
  weather: EnhancedWeatherData | null;
  streak: number;
  xpToEarn: number;
  daysToRace: number | null;
  coachMessage: string;
  onStart: () => void;
  onRefreshWeather: () => void;
}

export const OverviewTab: FC<Props> = ({
  workoutData,
  readiness,
  weather,
  streak,
  xpToEarn,
  daysToRace,
  coachMessage,
  onStart,
}) => {
  const readinessColor = readiness
    ? readiness.category === 'high'
      ? '#22c55e'
      : readiness.category === 'moderate'
      ? '#eab308'
      : '#ef4444'
    : '#6b7280';

  return (
    <div className="relative" style={{ backgroundColor: '#1a1b1f', minHeight: '100vh' }}>
      {/* Coach Message */}
      <div
        className="px-4 py-3 flex items-start gap-2"
        style={{ backgroundColor: '#2a2b2f', borderBottom: '1px solid #374151' }}
      >
        <div className="text-lg">💬</div>
        <div className="flex-1">
          <p className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>
            {coachMessage}
          </p>
        </div>
      </div>

      {/* Streak */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: '#1a1b1f', borderBottom: '1px solid #374151' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
            {streak} day streak
          </span>
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            Keep it going!
          </span>
        </div>
        <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
          +{xpToEarn} XP
        </span>
      </div>

      {/* Workout Card */}
      <div className="p-4">
        <div
          className="p-4 rounded-xl relative"
          style={{
            background: 'linear-gradient(135deg, #1e3a2f 0%, #1a2e26 100%)',
            border: '2px solid #22c55e',
          }}
        >
          {daysToRace !== null && (
            <div
              className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold"
              style={{ backgroundColor: '#22c55e', color: '#000' }}
            >
              {daysToRace} days
            </div>
          )}

          <h1 className="text-xl font-bold mb-0.5" style={{ color: '#f9fafb' }}>
            {workoutData.title}
          </h1>
          <p className="text-[11px] uppercase tracking-wide mb-3" style={{ color: '#9ca3af' }}>
            {workoutData.type} • {workoutData.isAdapted ? 'ADAPTED' : 'STANDARD'}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div
              className="text-center py-2 px-1 rounded"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>
                DURATION
              </div>
              <div className="text-base font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.duration}
              </div>
            </div>
            <div
              className="text-center py-2 px-1 rounded"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>
                DISTANCE
              </div>
              <div className="text-base font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.distance}
              </div>
            </div>
            <div
              className="text-center py-2 px-1 rounded"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>
                PACE
              </div>
              <div className="text-base font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.pace}
              </div>
            </div>
          </div>

          {readiness && (
            <div
              className="p-2.5 rounded flex items-center gap-2"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-xl">⚡</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: '#f9fafb' }}>
                    Readiness
                  </span>
                  <span className="text-base font-bold" style={{ color: readinessColor }}>
                    {readiness.score}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${readiness.score}%`, backgroundColor: readinessColor }}
                  />
                </div>
                <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: readinessColor }}>
                  {readiness.category}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weather */}
      {weather && <WeatherSection weather={weather} />}

      {/* Start Button */}
      <div className="px-4 py-3 mt-4">
        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
            color: '#fff',
          }}
        >
          <span className="text-lg">▶</span>
          <span>Start Workout</span>
        </button>
      </div>
    </div>
  );
};

const WeatherSection: FC<{ weather: EnhancedWeatherData }> = ({ weather }) => {
  const [expanded, setExpanded] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hours = weather.hours.slice(0, 24);

  const chartData = {
    labels: hours.map((h) => h.time.split(':')[0]),
    datasets: [
      {
        label: 'Temperature',
        data: hours.map((h) => h.temp),
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        pointBackgroundColor: '#fb923c',
        pointBorderColor: '#fb923c',
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#252628',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 6,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y}°C`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#374151',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 9 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: '#374151',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 9 },
          callback: (value: any) => `${value}°`,
        },
        position: 'right',
      },
    },
  };

  return (
    <div className="px-4 mt-2">
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#252628', border: '1px solid #374151' }}
      >
        {/* Header */}
        <div className="p-3">
          <div className="text-xs font-semibold mb-1" style={{ color: '#f9fafb' }}>
            {dateStr}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{weather.current.icon}</div>
              <div>
                <div className="text-3xl font-bold" style={{ color: '#f9fafb' }}>
                  {weather.current.temp}°
                </div>
                <div className="text-xs" style={{ color: '#9ca3af' }}>
                  H:{weather.current.high || weather.current.temp + 5}° L:
                  {weather.current.low || weather.current.temp - 5}°
                </div>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-base"
              style={{ color: '#9ca3af' }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Hourly Icons Strip */}
        <div className="px-3 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {hours.slice(0, 12).map((hour, idx) => (
              <div key={idx} className="flex flex-col items-center" style={{ minWidth: '36px' }}>
                <div className="text-[10px] mb-0.5" style={{ color: '#9ca3af' }}>
                  {hour.time.split(':')[0]}
                </div>
                <div className="text-xl mb-0.5">{hour.icon}</div>
                <div className="text-xs font-semibold" style={{ color: '#f9fafb' }}>
                  {hour.temp}°
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="px-3 pb-2" style={{ height: '140px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Best Window */}
        {weather.bestRunWindow && (
          <div className="px-3 pb-3">
            <div
              className="p-2 rounded flex items-center gap-2"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
            >
              <span className="text-xs" style={{ color: '#22c55e' }}>⏰ {weather.bestRunWindow.start}</span>
              <span className="text-[10px]" style={{ color: '#9ca3af' }}>
                Best window: {weather.bestRunWindow.start} – {weather.bestRunWindow.end}
              </span>
            </div>
            <div className="text-[10px] mt-1 px-1" style={{ color: '#9ca3af' }}>
              {weather.bestRunWindow.temp}° • Low wind • {weather.bestRunWindow.reason}
            </div>
          </div>
        )}

        {/* Details */}
        {expanded && (
          <div
            className="px-3 pb-3 pt-2 grid grid-cols-3 gap-2 text-[10px]"
            style={{ borderTop: '1px solid #374151' }}
          >
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>🌅 Sunrise</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.sun.sunrise}
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>☀️ UV {weather.uvIndex}</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                Index {weather.uvIndex}
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>🌇 Sunset</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.sun.sunset}
              </div>
            </div>
          </div>
        )}

        {/* Hourly Scroll */}
        <div className="px-3 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
            {hours.map((hour, idx) => {
              const isOptimal =
                weather.bestRunWindow &&
                parseInt(hour.time.split(':')[0]) >= parseInt(weather.bestRunWindow.start.split(':')[0]) &&
                parseInt(hour.time.split(':')[0]) <= parseInt(weather.bestRunWindow.end.split(':')[0]);

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center p-1.5 rounded"
                  style={{
                    minWidth: '46px',
                    backgroundColor: isOptimal
                      ? 'rgba(96, 165, 250, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isOptimal ? '1px solid rgba(96, 165, 250, 0.3)' : 'none',
                  }}
                >
                  <div className="text-[10px] mb-0.5" style={{ color: '#9ca3af' }}>
                    {hour.time.split(':')[0]}:00
                  </div>
                  <div className="text-base mb-0.5">{hour.icon}</div>
                  <div
                    className="text-xs font-bold"
                    style={{ color: isOptimal ? '#60a5fa' : '#f9fafb' }}
                  >
                    {hour.temp}°
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
