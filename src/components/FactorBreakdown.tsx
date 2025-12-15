import type { PerformanceFactor } from '@/types/performance';
import FactorChip from './FactorChip';

type FactorBreakdownProps = {
  factors: PerformanceFactor[];
  title?: string;
  compact?: boolean;
  groupByImpact?: boolean;
};

export default function FactorBreakdown({
  factors,
  title,
  compact = false,
  groupByImpact = true,
}: FactorBreakdownProps) {
  if (!factors || factors.length === 0) {
    return null;
  }

  if (groupByImpact) {
    const positive = factors.filter(f => f.impact === 'positive');
    const neutral = factors.filter(f => f.impact === 'neutral');
    const negative = factors.filter(f => f.impact === 'negative');

    return (
      <div style={{ width: '100%' }}>
        {title && (
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 16,
          }}>
            {title}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {positive.length > 0 && (
            <div style={{
              padding: 16,
              background: 'rgba(70, 231, 177, 0.06)',
              border: '1px solid rgba(70, 231, 177, 0.15)',
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#46E7B1',
                marginBottom: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: '0.9rem' }}>+</span>
                Favorable Factors
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {positive.map((factor, idx) => (
                  <FactorChip key={idx} factor={factor} compact={compact} />
                ))}
              </div>
            </div>
          )}

          {neutral.length > 0 && (
            <div style={{
              padding: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: '0.9rem' }}>=</span>
                Neutral Factors
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {neutral.map((factor, idx) => (
                  <FactorChip key={idx} factor={factor} compact={compact} />
                ))}
              </div>
            </div>
          )}

          {negative.length > 0 && (
            <div style={{
              padding: 16,
              background: 'rgba(255, 92, 122, 0.06)',
              border: '1px solid rgba(255, 92, 122, 0.15)',
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#FF5C7A',
                marginBottom: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: '0.9rem' }}>!</span>
                Challenging Factors
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {negative.map((factor, idx) => (
                  <FactorChip key={idx} factor={factor} compact={compact} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 12,
        }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {factors.map((factor, idx) => (
          <FactorChip key={idx} factor={factor} compact={compact} />
        ))}
      </div>
    </div>
  );
}
