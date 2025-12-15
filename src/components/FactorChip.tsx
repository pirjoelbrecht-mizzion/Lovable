import { useState } from 'react';
import type { PerformanceFactor } from '@/types/performance';

type FactorChipProps = {
  factor: PerformanceFactor;
  onClick?: () => void;
  compact?: boolean;
};

function getFactorColor(impact: 'positive' | 'negative' | 'neutral'): string {
  if (impact === 'positive') return '#46E7B1';
  if (impact === 'negative') return '#FF5C7A';
  return 'rgba(255,255,255,0.5)';
}

export default function FactorChip({ factor, onClick, compact = false }: FactorChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const color = getFactorColor(factor.impact);
  const symbol = factor.impact === 'positive' ? '-' : factor.impact === 'negative' ? '+' : '=';

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
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 4 : 6,
          padding: compact ? '4px 8px' : '8px 12px',
          borderRadius: 8,
          background: `${color}15`,
          border: `1px solid ${color}40`,
          fontSize: compact ? '0.75rem' : '0.85rem',
          fontWeight: 500,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: compact ? '0.9rem' : '1rem' }}>{factor.icon}</span>
        {!compact && (
          <>
            <span style={{ color: '#fff' }}>{factor.name}</span>
            <span style={{ color, fontWeight: 600 }}>{impactText}</span>
          </>
        )}
        {compact && (
          <span style={{ color, fontSize: '0.8rem', fontWeight: 600 }}>{symbol}</span>
        )}
      </div>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: 240,
            maxWidth: 320,
            padding: 14,
            background: 'rgba(22, 24, 41, 0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>{factor.icon}</span>
            <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{factor.name}</strong>
            <span
              style={{
                marginLeft: 'auto',
                padding: '3px 8px',
                borderRadius: 6,
                background: `${color}25`,
                color,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {impactText}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: 10, lineHeight: 1.5 }}>
            {factor.description}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 10 }}>
            {factor.tooltip}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
            <span>
              {factor.dataSource === 'forecast' && 'Live forecast'}
              {factor.dataSource === 'calculated' && 'Calculated'}
              {factor.dataSource === 'training' && 'Training data'}
              {factor.dataSource === 'manual' && 'Manual input'}
            </span>
            <span>
              {factor.confidence === 'high' && 'High confidence'}
              {factor.confidence === 'medium' && 'Medium confidence'}
              {factor.confidence === 'low' && 'Low confidence'}
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
              borderTop: '6px solid rgba(255,255,255,0.12)',
            }}
          />
        </div>
      )}
    </div>
  );
}
