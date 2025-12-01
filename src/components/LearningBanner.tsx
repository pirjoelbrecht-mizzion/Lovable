type LearningBannerProps = {
  message: string;
  emoji?: string;
  type?: 'success' | 'info' | 'warning';
  onDismiss?: () => void;
};

export default function LearningBanner({
  message,
  emoji = '🧠',
  type = 'success',
  onDismiss,
}: LearningBannerProps) {
  const colors = {
    success: {
      bg: 'var(--good-bg)',
      border: 'var(--good)',
      text: 'var(--good)',
    },
    info: {
      bg: 'var(--brand-bg)',
      border: 'var(--brand)',
      text: 'var(--brand)',
    },
    warning: {
      bg: 'var(--warning-bg)',
      border: 'var(--warning)',
      text: 'var(--warning)',
    },
  };

  const color = colors[type];

  return (
    <div
      style={{
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        animation: 'slideIn 0.3s ease',
      }}
    >
      <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: color.text, lineHeight: 1.5 }}>
          {message}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: color.text,
            cursor: 'pointer',
            padding: 8,
            fontSize: '1.2rem',
            lineHeight: 1,
          }}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
