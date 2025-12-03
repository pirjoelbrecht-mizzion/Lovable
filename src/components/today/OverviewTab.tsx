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
  onRefreshWeather,
}) => {
  const readinessColor = readiness
    ? readiness.category === 'high'
      ? '#22c55e'
      : readiness.category === 'moderate'
      ? '#eab308'
      : '#ef4444'
    : '#6b7280';

  return (
    <div className="pb-24" style={{ backgroundColor: '#1a1b1f' }}>
      {/* Coach Message Banner */}
      <div
        className="px-4 py-3 flex items-start gap-3"
        style={{ backgroundColor: '#252628', borderBottom: '1px solid #374151' }}
      >
        <div className="text-2xl">💬</div>
        <div className="flex-1">
          <p className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>
            {coachMessage}
          </p>
        </div>
      </div>

      {/* Streak Banner */}
      {daysToRace !== null && (
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ backgroundColor: '#1a1b1f', borderBottom: '1px solid #374151' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
              {streak} day streak
            </span>
            <span className="text-xs" style={{ color: '#9ca3af' }}>
              Keep it going!
            </span>
          </div>
          <div className="text-sm font-bold" style={{ color: '#22c55e' }}>
            +{xpToEarn} XP
          </div>
        </div>
      )}

      {/* Workout Card */}
      <div className="px-4 pt-4">
        <div
          className="p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e3a2f 0%, #1a2e26 100%)',
            border: '1px solid #22c55e',
          }}
        >
          {/* Days to Race Badge */}
          {daysToRace !== null && (
            <div
              className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold"
              style={{ backgroundColor: '#22c55e', color: '#000' }}
            >
              {daysToRace} days
            </div>
          )}

          <div className="mb-3">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#f9fafb' }}>
              {workoutData.title}
            </h1>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              {workoutData.type} • {workoutData.isAdapted ? 'ADAPTED' : 'STANDARD'}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                DURATION
              </div>
              <div className="text-lg font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.duration}
              </div>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                DISTANCE
              </div>
              <div className="text-lg font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.distance}
              </div>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                PACE
              </div>
              <div className="text-lg font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.pace}
              </div>
            </div>
          </div>

          {/* Readiness */}
          {readiness && (
            <div
              className="p-3 rounded-lg flex items-center gap-3"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
                    Readiness
                  </span>
                  <span className="text-lg font-bold" style={{ color: readinessColor }}>
                    {readiness.score}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${readiness.score}%`, backgroundColor: readinessColor }}
                  />
                </div>
                <div className="text-xs uppercase tracking-wide mt-1" style={{ color: readinessColor }}>
                  {readiness.category}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weather Section */}
      {weather && <WeatherSection weather={weather} onRefresh={onRefreshWeather} />}

      {/* Start Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ backgroundColor: '#1a1b1f' }}>
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl font-bold text-lg shadow-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
            color: '#fff',
          }}
        >
          <span className="text-2xl">▶</span>
          <span>Start Workout</span>
        </button>
      </div>
    </div>
  );
};

const WeatherSection: FC<{ weather: EnhancedWeatherData; onRefresh: () => void }> = ({
  weather,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Get current date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Prepare hourly data for the chart
  const hours = weather.hours.slice(0, 24);
  const chartData = {
    labels: hours.map((h) => h.time),
    datasets: [
      {
        label: 'Temperature',
        data: hours.map((h) => h.temp),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#fbbf24',
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Feels Like',
        data: hours.map((h) => h.feelsLike || h.temp),
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251, 146, 60, 0.05)',
        pointBackgroundColor: '#fb923c',
        pointBorderColor: '#fb923c',
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: false,
        borderDash: [5, 5],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#252628',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 8,
        displayColors: false,
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
          font: {
            size: 10,
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: '#374151',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10,
          },
          callback: (value: any) => `${value}°`,
        },
        position: 'right',
      },
    },
  };

  return (
    <div className="px-4 mt-4">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#252628', border: '1px solid #374151' }}
      >
        {/* Weather Header */}
        <div className="p-4 pb-3">
          <div className="text-sm font-semibold mb-1" style={{ color: '#f9fafb' }}>
            {dateStr}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{weather.current.icon}</div>
              <div>
                <div className="text-4xl font-bold" style={{ color: '#f9fafb' }}>
                  {weather.current.temp}°
                </div>
                <div className="text-sm" style={{ color: '#9ca3af' }}>
                  H:{weather.current.high || weather.current.temp + 5}° L:
                  {weather.current.low || weather.current.temp - 5}°
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 rounded-lg"
              style={{ color: '#9ca3af' }}
            >
              {showDetails ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Hourly Icons */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {hours.slice(0, 12).map((hour, idx) => (
              <div key={idx} className="flex flex-col items-center min-w-[40px]">
                <div className="text-xs mb-1" style={{ color: '#9ca3af' }}>
                  {hour.time}
                </div>
                <div className="text-2xl mb-1">{hour.icon}</div>
                <div className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
                  {hour.temp}°
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temperature Graph */}
        <div className="px-4 pb-3" style={{ height: '180px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Best Run Window */}
        {weather.bestRunWindow && (
          <div className="px-4 pb-3">
            <div
              className="p-3 rounded-lg flex items-start gap-2"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                  ⏰ {weather.bestRunWindow.start}
                </span>
                <span className="text-xs" style={{ color: '#9ca3af' }}>
                  Best window: {weather.bestRunWindow.start} – {weather.bestRunWindow.end}
                </span>
              </div>
            </div>
            <div className="text-xs mt-2 px-1" style={{ color: '#9ca3af' }}>
              {weather.bestRunWindow.temp}° • {weather.bestRunWindow.reason}
            </div>
          </div>
        )}

        {/* Additional Weather Info */}
        {showDetails && (
          <div
            className="px-4 pb-4 pt-2 grid grid-cols-3 gap-3 text-xs"
            style={{ borderTop: '1px solid #374151' }}
          >
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>🌅 Sunrise</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.sun.sunrise}
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>☀️ UV</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.uvIndex}
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>🌇 Sunset</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.sun.sunset}
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>💧 Humidity</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.current.humidity}%
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>💨 Wind</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.current.wind} km/h
              </div>
            </div>
            <div className="text-center">
              <div style={{ color: '#9ca3af' }}>🌡️ Feels</div>
              <div className="font-semibold" style={{ color: '#f9fafb' }}>
                {weather.current.feelsLike}°
              </div>
            </div>
          </div>
        )}

        {/* Hourly Forecast Scroll */}
        <div className="px-4 pb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {hours.map((hour, idx) => {
              const isOptimal =
                weather.bestRunWindow &&
                hour.time >= weather.bestRunWindow.start.split(':')[0] &&
                hour.time <= weather.bestRunWindow.end.split(':')[0];

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center p-2 rounded-lg min-w-[60px]"
                  style={{
                    backgroundColor: isOptimal
                      ? 'rgba(96, 165, 250, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isOptimal ? '1px solid rgba(96, 165, 250, 0.3)' : 'none',
                  }}
                >
                  <div className="text-xs mb-1" style={{ color: '#9ca3af' }}>
                    {hour.time}
                  </div>
                  <div
                    className="text-xl mb-1"
                    style={{
                      filter: hour.time.includes(':00') ? 'none' : 'brightness(0.7)',
                    }}
                  >
                    {hour.icon}
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: isOptimal ? '#60a5fa' : '#f9fafb' }}
                  >
                    {hour.temp}°
                  </div>
                  {hour.windSpeed > 15 && (
                    <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                      💨
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
