import { useState } from 'react';
import {
  Dumbbell,
  Play,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertTriangle,
  Mountain,
  Building2,
  Footprints,
  ExternalLink,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import type {
  StrengthExercise,
  MESessionTemplate,
  MEAssignment,
  LoadRegulationDecision,
  UserTerrainAccess,
  CompletedExercise,
} from '@/types/strengthTraining';

export interface SorenessSubmission {
  overallSoreness: number;
  bodyAreas: { muscleGroup: string; level: number }[];
  hasPain: boolean;
  notes: string;
  isFollowup: boolean;
}

interface StrengthExerciseCardProps {
  exercise: StrengthExercise;
  sets?: number;
  reps?: number;
  duration?: number;
  load?: string;
  showRecordButton?: boolean;
  onRecord?: (data: { sets: number; reps: number; load: string; rpe?: number }) => void;
}

export function StrengthExerciseCard({
  exercise,
  sets = 3,
  reps,
  duration,
  load,
  showRecordButton = false,
  onRecord,
}: StrengthExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [recordSets, setRecordSets] = useState(sets);
  const [recordReps, setRecordReps] = useState(reps || 10);
  const [recordLoad, setRecordLoad] = useState(load || 'bodyweight');
  const [recordRpe, setRecordRpe] = useState<number | undefined>(undefined);

  const categoryColors: Record<string, string> = {
    core: '#f59e0b',
    lower_body: '#22c55e',
    upper_body: '#3b82f6',
    plyometric: '#ef4444',
    mobility: '#8b5cf6',
  };

  const categoryColor = categoryColors[exercise.category] || '#6b7280';

  const handleRecord = () => {
    if (onRecord) {
      onRecord({
        sets: recordSets,
        reps: recordReps,
        load: recordLoad,
        rpe: recordRpe,
      });
    }
  };

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${categoryColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: categoryColor,
            flexShrink: 0,
          }}>
            <Dumbbell size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {exercise.name}
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 6,
            }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: `${categoryColor}20`,
                color: categoryColor,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
              }}>
                {exercise.category.replace('_', ' ')}
              </span>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--muted)',
                borderRadius: 4,
                fontSize: 12,
              }}>
                {exercise.exerciseType}
              </span>
            </div>
            {(sets || reps || duration) && (
              <div style={{
                marginTop: 8,
                fontSize: 14,
                color: 'var(--foreground)',
                fontWeight: 500,
              }}>
                {sets}x {duration ? `${duration}s hold` : `${reps} reps`}
                {load && load !== 'bodyweight' && ` @ ${load}`}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            marginTop: 12,
            padding: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--muted)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <span>{expanded ? 'Hide details' : 'Show technique cues'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{
          padding: 16,
          paddingTop: 0,
          borderTop: '1px solid var(--border)',
          marginTop: 0,
        }}>
          {exercise.techniqueCues && exercise.techniqueCues.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: '12px 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                TECHNIQUE CUES
              </h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>
                {exercise.techniqueCues.map((cue, i) => (
                  <li key={i}>{cue}</li>
                ))}
              </ul>
            </div>
          )}

          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                TARGET MUSCLES
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {exercise.targetMuscles.map((muscle, i) => (
                  <span key={i} style={{
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--foreground)',
                  }}>
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.videoUrl && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 12,
                padding: '10px 14px',
                background: 'var(--primary-bg)',
                borderRadius: 8,
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Play size={16} />
              Watch video demonstration
              <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
            </a>
          )}

          {showRecordButton && onRecord && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                RECORD SET
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Sets</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setRecordSets(Math.max(1, recordSets - 1))}
                      style={{ padding: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{recordSets}</span>
                    <button
                      onClick={() => setRecordSets(recordSets + 1)}
                      style={{ padding: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Reps</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setRecordReps(Math.max(1, recordReps - 1))}
                      style={{ padding: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{recordReps}</span>
                    <button
                      onClick={() => setRecordReps(recordReps + 1)}
                      style={{ padding: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>RPE</label>
                  <select
                    value={recordRpe || ''}
                    onChange={(e) => setRecordRpe(e.target.value ? Number(e.target.value) : undefined)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--foreground)',
                      fontSize: 13,
                    }}
                  >
                    <option value="">-</option>
                    {[6, 7, 8, 9, 10].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleRecord}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'var(--success)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Check size={16} />
                Record Set
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StrengthSessionViewProps {
  template: MESessionTemplate;
  exercises: StrengthExercise[];
  meAssignment: MEAssignment | null;
  loadRegulation: LoadRegulationDecision;
  onSessionComplete: (completedExercises: CompletedExercise[], notes: string) => void;
  onCancel: () => void;
}

export function StrengthSessionView({
  template,
  exercises,
  meAssignment,
  loadRegulation,
  onSessionComplete,
  onCancel,
}: StrengthSessionViewProps) {
  const [completedExercises, setCompletedExercises] = useState<Map<number, CompletedExercise>>(new Map());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');

  const exerciseDetails = template.exercises.map(ex =>
    exercises.find(e => e.name === ex.name) || null
  );

  const currentTemplateExercise = template.exercises[currentExerciseIndex];
  const currentExerciseDetail = exerciseDetails[currentExerciseIndex];

  const handleRecordExercise = (data: { sets: number; reps: number; load: string; rpe?: number }) => {
    const completed: CompletedExercise = {
      exerciseName: currentTemplateExercise.name,
      setsCompleted: data.sets,
      repsCompleted: data.reps,
      loadUsed: data.load,
      rpe: data.rpe,
    };

    const updated = new Map(completedExercises);
    updated.set(currentExerciseIndex, completed);
    setCompletedExercises(updated);

    if (currentExerciseIndex < template.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const handleFinish = () => {
    const allCompleted = Array.from(completedExercises.values());
    onSessionComplete(allCompleted, sessionNotes);
  };

  const progress = (completedExercises.size / template.exercises.length) * 100;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: 24, fontWeight: 700 }}>
            {template.name}
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
            Workout {template.workoutNumber} • {template.durationMinutes} min
          </p>
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <X size={16} />
          Cancel
        </button>
      </div>

      {loadRegulation.shouldAdjust && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <AlertTriangle size={20} color="#fbbf24" />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Load Adjustment Active</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{loadRegulation.reason}</div>
          </div>
        </div>
      )}

      <div style={{
        height: 6,
        background: 'var(--border)',
        borderRadius: 3,
        marginBottom: 24,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--success)',
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        <div>
          <div style={{
            background: 'var(--card)',
            border: '2px solid var(--primary)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              color: 'var(--primary)',
              fontSize: 13,
              fontWeight: 600,
            }}>
              CURRENT EXERCISE ({currentExerciseIndex + 1}/{template.exercises.length})
            </div>

            {currentExerciseDetail ? (
              <StrengthExerciseCard
                exercise={currentExerciseDetail}
                sets={currentTemplateExercise.sets}
                reps={typeof currentTemplateExercise.reps === 'number' ? currentTemplateExercise.reps : undefined}
                load={currentTemplateExercise.load}
                showRecordButton={true}
                onRecord={handleRecordExercise}
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{currentTemplateExercise.name}</h3>
                <p style={{ margin: '0 0 16px 0', color: 'var(--muted)' }}>
                  {currentTemplateExercise.sets} x {currentTemplateExercise.reps} @ {currentTemplateExercise.load}
                </p>
                <button
                  onClick={() => handleRecordExercise({
                    sets: currentTemplateExercise.sets,
                    reps: typeof currentTemplateExercise.reps === 'number' ? currentTemplateExercise.reps : 10,
                    load: currentTemplateExercise.load,
                  })}
                  style={{
                    padding: '12px 24px',
                    background: 'var(--success)',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={16} style={{ marginRight: 6 }} />
                  Mark Complete
                </button>
              </div>
            )}
          </div>

          {currentTemplateExercise.notes && (
            <div style={{
              background: 'var(--primary-bg)',
              borderLeft: '3px solid var(--primary)',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0',
              marginBottom: 20,
            }}>
              <strong style={{ fontSize: 12, color: 'var(--muted)' }}>COACH TIP</strong>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>{currentTemplateExercise.notes}</p>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: 16,
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Rest Between Sets</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{template.restProtocol.between_sets_seconds}s</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Rest Between Exercises</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{template.restProtocol.between_exercises_seconds}s</div>
            </div>
          </div>
        </div>

        <div>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Exercise List</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {template.exercises.map((ex, idx) => {
                const isCompleted = completedExercises.has(idx);
                const isCurrent = idx === currentExerciseIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentExerciseIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: isCurrent ? 'var(--primary-bg)' : 'transparent',
                      border: isCurrent ? '1px solid var(--primary)' : '1px solid transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--success)' : 'var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted ? 'white' : 'var(--muted)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {isCompleted ? <Check size={14} /> : idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: isCompleted ? 'var(--success)' : 'var(--foreground)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {ex.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {ex.sets}x{ex.reps}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>Session Notes</h3>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="How did it feel? Any adjustments needed?"
              style={{
                width: '100%',
                minHeight: 80,
                padding: 10,
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--foreground)',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
          </div>

          <button
            onClick={handleFinish}
            disabled={completedExercises.size === 0}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: completedExercises.size > 0 ? 'var(--success)' : 'var(--border)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: completedExercises.size > 0 ? 'pointer' : 'not-allowed',
              opacity: completedExercises.size > 0 ? 1 : 0.6,
            }}
          >
            Complete Session ({completedExercises.size}/{template.exercises.length})
          </button>
        </div>
      </div>
    </div>
  );
}

interface SorenessCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SorenessSubmission) => void;
  type?: 'immediate' | 'followup_48h';
}

const MUSCLE_GROUPS = [
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'calves', label: 'Calves' },
  { id: 'hip_flexors', label: 'Hip Flexors' },
  { id: 'core', label: 'Core' },
  { id: 'lower_back', label: 'Lower Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'lats', label: 'Lats' },
];

export function SorenessCheckModal({ isOpen, onClose, onSubmit, type = 'immediate' }: SorenessCheckModalProps) {
  const [overallSoreness, setOverallSoreness] = useState(3);
  const [bodyAreas, setBodyAreas] = useState<Map<string, number>>(new Map());
  const [hasPain, setHasPain] = useState(false);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const areas = Array.from(bodyAreas.entries()).map(([muscleGroup, level]) => ({
      muscleGroup,
      level,
    }));
    onSubmit({
      overallSoreness,
      bodyAreas: areas,
      hasPain,
      notes,
      isFollowup: type === 'followup_48h',
    });
    setOverallSoreness(3);
    setBodyAreas(new Map());
    setHasPain(false);
    setNotes('');
  };

  const toggleMuscleGroup = (id: string) => {
    const updated = new Map(bodyAreas);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.set(id, 3);
    }
    setBodyAreas(updated);
  };

  const setMuscleLevel = (id: string, level: number) => {
    const updated = new Map(bodyAreas);
    updated.set(id, level);
    setBodyAreas(updated);
  };

  const getSorenessLabel = (level: number) => {
    if (level <= 2) return 'Minimal';
    if (level <= 4) return 'Mild';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'High';
    return 'Severe';
  };

  const getSorenessColor = (level: number) => {
    if (level <= 2) return '#22c55e';
    if (level <= 4) return '#84cc16';
    if (level <= 6) return '#f59e0b';
    if (level <= 8) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20,
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: 16,
        maxWidth: 500,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {type === 'followup_48h' ? '48-Hour Recovery Check' : 'Log Soreness'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {type === 'followup_48h'
                ? 'How are you feeling 48 hours after your session?'
                : 'Help us adjust your training load appropriately'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Overall Soreness Level
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min="1"
                max="10"
                value={overallSoreness}
                onChange={(e) => setOverallSoreness(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <div style={{
                minWidth: 80,
                padding: '8px 12px',
                background: `${getSorenessColor(overallSoreness)}20`,
                border: `1px solid ${getSorenessColor(overallSoreness)}`,
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: getSorenessColor(overallSoreness) }}>
                  {overallSoreness}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {getSorenessLabel(overallSoreness)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Affected Areas (optional)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MUSCLE_GROUPS.map((group) => {
                const isSelected = bodyAreas.has(group.id);
                const level = bodyAreas.get(group.id) || 3;
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleMuscleGroup(group.id)}
                      style={{
                        padding: '8px 14px',
                        background: isSelected ? `${getSorenessColor(level)}20` : 'var(--background)',
                        border: `1px solid ${isSelected ? getSorenessColor(level) : 'var(--border)'}`,
                        borderRadius: 8,
                        color: isSelected ? getSorenessColor(level) : 'var(--foreground)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {group.label}
                    </button>
                    {isSelected && (
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={level}
                        onChange={(e) => setMuscleLevel(group.id, Number(e.target.value))}
                        style={{ width: '100%', marginTop: 4 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={hasPain}
                onChange={(e) => setHasPain(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>I'm experiencing pain</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                  Sharp, unusual, or concerning discomfort (not normal muscle soreness)
                </span>
              </div>
            </label>
          </div>

          {hasPain && (
            <div style={{
              padding: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: 'var(--foreground)' }}>
                Pain is different from normal soreness. We'll adjust your training and recommend rest.
                If pain persists, please consult a healthcare professional.
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details about how you're feeling..."
              style={{
                width: '100%',
                minHeight: 80,
                padding: 12,
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--foreground)',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                color: 'var(--foreground)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                flex: 2,
                padding: '12px 20px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TerrainAccessSettingsProps {
  currentAccess: UserTerrainAccess | null;
  detectedMaxGrade: number | null;
  onSave: (access: Partial<UserTerrainAccess>) => Promise<void>;
}

export function TerrainAccessSettings({ currentAccess, detectedMaxGrade, onSave }: TerrainAccessSettingsProps) {
  const [hasGymAccess, setHasGymAccess] = useState(currentAccess?.hasGymAccess ?? false);
  const [hasHillsAccess, setHasHillsAccess] = useState(currentAccess?.hasHillsAccess ?? false);
  const [hasTreadmillAccess, setHasTreadmillAccess] = useState(currentAccess?.treadmillAccess ?? false);
  const [hasStairsAccess, setHasStairsAccess] = useState(currentAccess?.stairsAccess ?? false);
  const [maxHillGrade, setMaxHillGrade] = useState(currentAccess?.maxHillGrade ?? detectedMaxGrade ?? 10);
  const [usesPoles, setUsesPoles] = useState(currentAccess?.usesPoles ?? false);
  const [isSkimoAthlete, setIsSkimoAthlete] = useState(currentAccess?.isSkimoAthlete ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        hasGymAccess,
        hasHillsAccess,
        treadmillAccess: hasTreadmillAccess,
        stairsAccess: hasStairsAccess,
        maxHillGrade,
        usesPoles,
        isSkimoAthlete,
        manualOverride: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const meTypePreview = () => {
    if (hasHillsAccess && maxHillGrade >= 15) return 'Outdoor Steep Hills';
    if (hasGymAccess) return 'Gym-Based ME';
    if (hasHillsAccess) return 'Outdoor Hills';
    if (hasTreadmillAccess || hasStairsAccess) return 'Treadmill/Stairs';
    return 'Not enough access configured';
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600 }}>
          Terrain & Equipment Access
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
          Configure your available training terrain to get personalized ME sessions
        </p>
      </div>

      {detectedMaxGrade !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          background: 'var(--primary-bg)',
          border: '1px solid var(--primary)',
          borderRadius: 12,
          marginBottom: 24,
        }}>
          <Mountain size={24} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 600 }}>Auto-detected terrain</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Based on your activities, we detected hills up to {detectedMaxGrade}% grade
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Available Terrain</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasHillsAccess}
              onChange={(e) => setHasHillsAccess(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <Mountain size={20} color="var(--success)" />
            <div>
              <span style={{ fontWeight: 500 }}>Hill Access</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                Access to hills for outdoor ME sessions
              </span>
            </div>
          </label>

          {hasHillsAccess && (
            <div style={{ marginLeft: 44 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                Maximum hill grade available: {maxHillGrade}%
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={maxHillGrade}
                onChange={(e) => setMaxHillGrade(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                <span>5% (gentle)</span>
                <span>15% (moderate)</span>
                <span>30% (steep)</span>
              </div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasGymAccess}
              onChange={(e) => setHasGymAccess(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <Building2 size={20} color="var(--primary)" />
            <div>
              <span style={{ fontWeight: 500 }}>Gym Access</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                Access to weights and gym equipment
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasTreadmillAccess}
              onChange={(e) => setHasTreadmillAccess(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <Footprints size={20} color="var(--warning)" />
            <div>
              <span style={{ fontWeight: 500 }}>Treadmill (Incline)</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                Treadmill with incline capability
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasStairsAccess}
              onChange={(e) => setHasStairsAccess(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <Footprints size={20} color="var(--warning)" />
            <div>
              <span style={{ fontWeight: 500 }}>Stairs Access</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                Access to stairs or stair machine
              </span>
            </div>
          </label>
        </div>
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Sport Type</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={usesPoles}
              onChange={(e) => setUsesPoles(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <div>
              <span style={{ fontWeight: 500 }}>I use trekking poles</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                Enables upper body ME for pole efficiency
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isSkimoAthlete}
              onChange={(e) => setIsSkimoAthlete(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <div>
              <span style={{ fontWeight: 500 }}>I'm a Skimo athlete</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                Enables SkiErg and upper body pole-power workouts
              </span>
            </div>
          </label>
        </div>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
          RECOMMENDED ME TYPE
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#22c55e' }}>
          {meTypePreview()}
        </div>
        {(usesPoles || isSkimoAthlete) && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            + Upper body ME sessions enabled
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => {
            setHasGymAccess(currentAccess?.hasGymAccess ?? false);
            setHasHillsAccess(currentAccess?.hasHillsAccess ?? false);
            setHasTreadmillAccess(currentAccess?.treadmillAccess ?? false);
            setHasStairsAccess(currentAccess?.stairsAccess ?? false);
            setMaxHillGrade(currentAccess?.maxHillGrade ?? detectedMaxGrade ?? 10);
            setUsesPoles(currentAccess?.usesPoles ?? false);
            setIsSkimoAthlete(currentAccess?.isSkimoAthlete ?? false);
          }}
          style={{
            padding: '12px 24px',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--foreground)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: 10,
            color: 'white',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
