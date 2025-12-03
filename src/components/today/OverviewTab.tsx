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
    <div style={{
      backgroundColor: '#0f1014',
      minHeight: '100%',
      paddingBottom: '80px'
    }}>
      {/* Coach Message */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#1a1c24',
          borderBottom: '1px solid #2a2d3a',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}
      >
        <div style={{ fontSize: '16px' }}>💬</div>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#d1d5db',
            margin: 0
          }}>
            {coachMessage}
          </p>
        </div>
      </div>

      {/* Streak Banner */}
      {daysToRace !== null && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#0f1014',
            borderBottom: '1px solid #2a2d3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🔥</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb' }}>
              {streak} day streak
            </span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              Keep it going!
            </span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
            +{xpToEarn} XP
          </span>
        </div>
      )}

      {/* Workout Card */}
      <div style={{ padding: '16px' }}>
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1a2e26 0%, #152620 100%)',
            border: '2px solid #22c55e',
            position: 'relative'
          }}
        >
          {daysToRace !== null && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#22c55e',
                color: '#000'
              }}
            >
              {daysToRace} days
            </div>
          )}

          <h1 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#f9fafb',
            margin: '0 0 4px 0'
          }}>
            {workoutData.title}
          </h1>
          <p style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#9ca3af',
            margin: '0 0 12px 0'
          }}>
            {workoutData.type} • {workoutData.isAdapted ? 'ADAPTED' : 'STANDARD'}
          </p>

          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '8px 4px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                marginBottom: '4px'
              }}>
                DURATION
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f9fafb' }}>
                {workoutData.duration}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '8px 4px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                marginBottom: '4px'
              }}>
                DISTANCE
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f9fafb' }}>
                {workoutData.distance}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '8px 4px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                marginBottom: '4px'
              }}>
                PACE
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f9fafb' }}>
                {workoutData.pace}
              </div>
            </div>
          </div>

          {/* Readiness */}
          {readiness && (
            <div style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{ fontSize: '20px' }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#f9fafb' }}>
                    Readiness
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: readinessColor }}>
                    {readiness.score}
                  </span>
                </div>
                <div style={{
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: '#374151',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${readiness.score}%`,
                    backgroundColor: readinessColor,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: readinessColor,
                  marginTop: '4px'
                }}>
                  {readiness.category}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weather Section */}
      {weather && <WeatherSection weather={weather} />}

      {/* Start Button */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ fontSize: '18px' }}>▶</span>
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

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#1a1c24',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#2a2d3a',
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y}°`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#2a2d3a',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: '#2a2d3a',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          callback: (value: any) => `${value}°`,
        },
        position: 'right',
      },
    },
  };

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      <div style={{
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>
            {dateStr}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '40px' }}>{weather.current.icon}</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#f9fafb' }}>
                  {weather.current.temp}°
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  H:{weather.current.high || weather.current.temp + 5}° L:
                  {weather.current.low || weather.current.temp - 5}°
                </div>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: '6px',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#9ca3af',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Hourly Icons Strip */}
        <div style={{
          padding: '0 12px 12px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }} className="scrollbar-hide">
          <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
            {hours.slice(0, 12).map((hour, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '40px'
              }}>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
                  {hour.time.split(':')[0]}
                </div>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{hour.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f9fafb' }}>
                  {hour.temp}°
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: '0 12px 12px 12px', height: '140px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Best Window */}
        {weather.bestRunWindow && (
          <div style={{ padding: '0 12px 12px 12px' }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#22c55e' }}>
                ⏰ {weather.bestRunWindow.start}
              </span>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                Best window: {weather.bestRunWindow.start} – {weather.bestRunWindow.end}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px', paddingLeft: '4px' }}>
              {weather.bestRunWindow.temp}° • Low wind • {weather.bestRunWindow.reason}
            </div>
          </div>
        )}

        {/* Hourly Forecast */}
        <div style={{
          padding: '0 12px 12px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }} className="scrollbar-hide">
          <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
            {hours.map((hour, idx) => {
              const isOptimal =
                weather.bestRunWindow &&
                parseInt(hour.time.split(':')[0]) >= parseInt(weather.bestRunWindow.start.split(':')[0]) &&
                parseInt(hour.time.split(':')[0]) <= parseInt(weather.bestRunWindow.end.split(':')[0]);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    minWidth: '50px',
                    backgroundColor: isOptimal
                      ? 'rgba(96, 165, 250, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isOptimal ? '1px solid rgba(96, 165, 250, 0.3)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
                    {hour.time.split(':')[0]}:00
                  </div>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{hour.icon}</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isOptimal ? '#60a5fa' : '#f9fafb'
                  }}>
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
