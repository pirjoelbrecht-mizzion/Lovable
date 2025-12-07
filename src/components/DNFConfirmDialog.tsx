import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onDeny: () => void;
  activityTitle: string;
  completionPercent: number;
}

export function DNFConfirmDialog({
  isOpen,
  onConfirm,
  onDeny,
  activityTitle,
  completionPercent
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 2500,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={onDeny}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '450px',
          textAlign: 'center',
          padding: '32px 24px'
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--warning-bg)',
              border: '2px solid var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 32
            }}
          >
            ⚠️
          </div>
          <h2 className="h2" style={{ margin: '0 0 8px', fontSize: 20 }}>
            Did today count as a DNF?
          </h2>
          <p className="small" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            {activityTitle}
          </p>
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'var(--accent-bg)',
              borderRadius: 6,
              display: 'inline-block'
            }}
          >
            <span className="small" style={{ fontWeight: 600 }}>
              Completed {completionPercent}% of planned distance
            </span>
          </div>
        </div>

        <p
          className="small"
          style={{
            color: 'var(--muted)',
            marginBottom: 24,
            lineHeight: 1.6
          }}
        >
          This will help us adjust your training and understand what happened.
        </p>

        <div
          className="row"
          style={{
            gap: 12,
            justifyContent: 'center'
          }}
        >
          <button
            onClick={onDeny}
            className="btn"
            style={{
              flex: 1,
              maxWidth: 180,
              padding: '12px 20px'
            }}
          >
            No, I just stopped early
          </button>
          <button
            onClick={onConfirm}
            className="btn primary"
            style={{
              flex: 1,
              maxWidth: 180,
              padding: '12px 20px',
              background: 'var(--warning)',
              borderColor: 'var(--warning)'
            }}
          >
            Yes, it was a DNF
          </button>
        </div>
      </motion.div>
    </div>
  );
}
