import Modal from './Modal';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  oldRaceDate: string;
  newRaceDate: string;
  onKeepManualEdits: () => void;
  onRegenerate: () => void;
  onClose: () => void;
}

export default function ConflictResolutionModal({
  isOpen,
  oldRaceDate,
  newRaceDate,
  onKeepManualEdits,
  onRegenerate,
  onClose,
}: ConflictResolutionModalProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: 24, maxWidth: 500 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️ Race Date Changed</div>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Your race date has changed from <strong>{formatDate(oldRaceDate)}</strong> to{' '}
          <strong>{formatDate(newRaceDate)}</strong>.
        </p>

        <div
          style={{
            padding: 16,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Your season plan was customized manually
          </div>
          <p className="small" style={{ color: 'var(--muted)', margin: 0 }}>
            You have made manual adjustments to phase durations. What would you like to do?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn"
            onClick={() => {
              onKeepManualEdits();
              onClose();
            }}
            style={{
              padding: 16,
              textAlign: 'left',
              border: '2px solid var(--line)',
              background: 'var(--bg)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Keep My Manual Edits
            </div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              Preserve your customized phase durations. A warning will be shown that the plan may be out of sync.
            </div>
          </button>

          <button
            className="btn primary"
            onClick={() => {
              onRegenerate();
              onClose();
            }}
            style={{
              padding: 16,
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Regenerate Season Plan
            </div>
            <div className="small" style={{ opacity: 0.9 }}>
              Automatically recalculate all phases based on the new race date. Manual edits will be discarded.
            </div>
          </button>

          <button
            className="btn"
            onClick={onClose}
            style={{
              padding: 12,
              marginTop: 8,
            }}
          >
            Cancel
          </button>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 12,
            background: 'var(--bg-secondary)',
            borderRadius: 6,
            border: '1px solid var(--line)',
          }}
        >
          <div className="small" style={{ color: 'var(--muted)' }}>
            💡 <strong>Tip:</strong> If you choose to keep manual edits, you can always regenerate the plan later
            from the Season Plan page.
          </div>
        </div>
      </div>
    </Modal>
  );
}
