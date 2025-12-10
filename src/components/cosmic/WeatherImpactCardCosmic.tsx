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
    <div className={`cosmic-heat-impact ${className}`}>
      {/* Sci-fi Grid Background */}
      <div className="cosmic-perspective-grid"></div>

      <div className="cosmic-content-wrapper">
        {/* Title Header */}
        <div className="impact-header">
          <h1 className="impact-title">HEAT & HUMIDITY IMPACT</h1>
          <p className="impact-subtitle">{severityLabel[data.severity]} • Level {level}</p>
        </div>

        {/* Diamond Layout: Metrics + Central Flame */}
        <div className="diamond-metrics-section">
          <svg className="diagonal-connectors-svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="neonConnectorGlow">
                <feGaussianBlur stdDeviation="5" result="blurEffect"/>
                <feMerge>
                  <feMergeNode in="blurEffect"/>
                  <feMergeNode in="blurEffect"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Diagonal connector: Top-Left Temperature to Center Flame */}
            <line
              x1="200" y1="160"
              x2="520" y2="340"
              stroke="#00E5FF"
              strokeWidth="3.5"
              opacity="0.85"
              filter="url(#neonConnectorGlow)"
            />

            {/* Diagonal connector: Top-Right Humidity to Center Flame */}
            <line
              x1="1000" y1="160"
              x2="680" y2="340"
              stroke="#00E5FF"
              strokeWidth="3.5"
              opacity="0.85"
              filter="url(#neonConnectorGlow)"
            />

            {/* Diagonal connector: Bottom-Left Heat Index to Center Flame */}
            <line
              x1="200" y1="540"
              x2="520" y2="360"
              stroke="#FF8C00"
              strokeWidth="3.5"
              opacity="0.85"
              filter="url(#neonConnectorGlow)"
            />

            {/* Diagonal connector: Bottom-Right Danger Zone to Center Flame */}
            <line
              x1="1000" y1="540"
              x2="680" y2="360"
              stroke="#FF8C00"
              strokeWidth="3.5"
              opacity="0.85"
              filter="url(#neonConnectorGlow)"
            />
          </svg>

          {/* Top-Left Metric: Average Temperature */}
          <div className="metric-node position-top-left">
            <div className="metric-circle-glow cyan-glow">
              <div className="metric-value">{Math.round(data.avgTemperature)}</div>
              <div className="metric-unit">°C</div>
            </div>
            <div className="metric-label">Avg Temperature</div>
          </div>

          {/* Top-Right Metric: Average Humidity */}
          <div className="metric-node position-top-right">
            <div className="metric-circle-glow cyan-glow">
              <div className="metric-value">{Math.round(data.avgHumidity)}</div>
              <div className="metric-unit">%</div>
            </div>
            <div className="metric-label">Avg Humidity</div>
          </div>

          {/* Center: Large Tall Neon Flame */}
          <div className="central-flame-container">
            <svg className="tall-neon-flame" viewBox="0 0 320 520" width="320" height="520">
              <defs>
                <filter id="massiveFlameGlow">
                  <feGaussianBlur stdDeviation="24" result="hugeBlur"/>
                  <feMerge>
                    <feMergeNode in="hugeBlur"/>
                    <feMergeNode in="hugeBlur"/>
                    <feMergeNode in="hugeBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="flameOrangeGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#FFF176"/>
                  <stop offset="20%" stopColor="#FFD54F"/>
                  <stop offset="45%" stopColor="#FFB74D"/>
                  <stop offset="70%" stopColor="#FF8A65"/>
                  <stop offset="100%" stopColor="#FF5722"/>
                </linearGradient>
              </defs>

              {/* Main tall flame body - WIDE and TALL */}
              <path
                d="M160,30
                   C170,45 180,65 185,95
                   Q195,140 198,190
                   Q200,240 198,290
                   Q195,340 188,385
                   Q182,425 175,455
                   Q170,475 160,495
                   Q150,475 145,455
                   Q138,425 132,385
                   Q125,340 122,290
                   Q120,240 122,190
                   Q125,140 135,95
                   C140,65 150,45 160,30 Z"
                fill="none"
                stroke="url(#flameOrangeGradient)"
                strokeWidth="8"
                filter="url(#massiveFlameGlow)"
              />

              {/* Inner flame glow spine */}
              <path
                d="M160,80 Q158,140 160,200 Q162,270 160,340 Q159,400 160,440"
                fill="none"
                stroke="#FFF176"
                strokeWidth="5"
                opacity="0.95"
                filter="url(#massiveFlameGlow)"
              />

              {/* Flame tip accent */}
              <path
                d="M155,40 Q160,55 165,70"
                fill="none"
                stroke="#FFEB3B"
                strokeWidth="4"
                opacity="0.85"
              />

              {/* Side flame wisps */}
              <path
                d="M145,120 Q160,150 165,180"
                fill="none"
                stroke="#FFB300"
                strokeWidth="3"
                opacity="0.7"
              />
              <path
                d="M175,120 Q160,150 155,180"
                fill="none"
                stroke="#FFB300"
                strokeWidth="3"
                opacity="0.7"
              />
            </svg>

            {/* LEVEL badge INSIDE the flame */}
            <div className="flame-level-badge">
              <div className="badge-level-text">LEVEL</div>
              <div className="badge-level-number">{level}</div>
            </div>
          </div>

          {/* Bottom-Left Metric: Heat Index */}
          <div className="metric-node position-bottom-left">
            <div className="metric-circle-glow orange-glow">
              <div className="metric-value">{Math.round(data.heatIndex)}</div>
              <div className="metric-unit">°C</div>
            </div>
            <div className="metric-label">Heat Index</div>
          </div>

          {/* Bottom-Right Metric: Danger Zone */}
          <div className="metric-node position-bottom-right">
            <div className="metric-circle-glow orange-glow">
              <div className="metric-value">{data.dangerZoneMinutes !== undefined ? Math.round(data.dangerZoneMinutes) : 0}</div>
              <div className="metric-unit">min</div>
            </div>
            <div className="metric-label">Danger Zone</div>
          </div>
        </div>

        {/* Heat Stress Chart - Directly Under Flame */}
        <div className="heat-stress-chart-section">
          {showTimeline && data.timeline && data.timeline.length > 0 && (
            <div className="chart-container">
              <svg className="neon-stress-curve" viewBox="0 0 800 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#FF8C00" stopOpacity="0"/>
                  </linearGradient>
                  <filter id="chartLineGlow">
                    <feGaussianBlur stdDeviation="6" result="glowBlur"/>
                    <feMerge>
                      <feMergeNode in="glowBlur"/>
                      <feMergeNode in="glowBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Background grid - horizontal */}
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <line
                    key={`h-${i}`}
                    x1="0" y1={i * 50}
                    x2="800" y2={i * 50}
                    stroke="rgba(255, 140, 0, 0.15)"
                    strokeWidth="1"
                  />
                ))}

                {/* Background grid - vertical */}
                {[0, 100, 200, 300, 400, 500, 600, 700, 800].map((x) => (
                  <line
                    key={`v-${x}`}
                    x1={x} y1="0"
                    x2={x} y2="300"
                    stroke="rgba(255, 140, 0, 0.1)"
                    strokeWidth="1"
                  />
                ))}

                {/* Neon orange stress curve - smooth ascending */}
                <path
                  d="M0,260 Q80,250 150,230 Q230,205 310,175 Q390,140 480,110 Q570,85 660,65 Q730,50 800,40"
                  fill="none"
                  stroke="#FF8C00"
                  strokeWidth="5"
                  filter="url(#chartLineGlow)"
                />

                {/* Area fill under curve */}
                <path
                  d="M0,260 Q80,250 150,230 Q230,205 310,175 Q390,140 480,110 Q570,85 660,65 Q730,50 800,40 L800,300 L0,300 Z"
                  fill="url(#chartAreaGrad)"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Bottom Three-Column Layout */}
        <div className="bottom-layout-grid">
          {/* Left Column: Vertical Event Timeline */}
          <div className="events-timeline-vertical">
            <div className="vertical-neon-line">
              <svg width="5" height="100%" preserveAspectRatio="none">
                <defs>
                  <filter id="verticalLineGlow">
                    <feGaussianBlur stdDeviation="3" result="lineBlur"/>
                    <feMerge>
                      <feMergeNode in="lineBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <line
                  x1="2.5" y1="0"
                  x2="2.5" y2="100%"
                  stroke="#FF8C00"
                  strokeWidth="4"
                  filter="url(#verticalLineGlow)"
                />
              </svg>
            </div>

            <div className="timeline-events-list">
              {data.events && data.events.slice(0, 4).map((event, idx) => (
                <div key={idx} className="timeline-event-item">
                  <div className="event-icon-circle">
                    {event.icon === 'hr_drift' && <span className="icon-symbol">⚡</span>}
                    {event.icon === 'hydration' && <span className="icon-symbol">⟳</span>}
                    {event.icon === 'warning' && <span className="icon-symbol">△</span>}
                    {event.icon === 'pace_drop' && <span className="icon-symbol">∿</span>}
                    {event.icon === 'default' && <span className="icon-symbol">●</span>}
                  </div>
                  <div className="event-text-content">
                    <div className="event-description">{event.description}</div>
                    <div className="event-distance">{event.distance_km.toFixed(1)} km</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Column: Empty/Spacer */}
          <div className="middle-spacer"></div>

          {/* Right Column: Recommendations Card */}
          <div className="recommendations-section">
            {/* Teal flame icon ABOVE card */}
            <div className="teal-icon-above">
              <svg className="teal-droplet-flame" viewBox="0 0 48 64" width="42" height="64">
                <defs>
                  <filter id="tealIconGlow">
                    <feGaussianBlur stdDeviation="4" result="tealBlur"/>
                    <feMerge>
                      <feMergeNode in="tealBlur"/>
                      <feMergeNode in="tealBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Droplet/flame shape */}
                <path
                  d="M24,6 Q29,12 30,22 Q31,32 29,42 Q27,50 24,54 Q21,50 19,42 Q17,32 18,22 Q19,12 24,6 Z"
                  fill="none"
                  stroke="#00FFD4"
                  strokeWidth="3.5"
                  filter="url(#tealIconGlow)"
                />
                {/* Bottom droplet */}
                <circle
                  cx="24" cy="59" r="3"
                  fill="#00FFD4"
                  filter="url(#tealIconGlow)"
                />
              </svg>
            </div>

            {/* Connector line from icon to card */}
            <div className="teal-connector-line">
              <svg width="4" height="50" preserveAspectRatio="none">
                <line
                  x1="2" y1="0"
                  x2="2" y2="50"
                  stroke="#00FFD4"
                  strokeWidth="2.5"
                  opacity="0.7"
                />
              </svg>
            </div>

            {/* Recommendations card with teal glow border */}
            <div className="recommendations-card">
              <h3 className="card-title">Recommendations</h3>
              <ul className="recommendations-list">
                {data.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="rec-item">
                    <span className="teal-bullet"></span>
                    <span className="rec-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cosmic-heat-impact {
          position: relative;
          min-height: 1100px;
          padding: 60px 80px;
          background: linear-gradient(180deg, #0a0a1e 0%, #050510 100%);
          overflow: hidden;
        }

        /* Sci-fi perspective grid background */
        .cosmic-perspective-grid {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background-image:
            linear-gradient(rgba(0, 229, 255, 0.18) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.18) 2px, transparent 2px);
          background-size: 55px 55px;
          transform: perspective(700px) rotateX(65deg);
          transform-origin: center bottom;
          opacity: 0.45;
          pointer-events: none;
        }

        .cosmic-content-wrapper {
          position: relative;
          z-index: 10;
        }

        /* Header */
        .impact-header {
          text-align: center;
          margin-bottom: 65px;
        }

        .impact-title {
          font-size: 56px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 9px;
          margin: 0 0 14px 0;
          text-shadow:
            0 0 50px rgba(255, 255, 255, 0.7),
            0 0 90px rgba(255, 255, 255, 0.4);
        }

        .impact-subtitle {
          font-size: 19px;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
          letter-spacing: 3px;
        }

        /* Diamond Metrics Section */
        .diamond-metrics-section {
          position: relative;
          width: 100%;
          max-width: 1200px;
          height: 700px;
          margin: 0 auto 80px;
        }

        /* Diagonal connectors SVG overlay */
        .diagonal-connectors-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        /* Metric nodes positioning */
        .metric-node {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          z-index: 5;
        }

        .position-top-left {
          top: 110px;
          left: 80px;
        }

        .position-top-right {
          top: 110px;
          right: 80px;
        }

        .position-bottom-left {
          bottom: 110px;
          left: 80px;
        }

        .position-bottom-right {
          bottom: 110px;
          right: 80px;
        }

        /* Metric circles with neon glow */
        .metric-circle-glow {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .cyan-glow {
          border: 4px solid #00E5FF;
          background: rgba(0, 40, 60, 0.75);
          box-shadow:
            0 0 35px rgba(0, 229, 255, 0.8),
            inset 0 0 30px rgba(0, 229, 255, 0.3);
        }

        .orange-glow {
          border: 4px solid #FF8C00;
          background: rgba(60, 30, 0, 0.75);
          box-shadow:
            0 0 35px rgba(255, 140, 0, 0.8),
            inset 0 0 30px rgba(255, 140, 0, 0.3);
        }

        .metric-value {
          font-size: 42px;
          font-weight: 700;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 25px rgba(255, 215, 0, 1);
        }

        .metric-unit {
          font-size: 22px;
          font-weight: 400;
          color: #FFD700;
          text-shadow: 0 0 18px rgba(255, 215, 0, 0.9);
        }

        .metric-label {
          font-size: 17px;
          color: #FFD700;
          text-align: center;
          letter-spacing: 1.5px;
          text-shadow: 0 0 16px rgba(255, 215, 0, 0.8);
        }

        /* Central Tall Neon Flame */
        .central-flame-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }

        .tall-neon-flame {
          display: block;
          filter: drop-shadow(0 0 50px rgba(255, 140, 0, 1));
        }

        /* LEVEL badge inside flame */
        .flame-level-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          margin-top: 60px;
        }

        .badge-level-text {
          font-size: 26px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 6px;
          text-shadow: 0 0 28px rgba(255, 215, 0, 1);
          margin-bottom: 8px;
        }

        .badge-level-number {
          font-size: 88px;
          font-weight: 900;
          color: #FFD700;
          line-height: 1;
          text-shadow: 0 0 38px rgba(255, 215, 0, 1);
        }

        /* Heat Stress Chart Section */
        .heat-stress-chart-section {
          max-width: 900px;
          margin: 0 auto 90px;
        }

        .chart-container {
          background: rgba(10, 20, 40, 0.55);
          border: 2px solid rgba(255, 140, 0, 0.4);
          border-radius: 18px;
          padding: 28px;
          min-height: 300px;
        }

        .neon-stress-curve {
          width: 100%;
          height: 100%;
        }

        /* Bottom Three-Column Grid */
        .bottom-layout-grid {
          display: grid;
          grid-template-columns: 340px 1fr 380px;
          gap: 60px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Vertical Event Timeline */
        .events-timeline-vertical {
          position: relative;
          padding-left: 70px;
        }

        .vertical-neon-line {
          position: absolute;
          left: 24px;
          top: 0;
          height: 100%;
        }

        .timeline-events-list {
          display: flex;
          flex-direction: column;
          gap: 42px;
        }

        .timeline-event-item {
          display: flex;
          align-items: flex-start;
          gap: 22px;
        }

        .event-icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 3.5px solid #FF8C00;
          background: rgba(60, 30, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 25px rgba(255, 140, 0, 0.8);
          position: relative;
          z-index: 5;
        }

        .icon-symbol {
          font-size: 26px;
          color: #FF8C00;
          text-shadow: 0 0 12px #FF8C00;
        }

        .event-text-content {
          flex: 1;
          padding-top: 8px;
        }

        .event-description {
          font-size: 18px;
          color: #ffffff;
          margin-bottom: 7px;
          text-shadow: 0 0 14px rgba(255, 255, 255, 0.6);
        }

        .event-distance {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.65);
        }

        /* Middle spacer */
        .middle-spacer {
          min-width: 0;
        }

        /* Recommendations Section */
        .recommendations-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .teal-icon-above {
          margin-bottom: -2px;
        }

        .teal-droplet-flame {
          filter: drop-shadow(0 0 18px rgba(0, 255, 212, 0.9));
        }

        .teal-connector-line {
          margin-bottom: -2px;
        }

        .recommendations-card {
          width: 100%;
          background: rgba(0, 25, 45, 0.8);
          border: 4px solid #00FFD4;
          border-radius: 26px;
          padding: 36px;
          box-shadow:
            0 0 40px rgba(0, 255, 212, 0.5),
            inset 0 0 40px rgba(0, 255, 212, 0.15);
        }

        .card-title {
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 26px 0;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
        }

        .recommendations-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .rec-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .teal-bullet {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #00FFD4;
          flex-shrink: 0;
          margin-top: 10px;
          box-shadow: 0 0 16px #00FFD4;
        }

        .rec-text {
          font-size: 18px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.95);
        }

        /* Responsive adjustments */
        @media (max-width: 1500px) {
          .bottom-layout-grid {
            grid-template-columns: 1fr;
            gap: 55px;
          }

          .events-timeline-vertical,
          .recommendations-section {
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }

          .middle-spacer {
            display: none;
          }
        }

        @media (max-width: 1100px) {
          .cosmic-heat-impact {
            padding: 45px;
          }

          .impact-title {
            font-size: 44px;
          }

          .diamond-metrics-section {
            height: 600px;
          }

          .tall-neon-flame {
            width: 280px;
            height: 455px;
          }
        }

        @media (max-width: 800px) {
          .cosmic-heat-impact {
            padding: 32px;
          }

          .impact-title {
            font-size: 36px;
            letter-spacing: 6px;
          }

          .impact-subtitle {
            font-size: 17px;
          }

          .diamond-metrics-section {
            height: 520px;
          }

          .position-top-left,
          .position-bottom-left {
            left: 32px;
          }

          .position-top-right,
          .position-bottom-right {
            right: 32px;
          }

          .metric-circle-glow {
            width: 100px;
            height: 100px;
          }

          .metric-value {
            font-size: 32px;
          }

          .metric-unit {
            font-size: 18px;
          }

          .tall-neon-flame {
            width: 230px;
            height: 375px;
          }

          .badge-level-number {
            font-size: 68px;
          }
        }
      `}</style>
    </div>
  );
}
