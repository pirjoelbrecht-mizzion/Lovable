import { useState, useEffect, useCallback } from 'react';
import { Check, Play, Pause, ChevronDown, ChevronUp, Timer, Dumbbell, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MESessionTemplate, MESessionExercise } from '@/types/strengthTraining';

interface ExerciseLog {
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  actualReps: number | null;
  weightKg: number | null;
  rpe: number | null;
  completed: boolean;
}

interface LastSessionData {
  exerciseName: string;
  avgWeight: number;
  maxWeight: number;
  lastWeight: number;
  lastReps: number;
}

interface Props {
  template: MESessionTemplate;
  userId: string;
  onComplete?: (sessionId: string) => void;
  onClose?: () => void;
}

export function LiveWorkoutTracker({ template, userId, onComplete, onClose }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<number>(0);
  const [lastSessionData, setLastSessionData] = useState<Map<string, LastSessionData>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initializeExercises();
    loadLastSessionWeights();
  }, [template]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const initializeExercises = () => {
    const logs: ExerciseLog[] = [];
    template.exercises.forEach((ex) => {
      const targetReps = parseInt(ex.reps) || 10;
      for (let set = 1; set <= ex.sets; set++) {
        logs.push({
          exerciseName: ex.name,
          setNumber: set,
          targetReps,
          actualReps: null,
          weightKg: null,
          rpe: null,
          completed: false,
        });
      }
    });
    setExerciseLogs(logs);
  };

  const loadLastSessionWeights = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('exercise_name, weight_kg, actual_reps')
        .eq('user_id', userId)
        .not('weight_kg', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error || !data) return;

      const weightMap = new Map<string, LastSessionData>();
      data.forEach(log => {
        const name = log.exercise_name;
        if (!weightMap.has(name)) {
          weightMap.set(name, {
            exerciseName: name,
            avgWeight: log.weight_kg,
            maxWeight: log.weight_kg,
            lastWeight: log.weight_kg,
            lastReps: log.actual_reps || 0,
          });
        } else {
          const existing = weightMap.get(name)!;
          existing.maxWeight = Math.max(existing.maxWeight, log.weight_kg);
        }
      });

      setLastSessionData(weightMap);
    } catch (err) {
      console.error('Error loading last session weights:', err);
    }
  };

  const startWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from('strength_sessions')
        .insert({
          user_id: userId,
          template_id: template.id,
          template_name: template.name,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      setIsActive(true);
    } catch (err) {
      console.error('Error starting workout:', err);
      setIsActive(true);
    }
  };

  const pauseWorkout = () => {
    setIsActive(false);
  };

  const resumeWorkout = () => {
    setIsActive(true);
  };

  const updateSet = useCallback(async (
    exerciseIdx: number,
    field: 'actualReps' | 'weightKg' | 'rpe',
    value: number | null
  ) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      updated[exerciseIdx] = { ...updated[exerciseIdx], [field]: value };
      return updated;
    });
  }, []);

  const completeSet = useCallback(async (exerciseIdx: number) => {
    const log = exerciseLogs[exerciseIdx];
    if (!log) return;

    setExerciseLogs(prev => {
      const updated = [...prev];
      updated[exerciseIdx] = { ...updated[exerciseIdx], completed: true };
      return updated;
    });

    if (sessionId) {
      try {
        await supabase.from('exercise_logs').insert({
          user_id: userId,
          session_id: sessionId,
          exercise_name: log.exerciseName,
          set_number: log.setNumber,
          target_reps: log.targetReps,
          actual_reps: log.actualReps || log.targetReps,
          weight_kg: log.weightKg,
          rpe: log.rpe,
          completed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error saving set:', err);
      }
    }

    const nextIncomplete = exerciseLogs.findIndex((l, i) => i > exerciseIdx && !l.completed);
    if (nextIncomplete !== -1) {
      const nextExercise = template.exercises.findIndex(
        ex => ex.name === exerciseLogs[nextIncomplete].exerciseName
      );
      if (nextExercise !== -1 && nextExercise !== expandedExercise) {
        setExpandedExercise(nextExercise);
      }
    }
  }, [exerciseLogs, sessionId, userId, template.exercises, expandedExercise]);

  const finishWorkout = async () => {
    setSaving(true);
    try {
      if (sessionId) {
        await supabase
          .from('strength_sessions')
          .update({
            completed_at: new Date().toISOString(),
            total_duration_minutes: Math.round(elapsedTime / 60),
          })
          .eq('id', sessionId);
      }
      onComplete?.(sessionId || '');
    } catch (err) {
      console.error('Error finishing workout:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRecommendedWeight = (exerciseName: string): string => {
    const lastData = lastSessionData.get(exerciseName);
    if (!lastData) return 'Start light';
    return `${lastData.lastWeight}kg (last time)`;
  };

  const completedSets = exerciseLogs.filter(l => l.completed).length;
  const totalSets = exerciseLogs.length;
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0b0e' }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(180deg, rgba(251,191,36,0.1) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(251,191,36,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Dumbbell size={24} color="#fbbf24" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>
                {template.name}
              </h2>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {template.exercises.length} exercises
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
          }}>
            <Timer size={16} color="#fbbf24" />
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: '#fff' }}>
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 4,
          }}>
            <span>Progress</span>
            <span>{completedSets}/{totalSets} sets</span>
          </div>
          <div style={{
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {!isActive ? (
          <button
            onClick={sessionId ? resumeWorkout : startWorkout}
            style={{
              width: '100%',
              padding: '12px',
              background: '#fbbf24',
              border: 'none',
              borderRadius: 8,
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Play size={18} />
            {sessionId ? 'Resume Workout' : 'Start Workout'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={pauseWorkout}
              style={{
                flex: 1,
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Pause size={16} />
              Pause
            </button>
            <button
              onClick={finishWorkout}
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                background: '#22c55e',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Check size={16} />
              {saving ? 'Saving...' : 'Finish'}
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {template.exercises.map((exercise, exIdx) => {
          const exerciseSets = exerciseLogs.filter(l => l.exerciseName === exercise.name);
          const completedExSets = exerciseSets.filter(l => l.completed).length;
          const isExpanded = expandedExercise === exIdx;
          const recommendation = getRecommendedWeight(exercise.name);
          const lastData = lastSessionData.get(exercise.name);

          return (
            <div
              key={exIdx}
              style={{
                marginBottom: 12,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                border: isExpanded ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setExpandedExercise(isExpanded ? -1 : exIdx)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: completedExSets === exercise.sets
                      ? 'rgba(34,197,94,0.2)'
                      : 'rgba(251,191,36,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: completedExSets === exercise.sets ? '#22c55e' : '#fbbf24',
                    fontSize: 14,
                    fontWeight: 600,
                  }}>
                    {completedExSets === exercise.sets ? <Check size={16} /> : exIdx + 1}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
                      {exercise.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {exercise.sets} x {exercise.reps} {exercise.load && exercise.load !== 'bodyweight' ? `@ ${exercise.load}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {completedExSets}/{exercise.sets}
                  </span>
                  {isExpanded ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: '0 16px 16px' }}>
                  {lastData && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      background: 'rgba(251,191,36,0.1)',
                      borderRadius: 8,
                      marginBottom: 12,
                    }}>
                      <TrendingUp size={14} color="#fbbf24" />
                      <span style={{ fontSize: 12, color: '#fbbf24' }}>
                        Last time: {lastData.lastWeight}kg x {lastData.lastReps} reps
                      </span>
                    </div>
                  )}

                  {exercise.notes && (
                    <p style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                      margin: '0 0 12px',
                      lineHeight: 1.5,
                    }}>
                      {exercise.notes}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {exerciseSets.map((set, setIdx) => {
                      const globalIdx = exerciseLogs.findIndex(
                        l => l.exerciseName === exercise.name && l.setNumber === set.setNumber
                      );
                      return (
                        <div
                          key={setIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            background: set.completed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                            borderRadius: 8,
                            border: set.completed ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                          }}
                        >
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: set.completed ? '#22c55e' : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: set.completed ? '#fff' : 'rgba(255,255,255,0.5)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {set.completed ? <Check size={14} /> : set.setNumber}
                          </div>

                          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 2 }}>
                                Weight (kg)
                              </label>
                              <input
                                type="number"
                                placeholder={lastData ? `${lastData.lastWeight}` : '0'}
                                value={set.weightKg ?? ''}
                                onChange={(e) => updateSet(globalIdx, 'weightKg', e.target.value ? parseFloat(e.target.value) : null)}
                                disabled={set.completed}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  background: 'rgba(255,255,255,0.1)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 6,
                                  color: '#fff',
                                  fontSize: 14,
                                  textAlign: 'center',
                                }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 2 }}>
                                Reps
                              </label>
                              <input
                                type="number"
                                placeholder={`${set.targetReps}`}
                                value={set.actualReps ?? ''}
                                onChange={(e) => updateSet(globalIdx, 'actualReps', e.target.value ? parseInt(e.target.value) : null)}
                                disabled={set.completed}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  background: 'rgba(255,255,255,0.1)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 6,
                                  color: '#fff',
                                  fontSize: 14,
                                  textAlign: 'center',
                                }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => completeSet(globalIdx)}
                            disabled={set.completed}
                            style={{
                              padding: '8px 12px',
                              background: set.completed ? 'transparent' : '#22c55e',
                              border: 'none',
                              borderRadius: 6,
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: set.completed ? 'default' : 'pointer',
                              opacity: set.completed ? 0.5 : 1,
                            }}
                          >
                            {set.completed ? 'Done' : 'Log'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
