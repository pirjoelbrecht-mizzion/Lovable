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
          <svg className="connector-overlay" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="connectorGlow">
                <feGaussianBlur stdDeviation="4" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <line x1="160" y1="130" x2="440" y2="240" stroke="#00E5FF" strokeWidth="3" opacity="0.9" filter="url(#connectorGlow)" />
            <line x1="840" y1="130" x2="560" y2="240" stroke="#00E5FF" strokeWidth="3" opacity="0.9" filter="url(#connectorGlow)" />
            <line x1="160" y1="370" x2="440" y2="260" stroke="#FF8C00" strokeWidth="3" opacity="0.9" filter="url(#connectorGlow)" />
            <line x1="840" y1="370" x2="560" y2="260" stroke="#FF8C00" strokeWidth="3" opacity="0.9" filter="url(#connectorGlow)" />
          </svg>

          <div className="metric-circle top-left-pos">
            <div className="circle-outer cyan-circle">
              <div className="circle-value">{Math.round(data.avgTemperature)}</div>
              <div className="circle-unit">°C</div>
            </div>
            <div className="circle-label">Avg Temperature</div>
          </div>

          <div className="metric-circle top-right-pos">
            <div className="circle-outer cyan-circle">
              <div className="circle-value">{Math.round(data.avgHumidity)}</div>
              <div className="circle-unit">%</div>
            </div>
            <div className="circle-label">Avg Humidity</div>
          </div>

          <div className="flame-center-pos">
            <svg className="flame-svg" viewBox="0 0 240 400" width="240" height="400">
              <defs>
                <filter id="flameGlow">
                  <feGaussianBlur stdDeviation="20" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
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
                d="M120,20 C130,35 140,55 145,85 Q152,130 154,180 Q155,230 153,280 Q150,320 145,350 Q140,370 120,390 Q100,370 95,350 Q90,320 87,280 Q85,230 86,180 Q88,130 95,85 C100,55 110,35 120,20 Z"
                fill="none"
                stroke="url(#flameGrad)"
                strokeWidth="7"
                filter="url(#flameGlow)"
              />

              <path
                d="M120,60 Q118,110 120,160 Q122,220 120,280 Q119,330 120,360"
                fill="none"
                stroke="#FFF176"
                strokeWidth="4"
                opacity="0.95"
                filter="url(#flameGlow)"
              />

              <path d="M115,30 Q120,45 125,60" fill="none" stroke="#FFEB3B" strokeWidth="3" opacity="0.9"/>
              <path d="M105,100 Q120,130 125,160" fill="none" stroke="#FFB300" strokeWidth="2.5" opacity="0.7"/>
              <path d="M135,100 Q120,130 115,160" fill="none" stroke="#FFB300" strokeWidth="2.5" opacity="0.7"/>
            </svg>

            <div className="flame-badge">
              <div className="badge-word">LEVEL</div>
              <div className="badge-num">{level}</div>
            </div>
          </div>

          <div className="metric-circle bottom-left-pos">
            <div className="circle-outer orange-circle">
              <div className="circle-value">{Math.round(data.heatIndex)}</div>
              <div className="circle-unit">°C</div>
            </div>
            <div className="circle-label">Heat Index</div>
          </div>

          <div className="metric-circle bottom-right-pos">
            <div className="circle-outer orange-circle">
              <div className="circle-value">{data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}</div>
              <div className="circle-unit">min</div>
            </div>
            <div className="circle-label">Danger Zone</div>
          </div>
        </div>

        {showTimeline && data.timeline && data.timeline.length > 0 && (
          <div className="chart-section">
            <svg className="stress-chart" viewBox="0 0 700 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.45"/>
                  <stop offset="100%" stopColor="#FF8C00" stopOpacity="0"/>
                </linearGradient>
                <filter id="chartGlow">
                  <feGaussianBlur stdDeviation="5" result="chartBlur"/>
                  <feMerge>
                    <feMergeNode in="chartBlur"/>
                    <feMergeNode in="chartBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {[0, 55, 110, 165, 220].map((y) => (
                <line key={`hg-${y}`} x1="0" y1={y} x2="700" y2={y} stroke="rgba(255, 140, 0, 0.12)" strokeWidth="1"/>
              ))}
              {[0, 87.5, 175, 262.5, 350, 437.5, 525, 612.5, 700].map((x) => (
                <line key={`vg-${x}`} x1={x} y1="0" x2={x} y2="220" stroke="rgba(255, 140, 0, 0.08)" strokeWidth="1"/>
              ))}

              <path
                d="M0,200 Q70,190 140,170 Q210,145 280,115 Q350,90 420,70 Q490,55 560,45 Q630,38 700,32"
                fill="none"
                stroke="#FF8C00"
                strokeWidth="4.5"
                filter="url(#chartGlow)"
              />

              <path
                d="M0,200 Q70,190 140,170 Q210,145 280,115 Q350,90 420,70 Q490,55 560,45 Q630,38 700,32 L700,220 L0,220 Z"
                fill="url(#chartFill)"
              />
            </svg>
          </div>
        )}

        <div className="bottom-section">
          <div className="timeline-column">
            <div className="timeline-line-container">
              <svg width="4" height="100%" preserveAspectRatio="none">
                <defs>
                  <filter id="lineGlow">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <line x1="2" y1="0" x2="2" y2="100%" stroke="#FF8C00" strokeWidth="3.5" filter="url(#lineGlow)"/>
              </svg>
            </div>

            <div className="timeline-items">
              {data.events && data.events.slice(0, 2).map((event, idx) => (
                <div key={idx} className="timeline-item">
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
          </div>

          <div className="recommendations-column">
            <div className="rec-icon-top">
              <svg className="teal-flame" viewBox="0 0 40 56" width="36" height="56">
                <defs>
                  <filter id="tealGlow">
                    <feGaussianBlur stdDeviation="3.5" result="tglow"/>
                    <feMerge>
                      <feMergeNode in="tglow"/>
                      <feMergeNode in="tglow"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M20,5 Q24,10 25,18 Q26,26 24,34 Q22,40 20,44 Q18,40 16,34 Q14,26 15,18 Q16,10 20,5 Z"
                  fill="none"
                  stroke="#00FFD4"
                  strokeWidth="3"
                  filter="url(#tealGlow)"
                />
                <circle cx="20" cy="50" r="2.5" fill="#00FFD4" filter="url(#tealGlow)"/>
              </svg>
            </div>

            <div className="rec-connector">
              <svg width="3" height="40" preserveAspectRatio="none">
                <line x1="1.5" y1="0" x2="1.5" y2="40" stroke="#00FFD4" strokeWidth="2" opacity="0.65"/>
              </svg>
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
      </div>

      <style>{`
        .cosmic-heat-impact-exact {
          position: relative;
          min-height: 900px;
          padding: 40px 60px;
          background: linear-gradient(180deg, #0a0a1e 0%, #050510 100%);
          overflow: hidden;
        }

        .cosmic-background-grid {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          background-image:
            linear-gradient(rgba(0, 229, 255, 0.16) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.16) 2px, transparent 2px);
          background-size: 50px 50px;
          transform: perspective(650px) rotateX(62deg);
          transform-origin: center bottom;
          opacity: 0.5;
          pointer-events: none;
        }

        .heat-content-container {
          position: relative;
          z-index: 10;
        }

        .header-section {
          text-align: center;
          margin-bottom: 45px;
        }

        .main-title {
          font-size: 48px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 8px;
          margin: 0 0 10px 0;
          text-shadow: 0 0 40px rgba(255, 255, 255, 0.6), 0 0 70px rgba(255, 255, 255, 0.35);
        }

        .subtitle-text {
          font-size: 17px;
          color: rgba(255, 255, 255, 0.82);
          margin: 0;
          letter-spacing: 2.5px;
        }

        .metrics-flame-container {
          position: relative;
          width: 100%;
          max-width: 1000px;
          height: 500px;
          margin: 0 auto 50px;
        }

        .connector-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .metric-circle {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 5;
        }

        .top-left-pos {
          top: 80px;
          left: 60px;
        }

        .top-right-pos {
          top: 80px;
          right: 60px;
        }

        .bottom-left-pos {
          bottom: 80px;
          left: 60px;
        }

        .bottom-right-pos {
          bottom: 80px;
          right: 60px;
        }

        .circle-outer {
          width: 115px;
          height: 115px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }

        .cyan-circle {
          border: 3.5px solid #00E5FF;
          background: rgba(0, 40, 60, 0.7);
          box-shadow: 0 0 30px rgba(0, 229, 255, 0.75), inset 0 0 25px rgba(0, 229, 255, 0.25);
        }

        .orange-circle {
          border: 3.5px solid #FF8C00;
          background: rgba(60, 30, 0, 0.7);
          box-shadow: 0 0 30px rgba(255, 140, 0, 0.75), inset 0 0 25px rgba(255, 140, 0, 0.25);
        }

        .circle-value {
          font-size: 38px;
          font-weight: 700;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 22px rgba(255, 215, 0, 1);
        }

        .circle-unit {
          font-size: 20px;
          font-weight: 400;
          color: #FFD700;
          text-shadow: 0 0 16px rgba(255, 215, 0, 0.85);
        }

        .circle-label {
          font-size: 15px;
          color: #FFD700;
          text-align: center;
          letter-spacing: 1.2px;
          text-shadow: 0 0 14px rgba(255, 215, 0, 0.75);
        }

        .flame-center-pos {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }

        .flame-svg {
          display: block;
          filter: drop-shadow(0 0 45px rgba(255, 140, 0, 0.95));
        }

        .flame-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 50px;
        }

        .badge-word {
          font-size: 23px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 5px;
          text-shadow: 0 0 24px rgba(255, 215, 0, 1);
          margin-bottom: 6px;
        }

        .badge-num {
          font-size: 78px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 32px rgba(255, 215, 0, 1);
        }

        .chart-section {
          max-width: 800px;
          margin: 0 auto 50px;
        }

        .stress-chart {
          width: 100%;
          height: 220px;
          background: rgba(10, 20, 40, 0.5);
          border: 2px solid rgba(255, 140, 0, 0.35);
          border-radius: 16px;
          padding: 20px;
          box-sizing: border-box;
        }

        .bottom-section {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 80px;
          max-width: 1200px;
          margin: 0 auto;
          align-items: start;
        }

        .timeline-column {
          position: relative;
          padding-left: 60px;
        }

        .timeline-line-container {
          position: absolute;
          left: 20px;
          top: 0;
          height: 100%;
        }

        .timeline-items {
          display: flex;
          flex-direction: column;
          gap: 36px;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 18px;
        }

        .event-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid #FF8C00;
          background: rgba(60, 30, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 22px rgba(255, 140, 0, 0.75);
          position: relative;
          z-index: 5;
        }

        .event-symbol {
          font-size: 24px;
          color: #FF8C00;
          text-shadow: 0 0 10px #FF8C00;
        }

        .event-content {
          flex: 1;
          padding-top: 6px;
        }

        .event-desc {
          font-size: 17px;
          color: #ffffff;
          margin-bottom: 5px;
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.55);
        }

        .event-dist {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.62);
        }

        .recommendations-column {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .rec-icon-top {
          margin-bottom: -1px;
        }

        .teal-flame {
          filter: drop-shadow(0 0 16px rgba(0, 255, 212, 0.85));
        }

        .rec-connector {
          margin-bottom: -1px;
        }

        .rec-card {
          width: 100%;
          background: rgba(0, 25, 45, 0.75);
          border: 3.5px solid #00FFD4;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 0 35px rgba(0, 255, 212, 0.45), inset 0 0 35px rgba(0, 255, 212, 0.12);
        }

        .rec-title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 22px 0;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.65);
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .rec-entry {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .rec-bullet {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00FFD4;
          flex-shrink: 0;
          margin-top: 9px;
          box-shadow: 0 0 14px #00FFD4;
        }

        .rec-content {
          font-size: 17px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.92);
        }

        @media (max-width: 1300px) {
          .bottom-section {
            grid-template-columns: 1fr;
            gap: 50px;
          }

          .timeline-column,
          .recommendations-column {
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 900px) {
          .cosmic-heat-impact-exact {
            padding: 35px 40px;
          }

          .main-title {
            font-size: 38px;
            letter-spacing: 6px;
          }

          .subtitle-text {
            font-size: 16px;
          }

          .metrics-flame-container {
            height: 420px;
          }

          .flame-svg {
            width: 200px;
            height: 330px;
          }

          .top-left-pos, .bottom-left-pos {
            left: 30px;
          }

          .top-right-pos, .bottom-right-pos {
            right: 30px;
          }

          .circle-outer {
            width: 90px;
            height: 90px;
          }

          .circle-value {
            font-size: 30px;
          }

          .circle-unit {
            font-size: 17px;
          }

          .badge-num {
            font-size: 62px;
          }
        }
      `}</style>
    </div>
  );
}
