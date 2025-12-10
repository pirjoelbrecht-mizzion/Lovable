import React from 'react';

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

  const severityLabel = {
    LOW: 'Mild Heat Stress',
    MODERATE: 'Moderate Heat Stress',
    HIGH: 'High Heat Stress',
    EXTREME: 'Extreme Heat Stress'
  };

  return (
    <div className={`cosmic-heat-impact-exact ${className}`}>
      <div className="cosmic-background-grid"></div>

      <div className="heat-content-container">
        <div className="header-section">
          <h1 className="main-title">HEAT & HUMIDITY IMPACT</h1>
          <p className="subtitle-text">{severityLabel[data.severity]} • Level {level}</p>
        </div>

        <div className="metrics-flame-container">
          <div className="flame-center-pos">
            <svg className="flame-svg" viewBox="0 0 120 140" width="120" height="140">
              <defs>
                <filter id="flameGlow">
                  <feGaussianBlur stdDeviation="12" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#FFF176"/>
                  <stop offset="25%" stopColor="#FFD54F"/>
                  <stop offset="50%" stopColor="#FFB74D"/>
                  <stop offset="75%" stopColor="#FF8A65"/>
                  <stop offset="100%" stopColor="#FF5722"/>
                </linearGradient>
              </defs>

              <path
                d="M60,10 C65,18 70,28 72,43 Q76,65 77,90 Q78,115 76,125 Q73,132 60,138 Q47,132 44,125 Q42,115 43,90 Q44,65 48,43 C50,28 55,18 60,10 Z"
                fill="none"
                stroke="url(#flameGrad)"
                strokeWidth="4"
                filter="url(#flameGlow)"
              />

              <path
                d="M60,30 Q59,55 60,80 Q61,110 60,125"
                fill="none"
                stroke="#FFF176"
                strokeWidth="2.5"
                opacity="0.95"
                filter="url(#flameGlow)"
              />
            </svg>

            <div className="flame-badge">
              <div className="badge-word">LEVEL</div>
              <div className="badge-num">{level}</div>
            </div>
          </div>

          <div className="metrics-row">
            <div className="metric-circle">
              <div className="circle-outer cyan-circle">
                <div className="circle-value">{Math.round(data.avgTemperature)}</div>
                <div className="circle-unit">°C</div>
              </div>
              <div className="circle-label">Temperature</div>
            </div>

            <div className="metric-circle">
              <div className="circle-outer cyan-circle">
                <div className="circle-value">{Math.round(data.avgHumidity)}</div>
                <div className="circle-unit">%</div>
              </div>
              <div className="circle-label">Humidity</div>
            </div>

            <div className="metric-circle">
              <div className="circle-outer orange-circle">
                <div className="circle-value">HI {Math.round(data.heatIndex)}</div>
                <div className="circle-unit"></div>
              </div>
              <div className="circle-label">Heat Index</div>
            </div>

            <div className="metric-circle">
              <div className="circle-outer orange-circle">
                <div className="circle-value">{data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}</div>
                <div className="circle-unit">min</div>
              </div>
              <div className="circle-label">Danger Zone</div>
            </div>
          </div>
        </div>

        {showTimeline && data.timeline && data.timeline.length > 0 && (
          <div className="chart-section">
            <svg className="stress-chart" viewBox="0 0 700 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#FF8C00" stopOpacity="0"/>
                </linearGradient>
                <filter id="chartGlow">
                  <feGaussianBlur stdDeviation="3" result="chartBlur"/>
                  <feMerge>
                    <feMergeNode in="chartBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <path
                d="M0,90 Q70,85 140,77 Q210,65 280,52 Q350,41 420,32 Q490,25 560,20 Q630,17 700,14"
                fill="none"
                stroke="#FF8C00"
                strokeWidth="3"
                filter="url(#chartGlow)"
              />

              <path
                d="M0,90 Q70,85 140,77 Q210,65 280,52 Q350,41 420,32 Q490,25 560,20 Q630,17 700,14 L700,100 L0,100 Z"
                fill="url(#chartFill)"
              />
            </svg>
          </div>
        )}

        <div className="bottom-section">
          <div className="events-row">
            {data.events && data.events.slice(0, 2).map((event, idx) => (
              <div key={idx} className="event-card">
                <div className="event-circle">
                  {event.icon === 'hr_drift' && <span className="event-symbol">⚡</span>}
                  {event.icon === 'hydration' && <span className="event-symbol">⟳</span>}
                  {event.icon === 'warning' && <span className="event-symbol">△</span>}
                  {event.icon === 'pace_drop' && <span className="event-symbol">∿</span>}
                  {!['hr_drift', 'hydration', 'warning', 'pace_drop'].includes(event.icon) && <span className="event-symbol">●</span>}
                </div>
                <div className="event-content">
                  <div className="event-desc">{event.description}</div>
                  <div className="event-dist">{event.distance_km.toFixed(1)} km</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rec-card">
            <h3 className="rec-title">Recommendations</h3>
            <ul className="rec-list">
              {data.recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="rec-entry">
                  <span className="rec-bullet"></span>
                  <span className="rec-content">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .cosmic-heat-impact-exact {
          position: relative;
          min-height: 700px;
          padding: 24px 40px;
          background: linear-gradient(180deg, #0a0a1e 0%, #050510 100%);
          overflow: hidden;
        }

        .cosmic-background-grid {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 120px;
          background-image:
            linear-gradient(rgba(0, 229, 255, 0.16) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.16) 2px, transparent 2px);
          background-size: 50px 50px;
          transform: perspective(650px) rotateX(62deg);
          transform-origin: center bottom;
          opacity: 0.3;
          pointer-events: none;
        }

        .heat-content-container {
          position: relative;
          z-index: 10;
        }

        .header-section {
          text-align: center;
          margin-bottom: 20px;
        }

        .main-title {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 4px;
          margin: 0 0 8px 0;
          text-shadow: 0 0 28px rgba(255, 255, 255, 0.42), 0 0 49px rgba(255, 255, 255, 0.25);
        }

        .subtitle-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.82);
          margin: 0;
          letter-spacing: 2px;
        }

        .metrics-flame-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 0 auto 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .flame-center-pos {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .flame-svg {
          display: block;
          filter: drop-shadow(0 0 30px rgba(255, 140, 0, 0.7));
        }

        .flame-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 20px;
        }

        .badge-word {
          font-size: 14px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 3px;
          text-shadow: 0 0 17px rgba(255, 215, 0, 0.7);
          margin-bottom: 4px;
        }

        .badge-num {
          font-size: 42px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 22px rgba(255, 215, 0, 0.7);
        }

        .metrics-row {
          display: flex;
          gap: 14px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .metric-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .circle-outer {
          width: 85px;
          height: 85px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }

        .cyan-circle {
          border: 2.5px solid #00E5FF;
          background: rgba(0, 40, 60, 0.7);
          box-shadow: 0 0 21px rgba(0, 229, 255, 0.53), inset 0 0 18px rgba(0, 229, 255, 0.18);
        }

        .orange-circle {
          border: 2.5px solid #FF8C00;
          background: rgba(60, 30, 0, 0.7);
          box-shadow: 0 0 21px rgba(255, 140, 0, 0.53), inset 0 0 18px rgba(255, 140, 0, 0.18);
        }

        .circle-value {
          font-size: 26px;
          font-weight: 700;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
        }

        .circle-unit {
          font-size: 14px;
          font-weight: 400;
          color: #FFD700;
          text-shadow: 0 0 11px rgba(255, 215, 0, 0.6);
        }

        .circle-label {
          font-size: 12px;
          color: #FFD700;
          text-align: center;
          letter-spacing: 0.8px;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.53);
        }

        .chart-section {
          max-width: 800px;
          margin: 0 auto 20px;
        }

        .stress-chart {
          width: 100%;
          height: 100px;
          background: rgba(10, 20, 40, 0.3);
          border: 1.5px solid rgba(255, 140, 0, 0.25);
          border-radius: 12px;
          padding: 8px;
          box-sizing: border-box;
        }

        .bottom-section {
          display: flex;
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
          align-items: flex-start;
        }

        .events-row {
          flex: 1;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .event-card {
          flex: 1;
          min-width: 200px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: rgba(60, 30, 0, 0.3);
          border: 1.5px solid rgba(255, 140, 0, 0.3);
          border-radius: 12px;
        }

        .event-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #FF8C00;
          background: rgba(60, 30, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 15px rgba(255, 140, 0, 0.53);
        }

        .event-symbol {
          font-size: 18px;
          color: #FF8C00;
          text-shadow: 0 0 7px #FF8C00;
        }

        .event-content {
          flex: 1;
        }

        .event-desc {
          font-size: 14px;
          color: #ffffff;
          margin-bottom: 4px;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.39);
          line-height: 1.3;
        }

        .event-dist {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }

        .rec-card {
          width: 280px;
          flex-shrink: 0;
          background: rgba(0, 25, 45, 0.75);
          border: 2.5px solid #00FFD4;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 0 25px rgba(0, 255, 212, 0.32), inset 0 0 25px rgba(0, 255, 212, 0.08);
        }

        .rec-title {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 14px 0;
          text-shadow: 0 0 13px rgba(255, 255, 255, 0.46);
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rec-entry {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .rec-bullet {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00FFD4;
          flex-shrink: 0;
          margin-top: 6px;
          box-shadow: 0 0 10px #00FFD4;
        }

        .rec-content {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.92);
        }

        @media (max-width: 900px) {
          .cosmic-heat-impact-exact {
            padding: 20px;
          }

          .main-title {
            font-size: 26px;
            letter-spacing: 3px;
          }

          .subtitle-text {
            font-size: 12px;
          }

          .flame-svg {
            width: 100px;
            height: 115px;
          }

          .badge-num {
            font-size: 36px;
          }

          .badge-word {
            font-size: 12px;
          }

          .circle-outer {
            width: 70px;
            height: 70px;
          }

          .circle-value {
            font-size: 20px;
          }

          .circle-unit {
            font-size: 12px;
          }

          .circle-label {
            font-size: 10px;
          }

          .metrics-row {
            gap: 10px;
          }

          .bottom-section {
            flex-direction: column;
            gap: 16px;
          }

          .rec-card {
            width: 100%;
          }

          .events-row {
            flex-direction: column;
          }

          .event-card {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
