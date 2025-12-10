import React from 'react';
import { Droplets, Zap, Clock, Heart } from 'lucide-react';

type Category = 'hydration' | 'pacing' | 'timing' | 'recovery';
type Priority = 'low' | 'medium' | 'high';

interface RecommendationHologramProps {
  category: Category;
  title: string;
  items: string[];
  priority?: Priority;
}

const CATEGORY_CONFIG: Record<
  Category,
  { icon: React.ReactNode; color: string; glow: string }
> = {
  hydration: {
    icon: <Droplets size={24} />,
    color: 'var(--neon-cyan)',
    glow: 'var(--neon-cyan-glow)',
  },
  pacing: {
    icon: <Zap size={24} />,
    color: 'var(--neon-orange)',
    glow: 'var(--neon-orange-glow)',
  },
  timing: {
    icon: <Clock size={24} />,
    color: 'var(--neon-yellow)',
    glow: 'var(--neon-yellow-glow)',
  },
  recovery: {
    icon: <Heart size={24} />,
    color: 'var(--neon-purple)',
    glow: 'var(--neon-purple-glow)',
  },
};

export function RecommendationHologram({
  category,
  title,
  items,
  priority = 'medium',
}: RecommendationHologramProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <div
      className={`recommendation-hologram ${priority === 'high' ? 'high-priority' : ''}`}
      data-priority={priority}
    >
      <div className="rec-header">
        <div className="rec-icon" style={{ color: config.color }}>
          {config.icon}
        </div>
        <h4 className="rec-title">{title}</h4>
        {priority === 'high' && (
          <span className="priority-badge">PRIORITY</span>
        )}
      </div>

      <ul className="rec-list">
        {items.map((item, idx) => (
          <li key={idx} className="rec-item">
            <span className="rec-bullet" style={{ backgroundColor: config.color }}></span>
            <span className="rec-text">{item}</span>
          </li>
        ))}
      </ul>

      <style>{`
        .recommendation-hologram {
          background: var(--cosmic-surface);
          backdrop-filter: blur(12px);
          border: 1px solid var(--hologram-border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .recommendation-hologram:hover {
          background: rgba(20, 20, 30, 0.8);
          border-color: var(--hologram-border-bright);
          transform: translateY(-2px);
        }

        .recommendation-hologram.high-priority {
          border-color: ${config.color};
          box-shadow: 0 0 20px ${config.glow};
        }

        .recommendation-hologram.high-priority.animate-float-up {
          animation: floatUp 3s ease-in-out infinite;
        }

        .rec-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .rec-icon {
          flex-shrink: 0;
        }

        .rec-title {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .priority-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          background: ${config.glow};
          color: ${config.color};
          border: 1px solid ${config.color};
          border-radius: 8px;
          letter-spacing: 0.5px;
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rec-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .rec-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 6px;
          box-shadow: 0 0 8px currentColor;
        }

        .rec-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text);
        }

        @media (max-width: 768px) {
          .recommendation-hologram {
            padding: 16px;
          }

          .rec-title {
            font-size: 14px;
          }

          .rec-text {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
