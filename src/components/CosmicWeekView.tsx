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

const DAY_POSITIONS = [80, 160, 240, 320, 400, 480, 560];

const DEFAULT_WEEK_WORKOUTS: Array<{ title: string; type: WorkoutType; distance?: string }> = [
  { title: 'Rest / Mobility', type: 'rest' },
  { title: 'Easy run', type: 'easy', distance: '8K' },
  { title: 'Easy run + Strength', type: 'easy', distance: '6K' },
  { title: 'Easy run', type: 'easy', distance: '8K' },
  { title: 'Workout', type: 'workout', distance: '10K' },
  { title: 'Long run', type: 'long', distance: '16K' },
  { title: 'Easy shakeout', type: 'easy', distance: '6K' },
];

const DAYS_FALLBACK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_SHORT_FALLBACK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CosmicWeekView({ weekData, onWorkoutClick, onAddClick }: CosmicWeekViewProps) {
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const allWorkouts: Array<{
    workout: Workout;
    day: string;
    dayShort: string;
    dayIndex: number;
    x: number;
    y: number;
    size: number;
  }> = [];

  const effectiveWeekData = weekData && weekData.length === 7 && weekData.some(d => d.workouts.length > 0)
    ? weekData
    : DAYS_FALLBACK.map((dayName, idx) => ({
        day: dayName,
        dayShort: DAYS_SHORT_FALLBACK[idx],
        isToday: idx === todayIndex,
        workouts: [{
          id: `default-${idx}`,
          type: DEFAULT_WEEK_WORKOUTS[idx].type,
          title: DEFAULT_WEEK_WORKOUTS[idx].title,
          distance: DEFAULT_WEEK_WORKOUTS[idx].distance,
          duration: '45 min',
          completed: idx < todayIndex,
          isToday: idx === todayIndex,
        }],
      }));

  effectiveWeekData.forEach((day, dayIndex) => {
    const x = DAY_POSITIONS[dayIndex];
    const workouts = day.workouts || [];

    const yStart = 140;
    const yEnd = 400;
    const availableHeight = yEnd - yStart;

    if (workouts.length === 0) {
      allWorkouts.push({
        workout: {
          id: `empty-${dayIndex}`,
          type: 'rest',
          title: 'Rest',
          duration: '',
          completed: false,
          isToday: day.isToday,
        },
        day: day.day,
        dayShort: day.dayShort,
        dayIndex,
        x,
        y: yStart + availableHeight / 2,
        size: day.isToday ? 100 : 50,
      });
      return;
    }

    workouts.forEach((workout, workoutIndex) => {
      let size: number;
      let y: number;

      if (workout.isToday) {
        size = 100;
        y = yStart + availableHeight / 2;
      } else {
        size = 50;

        if (workouts.length === 1) {
          y = yStart + availableHeight / 2;
        } else {
          const spacing = availableHeight / (workouts.length + 1);
          y = yStart + spacing * (workoutIndex + 1);
        }
      }

      allWorkouts.push({
        workout,
        day: day.day,
        dayShort: day.dayShort,
        dayIndex,
        x,
        y,
        size,
      });
    });
  });

  return (
    <div className="cosmic-week-view-container">
      <div className="cosmic-grid-bg" />

      <div className="weekly-indicators">
        {effectiveWeekData.map((day, idx) => {
          const hasWorkouts = day.workouts.length > 0;
          const mainColor = hasWorkouts ? WORKOUT_COLORS[day.workouts[0].type] : 'rgba(139, 92, 246, 0.3)';

          return (
            <div
              key={idx}
              className={`day-indicator ${day.isToday ? 'today' : ''} ${hasWorkouts ? 'active' : ''}`}
              style={{ background: mainColor }}
            />
          );
        })}
      </div>

      <svg className="cosmic-svg-canvas" viewBox="0 0 640 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {DAY_POSITIONS.map((x, idx) => {
          const isToday = effectiveWeekData[idx]?.isToday;
          return (
            <line
              key={`day-line-${idx}`}
              x1={x}
              y1="90"
              x2={x}
              y2="450"
              stroke={isToday ? 'rgba(6, 182, 212, 0.6)' : 'rgba(139, 92, 246, 0.3)'}
              strokeWidth={isToday ? '3' : '1.5'}
              filter={isToday ? 'url(#line-glow)' : undefined}
            />
          );
        })}
      </svg>

      <div className="cosmic-content-layer">
        {effectiveWeekData.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className={`day-label ${day.isToday ? 'today' : ''}`}
            style={{ left: `${(DAY_POSITIONS[dayIndex] / 640) * 100}%` }}
          >
            {day.dayShort.charAt(0)}
          </div>
        ))}

        {allWorkouts.map(({ workout, day, dayShort, x, y, size }, index) => {
          const isRace = isRaceWorkout(workout);
          const color = isRace ? '#F59E0B' : WORKOUT_COLORS[workout.type];
          const icon = isRace ? '🏆' : WORKOUT_ICONS[workout.type];
          const isHovered = hoveredWorkout === workout.id;
          const isToday = workout.isToday;

          return (
            <motion.div
              key={workout.id}
              className={`cosmic-workout-bubble ${workout.completed ? 'completed' : ''} ${isToday ? 'today-workout' : ''} ${isRace ? 'race-workout' : ''}`}
              style={{
                left: `${(x / 640) * 100}%`,
                top: `${(y / 520) * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                '--workout-color': color,
              } as React.CSSProperties}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.15 }}
              onMouseEnter={() => setHoveredWorkout(workout.id)}
              onMouseLeave={() => setHoveredWorkout(null)}
              onClick={() => onWorkoutClick?.(workout, day)}
            >
              <div className="bubble-glow" />

              <div className="bubble-content">
                {isToday ? (
                  <>
                    <div className="now-badge-large">NOW</div>
                    <div className="workout-day-large">{dayShort.toUpperCase()}</div>
                    <div className="workout-title-today">{workout.title}</div>
                    {workout.distance && (
                      <div className="workout-distance-today">{workout.distance}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="workout-icon-small">{icon}</div>
                    {workout.completed && <div className="check-badge-small">✓</div>}
                  </>
                )}
              </div>

              {isHovered && !isToday && (
                <motion.div
                  className="workout-tooltip-cosmic"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="tooltip-day">{dayShort.toUpperCase()}</div>
                  <div className="tooltip-title">{workout.title}</div>
                  {workout.distance && <div className="tooltip-distance">{workout.distance}</div>}
                </motion.div>
              )}
            </motion.div>
          );
        })}

        <motion.button
          className="cosmic-add-button"
          onClick={onAddClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div className="add-button-glow" />
          <div className="add-button-content">
            <span className="add-icon">+</span>
            <span className="add-text">Add</span>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
