import { useState } from 'react';
import { motion } from 'framer-motion';
import './CosmicWeekView.css';

type WorkoutType = 'rest' | 'recovery' | 'easy' | 'tempo' | 'intervals' | 'long' | 'strength' | 'workout';

interface Workout {
  id: string;
  sessionId?: string;
  type: WorkoutType;
  title: string;
  duration?: string;
  distance?: string;
  completed: boolean;
  isToday?: boolean;
  elevation?: number;
  zones?: string;
}

interface DayWorkouts {
  day: string;
  dayShort: string;
  workouts: Workout[];
  isToday: boolean;
}

interface CosmicWeekViewProps {
  weekData: DayWorkouts[];
  onWorkoutClick?: (workout: Workout, day: string) => void;
  onAddClick?: () => void;
}

const WORKOUT_COLORS: Record<WorkoutType, string> = {
  rest: '#10B981',
  recovery: '#34D399',
  easy: '#06B6D4',
  tempo: '#8B5CF6',
  intervals: '#EF4444',
  long: '#3B82F6',
  strength: '#F59E0B',
  workout: '#EC4899',
};

const WORKOUT_ICONS: Record<WorkoutType, string> = {
  rest: '😌',
  recovery: '🧘',
  easy: '🏃',
  tempo: '⚡',
  intervals: '🔥',
  long: '🏔️',
  strength: '💪',
  workout: '🔥',
};

const isRaceWorkout = (workout: Workout): boolean => {
  const title = workout.title?.toLowerCase() || '';
  return title.includes('race') || title.includes('event') || title.includes('bt2') || title.includes('marathon') || title.includes('ultra');
};

export function CosmicWeekView({ weekData, onWorkoutClick, onAddClick }: CosmicWeekViewProps) {
  console.log(
    '[CosmicWeekView] RENDER',
    weekData.map(d => ({
      day: d.day,
      workouts: d.workouts?.length ?? 0,
      workoutTypes: d.workouts?.map(w => w.type) ?? []
    }))
  );

  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);

  return (
    <div className="cosmic-week-container">
      <div className="cosmic-grid-floor" />

      <div className="cosmic-week-content">
        {weekData.map((day, dayIndex) => {
          const isRestDay = !Array.isArray(day.workouts) || day.workouts.length === 0;

          if (day.workouts.length > 0 && isRestDay) {
            console.error('[BUG] Rest day detected with workouts', day);
          }

          if (day.workouts.length > 0) {
            console.assert(
              day.workouts.every(w => w),
              '[BUG] Workouts exist but cards not rendered',
              day
            );
          }

          const isToday = day.isToday;
          const restColor = '#6B7280';

          return (
            <div key={dayIndex} className="cosmic-day-column">
              <div
                className={`cosmic-day-header ${isToday ? 'today' : ''}`}
                style={{ '--day-color': isRestDay ? restColor : (day.workouts[0] ? WORKOUT_COLORS[day.workouts[0].type] ?? WORKOUT_COLORS.easy : restColor) } as React.CSSProperties}
              >
                {day.dayShort.charAt(0)}
              </div>

              <div className="cosmic-day-line" style={{ background: `linear-gradient(to bottom, ${isRestDay ? restColor : (day.workouts[0] ? WORKOUT_COLORS[day.workouts[0].type] ?? WORKOUT_COLORS.easy : restColor)}40, ${isRestDay ? restColor : (day.workouts[0] ? WORKOUT_COLORS[day.workouts[0].type] ?? WORKOUT_COLORS.easy : restColor)}10)` }} />

              {isRestDay ? (
                <motion.div
                  className="cosmic-bubble rest-day"
                  style={{ '--bubble-color': restColor } as React.CSSProperties}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: dayIndex * 0.08, duration: 0.4 }}
                >
                  <div className="bubble-glow-ring" />
                  <div className="bubble-rest-content">
                    <span className="bubble-icon">🌙</span>
                    <div style={{ fontSize: '11px', marginTop: 4, opacity: 0.8 }}>Rest</div>
                  </div>
                </motion.div>
              ) : (
                day.workouts.map((workout, workoutIdx) => {
                  const normalizedWorkout = {
                    ...workout,
                    type: workout.type || 'easy',
                  };
                  const isRace = isRaceWorkout(normalizedWorkout);
                  const color = isRace ? '#F59E0B' : (WORKOUT_COLORS[normalizedWorkout.type] ?? WORKOUT_COLORS.easy);
                  const icon = isRace ? '🏆' : (WORKOUT_ICONS[normalizedWorkout.type] ?? WORKOUT_ICONS.easy);
                  const isHovered = hoveredWorkout === normalizedWorkout.id;
                  const isPrimaryWorkout = workoutIdx === 0;

                  return (
                    <motion.div
                      key={normalizedWorkout.id}
                      className={`cosmic-bubble ${isPrimaryWorkout ? '' : 'extra'} ${isToday && isPrimaryWorkout ? 'today' : ''} ${normalizedWorkout.completed ? 'completed' : ''} ${isRace ? 'race' : ''}`}
                      style={{ '--bubble-color': color } as React.CSSProperties}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: dayIndex * 0.08 + (isPrimaryWorkout ? 0.4 : 0.1 * (workoutIdx + 1)), duration: isPrimaryWorkout ? 0.4 : 0.3 }}
                      whileHover={isPrimaryWorkout ? { scale: 1.1 } : undefined}
                      onMouseEnter={() => setHoveredWorkout(normalizedWorkout.id)}
                      onMouseLeave={() => setHoveredWorkout(null)}
                      onClick={() => onWorkoutClick?.(normalizedWorkout, day.day)}
                    >
                      <div className="bubble-glow-ring" />

                      {isToday && isPrimaryWorkout ? (
                        <div className="bubble-today-content">
                          <span className="now-label">NOW</span>
                          <span className="bubble-icon">{icon}</span>
                        </div>
                      ) : isPrimaryWorkout ? (
                        <div className="bubble-icon-content">
                          <span className="bubble-icon">{icon}</span>
                          {normalizedWorkout.completed && <span className="completed-check">✓</span>}
                        </div>
                      ) : (
                        <span className="bubble-icon small">{icon}</span>
                      )}

                      {isHovered && isPrimaryWorkout && (
                        <motion.div
                          className="bubble-tooltip"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="tooltip-title">{normalizedWorkout.title}</div>
                          {normalizedWorkout.distance && <div className="tooltip-detail">{normalizedWorkout.distance}</div>}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <motion.button
        className="cosmic-add-btn"
        onClick={onAddClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="add-plus">+</span>
        <span className="add-label">Add</span>
      </motion.button>
    </div>
  );
}
