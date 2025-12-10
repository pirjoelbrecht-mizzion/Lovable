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
      {/* Futuristic Grid Background */}
      <div className="grid-background"></div>

      <div className="cosmic-content">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">HEAT & HUMIDITY IMPACT</h1>
          <p className="subtitle">{severityLabel[data.severity]} • Level {level}</p>
        </div>

        {/* Central Diamond Layout with Flame and Metrics */}
        <div className="diamond-container">
          {/* Diagonal Connectors SVG Layer */}
          <svg className="connectors-layer" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="connectorGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Top-Left to Center (diagonal down-right) */}
            <line x1="180" y1="150" x2="420" y2="280" stroke="#00C8FF" strokeWidth="2" opacity="0.7" filter="url(#connectorGlow)" />
            {/* Top-Right to Center (diagonal down-left) */}
            <line x1="820" y1="150" x2="580" y2="280" stroke="#00C8FF" strokeWidth="2" opacity="0.7" filter="url(#connectorGlow)" />
            {/* Bottom-Left to Center (diagonal up-right) */}
            <line x1="180" y1="450" x2="420" y2="320" stroke="#FFA500" strokeWidth="2" opacity="0.7" filter="url(#connectorGlow)" />
            {/* Bottom-Right to Center (diagonal up-left) */}
            <line x1="820" y1="450" x2="580" y2="320" stroke="#FFA500" strokeWidth="2" opacity="0.7" filter="url(#connectorGlow)" />
          </svg>

          {/* Top-Left: Temperature */}
          <div className="metric-node top-left">
            <div className="neon-circle cyan">
              <span className="metric-value">{Math.round(data.avgTemperature)}</span>
              <span className="metric-unit">°C</span>
            </div>
            <div className="metric-label cyan-text">Avg Temperature</div>
          </div>

          {/* Top-Right: Humidity */}
          <div className="metric-node top-right">
            <div className="neon-circle cyan">
              <span className="metric-value">{Math.round(data.avgHumidity)}</span>
              <span className="metric-unit">%</span>
            </div>
            <div className="metric-label cyan-text">Avg Humidity</div>
          </div>

          {/* Center: Tall Neon Flame with Level */}
          <div className="flame-center">
            <svg className="tall-neon-flame" viewBox="0 0 300 450" width="280" height="420">
              <defs>
                <filter id="flameGlow">
                  <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="flameGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#FFE600"/>
                  <stop offset="30%" stopColor="#FFAA00"/>
                  <stop offset="60%" stopColor="#FF8A00"/>
                  <stop offset="100%" stopColor="#FF5A00"/>
                </linearGradient>
              </defs>

              {/* Main flame outline - tall and narrow */}
              <path
                d="M150,40
                   Q165,70 170,110
                   Q175,150 173,190
                   Q171,230 165,270
                   Q160,310 155,350
                   Q152,380 150,410
                   Q148,380 145,350
                   Q140,310 135,270
                   Q129,230 127,190
                   Q125,150 130,110
                   Q135,70 150,40 Z"
                fill="none"
                stroke="url(#flameGradient)"
                strokeWidth="4"
                filter="url(#flameGlow)"
              />

              {/* Inner flame detail */}
              <path
                d="M150,80 Q145,120 147,170 Q149,220 150,270 Q151,220 153,170 Q155,120 150,80"
                fill="none"
                stroke="#FFE600"
                strokeWidth="2.5"
                opacity="0.8"
                filter="url(#flameGlow)"
              />

              {/* Flame flicker details */}
              <path
                d="M145,60 Q150,75 155,90"
                fill="none"
                stroke="#FFE600"
                strokeWidth="2"
                opacity="0.7"
              />
              <path
                d="M140,100 Q145,115 148,130"
                fill="none"
                stroke="#FFAA00"
                strokeWidth="1.5"
                opacity="0.6"
              />
            </svg>

            <div className="level-badge">
              <div className="level-label">LEVEL</div>
              <div className="level-number">{level}</div>
            </div>
          </div>

          {/* Bottom-Left: Heat Index */}
          <div className="metric-node bottom-left">
            <div className="neon-circle orange">
              <span className="metric-value">{Math.round(data.heatIndex)}</span>
              <span className="metric-unit">°C</span>
            </div>
            <div className="metric-label orange-text">Heat Index</div>
          </div>

          {/* Bottom-Right: Danger Zone */}
          <div className="metric-node bottom-right">
            <div className="neon-circle orange">
              <span className="metric-value">{data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}</span>
              <span className="metric-unit">min</span>
            </div>
            <div className="metric-label orange-text">Danger Zone</div>
          </div>
        </div>

        {/* Bottom Section: Timeline, Chart, Recommendations */}
        <div className="bottom-grid">
          {/* Left: Vertical Event Timeline */}
          <div className="events-timeline">
            <div className="timeline-track">
              <svg className="vertical-line" width="4" height="100%" preserveAspectRatio="none">
                <defs>
                  <filter id="timelineGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <line x1="2" y1="0" x2="2" y2="100%" stroke="#FFA500" strokeWidth="3" filter="url(#timelineGlow)"/>
              </svg>
            </div>

            <div className="timeline-events">
              {data.events && data.events.slice(0, 4).map((event, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="event-icon-circle">
                    <span className="event-symbol">{getEventIcon(event.icon)}</span>
                  </div>
                  <div className="event-info">
                    <div className="event-title">{event.description}</div>
                    <div className="event-km">{event.distance_km.toFixed(1)} km</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Heat Stress Chart */}
          <div className="stress-chart">
            {showTimeline && data.timeline && data.timeline.length > 0 && (
              <svg className="chart-svg" viewBox="0 0 700 280" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#FF8A00" stopOpacity="0.05"/>
                  </linearGradient>
                  <filter id="chartLineGlow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <line
                    key={`h-grid-${i}`}
                    x1="0"
                    y1={i * 56}
                    x2="700"
                    y2={i * 56}
                    stroke="rgba(255, 138, 0, 0.12)"
                    strokeWidth="1"
                  />
                ))}
                {[0, 100, 200, 300, 400, 500, 600, 700].map((x) => (
                  <line
                    key={`v-grid-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="280"
                    stroke="rgba(255, 138, 0, 0.08)"
                    strokeWidth="1"
                  />
                ))}

                {/* Heat stress curve with peaks */}
                <path
                  d="M0,240 Q80,230 140,210 T250,170 Q320,140 380,110 T480,85 Q540,70 600,55 T700,40"
                  fill="none"
                  stroke="#FF8A00"
                  strokeWidth="3.5"
                  filter="url(#chartLineGlow)"
                />

                {/* Area fill under curve */}
                <path
                  d="M0,240 Q80,230 140,210 T250,170 Q320,140 380,110 T480,85 Q540,70 600,55 T700,40 L700,280 L0,280 Z"
                  fill="url(#chartAreaFill)"
                />
              </svg>
            )}
          </div>

          {/* Right: Recommendations Card */}
          <div className="recommendations-section">
            {/* Flame icon above card */}
            <div className="rec-top-icon">
              <svg className="teal-droplet" viewBox="0 0 40 50" width="36" height="45">
                <defs>
                  <filter id="dropletGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M20,5 Q23,10 24,16 Q25,22 24,28 Q23,34 20,40 Q17,34 16,28 Q15,22 16,16 Q17,10 20,5 Z"
                  fill="none"
                  stroke="#5FFFE5"
                  strokeWidth="2.5"
                  filter="url(#dropletGlow)"
                />
                <circle cx="20" cy="45" r="2" fill="#5FFFE5" filter="url(#dropletGlow)"/>
              </svg>
            </div>

            {/* Connector line */}
            <div className="rec-connector-line">
              <svg width="4" height="45" preserveAspectRatio="none">
                <line x1="2" y1="0" x2="2" y2="45" stroke="#5FFFE5" strokeWidth="2" opacity="0.6"/>
              </svg>
            </div>

            {/* Recommendations card */}
            <div className="rec-card">
              <h3 className="rec-header">Recommendations</h3>
              <ul className="rec-items">
                {data.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="rec-item">
                    <span className="rec-dot"></span>
                    <span className="rec-text">{rec}</span>
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
          min-height: 950px;
          padding: 50px 70px;
          background: #0a0a15;
          overflow: hidden;
        }

        /* Futuristic Grid Background */
        .grid-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(0, 200, 255, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 200, 255, 0.12) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(600px) rotateX(60deg);
          transform-origin: center bottom;
          opacity: 0.35;
        }

        .cosmic-content {
          position: relative;
          z-index: 1;
        }

        /* Header */
        .header-section {
          text-align: center;
          margin-bottom: 50px;
        }

        .main-title {
          font-size: 50px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 7px;
          margin: 0 0 10px 0;
          text-shadow:
            0 0 35px rgba(255, 255, 255, 0.6),
            0 0 70px rgba(255, 255, 255, 0.3);
        }

        .subtitle {
          font-size: 17px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          letter-spacing: 2px;
        }

        /* Diamond Container */
        .diamond-container {
          position: relative;
          width: 100%;
          max-width: 1000px;
          height: 600px;
          margin: 0 auto 70px;
        }

        /* Connectors Layer */
        .connectors-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        /* Metric Nodes */
        .metric-node {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 2;
        }

        .metric-node.top-left {
          top: 100px;
          left: 70px;
        }

        .metric-node.top-right {
          top: 100px;
          right: 70px;
        }

        .metric-node.bottom-left {
          bottom: 100px;
          left: 70px;
        }

        .metric-node.bottom-right {
          bottom: 100px;
          right: 70px;
        }

        /* Neon Circles */
        .neon-circle {
          width: 115px;
          height: 115px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          position: relative;
        }

        .neon-circle.cyan {
          border: 3px solid #00C8FF;
          background: rgba(0, 30, 50, 0.65);
          box-shadow:
            0 0 25px rgba(0, 200, 255, 0.7),
            inset 0 0 25px rgba(0, 200, 255, 0.2);
        }

        .neon-circle.orange {
          border: 3px solid #FFA500;
          background: rgba(50, 30, 0, 0.65);
          box-shadow:
            0 0 25px rgba(255, 165, 0, 0.7),
            inset 0 0 25px rgba(255, 165, 0, 0.2);
        }

        .metric-value {
          font-size: 34px;
          font-weight: 700;
          color: #FFD700;
          text-shadow: 0 0 18px rgba(255, 215, 0, 0.9);
        }

        .metric-unit {
          font-size: 19px;
          font-weight: 400;
          color: #FFD700;
        }

        .metric-label {
          font-size: 15px;
          text-align: center;
          letter-spacing: 1px;
        }

        .cyan-text {
          color: #FFD700;
          text-shadow: 0 0 12px rgba(255, 215, 0, 0.7);
        }

        .orange-text {
          color: #FFD700;
          text-shadow: 0 0 12px rgba(255, 215, 0, 0.7);
        }

        /* Tall Neon Flame */
        .flame-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 3;
        }

        .tall-neon-flame {
          display: block;
          filter: drop-shadow(0 0 35px rgba(255, 138, 0, 0.9));
        }

        .level-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 40px;
        }

        .level-label {
          font-size: 22px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 4px;
          text-shadow: 0 0 22px rgba(255, 215, 0, 1);
          margin-bottom: 5px;
        }

        .level-number {
          font-size: 72px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 28px rgba(255, 215, 0, 1);
        }

        /* Bottom Grid */
        .bottom-grid {
          display: grid;
          grid-template-columns: 300px 1fr 340px;
          gap: 50px;
          max-width: 1300px;
          margin: 0 auto;
        }

        /* Events Timeline */
        .events-timeline {
          position: relative;
          padding-left: 60px;
        }

        .timeline-track {
          position: absolute;
          left: 20px;
          top: 0;
          height: 100%;
        }

        .vertical-line {
          height: 100%;
        }

        .timeline-events {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          position: relative;
        }

        .event-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2.5px solid #FFA500;
          background: rgba(50, 30, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 18px rgba(255, 165, 0, 0.7);
          position: relative;
          z-index: 2;
        }

        .event-symbol {
          font-size: 22px;
          color: #FFA500;
        }

        .event-info {
          flex: 1;
          padding-top: 6px;
        }

        .event-title {
          font-size: 16px;
          color: #ffffff;
          margin-bottom: 5px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .event-km {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Stress Chart */
        .stress-chart {
          background: rgba(10, 20, 40, 0.45);
          border: 1px solid rgba(255, 140, 0, 0.35);
          border-radius: 14px;
          padding: 22px;
          min-height: 280px;
        }

        .chart-svg {
          width: 100%;
          height: 100%;
        }

        /* Recommendations Section */
        .recommendations-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .rec-top-icon {
          margin-bottom: -2px;
        }

        .teal-droplet {
          filter: drop-shadow(0 0 12px rgba(95, 255, 229, 0.8));
        }

        .rec-connector-line {
          margin-bottom: -2px;
        }

        .rec-card {
          width: 100%;
          background: rgba(0, 20, 40, 0.75);
          border: 3px solid #5FFFE5;
          border-radius: 22px;
          padding: 30px;
          box-shadow:
            0 0 32px rgba(95, 255, 229, 0.45),
            inset 0 0 32px rgba(95, 255, 229, 0.12);
        }

        .rec-header {
          font-size: 23px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 22px 0;
          text-shadow: 0 0 16px rgba(255, 255, 255, 0.6);
        }

        .rec-items {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .rec-item {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .rec-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #5FFFE5;
          flex-shrink: 0;
          margin-top: 8px;
          box-shadow: 0 0 12px #5FFFE5;
        }

        .rec-text {
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.92);
        }

        /* Responsive */
        @media (max-width: 1400px) {
          .bottom-grid {
            grid-template-columns: 1fr;
            gap: 45px;
          }

          .events-timeline,
          .stress-chart,
          .recommendations-section {
            max-width: 750px;
            margin: 0 auto;
            width: 100%;
          }
        }

        @media (max-width: 1024px) {
          .weather-impact-cosmic {
            padding: 40px;
          }

          .main-title {
            font-size: 38px;
          }

          .diamond-container {
            height: 520px;
          }

          .tall-neon-flame {
            width: 240px;
            height: 360px;
          }
        }

        @media (max-width: 768px) {
          .weather-impact-cosmic {
            padding: 28px;
          }

          .main-title {
            font-size: 30px;
            letter-spacing: 4px;
          }

          .subtitle {
            font-size: 15px;
          }

          .diamond-container {
            height: 450px;
          }

          .metric-node.top-left,
          .metric-node.bottom-left {
            left: 25px;
          }

          .metric-node.top-right,
          .metric-node.bottom-right {
            right: 25px;
          }

          .neon-circle {
            width: 90px;
            height: 90px;
          }

          .metric-value {
            font-size: 26px;
          }

          .metric-unit {
            font-size: 15px;
          }

          .tall-neon-flame {
            width: 200px;
            height: 300px;
          }

          .level-number {
            font-size: 56px;
          }
        }
      `}</style>
    </div>
  );
}
