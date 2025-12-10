import React from 'react';
import { Thermometer, Droplets, Wind, Gauge } from 'lucide-react';
import { CosmicBackground } from './CosmicBackground';
import { CosmicHeatCore } from './CosmicHeatCore';
import { NeonMetricNode } from './NeonMetricNode';
import { HologramChart } from './HologramChart';
import { RecommendationHologram } from './RecommendationHologram';

interface HeatImpactData {
  overallScore: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  temperature: number;
  humidity: number;
  heatIndex: number;
  wbgt?: number;
  timeline?: Array<{ time: string; heatIndex: number; pace?: number }>;
  recommendations: {
    hydration?: string[];
    pacing?: string[];
    timing?: string[];
    recovery?: string[];
  };
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

  return (
    <div className={`weather-impact-cosmic ${className}`}>
      <CosmicBackground intensity="medium" />

      <div className="cosmic-content">
        <div className="cosmic-header">
          <h2 className="cosmic-title">Heat Impact Analysis</h2>
          <p className="cosmic-subtitle">Environmental Performance Projection</p>
        </div>

        <div className="core-section">
          <CosmicHeatCore
            severity={data.severity}
            score={data.overallScore}
            showLevel={true}
          />
        </div>

        <div className="metrics-grid">
          <NeonMetricNode
            icon={<Thermometer size={24} />}
            label="Temperature"
            value={Math.round(data.temperature)}
            unit="°F"
            color="orange"
            severity={data.temperature > 85 ? 'HIGH' : data.temperature > 75 ? 'MODERATE' : 'LOW'}
          />
          <NeonMetricNode
            icon={<Droplets size={24} />}
            label="Humidity"
            value={Math.round(data.humidity)}
            unit="%"
            color="cyan"
            severity={data.humidity > 70 ? 'HIGH' : data.humidity > 50 ? 'MODERATE' : 'LOW'}
          />
          <NeonMetricNode
            icon={<Wind size={24} />}
            label="Heat Index"
            value={Math.round(data.heatIndex)}
            unit="°F"
            color="yellow"
            severity={data.severity}
          />
          {data.wbgt !== undefined && (
            <NeonMetricNode
              icon={<Gauge size={24} />}
              label="WBGT"
              value={Math.round(data.wbgt)}
              unit="°F"
              color="blue"
            />
          )}
        </div>

        {hasTimeline && (
          <div className="timeline-section">
            <HologramChart
              data={data.timeline}
              dataKey="heatIndex"
              xAxisKey="time"
              title="Heat Index Timeline"
              color="var(--neon-orange)"
              referenceLines={[
                { y: 90, label: 'Caution', color: 'var(--neon-yellow)' },
                { y: 103, label: 'Danger', color: 'var(--neon-red)' },
              ]}
              height={250}
            />
          </div>
        )}

        <div className="recommendations-section">
          <h3 className="section-title">Personalized Recommendations</h3>
          <div className="recommendations-grid">
            {data.recommendations.hydration && data.recommendations.hydration.length > 0 && (
              <RecommendationHologram
                category="hydration"
                title="Hydration Strategy"
                items={data.recommendations.hydration}
                priority={data.severity === 'HIGH' || data.severity === 'EXTREME' ? 'high' : 'medium'}
              />
            )}
            {data.recommendations.pacing && data.recommendations.pacing.length > 0 && (
              <RecommendationHologram
                category="pacing"
                title="Pacing Adjustments"
                items={data.recommendations.pacing}
                priority={data.severity === 'EXTREME' ? 'high' : 'medium'}
              />
            )}
            {data.recommendations.timing && data.recommendations.timing.length > 0 && (
              <RecommendationHologram
                category="timing"
                title="Optimal Timing"
                items={data.recommendations.timing}
                priority="low"
              />
            )}
            {data.recommendations.recovery && data.recommendations.recovery.length > 0 && (
              <RecommendationHologram
                category="recovery"
                title="Recovery Protocol"
                items={data.recommendations.recovery}
                priority={data.severity === 'EXTREME' ? 'high' : 'medium'}
              />
            )}
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
          margin-bottom: 40px;
        }

        .cosmic-title {
          font-size: 32px;
          font-weight: 900;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cosmic-subtitle {
          font-size: 14px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin: 0;
        }

        .core-section {
          margin-bottom: 48px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 24px;
          max-width: 600px;
          margin: 0 auto 48px;
          justify-items: center;
        }

        .timeline-section {
          margin-bottom: 48px;
        }

        .recommendations-section {
          margin-top: 48px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-align: center;
          margin: 0 0 24px 0;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            max-width: 400px;
          }

          .recommendations-grid {
            grid-template-columns: 1fr;
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
          }

          .cosmic-subtitle {
            font-size: 12px;
          }

          .core-section {
            margin-bottom: 32px;
          }

          .metrics-grid {
            gap: 16px;
            margin-bottom: 32px;
          }

          .timeline-section {
            margin-bottom: 32px;
          }

          .recommendations-section {
            margin-top: 32px;
          }

          .section-title {
            font-size: 18px;
            margin-bottom: 20px;
          }

          .recommendations-grid {
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .weather-impact-cosmic {
            padding: 16px;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .cosmic-title {
            font-size: 20px;
          }

          .recommendations-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
