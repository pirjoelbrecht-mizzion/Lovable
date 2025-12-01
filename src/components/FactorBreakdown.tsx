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
  title = 'Performance Factors',
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
      <div className="factor-breakdown" style={{ width: '100%' }}>
        {title && (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
            {title}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {positive.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--good)', marginBottom: 6, fontWeight: 600 }}>
                ✓ Favorable Factors
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {positive.map((factor, idx) => (
                  <FactorChip key={idx} factor={factor} compact={compact} />
                ))}
              </div>
            </div>
          )}

          {neutral.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
                → Neutral Factors
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {neutral.map((factor, idx) => (
                  <FactorChip key={idx} factor={factor} compact={compact} />
                ))}
              </div>
            </div>
          )}

          {negative.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginBottom: 6, fontWeight: 600 }}>
                ⚠ Challenging Factors
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
    <div className="factor-breakdown" style={{ width: '100%' }}>
      {title && (
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
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
