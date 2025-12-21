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
  onAddClick?: (day: string) => void;
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

const DAY_POSITIONS = [80, 160, 240, 320, 400, 480, 560];

export function CosmicWeekView({ weekData, onWorkoutClick }: CosmicWeekViewProps) {
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);

  console.log('[CosmicWeekView] Received weekData:', weekData.map(d => ({ day: d.day, workoutCount: d.workouts.length })));

  const allWorkouts: Array<{
    workout: Workout;
    day: string;
    dayShort: string;
    dayIndex: number;
    x: number;
    y: number;
    size: number;
  }> = [];

  weekData.forEach((day, dayIndex) => {
    const x = DAY_POSITIONS[dayIndex];
    const workouts = day.workouts;

    if (workouts.length === 0) {
      console.log(`[CosmicWeekView] Skipping day ${day.day} - no workouts`);
      return;
    }

    console.log(`[CosmicWeekView] Rendering ${workouts.length} workouts for ${day.day}:`, workouts);

    const yStart = 160;
    const yEnd = 380;
    const availableHeight = yEnd - yStart;

    workouts.forEach((workout, workoutIndex) => {
      let size: number;
      let y: number;

      if (workout.isToday) {
        size = 180;
        y = 300;
      } else {
        size = 60;

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
        {weekData.map((day, idx) => {
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
          const isToday = weekData[idx]?.isToday;
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
        {weekData.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className={`day-label ${day.isToday ? 'today' : ''}`}
            style={{ left: `${(DAY_POSITIONS[dayIndex] / 640) * 100}%` }}
          >
            {day.dayShort.charAt(0)}
          </div>
        ))}

        {allWorkouts.map(({ workout, day, dayShort, x, y, size }, index) => {
          const color = WORKOUT_COLORS[workout.type];
          const icon = WORKOUT_ICONS[workout.type];
          const isHovered = hoveredWorkout === workout.id;
          const isToday = workout.isToday;

          return (
            <motion.div
              key={workout.id}
              className={`cosmic-workout-bubble ${workout.completed ? 'completed' : ''} ${isToday ? 'today-workout' : ''}`}
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
      </div>
    </div>
  );
}
