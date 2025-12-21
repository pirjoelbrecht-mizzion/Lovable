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

export function CosmicWeekView({ weekData, onWorkoutClick }: CosmicWeekViewProps) {
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);

  const allWorkouts: Array<{
    workout: Workout;
    day: string;
    dayShort: string;
    x: number;
    y: number;
    size: number;
  }> = [];

  const positions = [
    { x: 180, y: 140 },
    { x: 280, y: 210 },
    { x: 180, y: 320 },
    { x: 320, y: 380 },
    { x: 440, y: 280 },
    { x: 440, y: 180 },
    { x: 540, y: 240 },
  ];

  let posIndex = 0;
  weekData.forEach((day) => {
    day.workouts.forEach((workout) => {
      if (posIndex < positions.length) {
        const pos = positions[posIndex];
        const size = workout.isToday ? 140 : 95;

        allWorkouts.push({
          workout,
          day: day.day,
          dayShort: day.dayShort,
          x: pos.x,
          y: pos.y,
          size,
        });
        posIndex++;
      }
    });
  });

  const renderConnections = () => {
    const paths: JSX.Element[] = [];

    for (let i = 0; i < allWorkouts.length - 1; i++) {
      const current = allWorkouts[i];
      const next = allWorkouts[i + 1];
      const color = WORKOUT_COLORS[current.workout.type] || '#8B5CF6';

      paths.push(
        <path
          key={`connection-${i}`}
          d={`M ${current.x} ${current.y} L ${next.x} ${next.y}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity="0.3"
          strokeDasharray="5,5"
        />
      );
    }

    return paths;
  };

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

      <svg className="cosmic-svg-canvas" viewBox="0 0 720 520" preserveAspectRatio="xMidYMid meet">
        {renderConnections()}
      </svg>

      <div className="cosmic-content-layer">
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
                left: `${(x / 720) * 100}%`,
                top: `${(y / 520) * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                '--workout-color': color,
              } as React.CSSProperties}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              whileHover={{ scale: 1.1 }}
              onMouseEnter={() => setHoveredWorkout(workout.id)}
              onMouseLeave={() => setHoveredWorkout(null)}
              onClick={() => onWorkoutClick?.(workout, day)}
            >
              <div className="bubble-glow" />

              <div className="bubble-content">
                {isToday ? (
                  <>
                    <div className="now-badge">NOW</div>
                    <div className="workout-day">{dayShort.toUpperCase()}</div>
                    <div className="workout-title-main">{workout.title}</div>
                    <div className="workout-details">
                      {workout.distance && <span className="detail-distance">{workout.distance}</span>}
                      {workout.duration && <span className="detail-duration">{workout.duration}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="workout-icon-large">{icon}</div>
                    <div className="workout-day">{dayShort.toUpperCase()}</div>
                    <div className="workout-title">{workout.title}</div>
                    <div className="workout-meta">
                      {workout.distance && <span>{workout.distance}</span>}
                    </div>
                    {workout.completed && (
                      <div className="check-badge">✓</div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
