import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RaceFeedback, EventType, LimiterType } from '../types/feedback';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventType: EventType;
  eventDate: string;
  actualDistance?: number;
  actualDuration?: number;
  onSubmit: (data: Partial<RaceFeedback>) => Promise<void>;
}

const LIMITERS: Array<{ value: LimiterType; emoji: string; label: string }> = [
  { value: 'legs', emoji: '🦵', label: 'Legs' },
  { value: 'stomach', emoji: '🤢', label: 'Stomach' },
  { value: 'heat', emoji: '🥵', label: 'Heat' },
  { value: 'pacing', emoji: '⏱️', label: 'Pacing' },
  { value: 'mindset', emoji: '🧠', label: 'Mindset' },
  { value: 'equipment', emoji: '👟', label: 'Equipment' },
  { value: 'other', emoji: '❓', label: 'Other' },
];

export function RacePerformanceFeedbackModal({
  isOpen,
  onClose,
  eventTitle,
  eventType,
  eventDate,
  actualDistance,
  actualDuration,
  onSubmit
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [climbingDifficulty, setClimbingDifficulty] = useState<number>(3);
  const [downhillDifficulty, setDownhillDifficulty] = useState<number>(3);
  const [heatPerception, setHeatPerception] = useState<number>(3);
  const [technicality, setTechnicality] = useState<number>(3);
  const [biggestLimiter, setBiggestLimiter] = useState<LimiterType>('legs');
  const [limiterNotes, setLimiterNotes] = useState('');
  const [fuelLog, setFuelLog] = useState('');
  const [issuesStartKm, setIssuesStartKm] = useState<string>('');
  const [strongestArea, setStrongestArea] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const feedback: Partial<RaceFeedback> = {
        event_date: eventDate,
        event_type: eventType,
        climbing_difficulty: climbingDifficulty,
        downhill_difficulty: downhillDifficulty,
        heat_perception: heatPerception,
        technicality,
        biggest_limiter: biggestLimiter,
        limiter_notes: limiterNotes || undefined,
        fuel_log: fuelLog || undefined,
        issues_start_km: issuesStartKm ? parseFloat(issuesStartKm) : undefined,
        strongest_performance_area: strongestArea || undefined,
        completion_status: 'completed',
      };
      await onSubmit(feedback);
      onClose();
    } catch (error) {
      console.error("Failed to submit race feedback", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyLabel = (val: number) => {
    const labels = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'];
    return labels[val - 1] || 'Moderate';
  };

  const getDifficultyColor = (val: number) => {
    if (val <= 2) return 'var(--success)';
    if (val === 3) return 'var(--warning)';
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
          maxWidth: '600px',
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
              {eventType === 'race' ? '🏁' : eventType === 'simulation' ? '🎯' : '⏱️'} Race Feedback
            </h2>
            <p className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {eventTitle}
              {actualDistance && ` • ${actualDistance.toFixed(1)} km`}
              {actualDuration && ` • ${actualDuration} min`}
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

          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
              Difficulty Ratings (1-5)
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small">⛰️ Climbing</span>
                  <span
                    className="small"
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getDifficultyColor(climbingDifficulty),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 11
                    }}
                  >
                    {getDifficultyLabel(climbingDifficulty)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={climbingDifficulty}
                  onChange={(e) => setClimbingDifficulty(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small">⬇️ Downhills</span>
                  <span
                    className="small"
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getDifficultyColor(downhillDifficulty),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 11
                    }}
                  >
                    {getDifficultyLabel(downhillDifficulty)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={downhillDifficulty}
                  onChange={(e) => setDownhillDifficulty(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small">🌡️ Heat</span>
                  <span
                    className="small"
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getDifficultyColor(heatPerception),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 11
                    }}
                  >
                    {getDifficultyLabel(heatPerception)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={heatPerception}
                  onChange={(e) => setHeatPerception(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small">🪨 Technicality</span>
                  <span
                    className="small"
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getDifficultyColor(technicality),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 11
                    }}
                  >
                    {getDifficultyLabel(technicality)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={technicality}
                  onChange={(e) => setTechnicality(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
              What was your biggest limiter today?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LIMITERS.map((limiter) => (
                <button
                  key={limiter.value}
                  onClick={() => setBiggestLimiter(limiter.value)}
                  className="btn"
                  style={{
                    flex: '1 1 calc(33% - 8px)',
                    minWidth: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 8px',
                    background: biggestLimiter === limiter.value ? 'var(--primary)' : 'var(--card)',
                    border: biggestLimiter === limiter.value ? '2px solid var(--primary)' : '1px solid var(--line)',
                    transform: biggestLimiter === limiter.value ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: 24, marginBottom: 4 }}>{limiter.emoji}</span>
                  <span className="small" style={{ fontSize: 12 }}>{limiter.label}</span>
                </button>
              ))}
            </div>
            {biggestLimiter && biggestLimiter !== 'other' && (
              <textarea
                placeholder={`Tell us more about what made ${biggestLimiter} limiting...`}
                value={limiterNotes}
                onChange={(e) => setLimiterNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--card)',
                  resize: 'vertical',
                  minHeight: 60,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  color: 'var(--text)',
                  marginTop: 12
                }}
              />
            )}
          </div>

          <div>
            <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Fueling Log (Optional)
            </label>
            <textarea
              placeholder="e.g. 'Gel at km 10, 20, 30. Water every 5km.'"
              value={fuelLog}
              onChange={(e) => setFuelLog(e.target.value)}
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
                color: 'var(--text)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="small" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Issues started at (km)
              </label>
              <input
                type="number"
                placeholder="e.g. 25"
                value={issuesStartKm}
                onChange={(e) => setIssuesStartKm(e.target.value)}
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
                Strongest area
              </label>
              <input
                type="text"
                placeholder="e.g. 'Uphills'"
                value={strongestArea}
                onChange={(e) => setStrongestArea(e.target.value)}
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
                Learning...
              </>
            ) : (
              'Save & Learn'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
