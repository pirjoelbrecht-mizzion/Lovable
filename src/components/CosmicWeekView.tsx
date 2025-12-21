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

const WORKOUT_COLORS: Record<WorkoutType, { color: string; icon: string }> = {
  rest: { color: '#10B981', icon: '😌' },
  recovery: { color: '#34D399', icon: '🧘' },
  easy: { color: '#06B6D4', icon: '🏃' },
  tempo: { color: '#8B5CF6', icon: '⚡' },
  intervals: { color: '#EF4444', icon: '🔥' },
  long: { color: '#3B82F6', icon: '🏔️' },
  strength: { color: '#F59E0B', icon: '💪' },
  workout: { color: '#EC4899', icon: '🔥' },
};

const BASE_X_POSITIONS = [50, 150, 250, 350, 450, 550, 650];

export function CosmicWeekView({ weekData, onWorkoutClick, onAddClick }: CosmicWeekViewProps) {
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);

  const calculatePositions = () => {
    const positions: Array<{
      workout: Workout;
      x: number;
      y: number;
      size: number;
      dayIndex: number;
      day: string;
    }> = [];

    weekData.forEach((day, dayIndex) => {
      const x = BASE_X_POSITIONS[dayIndex];
      const workouts = day.workouts;

      if (workouts.length === 0) return;

      const yStart = 120;
      const yEnd = 420;
      const availableHeight = yEnd - yStart;

      workouts.forEach((workout, workoutIndex) => {
        let size = 50;
        if (workout.isToday) size = 90;
        else if (workout.type === 'long' || workout.type === 'intervals') size = 70;
        else if (workout.type === 'strength') size = 60;
        else if (workout.type === 'easy') size = 55;

        let y: number;
        if (workouts.length === 1) {
          y = yStart + availableHeight / 2;
        } else {
          const spacing = availableHeight / (workouts.length + 1);
          y = yStart + spacing * (workoutIndex + 1);
        }

        positions.push({
          workout,
          x,
          y,
          size,
          dayIndex,
          day: day.day,
        });
      });
    });

    return positions;
  };

  const positions = calculatePositions();

  const renderConnections = () => {
    const paths: JSX.Element[] = [];

    for (let i = 0; i < positions.length - 1; i++) {
      const current = positions[i];
      const next = positions[i + 1];

      if (next.dayIndex === current.dayIndex + 1 || next.dayIndex === current.dayIndex) {
        const color = WORKOUT_COLORS[current.workout.type]?.color || '#8B5CF6';

        paths.push(
          <path
            key={`connection-${i}`}
            d={`M ${current.x} ${current.y} L ${next.x} ${next.y}`}
            stroke={color}
            strokeWidth="2"
            fill="none"
            opacity="0.4"
            className="workout-connection"
          />
        );
      }
    }

    return paths;
  };

  return (
    <div className="cosmic-week-view-container">
      <div className="cosmic-grid-bg" />

      <div className="weekly-indicators">
        {weekData.map((day, idx) => {
          const hasWorkouts = day.workouts.length > 0;
          const mainColor = hasWorkouts ? WORKOUT_COLORS[day.workouts[0].type]?.color : 'rgba(139, 92, 246, 0.3)';

          return (
            <div
              key={idx}
              className={`day-indicator ${day.isToday ? 'today' : ''} ${hasWorkouts ? 'active' : ''}`}
              style={{ background: mainColor }}
            />
          );
        })}
      </div>

      <svg className="cosmic-svg-canvas" viewBox="0 0 720 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          {Object.entries(WORKOUT_COLORS).map(([type, { color }]) => (
            <filter key={`glow-${type}`} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {BASE_X_POSITIONS.map((x, idx) => {
          const isToday = weekData[idx]?.isToday;
          return (
            <line
              key={`day-line-${idx}`}
              x1={x}
              y1="80"
              x2={x}
              y2="450"
              stroke={isToday ? 'rgba(6, 182, 212, 0.5)' : 'rgba(139, 92, 246, 0.25)'}
              strokeWidth={isToday ? '2' : '1.5'}
              className={isToday ? 'day-line-today' : 'day-line'}
            />
          );
        })}

        {renderConnections()}
      </svg>

      <div className="cosmic-content-layer">
        {weekData.map((day, dayIndex) => {
          const x = BASE_X_POSITIONS[dayIndex];

          return (
            <div key={dayIndex} className="day-column-container">
              <div
                className={`day-label-circle ${day.isToday ? 'today' : ''}`}
                style={{ left: `${(x / 720) * 100}%` }}
              >
                {day.dayShort.charAt(0)}
              </div>

              {day.workouts.length === 0 && (
                <button
                  className="add-workout-btn"
                  style={{
                    left: `${(x / 720) * 100}%`,
                    top: '50%',
                  }}
                  onClick={() => onAddClick?.(day.day)}
                >
                  +
                </button>
              )}
            </div>
          );
        })}

        {positions.map(({ workout, x, y, size, day }, index) => {
          const colors = WORKOUT_COLORS[workout.type];
          const isHovered = hoveredWorkout === workout.id;

          return (
            <motion.div
              key={workout.id}
              className={`cosmic-workout-bubble ${workout.completed ? 'completed' : ''} ${workout.isToday ? 'today-workout' : ''}`}
              style={{
                left: `${(x / 720) * 100}%`,
                top: `${(y / 520) * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                '--workout-color': colors.color,
              } as React.CSSProperties}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              whileHover={{ scale: 1.15 }}
              onMouseEnter={() => setHoveredWorkout(workout.id)}
              onMouseLeave={() => setHoveredWorkout(null)}
              onClick={() => onWorkoutClick?.(workout, day)}
            >
              <div className="bubble-glow" />
              <div className="bubble-inner">
                {workout.isToday ? (
                  <div className="now-label">NOW</div>
                ) : (
                  <div className="workout-icon">{colors.icon}</div>
                )}
                {workout.completed && <div className="check-badge">✓</div>}
              </div>

              {isHovered && (
                <motion.div
                  className="workout-tooltip"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="tooltip-title">{workout.title}</div>
                  <div className="tooltip-details">
                    {workout.duration && <span>{workout.duration}</span>}
                    {workout.distance && <span> • {workout.distance}</span>}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
