import { useState, useEffect } from 'react';
import { assessWeatherSafety, type WeatherAlert } from '@/services/weatherSafety';
import type { CurrentWeather } from '@/utils/weather';

type WeatherAlertBannerProps = {
  weather: CurrentWeather;
  onDismiss?: () => void;
};

export default function WeatherAlertBanner({ weather, onDismiss }: WeatherAlertBannerProps) {
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const weatherAlert = assessWeatherSafety(weather);
    setAlert(weatherAlert);
    setDismissed(false);
  }, [weather]);

  if (dismissed) return null;

  if (!alert) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 24, lineHeight: 1 }}>✓</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(74, 222, 128, 1)',
              marginBottom: 2,
            }}
          >
            Weather conditions are safe
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(134, 239, 172, 0.9)',
            }}
          >
            Temperature: {weather.temp}°C • Humidity: {weather.humidity}% • Wind: {weather.wind} km/h
          </div>
        </div>
      </div>
    );
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  const getLevelColor = () => {
    switch (alert.level) {
      case 'danger':
        return {
          bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          border: 'rgba(220, 38, 38, 0.4)',
          icon: '🚨',
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          border: 'rgba(245, 158, 11, 0.4)',
          icon: '⚠️',
        };
      case 'caution':
        return {
          bg: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
          border: 'rgba(234, 179, 8, 0.4)',
          icon: '⚡',
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
          border: 'rgba(59, 130, 246, 0.4)',
          icon: 'ℹ️',
        };
    }
  };

  const colors = getLevelColor();

  return (
    <div
      style={{
        background: colors.bg,
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
        border: `1px solid ${colors.border}`,
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: 6,
          color: 'white',
          cursor: 'pointer',
          fontSize: 18,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
        }}
        aria-label="Dismiss alert"
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
        <div style={{ fontSize: 32, lineHeight: 1 }}>{colors.icon}</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'white',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {alert.title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            {alert.message}
          </div>

          {alert.recommendations && alert.recommendations.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Recommendations:
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.6,
                }}
              >
                {alert.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <div>
          <span style={{ fontWeight: 600 }}>Temperature:</span> {weather.temp}°C
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Humidity:</span> {weather.humidity}%
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Wind:</span> {weather.wind} km/h
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Heat Index:</span> {weather.heatIndex}°C
        </div>
      </div>
    </div>
  );
}
