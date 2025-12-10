import React from 'react';

interface CosmicBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
}

export function CosmicBackground({ intensity = 'medium' }: CosmicBackgroundProps) {
  const orbCount = intensity === 'low' ? 3 : intensity === 'medium' ? 5 : 8;

  const orbs = Array.from({ length: orbCount }, (_, i) => {
    const colors = ['var(--neon-teal)', 'var(--neon-lime)', 'var(--neon-orange)'];
    const sizes = [120, 150, 180, 200];
    const positions = [
      { top: '10%', left: '15%' },
      { top: '60%', left: '75%' },
      { top: '30%', left: '80%' },
      { top: '75%', left: '20%' },
      { top: '45%', left: '50%' },
      { top: '20%', left: '40%' },
      { top: '80%', left: '60%' },
      { top: '15%', left: '70%' },
    ];

    return {
      id: i,
      color: colors[i % colors.length],
      size: sizes[i % sizes.length],
      position: positions[i] || { top: '50%', left: '50%' },
      delay: i * 0.8,
    };
  });

  return (
    <div className="cosmic-background">
      <div className="cosmic-gradient"></div>
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="cosmic-orb animate-orb-float animate-orb-pulse"
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            backgroundColor: orb.color,
            top: orb.position.top,
            left: orb.position.left,
            animationDelay: `${orb.delay}s, ${orb.delay * 0.5}s`,
          }}
        />
      ))}

      <style>{`
        .cosmic-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .cosmic-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            var(--cosmic-bg-darker) 0%,
            var(--cosmic-bg-dark) 50%,
            var(--cosmic-bg-darker) 100%
          );
        }

        .cosmic-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          transform: translate(-50%, -50%);
          will-change: transform, opacity;
        }

        @media (max-width: 768px) {
          .cosmic-orb {
            filter: blur(60px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cosmic-orb {
            animation: none !important;
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
