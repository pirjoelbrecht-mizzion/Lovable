import { FC } from 'react';
import type { EnhancedWeatherData } from '@/services/realtimeWeather';
import { motion } from 'framer-motion';

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
  const getReadinessColor = () => {
    if (!readiness) return { primary: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' };
    switch (readiness.category) {
      case 'high': return { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'moderate': return { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'low': return { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    }
  };

  const readinessColors = getReadinessColor();

  return (
    <div style={{
      backgroundColor: '#0a0b0e',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden'
      }} className="scrollbar-hide">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            margin: '12px 12px 8px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p style={{
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#e5e7eb',
            margin: 0,
            fontWeight: 400
          }}>
            {coachMessage}
          </p>
        </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{ padding: '0 12px 8px' }}
      >
        <div style={{
          borderRadius: '16px',
          background: 'linear-gradient(145deg, #12151a 0%, #0d0f12 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, transparent 60%)',
            position: 'relative'
          }}>
            {daysToRace !== null && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                  {daysToRace}d to race
                </span>
              </div>
            )}

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981'
              }} />
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#10b981'
              }}>
                {workoutData.type}
              </span>
            </div>

            <h1 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 4px 0',
              letterSpacing: '-0.5px'
            }}>
              {workoutData.title}
            </h1>

            {workoutData.isAdapted && (
              <span style={{
                fontSize: '11px',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Adapted to your readiness
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)'
          }}>
            <MetricCell label="Duration" value={workoutData.duration} icon="clock" />
            <MetricCell label="Distance" value={workoutData.distance} icon="route" />
            <MetricCell label="Target Pace" value={workoutData.pace} unit="min/km" icon="speed" />
          </div>

          {readiness && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: readinessColors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={readinessColors.primary} strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e5e7eb' }}>
                    Readiness Score
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: readinessColors.primary
                  }}>
                    {readiness.score}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>/100</span>
                </div>
              </div>
              <div style={{
                height: '5px',
                borderRadius: '2.5px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                overflow: 'hidden'
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${readiness.score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${readinessColors.primary} 0%, ${readinessColors.primary}88 100%)`,
                    borderRadius: '2.5px'
                  }}
                />
              </div>
            </div>
          )}

          {streak > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>&#128293;</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f9fafb' }}>
                  {streak} day streak
                </span>
              </div>
              <div style={{
                padding: '3px 8px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                  +{xpToEarn} XP
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <WeatherSection weather={weather} />
        </motion.div>
      )}
      </div>

      <div style={{
        padding: '12px',
        background: 'linear-gradient(to top, #0a0b0e 0%, #0a0b0eee 80%, transparent 100%)',
        paddingTop: '20px'
      }}>
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.3)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>Start Workout</span>
        </button>
      </div>
    </div>
  );
};

const MetricCell: FC<{
  label: string;
  value: string;
  unit?: string;
  icon: 'clock' | 'route' | 'speed';
}> = ({ label, value, unit, icon }) => {
  const renderIcon = () => {
    const iconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "#6b7280", strokeWidth: 2 };
    switch (icon) {
      case 'clock':
        return <svg {...iconProps}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
      case 'route':
        return <svg {...iconProps}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
      case 'speed':
        return <svg {...iconProps}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>;
    }
  };

  return (
    <div style={{
      padding: '16px 12px',
      backgroundColor: '#0d0f12',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        marginBottom: '6px'
      }}>
        {renderIcon()}
        <span style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#6b7280',
          fontWeight: 500
        }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
        {value}
      </div>
      {unit && (
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
          {unit}
        </div>
      )}
    </div>
  );
};

const WeatherSection: FC<{ weather: EnhancedWeatherData }> = ({ weather }) => {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const hours = weather.hours.slice(0, 8);
  const highTemp = Math.round(weather.current.high || weather.current.temp + 5);
  const lowTemp = Math.round(weather.current.low || weather.current.temp - 5);
  const currentTemp = Math.round(weather.current.temp);

  return (
    <div style={{ padding: '0 12px 8px' }}>
      <div style={{
        borderRadius: '12px',
        background: 'linear-gradient(145deg, #12151a 0%, #0d0f12 100%)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        padding: '10px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '24px' }}>{weather.current.icon}</div>
            <div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1
              }}>
                {currentTemp}°
              </div>
              <div style={{ fontSize: '9px', color: '#6b7280' }}>
                H:{highTemp}° L:{lowTemp}°
              </div>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280', textAlign: 'right' }}>
            {dateStr}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '2px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }} className="scrollbar-hide">
          {hours.map((hour, idx) => {
            const isOptimal = weather.bestRunWindow &&
              parseInt(hour.time.split(':')[0]) >= parseInt(weather.bestRunWindow.start.split(':')[0]) &&
              parseInt(hour.time.split(':')[0]) <= parseInt(weather.bestRunWindow.end.split(':')[0]);

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '5px 6px',
                  borderRadius: '6px',
                  minWidth: '34px',
                  backgroundColor: isOptimal ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  border: isOptimal ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent'
                }}
              >
                <div style={{
                  fontSize: '8px',
                  color: isOptimal ? '#10b981' : '#6b7280',
                  marginBottom: '3px'
                }}>
                  {hour.time.split(':')[0]}
                </div>
                <div style={{ fontSize: '13px', marginBottom: '2px' }}>{hour.icon}</div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: isOptimal ? '#10b981' : '#e5e7eb'
                }}>
                  {Math.round(hour.temp)}°
                </div>
              </div>
            );
          })}
        </div>

        {weather.bestRunWindow && (
          <div style={{
            marginTop: '8px',
            padding: '6px 8px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>
              Best: {weather.bestRunWindow.start}-{weather.bestRunWindow.end}
            </span>
            <span style={{ fontSize: '9px', color: '#6b7280' }}>
              {Math.round(weather.bestRunWindow.temp)}°
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
