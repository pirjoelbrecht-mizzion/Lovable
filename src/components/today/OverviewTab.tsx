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
    <div className="p-5 space-y-4 pb-8" style={{ color: '#f9fafb' }}>
      <div
        className="p-5 rounded-2xl shadow-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #252628 0%, #2a2b2d 100%)',
          borderLeft: `4px solid ${readinessColor}`,
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="mb-1">
              <h1 className="text-2xl font-bold" style={{ color: '#f9fafb' }}>
                {workoutData.title}
              </h1>
            </div>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              {workoutData.type}{workoutData.isAdapted && ' • ADAPTED'}
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-bold shadow-lg" style={{ backgroundColor: '#22c55e', color: '#000' }}>
            TODAY
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCard icon="⏱️" label="Duration" value={workoutData.duration} />
          <MetricCard icon="📏" label="Distance" value={workoutData.distance} />
          <MetricCard icon="🏃" label="Pace" value={workoutData.pace} />
        </div>

        {readiness && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#1a1b1e' }}>
            <div className="text-3xl">⚡</div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold" style={{ color: readinessColor }}>
                  {readiness.score}
                </span>
                <span className="text-sm uppercase font-bold tracking-wide" style={{ color: readinessColor }}>
                  {readiness.category}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${readiness.score}%`, backgroundColor: readinessColor }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {weather && (
        <WeatherSection weather={weather} onRefresh={onRefreshWeather} />
      )}

      <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
        <div className="flex items-start gap-3">
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

      <div className="flex items-center justify-between p-4 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">🔥</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
              {streak} day streak
            </p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>Keep it going!</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: '#22c55e' }}>+{xpToEarn}</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>XP</p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-5 rounded-2xl text-white font-bold text-base shadow-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-6"
        style={{
          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
          minHeight: '64px'
        }}
      >
        <span>▶️</span>
        <span>Start Workout</span>
      </button>
    </div>
  );
};

const MetricCard: FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
    <span className="text-2xl mb-1">{icon}</span>
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
    <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
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

      <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ backgroundColor: '#1a1b1e' }}>
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
        <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#22c55e' }}>Best window: {weather.bestRunWindow.start} – {weather.bestRunWindow.end}</p>
          <p className="text-xs" style={{ color: '#d1d5db' }}>
            {weather.bestRunWindow.temp}° • {weather.bestRunWindow.reason}
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
  const isOptimalTemp = hour.temp >= 16 && hour.temp <= 19;

  return (
    <div
      className="flex flex-col items-center min-w-[50px] p-2 rounded-lg"
      style={{
        backgroundColor: isOptimalTemp ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.03)',
        border: isOptimalTemp ? '1px solid rgba(96, 165, 250, 0.3)' : 'none'
      }}
    >
      <span className="text-[10px] mb-1" style={{ color: '#9ca3af' }}>{hour.time}</span>
      <span className="text-lg mb-1">{hour.icon}</span>
      <span
        className="text-xs font-bold"
        style={{ color: isOptimalTemp ? '#60a5fa' : '#f9fafb' }}
      >
        {hour.temp}°
      </span>
      {hour.windSpeed > 15 && (
        <span className="text-[10px] mt-1">💨</span>
      )}
    </div>
  );
};
