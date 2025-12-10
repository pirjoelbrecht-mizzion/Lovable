import React from 'react';
import { Thermometer, Droplets, Wind, Clock } from 'lucide-react';
import { CosmicBackground } from './CosmicBackground';
import { CosmicHeatCore } from './CosmicHeatCore';
import { NeonMetricNode } from './NeonMetricNode';
import { HologramChart } from './HologramChart';
import { EventIndicator } from './EventIndicator';

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
  const hasTimeline = showTimeline && data.timeline && data.timeline.length > 0;
  const hasEvents = data.events && data.events.length > 0;

  // Calculate level from severity
  const severityToLevel = {
    LOW: 1,
    MODERATE: 2,
    HIGH: 3,
    EXTREME: 4
  };
  const level = severityToLevel[data.severity];

  // Prepare timeline data for chart
  const timelineData = hasTimeline
    ? data.timeline!.map((point) => ({
        time: `${point.distance.toFixed(1)}km`,
        heatIndex: point.heatStress,
      }))
    : [];

  return (
    <div className={`weather-impact-cosmic ${className}`}>
      <CosmicBackground intensity="medium" />

      <div className="cosmic-content">
        <div className="cosmic-header">
          <h2 className="cosmic-title">HEAT & HUMIDITY IMPACT</h2>
        </div>

        <div className="three-column-layout">
          {/* LEFT COLUMN: Timeline + Events */}
          <div className="left-column">
            {hasTimeline && (
              <div className="timeline-container">
                <HologramChart
                  data={timelineData}
                  dataKey="heatIndex"
                  xAxisKey="time"
                  title=""
                  color="var(--neon-orange)"
                  height={220}
                />
              </div>
            )}

            {hasEvents && (
              <div className="events-list">
                {data.events!.map((event, idx) => (
                  <EventIndicator
                    key={idx}
                    icon={event.icon}
                    distance={event.distance_km}
                    description={event.description}
                    severity={event.severity}
                  />
                ))}
              </div>
            )}
          </div>

          {/* CENTER COLUMN: Flame Core + Metrics */}
          <div className="center-column">
            <div className="metrics-top-row">
              <NeonMetricNode
                icon={<Thermometer size={20} />}
                label="Avg Temperature"
                value={Math.round(data.avgTemperature)}
                unit="°C"
                color="blue"
                severity={data.avgTemperature > 30 ? 'HIGH' : data.avgTemperature > 25 ? 'MODERATE' : 'LOW'}
              />
              <div className="spacer"></div>
              <NeonMetricNode
                icon={<Droplets size={20} />}
                label="Avg Humidity"
                value={Math.round(data.avgHumidity)}
                unit="%"
                color="cyan"
                severity={data.avgHumidity > 70 ? 'HIGH' : data.avgHumidity > 50 ? 'MODERATE' : 'LOW'}
              />
            </div>

            <div className="core-section">
              <CosmicHeatCore
                severity={data.severity}
                score={data.overallScore}
                level={level}
                showLevel={true}
              />
            </div>

            <div className="metrics-bottom-row">
              <NeonMetricNode
                icon={<Wind size={20} />}
                label="Heat Index"
                value={Math.round(data.heatIndex)}
                unit="°C"
                color="blue"
                severity={data.severity}
              />
              <div className="spacer"></div>
              {data.dangerZoneMinutes !== undefined && (
                <NeonMetricNode
                  icon={<Clock size={20} />}
                  label="Danger Zone"
                  value={Math.round(data.dangerZoneMinutes)}
                  unit="min"
                  color="orange"
                  severity={data.dangerZoneMinutes > 10 ? 'HIGH' : data.dangerZoneMinutes > 5 ? 'MODERATE' : 'LOW'}
                />
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Recommendations */}
          <div className="right-column">
            <div className="recommendations-panel">
              <div className="panel-header">
                <Droplets size={20} />
                <h3 className="panel-title">Recommendations</h3>
              </div>
              <ul className="recommendations-list">
                {data.recommendations.slice(0, 4).map((rec, idx) => (
                  <li key={idx} className="recommendation-item">
                    <span className="rec-bullet"></span>
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
          min-height: 600px;
          padding: 40px;
          border-radius: 24px;
          overflow: hidden;
        }

        .cosmic-content {
          position: relative;
          z-index: 1;
        }

        .cosmic-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .cosmic-title {
          font-size: 36px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin: 0;
          text-shadow:
            0 0 20px rgba(255, 255, 255, 0.5),
            0 0 40px rgba(255, 255, 255, 0.3);
        }

        .three-column-layout {
          display: grid;
          grid-template-columns: 300px 1fr 320px;
          gap: 40px;
          align-items: start;
        }

        /* LEFT COLUMN */
        .left-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .timeline-container {
          background: rgba(10, 20, 40, 0.6);
          border: 1px solid rgba(255, 140, 0, 0.3);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* CENTER COLUMN */
        .center-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          padding: 0 20px;
        }

        .metrics-top-row,
        .metrics-bottom-row {
          display: flex;
          align-items: center;
          gap: 80px;
          width: 100%;
          justify-content: center;
        }

        .spacer {
          width: 60px;
        }

        .core-section {
          margin: 0;
        }

        /* RIGHT COLUMN */
        .right-column {
          display: flex;
          flex-direction: column;
        }

        .recommendations-panel {
          background: rgba(0, 20, 40, 0.7);
          border: 2px solid rgba(0, 247, 255, 0.6);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
          box-shadow:
            0 0 20px rgba(0, 247, 255, 0.3),
            inset 0 0 20px rgba(0, 247, 255, 0.1);
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: var(--neon-cyan);
        }

        .panel-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--neon-cyan);
          margin: 0;
          text-shadow: 0 0 10px var(--neon-cyan-glow);
        }

        .recommendations-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .rec-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--neon-cyan);
          flex-shrink: 0;
          margin-top: 8px;
          box-shadow: 0 0 8px var(--neon-cyan);
        }

        .rec-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text);
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 1200px) {
          .three-column-layout {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .left-column,
          .right-column {
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
          }

          .center-column {
            max-width: 700px;
            margin: 0 auto;
            width: 100%;
          }

          .metrics-top-row,
          .metrics-bottom-row {
            gap: 60px;
          }

          .spacer {
            width: 40px;
          }
        }

        @media (max-width: 768px) {
          .weather-impact-cosmic {
            padding: 24px;
            min-height: auto;
          }

          .cosmic-header {
            margin-bottom: 32px;
          }

          .cosmic-title {
            font-size: 24px;
            letter-spacing: 2px;
          }

          .three-column-layout {
            gap: 24px;
          }

          .center-column {
            gap: 24px;
            padding: 0;
          }

          .metrics-top-row,
          .metrics-bottom-row {
            gap: 40px;
          }

          .spacer {
            width: 20px;
          }

          .recommendations-panel {
            padding: 20px;
          }

          .panel-title {
            font-size: 16px;
          }

          .rec-text {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .weather-impact-cosmic {
            padding: 16px;
          }

          .cosmic-title {
            font-size: 20px;
            letter-spacing: 1.5px;
          }

          .metrics-top-row,
          .metrics-bottom-row {
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
          }

          .spacer {
            display: none;
          }

          .recommendations-panel {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
