import type { BaselineRace } from '@/utils/computeBaseline';
import { formatBaselineDescription, getBaselineQualityLabel } from '@/utils/computeBaseline';

type BaselineCardProps = {
  baseline: BaselineRace;
  showDetails?: boolean;
};

export default function BaselineCard({ baseline, showDetails = true }: BaselineCardProps) {
  const qualityLabel = getBaselineQualityLabel(baseline);
  const isRealRace = baseline.type === 'real';

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: `2px solid ${isRealRace ? 'var(--brand)' : 'var(--line)'}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: '2rem' }}>
          {isRealRace ? '🏁' : '🎯'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
            Baseline Performance
          </div>
          <div className="small" style={{ color: 'var(--muted)' }}>
            {qualityLabel}
          </div>
        </div>
        <div
          style={{
            padding: '6px 12px',
            background: isRealRace ? 'var(--brand-bg)' : 'var(--bg-tertiary)',
            color: isRealRace ? 'var(--brand)' : 'var(--muted)',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {isRealRace ? 'REAL RACE' : 'DERIVED'}
        </div>
      </div>

      {showDetails && (
        <>
          <div
            style={{
              padding: 16,
              background: 'var(--bg)',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <div className="small" style={{ color: 'var(--text)', lineHeight: 1.6 }}>
              {formatBaselineDescription(baseline)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px' }}>
              <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
                Confidence
              </div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {Math.round(baseline.confidenceScore * 100)}%
              </div>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
                Source
              </div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>
                {baseline.source}
              </div>
            </div>
          </div>

          {!isRealRace && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--brand-bg)',
                borderRadius: 8,
                border: '1px solid var(--brand)',
              }}
            >
              <div className="small" style={{ color: 'var(--brand)', lineHeight: 1.5 }}>
                Predictions will become more accurate when you log a real race result.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
