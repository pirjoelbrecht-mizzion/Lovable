interface TrainingFrequencyConfirmationProps {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function TrainingFrequencyConfirmation({
  onConfirm,
  onCancel,
  isLoading,
}: TrainingFrequencyConfirmationProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: 12,
        border: '1px solid var(--line)',
        padding: 32,
        maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Update Training Frequency?</h2>

        <p style={{
          fontSize: 14,
          color: 'var(--muted)',
          lineHeight: 1.6,
          marginBottom: 24
        }}>
          Your training plan will update starting next week. This week remains unchanged.
        </p>

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--line)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Updating...' : 'Update Frequency'}
          </button>
        </div>
      </div>
    </div>
  );
}
