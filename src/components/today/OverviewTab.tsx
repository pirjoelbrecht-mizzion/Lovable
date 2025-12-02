import { FC } from 'react';
import type { EnhancedWeatherData } from '@/services/realtimeWeather';

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
    <div className="p-4 space-y-4 pb-8" style={{ color: '#e5e7eb' }}>
      <div
        className="p-6 rounded-2xl shadow-elevated relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #16171a 0%, #1a1b1f 100%)',
          borderLeft: `4px solid ${readinessColor}`,
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.title}
              </h1>
              {workoutData.isAdapted && (
                <span className="text-xs bg-primary-light/20 text-primary-light dark:bg-primary-dark/20 dark:text-primary-dark px-2 py-0.5 rounded-full font-medium">
                  AI
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: '#9ca3af' }}>{workoutData.type}</p>
          </div>
          <span className="text-xs bg-success text-black px-3 py-1.5 rounded-full font-bold shadow-lg">
            TODAY
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCard icon="⏱️" label="Duration" value={workoutData.duration} />
          <MetricCard icon="📏" label="Distance" value={workoutData.distance} />
          <MetricCard icon="🏃" label="Pace" value={workoutData.pace} />
        </div>

        {readiness && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface1-light/50 dark:bg-surface1-dark/50">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: readinessColor }}
              >
                {readiness.score}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#f9fafb' }}>
                  Readiness Score
                </p>
                <p className="text-[10px] capitalize" style={{ color: '#9ca3af' }}>
                  {readiness.category}
                </p>
              </div>
            </div>
            {daysToRace !== null && (
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: '#f9fafb' }}>
                  {daysToRace}
                </p>
                <p className="text-[10px]" style={{ color: '#9ca3af' }}>Days to race</p>
              </div>
            )}
          </div>
        )}
      </div>

      {weather && (
        <WeatherSection weather={weather} onRefresh={onRefreshWeather} />
      )}

      <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">💬</div>
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#f9fafb' }}>
              Coach's Message
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
              {coachMessage}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-surface2-light dark:bg-surface2-dark">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🔥</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
              {streak} day streak
            </p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>+{xpToEarn} XP to earn</p>
          </div>
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-primary-light dark:bg-primary-dark text-white font-bold text-base shadow-elevated hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        style={{ minHeight: '56px' }}
      >
        <span>▶️</span>
        <span>Start Workout</span>
      </button>
    </div>
  );
};

const MetricCard: FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center p-3 rounded-xl bg-surface2-light/50 dark:bg-surface2-dark/50">
    <span className="text-lg mb-1">{icon}</span>
    <span className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#9ca3af' }}>
      {label}
    </span>
    <span className="text-sm font-bold" style={{ color: '#f9fafb' }}>{value}</span>
  </div>
);

const WeatherSection: FC<{ weather: EnhancedWeatherData; onRefresh: () => void }> = ({
  weather,
  onRefresh,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
          Today's Weather
        </h3>
        <button
          onClick={onRefresh}
          className="text-xs hover:underline flex items-center gap-1"
          style={{ color: '#60a5fa' }}
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-surface2-light/50 dark:bg-surface2-dark/50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{weather.current.icon}</span>
          <div>
            <p className="text-2xl font-bold" style={{ color: '#f9fafb' }}>
              {weather.current.temp}°
            </p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              Feels like {weather.current.feelsLike}°
            </p>
          </div>
        </div>
        <div className="text-right text-xs" style={{ color: '#9ca3af' }}>
          <p>{weather.current.conditions}</p>
          <p>💨 {weather.current.wind} km/h</p>
          <p>💧 {weather.current.humidity}%</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs" style={{ color: '#9ca3af' }}>
        <div className="flex items-center gap-1">
          <span>🌅</span>
          <span>{weather.sun.sunrise}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>☀️ UV {weather.uvIndex}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🌇</span>
          <span>{weather.sun.sunset}</span>
        </div>
      </div>

      {weather.bestRunWindow && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/20 mb-3">
          <p className="text-xs font-semibold mb-1" style={{ color: '#22c55e' }}>Best Run Window</p>
          <p className="text-xs" style={{ color: '#d1d5db' }}>
            {weather.bestRunWindow.start} - {weather.bestRunWindow.end} • {weather.bestRunWindow.temp}° •{' '}
            {weather.bestRunWindow.reason}
          </p>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
          {weather.hours.slice(0, 12).map((hour, idx) => (
            <HourlyWeatherCard key={idx} hour={hour} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-center mt-2" style={{ color: '#9ca3af' }}>
        Updated {new Date(weather.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
};

const HourlyWeatherCard: FC<{ hour: any }> = ({ hour }) => {
  const getTempColor = (temp: number) => {
    if (temp < 10) return '#60a5fa';
    if (temp < 20) return '#34d399';
    if (temp < 25) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="flex flex-col items-center min-w-[50px] p-2 rounded-lg bg-surface2-light/30 dark:bg-surface2-dark/30">
      <span className="text-[10px] mb-1" style={{ color: '#9ca3af' }}>{hour.time}</span>
      <span className="text-lg mb-1">{hour.icon}</span>
      <span
        className="text-xs font-bold"
        style={{ color: getTempColor(hour.temp) }}
      >
        {hour.temp}°
      </span>
      {hour.windSpeed > 15 && (
        <span className="text-[10px] mt-1">💨</span>
      )}
    </div>
  );
};
