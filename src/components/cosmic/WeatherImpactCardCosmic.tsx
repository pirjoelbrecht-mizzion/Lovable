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
    <div className={`weather-impact-cosmic ${className}`}>
      {/* Futuristic Grid Background */}
      <div className="cosmic-grid-bg"></div>

      <div className="cosmic-wrapper">
        {/* Header Section */}
        <div className="cosmic-header">
          <h1 className="cosmic-title">HEAT & HUMIDITY IMPACT</h1>
          <p className="cosmic-subtitle">{severityLabel[data.severity]} • Level {level}</p>
        </div>

        {/* Main Diamond Layout */}
        <div className="diamond-layout-container">
          {/* SVG Layer for Diagonal Connectors */}
          <svg className="connector-svg-layer" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="connGlow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Top-Left (Temp) to Center - diagonal down-right */}
            <line x1="180" y1="140" x2="430" y2="290" stroke="#00C8FF" strokeWidth="2.5" opacity="0.8" filter="url(#connGlow)" />

            {/* Top-Right (Humidity) to Center - diagonal down-left */}
            <line x1="820" y1="140" x2="570" y2="290" stroke="#00C8FF" strokeWidth="2.5" opacity="0.8" filter="url(#connGlow)" />

            {/* Bottom-Left (Heat Index) to Center - diagonal up-right */}
            <line x1="180" y1="460" x2="430" y2="310" stroke="#FFA500" strokeWidth="2.5" opacity="0.8" filter="url(#connGlow)" />

            {/* Bottom-Right (Danger Zone) to Center - diagonal up-left */}
            <line x1="820" y1="460" x2="570" y2="310" stroke="#FFA500" strokeWidth="2.5" opacity="0.8" filter="url(#connGlow)" />
          </svg>

          {/* Top-Left Metric: Temperature */}
          <div className="metric-circle-node node-top-left">
            <div className="metric-circle cyan-circle">
              <span className="metric-num">{Math.round(data.avgTemperature)}</span>
              <span className="metric-suffix">°C</span>
            </div>
            <div className="metric-name">Avg Temperature</div>
          </div>

          {/* Top-Right Metric: Humidity */}
          <div className="metric-circle-node node-top-right">
            <div className="metric-circle cyan-circle">
              <span className="metric-num">{Math.round(data.avgHumidity)}</span>
              <span className="metric-suffix">%</span>
            </div>
            <div className="metric-name">Avg Humidity</div>
          </div>

          {/* Center: Large Neon Flame with Level Badge */}
          <div className="flame-center-container">
            <svg className="flame-svg" viewBox="0 0 280 440" width="280" height="440">
              <defs>
                <filter id="flameGlowEffect">
                  <feGaussianBlur stdDeviation="18" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#FFEB3B"/>
                  <stop offset="25%" stopColor="#FFB300"/>
                  <stop offset="60%" stopColor="#FF8A00"/>
                  <stop offset="100%" stopColor="#FF5A00"/>
                </linearGradient>
              </defs>

              {/* Main flame shape - tall and prominent */}
              <path
                d="M140,35
                   C145,45 150,60 155,85
                   Q160,115 162,150
                   Q164,185 163,220
                   Q162,255 158,290
                   Q155,320 152,350
                   Q150,375 148,395
                   Q147,405 140,415
                   Q133,405 132,395
                   Q130,375 128,350
                   Q125,320 122,290
                   Q118,255 117,220
                   Q116,185 118,150
                   Q120,115 125,85
                   C130,60 135,45 140,35 Z"
                fill="none"
                stroke="url(#flameGrad)"
                strokeWidth="5"
                filter="url(#flameGlowEffect)"
              />

              {/* Inner flame bright line */}
              <path
                d="M140,75 Q137,110 138,155 Q139,200 140,250 Q141,300 140,340"
                fill="none"
                stroke="#FFEB3B"
                strokeWidth="3"
                opacity="0.85"
                filter="url(#flameGlowEffect)"
              />

              {/* Flame flicker accents */}
              <path
                d="M135,55 Q140,70 145,85"
                fill="none"
                stroke="#FFEB3B"
                strokeWidth="2.5"
                opacity="0.75"
              />
              <path
                d="M132,100 Q138,120 140,140"
                fill="none"
                stroke="#FFB300"
                strokeWidth="2"
                opacity="0.65"
              />
            </svg>

            {/* Level Badge Inside Flame */}
            <div className="level-badge-overlay">
              <div className="level-text">LEVEL</div>
              <div className="level-num">{level}</div>
            </div>
          </div>

          {/* Bottom-Left Metric: Heat Index */}
          <div className="metric-circle-node node-bottom-left">
            <div className="metric-circle orange-circle">
              <span className="metric-num">{Math.round(data.heatIndex)}</span>
              <span className="metric-suffix">°C</span>
            </div>
            <div className="metric-name">Heat Index</div>
          </div>

          {/* Bottom-Right Metric: Danger Zone */}
          <div className="metric-circle-node node-bottom-right">
            <div className="metric-circle orange-circle">
              <span className="metric-num">{data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}</span>
              <span className="metric-suffix">min</span>
            </div>
            <div className="metric-name">Danger Zone</div>
          </div>
        </div>

        {/* Bottom Three-Column Section */}
        <div className="bottom-three-col">
          {/* Left Column: Vertical Event Timeline */}
          <div className="event-timeline-col">
            <div className="timeline-vertical-bar">
              <svg width="4" height="100%" preserveAspectRatio="none">
                <defs>
                  <filter id="timelineGlowFilter">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <line x1="2" y1="0" x2="2" y2="100%" stroke="#FFA500" strokeWidth="3.5" filter="url(#timelineGlowFilter)"/>
              </svg>
            </div>

            <div className="timeline-items-list">
              {data.events && data.events.slice(0, 4).map((event, idx) => (
                <div key={idx} className="timeline-event-row">
                  <div className="event-circle-icon">
                    {event.icon === 'hr_drift' && <span className="event-symbol">⚡</span>}
                    {event.icon === 'hydration' && <span className="event-symbol">⟳</span>}
                    {event.icon === 'warning' && <span className="event-symbol">△</span>}
                    {event.icon === 'pace_drop' && <span className="event-symbol">∿</span>}
                    {event.icon === 'default' && <span className="event-symbol">○</span>}
                  </div>
                  <div className="event-text-block">
                    <div className="event-desc">{event.description}</div>
                    <div className="event-dist">{event.distance_km.toFixed(1)} km</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Column: Heat Stress Chart */}
          <div className="heat-chart-col">
            {showTimeline && data.timeline && data.timeline.length > 0 && (
              <svg className="stress-chart-svg" viewBox="0 0 700 280" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.45"/>
                    <stop offset="100%" stopColor="#FF8A00" stopOpacity="0.05"/>
                  </linearGradient>
                  <filter id="chartGlowFilter">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid - horizontal */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <line
                    key={`hgrid-${i}`}
                    x1="0"
                    y1={i * 56}
                    x2="700"
                    y2={i * 56}
                    stroke="rgba(255, 138, 0, 0.13)"
                    strokeWidth="1"
                  />
                ))}

                {/* Grid - vertical */}
                {[0, 100, 200, 300, 400, 500, 600, 700].map((x) => (
                  <line
                    key={`vgrid-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="280"
                    stroke="rgba(255, 138, 0, 0.09)"
                    strokeWidth="1"
                  />
                ))}

                {/* Stress curve with peaks */}
                <path
                  d="M0,245 Q70,235 130,215 Q190,195 240,175 Q290,150 350,120 Q410,95 470,80 Q530,68 590,58 Q640,50 700,42"
                  fill="none"
                  stroke="#FF8A00"
                  strokeWidth="4"
                  filter="url(#chartGlowFilter)"
                />

                {/* Fill under curve */}
                <path
                  d="M0,245 Q70,235 130,215 Q190,195 240,175 Q290,150 350,120 Q410,95 470,80 Q530,68 590,58 Q640,50 700,42 L700,280 L0,280 Z"
                  fill="url(#chartGradFill)"
                />
              </svg>
            )}
          </div>

          {/* Right Column: Recommendations Card */}
          <div className="recommendations-col">
            {/* Teal flame icon above */}
            <div className="rec-icon-top">
              <svg className="teal-flame-icon" viewBox="0 0 40 52" width="38" height="52">
                <defs>
                  <filter id="tealFlameGlow">
                    <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Droplet/flame shape */}
                <path
                  d="M20,4 Q24,9 25,16 Q26,23 25,30 Q24,37 20,42 Q16,37 15,30 Q14,23 15,16 Q16,9 20,4 Z"
                  fill="none"
                  stroke="#5FFFE5"
                  strokeWidth="3"
                  filter="url(#tealFlameGlow)"
                />
                {/* Drop at bottom */}
                <circle cx="20" cy="47" r="2.5" fill="#5FFFE5" filter="url(#tealFlameGlow)"/>
              </svg>
            </div>

            {/* Connector line to card */}
            <div className="rec-line-connector">
              <svg width="4" height="48" preserveAspectRatio="none">
                <line x1="2" y1="0" x2="2" y2="48" stroke="#5FFFE5" strokeWidth="2.5" opacity="0.65"/>
              </svg>
            </div>

            {/* Recommendations card with teal border */}
            <div className="rec-card-box">
              <h3 className="rec-title">Recommendations</h3>
              <ul className="rec-bullet-list">
                {data.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="rec-list-item">
                    <span className="teal-bullet-dot"></span>
                    <span className="rec-item-text">{rec}</span>
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
          min-height: 980px;
          padding: 55px 75px;
          background: #08081a;
          overflow: hidden;
        }

        /* Grid Background */
        .cosmic-grid-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(0, 200, 255, 0.14) 1.5px, transparent 1.5px),
            linear-gradient(90deg, rgba(0, 200, 255, 0.14) 1.5px, transparent 1.5px);
          background-size: 50px 50px;
          transform: perspective(650px) rotateX(62deg);
          transform-origin: center bottom;
          opacity: 0.4;
        }

        .cosmic-wrapper {
          position: relative;
          z-index: 1;
        }

        /* Header */
        .cosmic-header {
          text-align: center;
          margin-bottom: 55px;
        }

        .cosmic-title {
          font-size: 52px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 8px;
          margin: 0 0 12px 0;
          text-shadow:
            0 0 40px rgba(255, 255, 255, 0.65),
            0 0 80px rgba(255, 255, 255, 0.35);
        }

        .cosmic-subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.82);
          margin: 0;
          letter-spacing: 2.5px;
        }

        /* Diamond Layout Container */
        .diamond-layout-container {
          position: relative;
          width: 100%;
          max-width: 1000px;
          height: 620px;
          margin: 0 auto 75px;
        }

        /* Connector SVG Layer */
        .connector-svg-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        /* Metric Circle Nodes */
        .metric-circle-node {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }

        .node-top-left {
          top: 90px;
          left: 65px;
        }

        .node-top-right {
          top: 90px;
          right: 65px;
        }

        .node-bottom-left {
          bottom: 95px;
          left: 65px;
        }

        .node-bottom-right {
          bottom: 95px;
          right: 65px;
        }

        /* Metric Circles */
        .metric-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .cyan-circle {
          border: 3.5px solid #00C8FF;
          background: rgba(0, 35, 55, 0.7);
          box-shadow:
            0 0 28px rgba(0, 200, 255, 0.75),
            inset 0 0 28px rgba(0, 200, 255, 0.25);
        }

        .orange-circle {
          border: 3.5px solid #FFA500;
          background: rgba(55, 30, 0, 0.7);
          box-shadow:
            0 0 28px rgba(255, 165, 0, 0.75),
            inset 0 0 28px rgba(255, 165, 0, 0.25);
        }

        .metric-num {
          font-size: 38px;
          font-weight: 700;
          color: #FFD700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.95);
        }

        .metric-suffix {
          font-size: 20px;
          font-weight: 400;
          color: #FFD700;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.85);
        }

        .metric-name {
          font-size: 16px;
          color: #FFD700;
          text-align: center;
          letter-spacing: 1.2px;
          text-shadow: 0 0 14px rgba(255, 215, 0, 0.75);
        }

        /* Flame Center */
        .flame-center-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 3;
        }

        .flame-svg {
          display: block;
          filter: drop-shadow(0 0 40px rgba(255, 138, 0, 0.95));
        }

        .level-badge-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 45px;
        }

        .level-text {
          font-size: 24px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 5px;
          text-shadow: 0 0 24px rgba(255, 215, 0, 1);
          margin-bottom: 6px;
        }

        .level-num {
          font-size: 78px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 32px rgba(255, 215, 0, 1);
        }

        /* Bottom Three Columns */
        .bottom-three-col {
          display: grid;
          grid-template-columns: 310px 1fr 350px;
          gap: 55px;
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Event Timeline Column */
        .event-timeline-col {
          position: relative;
          padding-left: 65px;
        }

        .timeline-vertical-bar {
          position: absolute;
          left: 22px;
          top: 0;
          height: 100%;
        }

        .timeline-items-list {
          display: flex;
          flex-direction: column;
          gap: 35px;
        }

        .timeline-event-row {
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }

        .event-circle-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 3px solid #FFA500;
          background: rgba(55, 30, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(255, 165, 0, 0.75);
          position: relative;
          z-index: 2;
        }

        .event-symbol {
          font-size: 24px;
          color: #FFA500;
        }

        .event-text-block {
          flex: 1;
          padding-top: 7px;
        }

        .event-desc {
          font-size: 17px;
          color: #ffffff;
          margin-bottom: 6px;
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.55);
        }

        .event-dist {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.62);
        }

        /* Heat Chart Column */
        .heat-chart-col {
          background: rgba(12, 22, 45, 0.5);
          border: 1.5px solid rgba(255, 140, 0, 0.38);
          border-radius: 16px;
          padding: 24px;
          min-height: 280px;
        }

        .stress-chart-svg {
          width: 100%;
          height: 100%;
        }

        /* Recommendations Column */
        .recommendations-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .rec-icon-top {
          margin-bottom: -3px;
        }

        .teal-flame-icon {
          filter: drop-shadow(0 0 14px rgba(95, 255, 229, 0.85));
        }

        .rec-line-connector {
          margin-bottom: -3px;
        }

        .rec-card-box {
          width: 100%;
          background: rgba(0, 22, 45, 0.78);
          border: 3.5px solid #5FFFE5;
          border-radius: 24px;
          padding: 32px;
          box-shadow:
            0 0 35px rgba(95, 255, 229, 0.48),
            inset 0 0 35px rgba(95, 255, 229, 0.14);
        }

        .rec-title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 24px 0;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.65);
        }

        .rec-bullet-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .rec-list-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .teal-bullet-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #5FFFE5;
          flex-shrink: 0;
          margin-top: 9px;
          box-shadow: 0 0 14px #5FFFE5;
        }

        .rec-item-text {
          font-size: 17px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.93);
        }

        /* Responsive */
        @media (max-width: 1450px) {
          .bottom-three-col {
            grid-template-columns: 1fr;
            gap: 50px;
          }

          .event-timeline-col,
          .heat-chart-col,
          .recommendations-col {
            max-width: 780px;
            margin: 0 auto;
            width: 100%;
          }
        }

        @media (max-width: 1024px) {
          .weather-impact-cosmic {
            padding: 42px;
          }

          .cosmic-title {
            font-size: 40px;
          }

          .diamond-layout-container {
            height: 540px;
          }

          .flame-svg {
            width: 250px;
            height: 393px;
          }
        }

        @media (max-width: 768px) {
          .weather-impact-cosmic {
            padding: 30px;
          }

          .cosmic-title {
            font-size: 32px;
            letter-spacing: 5px;
          }

          .cosmic-subtitle {
            font-size: 16px;
          }

          .diamond-layout-container {
            height: 470px;
          }

          .node-top-left,
          .node-bottom-left {
            left: 28px;
          }

          .node-top-right,
          .node-bottom-right {
            right: 28px;
          }

          .metric-circle {
            width: 95px;
            height: 95px;
          }

          .metric-num {
            font-size: 28px;
          }

          .metric-suffix {
            font-size: 16px;
          }

          .flame-svg {
            width: 210px;
            height: 330px;
          }

          .level-num {
            font-size: 60px;
          }
        }
      `}</style>
    </div>
  );
}
