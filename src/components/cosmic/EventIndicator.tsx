import React from 'react';
import { Zap, AlertTriangle, Droplets, Activity } from 'lucide-react';

type EventType = 'hr_drift' | 'warning' | 'hydration' | 'pace_drop' | 'default';

interface EventIndicatorProps {
  icon: EventType;
  distance: number;
  description: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  hr_drift: <Zap size={16} />,
  warning: <AlertTriangle size={16} />,
  hydration: <Droplets size={16} />,
  pace_drop: <Activity size={16} />,
  default: <AlertTriangle size={16} />
};

export function EventIndicator({ icon, distance, description, severity }: EventIndicatorProps) {
  const IconComponent = EVENT_ICONS[icon] || EVENT_ICONS.default;

  return (
    <div className="event-indicator">
      <div className="event-icon-badge">
        {IconComponent}
      </div>
      <div className="event-content">
        <div className="event-description">{description}</div>
        <div className="event-distance">{distance.toFixed(2)} km</div>
      </div>

      <style>{`
        .event-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }

        .event-icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 140, 0, 0.1);
          border: 2px solid var(--neon-orange);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--neon-orange);
          box-shadow: 0 0 12px var(--neon-orange-glow);
          flex-shrink: 0;
        }

        .event-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .event-description {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        .event-distance {
          font-size: 11px;
          font-weight: 500;
          color: var(--muted);
        }

        @media (max-width: 768px) {
          .event-indicator {
            padding: 6px 0;
            gap: 10px;
          }

          .event-icon-badge {
            width: 28px;
            height: 28px;
          }

          .event-icon-badge svg {
            width: 14px;
            height: 14px;
          }

          .event-description {
            font-size: 12px;
          }

          .event-distance {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
