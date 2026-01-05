import { useState, useMemo, memo, useCallback, FC } from 'react';
import { motion } from 'framer-motion';
import './CosmicWeekView.css';

type WorkoutType = 'recovery' | 'easy' | 'tempo' | 'intervals' | 'long' | 'strength' | 'workout';

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

const WORKOUT_COLORS: Record<string, string> = {
  recovery: '#34D399',
  easy: '#06B6D4',
  tempo: '#8B5CF6',
  intervals: '#EF4444',
  long: '#3B82F6',
  strength: '#F59E0B',
  workout: '#EC4899',
};

const WORKOUT_ICONS: Record<string, string> = {
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

interface WorkoutBubbleProps {
  workout: Workout;
  workoutIdx: number;
  dayIndex: number;
  dayShort: string;
  isToday: boolean;
  isHovered: boolean;
  onHoverStart: (id: string) => void;
  onHoverEnd: () => void;
  onClick: (workout: Workout, day: string) => void;
}

const WorkoutBubble: FC<WorkoutBubbleProps> = memo(({
  workout,
  workoutIdx,
  dayIndex,
  dayShort,
  isToday,
  isHovered,
  onHoverStart,
  onHoverEnd,
  onClick
}) => {
  const isRace = isRaceWorkout(workout);
  const color = isRace ? '#F59E0B' : (WORKOUT_COLORS[workout.type] || '#06B6D4');
  const icon = isRace ? '🏆' : (WORKOUT_ICONS[workout.type] || '🏃');
  const isPrimaryWorkout = workoutIdx === 0;
  const bubbleStyle = useMemo(
    () => ({ '--bubble-color': color } as React.CSSProperties),
    [color]
  );

  const handleMouseEnter = useCallback(() => {
    onHoverStart(workout.id);
  }, [onHoverStart, workout.id]);

  const handleMouseLeave = useCallback(() => {
    onHoverEnd();
  }, [onHoverEnd]);

  const handleClick = useCallback(() => {
    onClick(workout, dayShort);
  }, [onClick, workout, dayShort]);

  return (
    <motion.div
      key={workout.id}
      className={`cosmic-bubble ${isPrimaryWorkout ? '' : 'extra'} ${isToday && isPrimaryWorkout ? 'today' : ''} ${workout.completed ? 'completed' : ''} ${isRace ? 'race' : ''}`}
      style={bubbleStyle}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: dayIndex * 0.08 + (isPrimaryWorkout ? 0.4 : 0.1 * (workoutIdx + 1)), duration: isPrimaryWorkout ? 0.4 : 0.3 }}
      whileHover={isPrimaryWorkout ? { scale: 1.1 } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
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
          {workout.completed && <span className="completed-check">✓</span>}
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
          <div className="tooltip-title">{workout.title}</div>
          {workout.distance && <div className="tooltip-detail">{workout.distance}</div>}
        </motion.div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.workout.id === nextProps.workout.id &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.workout.completed === nextProps.workout.completed &&
    prevProps.isToday === nextProps.isToday
  );
});

WorkoutBubble.displayName = 'WorkoutBubble';

// Deep equality check for workout arrays to prevent unnecessary re-renders
const areWorkoutsEqual = (prev: Workout[], next: Workout[]): boolean => {
  if (prev.length !== next.length) return false;

  return prev.every((workout, index) => {
    const nextWorkout = next[index];
    return (
      workout.id === nextWorkout.id &&
      workout.title === nextWorkout.title &&
      workout.type === nextWorkout.type &&
      workout.completed === nextWorkout.completed &&
      workout.distance === nextWorkout.distance &&
      workout.duration === nextWorkout.duration
    );
  });
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: CosmicWeekViewProps, nextProps: CosmicWeekViewProps): boolean => {
  // Check if callbacks changed (they shouldn't if properly memoized)
  if (prevProps.onWorkoutClick !== nextProps.onWorkoutClick ||
      prevProps.onAddClick !== nextProps.onAddClick) {
    return false;
  }

  // Check if weekData arrays are the same length
  if (prevProps.weekData.length !== nextProps.weekData.length) {
    return false;
  }

  // Check each day's data
  return prevProps.weekData.every((prevDay, index) => {
    const nextDay = nextProps.weekData[index];
    return prevDay.day === nextDay.day &&
      prevDay.isToday === nextDay.isToday &&
      areWorkoutsEqual(prevDay.workouts, nextDay.workouts);
  });
};

const CosmicWeekViewComponent = ({ weekData, onWorkoutClick, onAddClick }: CosmicWeekViewProps) => {

  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);

  // Stable hover handlers to prevent WorkoutBubble re-renders
  const handleHoverStart = useCallback((id: string) => {
    setHoveredWorkout(id);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoveredWorkout(null);
  }, []);

  // Memoize rest day style to prevent new object creation
  const restColor = '#6B7280';
  const restDayStyle = useMemo(() =>
    ({ '--bubble-color': restColor } as React.CSSProperties),
    []
  );

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
          const dayColor = isRestDay ? restColor : (WORKOUT_COLORS[day.workouts[0]?.type] || '#06B6D4');

          // Memoize styles per day (React will handle re-renders when dayColor changes)
          const dayHeaderStyle = { '--day-color': dayColor } as React.CSSProperties;
          const dayLineStyle = { background: `linear-gradient(to bottom, ${dayColor}40, ${dayColor}10)` };

          return (
            <div key={dayIndex} className="cosmic-day-column">
              <div
                className={`cosmic-day-header ${isToday ? 'today' : ''}`}
                style={dayHeaderStyle}
              >
                {day.dayShort.charAt(0)}
              </div>

              <div className="cosmic-day-line" style={dayLineStyle} />

              {isRestDay ? (
                <motion.div
                  className="cosmic-bubble rest-day"
                  style={restDayStyle}
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
                day.workouts.map((workout, workoutIdx) => (
                  <WorkoutBubble
                    key={workout.id}
                    workout={workout}
                    workoutIdx={workoutIdx}
                    dayIndex={dayIndex}
                    dayShort={day.dayShort}
                    isToday={isToday}
                    isHovered={hoveredWorkout === workout.id}
                    onHoverStart={handleHoverStart}
                    onHoverEnd={handleHoverEnd}
                    onClick={onWorkoutClick!}
                  />
                ))
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
};

// Export with custom comparison function
export const CosmicWeekView = memo(CosmicWeekViewComponent, arePropsEqual);
