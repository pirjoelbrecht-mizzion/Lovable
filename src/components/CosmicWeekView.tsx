import { useState } from 'react';
import { motion } from 'framer-motion';
import './CosmicWeekView.css';

type WorkoutType = 'rest' | 'recovery' | 'easy' | 'tempo' | 'intervals' | 'long' | 'strength' | 'workout';

interface Workout {
  id: string;
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

type DefaultWorkout = { title: string; type: WorkoutType; distance?: string };
type DefaultDayWorkouts = DefaultWorkout[];

const DEFAULT_WEEK_DATA: DefaultDayWorkouts[] = [
  [{ title: 'Rest / Mobility', type: 'rest' }],
  [{ title: 'Easy run', type: 'easy', distance: '8K' }],
  [{ title: 'Easy run', type: 'easy', distance: '6K' }, { title: 'Strength', type: 'strength' }],
  [{ title: 'Easy run', type: 'easy', distance: '8K' }],
  [{ title: 'Workout', type: 'workout', distance: '10K' }],
  [{ title: 'Long run', type: 'long', distance: '16K' }],
  [{ title: 'Easy shakeout', type: 'easy', distance: '6K' }],
];

const DAYS_FALLBACK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CosmicWeekView({ weekData, onWorkoutClick, onAddClick }: CosmicWeekViewProps) {
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const effectiveWeekData = weekData && weekData.length === 7 && weekData.some(d => d.workouts && d.workouts.length > 0)
    ? weekData
    : DAYS_FALLBACK.map((dayName, idx) => ({
        day: dayName,
        dayShort: dayName,
        isToday: idx === todayIndex,
        workouts: DEFAULT_WEEK_DATA[idx].map((w, wIdx) => ({
          id: `default-${idx}-${wIdx}`,
          type: w.type,
          title: w.title,
          distance: w.distance,
          duration: '45 min',
          completed: idx < todayIndex,
          isToday: idx === todayIndex && wIdx === 0,
        })),
      }));

  return (
    <div className="cosmic-week-container">
      <div className="cosmic-grid-floor" />

      <div className="cosmic-week-content">
        {effectiveWeekData.map((day, dayIndex) => {
          const workout = day.workouts[0];
          if (!workout) return null;

          const isRace = isRaceWorkout(workout);
          const color = isRace ? '#F59E0B' : WORKOUT_COLORS[workout.type] || '#8B5CF6';
          const icon = isRace ? '🏆' : (WORKOUT_ICONS[workout.type] || '🏃');
          const isHovered = hoveredWorkout === workout.id;
          const isToday = day.isToday;

          return (
            <div key={dayIndex} className="cosmic-day-column">
              <div
                className={`cosmic-day-header ${isToday ? 'today' : ''}`}
                style={{ '--day-color': color } as React.CSSProperties}
              >
                {day.dayShort.charAt(0)}
              </div>

              <div className="cosmic-day-line" style={{ background: `linear-gradient(to bottom, ${color}40, ${color}10)` }} />

              <motion.div
                className={`cosmic-bubble ${isToday ? 'today' : ''} ${workout.completed ? 'completed' : ''} ${isRace ? 'race' : ''}`}
                style={{ '--bubble-color': color } as React.CSSProperties}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: dayIndex * 0.08, duration: 0.4 }}
                whileHover={{ scale: 1.1 }}
                onMouseEnter={() => setHoveredWorkout(workout.id)}
                onMouseLeave={() => setHoveredWorkout(null)}
                onClick={() => onWorkoutClick?.(workout, day.day)}
              >
                <div className="bubble-glow-ring" />

                {isToday ? (
                  <div className="bubble-today-content">
                    <span className="now-label">NOW</span>
                    <span className="bubble-icon">{icon}</span>
                  </div>
                ) : (
                  <div className="bubble-icon-content">
                    <span className="bubble-icon">{icon}</span>
                    {workout.completed && <span className="completed-check">✓</span>}
                  </div>
                )}

                {isHovered && (
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

              {day.workouts.length > 1 && day.workouts.slice(1).map((extraWorkout, extraIdx) => {
                const extraColor = WORKOUT_COLORS[extraWorkout.type] || '#8B5CF6';
                const extraIcon = WORKOUT_ICONS[extraWorkout.type] || '🏃';
                return (
                  <motion.div
                    key={extraWorkout.id}
                    className={`cosmic-bubble extra ${extraWorkout.completed ? 'completed' : ''}`}
                    style={{ '--bubble-color': extraColor } as React.CSSProperties}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: dayIndex * 0.08 + 0.1 * (extraIdx + 1) }}
                    onClick={() => onWorkoutClick?.(extraWorkout, day.day)}
                  >
                    <span className="bubble-icon small">{extraIcon}</span>
                  </motion.div>
                );
              })}
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
