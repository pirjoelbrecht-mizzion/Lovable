import { useState } from 'react';

export interface HourlyWeather {
  time: string;
  temp: number;
  icon: string;
  precipitation?: number;
  windSpeed?: number;
}

export interface WeatherTimelineProps {
  current: {
    temp: number;
    summary: string;
  };
  hours: HourlyWeather[];
  onHourClick?: (hour: HourlyWeather) => void;
}

export function WeatherTimelineCompact({ current, hours, onHourClick }: WeatherTimelineProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyWeather | null>(null);

  const handleHourClick = (hour: HourlyWeather) => {
    setSelectedHour(hour);
    onHourClick?.(hour);
  };

  return (
    <div className="p-4 rounded-2xl bg-surface2-light dark:bg-surface2-dark shadow-elevated">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark">
          Today's Weather
        </h3>
        <span className="text-xs text-muted-light dark:text-muted-dark">
          {current.temp}° • {current.summary}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-6 py-2">
          {hours.map((hour) => (
            <button
              key={hour.time}
              onClick={() => handleHourClick(hour)}
              className={`flex flex-col items-center min-w-[40px] transition-opacity ${
                selectedHour?.time === hour.time ? 'opacity-100' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <span className="text-[10px] text-muted-light dark:text-muted-dark mb-1">
                {hour.time}
              </span>

              <div className="relative w-5 h-5 my-1">
                {getWeatherIcon(hour.icon)}
                {hour.precipitation && hour.precipitation > 0 && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] text-blue-400">
                    💧
                  </span>
                )}
              </div>

              <span className="text-[11px] font-medium text-primary-light dark:text-primary-dark mt-1">
                {hour.temp}°
              </span>

              {hour.windSpeed && hour.windSpeed > 15 && (
                <span className="text-[8px] text-orange-400 mt-0.5">
                  🌬️
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedHour && (
        <div className="mt-3 pt-3 border-t border-gray-700 dark:border-gray-600">
          <div className="text-xs text-muted-light dark:text-muted-dark space-y-1">
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="font-medium">{selectedHour.time}</span>
            </div>
            <div className="flex justify-between">
              <span>Temperature:</span>
              <span className="font-medium">{selectedHour.temp}°C</span>
            </div>
            {selectedHour.precipitation !== undefined && (
              <div className="flex justify-between">
                <span>Precipitation:</span>
                <span className="font-medium">{selectedHour.precipitation}mm</span>
              </div>
            )}
            {selectedHour.windSpeed !== undefined && (
              <div className="flex justify-between">
                <span>Wind:</span>
                <span className="font-medium">{selectedHour.windSpeed} km/h</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getWeatherIcon(iconName: string): JSX.Element {
  const iconMap: Record<string, string> = {
    'clear-day': '☀️',
    'clear-night': '🌙',
    'partly-cloudy-day': '⛅',
    'partly-cloudy-night': '☁️',
    'cloudy': '☁️',
    'rain': '🌧️',
    'snow': '❄️',
    'wind': '🌬️',
    'fog': '🌫️',
    'sunrise': '🌅',
    'sunset': '🌇',
  };

  const emoji = iconMap[iconName] || '☀️';

  return (
    <span className="text-base opacity-80" role="img" aria-label={iconName}>
      {emoji}
    </span>
  );
}
