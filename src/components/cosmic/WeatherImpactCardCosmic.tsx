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

  const getEventIcon = (icon: string) => {
    switch (icon) {
      case 'hr_drift':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'hydration':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M21 5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5zM8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 2L2 20h20L12 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'pace_drop':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M2 12c0-2 1-4 3-5s4-1 5 0 2 2 3 4c1 2 2 3 3 4s3 1 5 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
    }
  };

  return (
    <div className={`weather-impact-cosmic ${className}`}>
      {/* Sci-fi Grid Background */}
      <div className="grid-background"></div>

      <div className="cosmic-content">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">HEAT & HUMIDITY IMPACT</h1>
          <p className="subtitle">{severityLabel[data.severity]} • Level {level}</p>
        </div>

        {/* Central Diamond Layout */}
        <div className="diamond-layout">
          {/* Top-Left: Temperature */}
          <div className="metric-node top-left">
            <div className="neon-circle blue">
              <span className="metric-value">{Math.round(data.avgTemperature)}</span>
              <span className="metric-unit">°C</span>
            </div>
            <div className="metric-label">Avg Temperature</div>
            <svg className="connector-line" viewBox="0 0 200 100" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="200" y2="50" stroke="#00C8FF" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>

          {/* Top-Right: Humidity */}
          <div className="metric-node top-right">
            <div className="neon-circle blue">
              <span className="metric-value">{Math.round(data.avgHumidity)}</span>
              <span className="metric-unit">%</span>
            </div>
            <div className="metric-label">Avg Humidity</div>
            <svg className="connector-line" viewBox="0 0 200 100" preserveAspectRatio="none">
              <line x1="200" y1="50" x2="0" y2="50" stroke="#00C8FF" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>

          {/* Center: Large Flame */}
          <div className="flame-center">
            <svg className="tall-flame" viewBox="0 0 300 400" width="300" height="400">
              <defs>
                <filter id="neonGlow">
                  <feGaussianBlur stdDeviation="12" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FFD700' }}/>
                  <stop offset="50%" style={{ stopColor: '#FFA500' }}/>
                  <stop offset="100%" style={{ stopColor: '#FF6B00' }}/>
                </linearGradient>
              </defs>

              {/* Main flame shape */}
              <path
                d="M150,50 Q170,80 175,120 Q180,160 175,200 Q170,240 160,280 Q155,310 150,340 Q145,310 140,280 Q130,240 125,200 Q120,160 125,120 Q130,80 150,50 Z"
                fill="url(#flameGrad)"
                filter="url(#neonGlow)"
                stroke="#FFA500"
                strokeWidth="3"
              />

              {/* Inner flame detail */}
              <path
                d="M150,90 Q140,120 145,160 Q148,190 150,220"
                fill="none"
                stroke="#FFD700"
                strokeWidth="2"
                opacity="0.7"
              />

              {/* Flame tip curves */}
              <path
                d="M145,70 Q155,85 160,100"
                fill="none"
                stroke="#FFD700"
                strokeWidth="2"
                opacity="0.8"
              />
            </svg>

            <div className="level-text">
              <div className="level-label">LEVEL</div>
              <div className="level-number">{level}</div>
            </div>
          </div>

          {/* Bottom-Left: Heat Index */}
          <div className="metric-node bottom-left">
            <div className="neon-circle blue">
              <span className="metric-value">{Math.round(data.heatIndex)}</span>
              <span className="metric-unit">°C</span>
            </div>
            <div className="metric-label">Heat Index</div>
            <svg className="connector-line" viewBox="0 0 200 100" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="200" y2="50" stroke="#00C8FF" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>

          {/* Bottom-Right: Danger Zone */}
          <div className="metric-node bottom-right">
            <div className="neon-circle orange">
              <span className="metric-value">{data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}</span>
              <span className="metric-unit">min</span>
            </div>
            <div className="metric-label">Danger Zone</div>
            <svg className="connector-line" viewBox="0 0 200 100" preserveAspectRatio="none">
              <line x1="200" y1="50" x2="0" y2="50" stroke="#FFA500" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bottom-section">
          {/* Left: Key Events Timeline */}
          <div className="events-timeline">
            <svg className="timeline-line" width="3" height="100%">
              <line x1="1.5" y1="0" x2="1.5" y2="100%" stroke="#FFA500" strokeWidth="3" filter="url(#neonGlow)" />
            </svg>

            {data.events && data.events.slice(0, 4).map((event, idx) => (
              <div key={idx} className="timeline-event">
                <div className="event-icon orange-icon">
                  {getEventIcon(event.icon)}
                </div>
                <div className="event-content">
                  <div className="event-description">{event.description}</div>
                  <div className="event-distance">{event.distance_km.toFixed(1)} km</div>
                </div>
              </div>
            ))}
          </div>

          {/* Center: Heat Stress Chart */}
          {showTimeline && data.timeline && data.timeline.length > 0 && (
            <div className="heat-chart">
              <svg viewBox="0 0 600 250" preserveAspectRatio="none" width="100%" height="100%">
                <defs>
                  <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFA500" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#FFA500" stopOpacity="0.05"/>
                  </linearGradient>
                  <filter id="chartGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={`grid-${i}`}
                    x1="0"
                    y1={50 * i}
                    x2="600"
                    y2={50 * i}
                    stroke="rgba(255,165,0,0.1)"
                    strokeWidth="1"
                  />
                ))}

                {/* Vertical markers */}
                {[100, 200, 300, 400, 500].map((x) => (
                  <line
                    key={`vgrid-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="250"
                    stroke="rgba(255,165,0,0.08)"
                    strokeWidth="1"
                  />
                ))}

                {/* Chart line */}
                <path
                  d="M0,220 Q50,210 100,195 T200,160 T300,120 T400,90 T500,70 T600,60"
                  fill="none"
                  stroke="#FFA500"
                  strokeWidth="3"
                  filter="url(#chartGlow)"
                />

                {/* Fill area */}
                <path
                  d="M0,220 Q50,210 100,195 T200,160 T300,120 T400,90 T500,70 T600,60 L600,250 L0,250 Z"
                  fill="url(#chartFill)"
                />
              </svg>
            </div>
          )}

          {/* Right: Recommendations */}
          <div className="recommendations-card">
            <div className="rec-connector">
              <div className="rec-icon">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path d="M12,2 Q14,5 14,9 Q14,13 12,17 Q10,13 10,9 Q10,5 12,2 Z M12,17 L12,21"
                    fill="none"
                    stroke="#5FFFE5"
                    strokeWidth="2"
                    filter="url(#neonGlow)"
                  />
                  <circle cx="12" cy="22" r="1.5" fill="#5FFFE5" filter="url(#neonGlow)"/>
                </svg>
              </div>
              <svg className="rec-line" width="3" height="40">
                <line x1="1.5" y1="0" x2="1.5" y2="40" stroke="#5FFFE5" strokeWidth="2" opacity="0.6"/>
              </svg>
            </div>

            <div className="rec-box">
              <h3 className="rec-title">Recommendations</h3>
              <ul className="rec-list">
                {data.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx}>
                    <span className="bullet"></span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .weather-impact-cosmic {
          position: relative;
          min-height: 900px;
          padding: 60px 80px;
          background: #0a0a15;
          overflow: hidden;
        }

        /* Grid Background */
        .grid-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(0, 200, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 200, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(500px) rotateX(60deg);
          transform-origin: center bottom;
          opacity: 0.3;
        }

        .cosmic-content {
          position: relative;
          z-index: 1;
        }

        /* Header */
        .header-section {
          text-align: center;
          margin-bottom: 60px;
        }

        .main-title {
          font-size: 48px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 6px;
          margin: 0 0 12px 0;
          text-shadow:
            0 0 30px rgba(255, 255, 255, 0.5),
            0 0 60px rgba(255, 255, 255, 0.3);
        }

        .subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          letter-spacing: 2px;
        }

        /* Diamond Layout */
        .diamond-layout {
          position: relative;
          width: 100%;
          max-width: 1000px;
          height: 600px;
          margin: 0 auto 80px;
        }

        /* Metric Nodes */
        .metric-node {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .metric-node.top-left {
          top: 80px;
          left: 80px;
        }

        .metric-node.top-right {
          top: 80px;
          right: 80px;
        }

        .metric-node.bottom-left {
          bottom: 80px;
          left: 80px;
        }

        .metric-node.bottom-right {
          bottom: 80px;
          right: 80px;
        }

        /* Neon Circles */
        .neon-circle {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          position: relative;
        }

        .neon-circle.blue {
          border: 3px solid #00C8FF;
          background: rgba(0, 30, 50, 0.6);
          box-shadow:
            0 0 20px rgba(0, 200, 255, 0.6),
            inset 0 0 20px rgba(0, 200, 255, 0.2);
        }

        .neon-circle.orange {
          border: 3px solid #FFA500;
          background: rgba(50, 30, 0, 0.6);
          box-shadow:
            0 0 20px rgba(255, 165, 0, 0.6),
            inset 0 0 20px rgba(255, 165, 0, 0.2);
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          color: #FFD700;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
        }

        .metric-unit {
          font-size: 18px;
          font-weight: 400;
          color: #FFD700;
        }

        .metric-label {
          font-size: 15px;
          color: #FFD700;
          text-align: center;
          letter-spacing: 1px;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
        }

        /* Connector Lines */
        .connector-line {
          position: absolute;
          pointer-events: none;
        }

        .metric-node.top-left .connector-line {
          top: 50%;
          left: 100%;
          width: 200px;
          height: 100px;
          transform: translateY(-50%);
        }

        .metric-node.top-right .connector-line {
          top: 50%;
          right: 100%;
          width: 200px;
          height: 100px;
          transform: translateY(-50%);
        }

        .metric-node.bottom-left .connector-line {
          bottom: 50%;
          left: 100%;
          width: 200px;
          height: 100px;
          transform: translateY(50%);
        }

        .metric-node.bottom-right .connector-line {
          bottom: 50%;
          right: 100%;
          width: 200px;
          height: 100px;
          transform: translateY(50%);
        }

        /* Flame Center */
        .flame-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tall-flame {
          display: block;
          filter: drop-shadow(0 0 30px rgba(255, 165, 0, 0.8));
        }

        .level-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 30px;
        }

        .level-label {
          font-size: 20px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 3px;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.9);
          margin-bottom: 4px;
        }

        .level-number {
          font-size: 64px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 25px rgba(255, 215, 0, 0.9);
        }

        /* Bottom Section */
        .bottom-section {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          gap: 60px;
          max-width: 1200px;
          margin: 0 auto;
          align-items: start;
        }

        /* Events Timeline */
        .events-timeline {
          position: relative;
          padding-left: 50px;
        }

        .timeline-line {
          position: absolute;
          left: 18px;
          top: 0;
        }

        .timeline-event {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 28px;
          position: relative;
        }

        .event-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        .orange-icon {
          border: 2px solid #FFA500;
          background: rgba(50, 30, 0, 0.8);
          color: #FFA500;
          box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
        }

        .event-content {
          flex: 1;
          padding-top: 4px;
        }

        .event-description {
          font-size: 16px;
          color: #ffffff;
          margin-bottom: 4px;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
        }

        .event-distance {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Heat Chart */
        .heat-chart {
          background: rgba(10, 20, 40, 0.4);
          border: 1px solid rgba(255, 140, 0, 0.3);
          border-radius: 12px;
          padding: 20px;
          height: 250px;
        }

        /* Recommendations */
        .recommendations-card {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .rec-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 0;
        }

        .rec-icon {
          margin-bottom: -2px;
        }

        .rec-box {
          width: 100%;
          background: rgba(0, 20, 40, 0.7);
          border: 3px solid #5FFFE5;
          border-radius: 20px;
          padding: 28px;
          box-shadow:
            0 0 30px rgba(95, 255, 229, 0.4),
            inset 0 0 30px rgba(95, 255, 229, 0.1);
        }

        .rec-title {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 20px 0;
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .rec-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
        }

        .bullet {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #5FFFE5;
          flex-shrink: 0;
          margin-top: 8px;
          box-shadow: 0 0 10px #5FFFE5;
        }

        /* Responsive */
        @media (max-width: 1400px) {
          .bottom-section {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .events-timeline,
          .heat-chart,
          .recommendations-card {
            max-width: 700px;
            margin: 0 auto;
            width: 100%;
          }
        }

        @media (max-width: 1024px) {
          .weather-impact-cosmic {
            padding: 40px;
          }

          .main-title {
            font-size: 36px;
          }

          .diamond-layout {
            height: 500px;
          }

          .tall-flame {
            width: 250px;
            height: 333px;
          }
        }

        @media (max-width: 768px) {
          .weather-impact-cosmic {
            padding: 24px;
          }

          .main-title {
            font-size: 28px;
            letter-spacing: 3px;
          }

          .subtitle {
            font-size: 14px;
          }

          .diamond-layout {
            height: 400px;
          }

          .metric-node.top-left,
          .metric-node.bottom-left {
            left: 20px;
          }

          .metric-node.top-right,
          .metric-node.bottom-right {
            right: 20px;
          }

          .neon-circle {
            width: 80px;
            height: 80px;
          }

          .metric-value {
            font-size: 24px;
          }

          .metric-unit {
            font-size: 14px;
          }

          .tall-flame {
            width: 200px;
            height: 267px;
          }
        }
      `}</style>
    </div>
  );
}
