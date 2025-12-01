import { useState } from 'react';
import type { PerformanceFactor } from '@/types/performance';
import { getFactorColor } from '@/utils/performanceFactors';

type FactorChipProps = {
  factor: PerformanceFactor;
  onClick?: () => void;
  compact?: boolean;
};

export default function FactorChip({ factor, onClick, compact = false }: FactorChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const color = getFactorColor(factor.impact);
  const symbol = factor.impact === 'positive' ? '↓' : factor.impact === 'negative' ? '↑' : '→';

  const impactText = Math.abs(factor.impactPct) < 0.5
    ? 'neutral'
    : `${factor.impactPct > 0 ? '+' : ''}${factor.impactPct.toFixed(1)}%`;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
    >
      <div
        className="factor-chip"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 4 : 6,
          padding: compact ? '4px 8px' : '6px 12px',
          borderRadius: 12,
          background: `${color}20`,
          border: `1px solid ${color}`,
          fontSize: compact ? '0.75rem' : '0.85rem',
          fontWeight: 500,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: compact ? '0.9rem' : '1rem' }}>{factor.icon}</span>
        {!compact && (
          <>
            <span style={{ color: 'var(--text)' }}>{factor.name}</span>
            <span style={{ color, fontWeight: 600 }}>{impactText}</span>
          </>
        )}
        {compact && (
          <span style={{ color, fontSize: '0.9rem' }}>{symbol}</span>
        )}
      </div>

      {showTooltip && (
        <div
          className="factor-tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: 240,
            maxWidth: 320,
            padding: 12,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>{factor.icon}</span>
            <strong style={{ fontSize: '0.9rem' }}>{factor.name}</strong>
            <span
              style={{
                marginLeft: 'auto',
                padding: '2px 6px',
                borderRadius: 4,
                background: `${color}30`,
                color,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {impactText}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: 8, lineHeight: 1.4 }}>
            {factor.description}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4, marginBottom: 8 }}>
            {factor.tooltip}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', color: 'var(--muted)' }}>
            <span>
              {factor.dataSource === 'forecast' && '🌐 Live forecast'}
              {factor.dataSource === 'calculated' && '📊 Calculated'}
              {factor.dataSource === 'training' && '🏃 Training data'}
              {factor.dataSource === 'manual' && '✏️ Manual input'}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {factor.confidence === 'high' && '✅ High confidence'}
              {factor.confidence === 'medium' && '⚠️ Medium confidence'}
              {factor.confidence === 'low' && '❓ Low confidence'}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--line)',
            }}
          />
        </div>
      )}
    </div>
  );
}
