import React from 'react';

type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

interface CosmicHeatCoreProps {
  severity: Severity;
  score: number;
  level?: number;
  showLevel?: boolean;
}

const FLAME_MAP: Record<Severity, string> = {
  LOW: '/assets/heat-cosmic/flames/flame-level-1-mild.svg',
  MODERATE: '/assets/heat-cosmic/flames/flame-level-2-moderate.svg',
  HIGH: '/assets/heat-cosmic/flames/flame-level-3-high.svg',
  EXTREME: '/assets/heat-cosmic/flames/flame-level-4-extreme.svg',
};

const SEVERITY_COLORS: Record<Severity, { primary: string; glow: string }> = {
  LOW: { primary: 'var(--severity-low)', glow: 'var(--severity-low-glow)' },
  MODERATE: { primary: 'var(--severity-moderate)', glow: 'var(--severity-moderate-glow)' },
  HIGH: { primary: 'var(--severity-high)', glow: 'var(--severity-high-glow)' },
  EXTREME: { primary: 'var(--severity-extreme)', glow: 'var(--severity-extreme-glow)' },
};

export function CosmicHeatCore({
  severity,
  score,
  level,
  showLevel = true
}: CosmicHeatCoreProps) {
  const flameSrc = FLAME_MAP[severity];
  const colors = SEVERITY_COLORS[severity];
  const displayLevel = level ?? Math.floor(score / 10);

  return (
    <div className="cosmic-heat-core">
      <div className="ring-layer pulse-ring animate-pulse-neon">
        <img
          src="/assets/heat-cosmic/xp-rings/xp-ring-pulse.svg"
          alt=""
          aria-hidden="true"
        />
      </div>

      <div className="ring-layer orbit-ring animate-spin-slow">
        <img
          src="/assets/heat-cosmic/xp-rings/xp-ring-dual-orbit.svg"
          alt=""
          aria-hidden="true"
        />
      </div>

      <div className="flame-container animate-flame-flicker">
        <img
          src={flameSrc}
          alt={`${severity} heat severity`}
          className="flame-icon"
        />
      </div>

      <div className="core-content">
        {showLevel && (
          <div className="level-text">LEVEL {displayLevel}</div>
        )}
        <div className="score-text">{Math.round(score)}</div>
      </div>

      <style>{`
        .cosmic-heat-core {
          position: relative;
          width: 240px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }

        .ring-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .ring-layer img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .pulse-ring {
          z-index: 1;
        }

        .orbit-ring {
          z-index: 2;
        }

        .flame-container {
          position: absolute;
          z-index: 3;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 20px ${colors.glow});
        }

        .flame-icon {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .core-content {
          position: relative;
          z-index: 4;
          text-align: center;
          margin-top: 100px;
        }

        .level-text {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          color: ${colors.primary};
          text-shadow: 0 0 10px ${colors.glow};
          margin-bottom: 4px;
        }

        .score-text {
          font-size: 32px;
          font-weight: 900;
          color: var(--text);
          text-shadow:
            0 0 20px ${colors.glow},
            0 0 40px ${colors.glow};
        }

        @media (max-width: 768px) {
          .cosmic-heat-core {
            width: 200px;
            height: 200px;
          }

          .flame-container {
            width: 64px;
            height: 64px;
          }

          .score-text {
            font-size: 28px;
          }

          .level-text {
            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flame-container {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
