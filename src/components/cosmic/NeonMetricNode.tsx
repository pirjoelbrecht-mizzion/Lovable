import React from 'react';

type NeonColor = 'cyan' | 'blue' | 'orange' | 'yellow' | 'purple';

interface NeonMetricNodeProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color: NeonColor;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  className?: string;
}

const COLOR_CLASSES: Record<NeonColor, string> = {
  cyan: 'neon-glow-cyan neon-border-cyan',
  blue: 'neon-glow-blue neon-border-blue',
  orange: 'neon-glow-orange neon-border-orange',
  yellow: 'neon-glow-yellow neon-border-yellow',
  purple: 'neon-glow-purple',
};

const COLOR_VALUES: Record<NeonColor, string> = {
  cyan: 'var(--neon-cyan)',
  blue: 'var(--neon-blue)',
  orange: 'var(--neon-orange)',
  yellow: 'var(--neon-yellow)',
  purple: 'var(--neon-purple)',
};

export function NeonMetricNode({
  icon,
  label,
  value,
  unit,
  color,
  severity,
  className = ''
}: NeonMetricNodeProps) {
  const colorClass = COLOR_CLASSES[color];
  const colorValue = COLOR_VALUES[color];

  return (
    <div className={`neon-metric-node ${colorClass} ${className}`}>
      <div className="metric-icon" style={{ color: colorValue }}>
        {icon}
      </div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="metric-label">{label}</div>
      {severity && (
        <div className="severity-badge" data-severity={severity.toLowerCase()}>
          {severity}
        </div>
      )}

      <style>{`
        .neon-metric-node {
          position: relative;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: var(--cosmic-surface);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.3s ease;
          cursor: default;
        }

        .neon-metric-node:hover {
          transform: scale(1.05);
          background: rgba(20, 20, 30, 0.8);
        }

        .metric-icon {
          font-size: 24px;
          margin-bottom: 2px;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          line-height: 1;
        }

        .metric-unit {
          font-size: 12px;
          font-weight: 500;
          margin-left: 2px;
          opacity: 0.7;
        }

        .metric-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--muted);
          text-align: center;
          padding: 0 8px;
        }

        .severity-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          font-size: 8px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          backdrop-filter: blur(8px);
        }

        .severity-badge[data-severity="low"] {
          background: var(--severity-low-glow);
          color: var(--severity-low);
          border: 1px solid var(--severity-low);
        }

        .severity-badge[data-severity="moderate"] {
          background: var(--severity-moderate-glow);
          color: var(--severity-moderate);
          border: 1px solid var(--severity-moderate);
        }

        .severity-badge[data-severity="high"] {
          background: var(--severity-high-glow);
          color: var(--severity-high);
          border: 1px solid var(--severity-high);
        }

        .severity-badge[data-severity="extreme"] {
          background: var(--severity-extreme-glow);
          color: var(--severity-extreme);
          border: 1px solid var(--severity-extreme);
        }

        @media (max-width: 768px) {
          .neon-metric-node {
            width: 90px;
            height: 90px;
          }

          .metric-icon {
            font-size: 20px;
          }

          .metric-value {
            font-size: 18px;
          }

          .metric-label {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}
