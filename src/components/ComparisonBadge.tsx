import type { MetricDelta } from '@/utils/baselineComparison';
import { getDeltaColor, getDeltaArrow } from '@/utils/baselineComparison';

type ComparisonBadgeProps = {
  delta: MetricDelta;
  formatValue: (delta: MetricDelta) => string;
  label?: string;
};

export default function ComparisonBadge({ delta, formatValue, label }: ComparisonBadgeProps) {
  if (!delta.showComparison) {
    return null;
  }

  const color = getDeltaColor(delta);
  const arrow = getDeltaArrow(delta);
  const formattedValue = formatValue(delta);

  return (
    <span
      className="comparison-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: delta.isImprovement ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 146, 60, 0.1)',
        border: `1px solid ${color}`,
        color: color,
        fontSize: '0.85rem',
        fontWeight: 600,
        marginLeft: 8,
        animation: 'badgeFadeIn 0.3s ease',
        transition: 'all 0.3s ease',
      }}
      title={label ? `${label}: ${formattedValue} vs baseline` : `${formattedValue} vs baseline`}
    >
      <span style={{ fontSize: '0.9rem' }}>{arrow}</span>
      <span>{formattedValue}</span>
    </span>
  );
}
