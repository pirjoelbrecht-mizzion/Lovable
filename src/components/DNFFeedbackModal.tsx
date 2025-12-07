import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DNFEvent, DNFCause } from '../types/feedback';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventDate: string;
  actualDistance: number;
  plannedDistance: number;
  autoDetected: boolean;
  onSubmit: (data: Partial<DNFEvent>) => Promise<void>;
}

const DNF_CAUSES: Array<{ value: DNFCause; emoji: string; label: string }> = [
  { value: 'injury', emoji: '🤕', label: 'Injury' },
  { value: 'heat', emoji: '🥵', label: 'Heat Exhaustion' },
  { value: 'stomach', emoji: '🤢', label: 'GI Issues' },
  { value: 'pacing', emoji: '⏱️', label: 'Pacing Error' },
  { value: 'mental', emoji: '🧠', label: 'Mental Fatigue' },
  { value: 'equipment', emoji: '👟', label: 'Equipment Issue' },
  { value: 'other', emoji: '❓', label: 'Other' },
];

export function DNFFeedbackModal({
  isOpen,
  onClose,
  eventTitle,
  eventDate,
  actualDistance,
  plannedDistance,
  autoDetected,
  onSubmit
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dnfCause, setDnfCause] = useState<DNFCause>('injury');
  const [causeNotes, setCauseNotes] = useState('');
  const [kmStopped, setKmStopped] = useState<string>(actualDistance.toFixed(1));
  const [hadWarnings, setHadWarnings] = useState<boolean>(false);
  const [whatWouldChange, setWhatWouldChange] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dnfData: Partial<DNFEvent> = {
        event_date: eventDate,
        dnf_cause: dnfCause,
        dnf_cause_notes: causeNotes || undefined,
        km_stopped: parseFloat(kmStopped),
        had_warning_signs: hadWarnings,
        what_would_change: whatWouldChange || undefined,
        what_went_well: whatWentWell || undefined,
        auto_detected: autoDetected,
        user_confirmed: true,
      };
      await onSubmit(dnfData);
      onClose();
    } catch (error) {
      console.error("Failed to submit DNF feedback", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completionPercent = Math.round((actualDistance / plannedDistance) * 100);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--line)'
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 className="h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
              We're here with you
            </h2>
            <p className="small" style={{ color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              Every DNF is a learning opportunity. Your feedback helps us adjust your training so you come back stronger.
            </p>
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--accent-bg)',
                borderRadius: 8,
                border: '1px solid var(--accent)'
              }}
            >
              <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
                {eventTitle}
              </div>
              <div className="small" style={{ fontWeight: 600 }}>
                Completed {actualDistance.toFixed(1)} km of {plannedDistance.toFixed(1)} km ({completionPercent}%)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{ padding: '4px 8px', minWidth: 'auto', marginLeft: 12 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
              What was the primary reason you stopped?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DNF_CAUSES.map((cause) => (
                <button
                  key={cause.value}
                  onClick={() => setDnfCause(cause.value)}
                  className="btn"
                  style={{
                    flex: '1 1 calc(33% - 8px)',
                    minWidth: '140px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 8px',
                    background: dnfCause === cause.value ? 'var(--primary)' : 'var(--card)',
                    border: dnfCause === cause.value ? '2px solid var(--primary)' : '1px solid var(--line)',
                    transform: dnfCause === cause.value ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: 24, marginBottom: 4 }}>{cause.emoji}</span>
                  <span className="small" style={{ fontSize: 12, textAlign: 'center' }}>{cause.label}</span>
                </button>
              ))}
            </div>
            {dnfCause && (
              <textarea
                placeholder={`Tell us more about what happened...`}
                value={causeNotes}
                onChange={(e) => setCauseNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--card)',
                  resize: 'vertical',
                  minHeight: 70,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  color: 'var(--text)',
                  marginTop: 12
                }}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Distance completed (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={kmStopped}
                onChange={(e) => setKmStopped(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--card)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  color: 'var(--text)'
                }}
              />
            </div>

            <div>
              <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Did you have warning signs?
              </label>
              <div className="row" style={{ gap: 8, height: 42 }}>
                <button
                  onClick={() => setHadWarnings(true)}
                  className="btn"
                  style={{
                    flex: 1,
                    background: hadWarnings ? 'var(--warning)' : 'var(--card)',
                    border: hadWarnings ? '2px solid var(--warning)' : '1px solid var(--line)',
                    color: hadWarnings ? '#fff' : 'var(--text)',
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHadWarnings(false)}
                  className="btn"
                  style={{
                    flex: 1,
                    background: !hadWarnings ? 'var(--success)' : 'var(--card)',
                    border: !hadWarnings ? '2px solid var(--success)' : '1px solid var(--line)',
                    color: !hadWarnings ? '#fff' : 'var(--text)',
                  }}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
              If you could start over, what would you change?
            </label>
            <textarea
              placeholder="e.g. 'Start slower', 'More fluids early', 'Better fueling strategy'..."
              value={whatWouldChange}
              onChange={(e) => setWhatWouldChange(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                resize: 'vertical',
                minHeight: 80,
                fontFamily: 'inherit',
                fontSize: 14,
                color: 'var(--text)'
              }}
            />
          </div>

          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: 'var(--success)' }}>
              What went well before you stopped?
            </label>
            <textarea
              placeholder="e.g. 'Felt strong in the first half', 'Pacing was good'..."
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--success)',
                background: 'var(--card)',
                resize: 'vertical',
                minHeight: 80,
                fontFamily: 'inherit',
                fontSize: 14,
                color: 'var(--text)'
              }}
            />
          </div>

        </div>

        <div
          className="row"
          style={{
            gap: 12,
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onClose}
            className="btn"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Adjusting Plan...
              </>
            ) : (
              'Save & Adjust Plan'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
