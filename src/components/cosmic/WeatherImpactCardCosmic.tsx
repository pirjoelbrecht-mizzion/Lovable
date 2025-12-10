import React from 'react';
import { CosmicBackground } from './CosmicBackground';

interface HeatEvent {
  icon: 'hr_drift' | 'warning' | 'hydration' | 'pace_drop' | 'default';
  distance_km: number;
  description: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

interface HeatImpactData {
  overallScore: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  avgTemperature: number;
  avgHumidity: number;
  heatIndex: number;
  dangerZoneMinutes?: number;
  timeline?: Array<{ distance: number; heatStress: number; hr?: number }>;
  events?: HeatEvent[];
  recommendations: string[];
}

interface WeatherImpactCardCosmicProps {
  data: HeatImpactData;
  showTimeline?: boolean;
  className?: string;
}

export function WeatherImpactCardCosmic({
  data,
  showTimeline = true,
  className = '',
}: WeatherImpactCardCosmicProps) {
  const severityToLevel = {
    LOW: 1,
    MODERATE: 2,
    HIGH: 3,
    EXTREME: 4
  };
  const level = severityToLevel[data.severity];

  const getFlameColor = (severity: string) => {
    if (severity === 'LOW') return '#00d9ff';
    if (severity === 'MODERATE') return '#ffa500';
    if (severity === 'HIGH') return '#ff6b35';
    return '#ff0000';
  };

  const flameColor = getFlameColor(data.severity);

  const getEventIcon = (icon: string) => {
    switch (icon) {
      case 'hr_drift':
        return '⚡';
      case 'hydration':
        return '⟳';
      case 'warning':
        return '△';
      case 'pace_drop':
        return '∿';
      default:
        return '○';
    }
  };

  return (
    <div className={`weather-impact-cosmic ${className}`}>
      <CosmicBackground intensity="medium" />

      <div className="cosmic-content">
        {/* Clean Header */}
        <h2 className="page-header">HEAT & HUMIDITY IMPACT</h2>

        {/* Hero Section: Flame + 4 Circles */}
        <div className="hero-section">
          {/* Top Left - Temperature */}
          <div className="metric-circle top-left">
            <div className="circle-inner">
              <div className="circle-value">
                {Math.round(data.avgTemperature)}<span className="unit">°C</span>
              </div>
            </div>
            <div className="circle-label">Avg Temperature</div>
          </div>

          {/* Top Right - Humidity */}
          <div className="metric-circle top-right">
            <div className="circle-inner">
              <div className="circle-value">
                {Math.round(data.avgHumidity)}<span className="unit">%</span>
              </div>
            </div>
            <div className="circle-label">Avg Humidity</div>
          </div>

          {/* Center Flame */}
          <div className="flame-container">
            <svg className="flame-svg" viewBox="0 0 200 260" width="200" height="260">
              <defs>
                <linearGradient id="flameGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                  <stop offset="40%" style={{ stopColor: flameColor, stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#FF4500', stopOpacity: 0.9 }} />
                </linearGradient>
                <filter id="flameGlow">
                  <feGaussianBlur stdDeviation="10" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M100,30 Q115,50 120,75 Q125,100 122,125 Q118,150 110,175 Q105,195 100,215 Q95,195 90,175 Q82,150 78,125 Q75,100 80,75 Q85,50 100,30 M100,60 Q90,80 92,110 Q95,135 100,160"
                fill="url(#flameGradient)"
                filter="url(#flameGlow)"
              />
            </svg>
            <div className="level-text">
              <div className="level-label">LEVEL</div>
              <div className="level-number">{level}</div>
            </div>
          </div>

          {/* Bottom Left - Heat Index */}
          <div className="metric-circle bottom-left">
            <div className="circle-inner">
              <div className="circle-value">
                {Math.round(data.heatIndex)}<span className="unit">°C</span>
              </div>
            </div>
            <div className="circle-label">Heat Index</div>
          </div>

          {/* Bottom Right - Danger Zone */}
          <div className="metric-circle bottom-right danger-zone">
            <div className="circle-inner">
              <div className="circle-value">
                {data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}<span className="unit">min</span>
              </div>
            </div>
            <div className="circle-label">Danger Zone</div>
          </div>

          {/* Connector Lines */}
          <svg className="connector-lines" viewBox="0 0 800 500">
            <line x1="140" y1="120" x2="340" y2="180" stroke={flameColor} strokeWidth="2" opacity="0.5" />
            <line x1="660" y1="120" x2="460" y2="180" stroke={flameColor} strokeWidth="2" opacity="0.5" />
            <line x1="140" y1="380" x2="340" y2="320" stroke={flameColor} strokeWidth="2" opacity="0.5" />
            <line x1="660" y1="380" x2="460" y2="320" stroke={flameColor} strokeWidth="2" opacity="0.5" />
          </svg>
        </div>

        {/* Chart Section */}
        {showTimeline && data.timeline && data.timeline.length > 0 && (
          <div className="chart-section">
            <svg className="heat-chart" viewBox="0 0 800 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: flameColor, stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: flameColor, stopOpacity: 0.8 }} />
                </linearGradient>
              </defs>
              {/* Grid */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={`grid-h-${i}`}
                  x1="0"
                  y1={40 * i}
                  x2="800"
                  y2={40 * i}
                  stroke="rgba(255,140,0,0.1)"
                  strokeWidth="1"
                />
              ))}
              {/* Chart Line */}
              <path
                d="M0,160 L100,150 L200,135 L300,110 L400,85 L500,65 L600,50 L700,40 L800,35"
                stroke={flameColor}
                strokeWidth="3"
                fill="none"
                opacity="0.9"
              />
              <path
                d="M0,160 L100,150 L200,135 L300,110 L400,85 L500,65 L600,50 L700,40 L800,35 L800,200 L0,200 Z"
                fill="url(#chartGradient)"
                opacity="0.2"
              />
            </svg>
          </div>
        )}

        {/* Bottom Section: Events + Recommendations */}
        <div className="bottom-layout">
          {/* Left: Key Events */}
          <div className="events-column">
            {data.events && data.events.length > 0 && data.events.slice(0, 4).map((event, idx) => (
              <div key={idx} className="event-row">
                <div className="event-icon-circle">{getEventIcon(event.icon)}</div>
                <div className="event-details">
                  <div className="event-description">{event.description}</div>
                  <div className="event-distance">{event.distance_km.toFixed(1)} km</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Recommendations */}
          <div className="recommendations-panel">
            <div className="rec-header">
              <div className="rec-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
                  <path d="M12,2 Q14,5 14,9 Q14,13 12,16 M12,16 L12,20" />
                  <circle cx="12" cy="21" r="1" fill="#00d9ff" />
                </svg>
              </div>
              <h3 className="rec-title">Recommendations</h3>
            </div>
            <ul className="rec-list">
              {data.recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="rec-item">
                  <span className="rec-bullet"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .weather-impact-cosmic {
          position: relative;
          min-height: 700px;
          padding: 40px;
          border-radius: 24px;
          overflow: hidden;
          background: #0a0a15;
        }

        .cosmic-content {
          position: relative;
          z-index: 1;
        }

        /* Header - Clean, No Effects */
        .page-header {
          text-align: center;
          font-size: 36px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin: 0 0 24px 0;
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          width: 100%;
          max-width: 800px;
          height: 500px;
          margin: 0 auto 40px auto;
        }

        /* Metric Circles */
        .metric-circle {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .metric-circle.top-left {
          top: 80px;
          left: 60px;
        }

        .metric-circle.top-right {
          top: 80px;
          right: 60px;
        }

        .metric-circle.bottom-left {
          bottom: 80px;
          left: 60px;
        }

        .metric-circle.bottom-right {
          bottom: 80px;
          right: 60px;
        }

        .circle-inner {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 2px solid #00d9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 20, 40, 0.6);
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
        }

        .metric-circle.danger-zone .circle-inner {
          border-color: #ffa500;
          box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
        }

        .circle-value {
          font-size: 28px;
          font-weight: 700;
          color: #FFD700;
        }

        .circle-value .unit {
          font-size: 16px;
          font-weight: 400;
        }

        .circle-label {
          font-size: 14px;
          color: #FFD700;
          text-align: center;
          max-width: 120px;
        }

        /* Flame Container */
        .flame-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .flame-svg {
          display: block;
        }

        .level-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 20px;
        }

        .level-label {
          font-size: 16px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 2px;
        }

        .level-number {
          font-size: 48px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
        }

        /* Connector Lines */
        .connector-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        /* Chart Section */
        .chart-section {
          width: 100%;
          max-width: 800px;
          height: 200px;
          margin: 0 auto 40px auto;
          background: rgba(10, 20, 40, 0.5);
          border: 1px solid rgba(255, 140, 0, 0.3);
          border-radius: 12px;
          padding: 20px;
        }

        .heat-chart {
          width: 100%;
          height: 100%;
        }

        /* Bottom Layout */
        .bottom-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Events Column */
        .events-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .event-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .event-icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #ffa500;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 140, 0, 0.1);
          font-size: 20px;
          flex-shrink: 0;
        }

        .event-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .event-description {
          font-size: 14px;
          color: #ffffff;
        }

        .event-distance {
          font-size: 12px;
          color: #999999;
        }

        /* Recommendations Panel */
        .recommendations-panel {
          background: rgba(0, 20, 40, 0.7);
          border: 2px solid rgba(0, 217, 255, 0.6);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
        }

        .rec-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .rec-icon-circle {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .rec-title {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rec-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 14px;
          line-height: 1.6;
          color: #cccccc;
        }

        .rec-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00d9ff;
          flex-shrink: 0;
          margin-top: 8px;
          box-shadow: 0 0 8px #00d9ff;
        }

        /* Responsive */
        @media (max-width: 1000px) {
          .hero-section {
            max-width: 600px;
            height: 400px;
          }

          .circle-inner {
            width: 80px;
            height: 80px;
          }

          .circle-value {
            font-size: 22px;
          }

          .flame-svg {
            width: 160px;
            height: 208px;
          }
        }

        @media (max-width: 768px) {
          .weather-impact-cosmic {
            padding: 24px;
          }

          .page-header {
            font-size: 24px;
          }

          .hero-section {
            height: 350px;
          }

          .bottom-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        @media (max-width: 480px) {
          .metric-circle.top-left {
            top: 40px;
            left: 20px;
          }

          .metric-circle.top-right {
            top: 40px;
            right: 20px;
          }

          .metric-circle.bottom-left {
            bottom: 40px;
            left: 20px;
          }

          .metric-circle.bottom-right {
            bottom: 40px;
            right: 20px;
          }

          .circle-inner {
            width: 70px;
            height: 70px;
          }

          .circle-value {
            font-size: 18px;
          }

          .circle-label {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
