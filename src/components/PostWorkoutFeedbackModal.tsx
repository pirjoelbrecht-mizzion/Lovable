import { useState } from 'react';
import { motion } from 'framer-motion';

interface FeedbackData {
  rpe: number;
  feeling: string;
  painAreas: string[];
  notes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workoutTitle: string;
  actualDuration?: number;
  onSubmit: (data: FeedbackData) => Promise<void>;
}

const PAIN_AREAS = [
  'None', 'Knee (L)', 'Knee (R)', 'Ankle (L)', 'Ankle (R)',
  'Hamstring', 'Quad', 'Calf', 'Hip', 'Lower Back', 'Foot/Arch'
];

const MOODS = [
  { value: 'great', emoji: '🤩', label: 'Strong' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'tired', emoji: '😐', label: 'Tired' },
  { value: 'exhausted', emoji: '😫', label: 'Drained' },
  { value: 'sick', emoji: '🤒', label: 'Sick' },
];

export function PostWorkoutFeedbackModal({
  isOpen,
  onClose,
  workoutTitle,
  actualDuration,
  onSubmit
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rpe, setRpe] = useState<number>(5);
  const [feeling, setFeeling] = useState<string>('good');
  const [painAreas, setPainAreas] = useState<string[]>(['None']);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handlePainToggle = (area: string) => {
    if (area === 'None') {
      setPainAreas(['None']);
      return;
    }
    let newAreas = painAreas.filter(a => a !== 'None');
    if (newAreas.includes(area)) {
      newAreas = newAreas.filter(a => a !== area);
    } else {
      newAreas.push(area);
    }
    setPainAreas(newAreas.length === 0 ? ['None'] : newAreas);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ rpe, feeling, painAreas, notes });
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRpeColor = (val: number) => {
    if (val <= 3) return 'var(--success)';
    if (val <= 6) return 'var(--warning)';
    if (val <= 8) return 'var(--accent)';
    return 'var(--danger)';
  };

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
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--line)'
          }}
        >
          <div>
            <h2 className="h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✓ Workout Complete
            </h2>
            <p className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {workoutTitle} {actualDuration ? `• ${actualDuration} min` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{ padding: '4px 8px', minWidth: 'auto' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* RPE Slider */}
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="small" style={{ fontWeight: 600 }}>
                Perceived Exertion (RPE)
              </label>
              <span
                className="small"
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: getRpeColor(rpe),
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                {rpe} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>Easy</span>
              <span className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>Moderate</span>
              <span className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>Hard</span>
              <span className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>Max</span>
            </div>
          </div>

          {/* Mood / Feeling */}
          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
              How do you feel?
            </label>
            <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setFeeling(m.value)}
                  className="btn"
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 8px',
                    background: feeling === m.value ? 'var(--primary)' : 'var(--card)',
                    border: feeling === m.value ? '2px solid var(--primary)' : '1px solid var(--line)',
                    transform: feeling === m.value ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: 24, marginBottom: 4 }}>{m.emoji}</span>
                  <span className="small" style={{ fontSize: 11 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pain Areas */}
          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
              Any soreness or pain?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAIN_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => handlePainToggle(area)}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    background: painAreas.includes(area)
                      ? (area === 'None' ? 'var(--success)' : 'var(--danger)')
                      : 'var(--card)',
                    border: painAreas.includes(area)
                      ? `2px solid ${area === 'None' ? 'var(--success)' : 'var(--danger)'}`
                      : '1px solid var(--line)',
                    color: painAreas.includes(area) ? '#fff' : 'var(--text)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Additional Notes (Optional)
            </label>
            <textarea
              placeholder="e.g. 'Felt sluggish at the start...'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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

        </div>

        {/* Footer */}
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
                Adapting Plan...
              </>
            ) : (
              'Save & Adapt'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
