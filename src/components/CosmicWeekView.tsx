import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const WORKOUT_COLORS: Record<WorkoutType, { primary: string; glow: string; icon: string }> = {
  rest: { primary: '#10B981', glow: '#10B981', icon: '😌' },
  recovery: { primary: '#34D399', glow: '#34D399', icon: '🧘' },
  easy: { primary: '#06B6D4', glow: '#06B6D4', icon: '🏃' },
  tempo: { primary: '#8B5CF6', glow: '#8B5CF6', icon: '⚡' },
  intervals: { primary: '#EF4444', glow: '#EF4444', icon: '🔥' },
  long: { primary: '#3B82F6', glow: '#3B82F6', icon: '🏔️' },
  strength: { primary: '#F59E0B', glow: '#F59E0B', icon: '💪' },
  workout: { primary: '#EC4899', glow: '#EC4899', icon: '🔥' },
};

const WORKOUT_SIZES = {
  small: 40,
  medium: 50,
  large: 60,
  today: 80,
};

function getWorkoutSize(workout: Workout): number {
  if (workout.isToday) return WORKOUT_SIZES.today;
  if (workout.type === 'long' || workout.type === 'intervals') return WORKOUT_SIZES.large;
  if (workout.type === 'strength') return WORKOUT_SIZES.medium;
  return WORKOUT_SIZES.small;
}

export function CosmicWeekView({ weekData, onWorkoutClick, onAddClick }: CosmicWeekViewProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const handleWorkoutClick = (workout: Workout, day: string) => {
    setSelectedWorkout(workout.id);
    onWorkoutClick?.(workout, day);
  };

  // Calculate workout positions for each day
  const getDayLayout = (workouts: Workout[], dayIndex: number) => {
    const totalHeight = 400;
    const topMargin = 60;
    const bottomMargin = 60;
    const usableHeight = totalHeight - topMargin - bottomMargin;

    if (workouts.length === 0) return [];

    if (workouts.length === 1) {
      return [{ y: topMargin + usableHeight / 2, size: getWorkoutSize(workouts[0]) }];
    }

    const spacing = usableHeight / (workouts.length + 1);
    return workouts.map((workout, index) => ({
      y: topMargin + spacing * (index + 1),
      size: getWorkoutSize(workout),
    }));
  };

  return (
    <div className="cosmic-week-view">
      {/* Grid Background */}
      <div className="cosmic-grid" />

      {/* Weekly Stress Indicator */}
      <div className="weekly-stress-bar">
        {weekData.map((day, index) => (
          <div
            key={index}
            className={`stress-dot ${day.workouts.length > 0 ? 'active' : ''} ${day.isToday ? 'today' : ''}`}
            style={{
              background: day.workouts.length > 1
                ? 'linear-gradient(135deg, #EF4444, #F59E0B)'
                : day.workouts.length === 1
                ? WORKOUT_COLORS[day.workouts[0].type]?.primary
                : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Main Visualization */}
      <svg className="cosmic-connections" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Glow filters for each workout type */}
          {Object.entries(WORKOUT_COLORS).map(([type, { glow }]) => (
            <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* Gradient definitions */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.6)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
          </linearGradient>
        </defs>

        {/* Vertical lines for each day */}
        {weekData.map((day, dayIndex) => {
          const x = 100 + dayIndex * 100;
          const workoutPositions = getDayLayout(day.workouts, dayIndex);

          return (
            <g key={dayIndex}>
              {/* Day vertical line */}
              <line
                x1={x}
                y1="60"
                x2={x}
                y2="440"
                stroke={day.isToday ? 'rgba(6, 182, 212, 0.6)' : 'rgba(139, 92, 246, 0.3)'}
                strokeWidth={day.isToday ? '3' : '2'}
                className={day.isToday ? 'today-line' : ''}
              />

              {/* Connection lines between workouts */}
              {workoutPositions.map((pos, index) => {
                if (index === workoutPositions.length - 1) return null;
                const nextPos = workoutPositions[index + 1];
                const workout = day.workouts[index];
                const nextWorkout = day.workouts[index + 1];

                return (
                  <line
                    key={`connect-${index}`}
                    x1={x}
                    y1={pos.y}
                    x2={x}
                    y2={nextPos.y}
                    stroke={WORKOUT_COLORS[workout.type]?.primary || '#8B5CF6'}
                    strokeWidth="2"
                    opacity="0.5"
                  />
                );
              })}

              {/* Connecting line to next day (if workouts exist) */}
              {dayIndex < weekData.length - 1 && workoutPositions.length > 0 && getDayLayout(weekData[dayIndex + 1].workouts, dayIndex + 1).length > 0 && (
                <path
                  d={`M ${x} ${workoutPositions[workoutPositions.length - 1].y}
                      Q ${x + 50} ${workoutPositions[workoutPositions.length - 1].y + 20},
                        ${x + 100} ${getDayLayout(weekData[dayIndex + 1].workouts, dayIndex + 1)[0].y}`}
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.4"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Workout Bubbles */}
      <div className="cosmic-bubbles-container">
        {weekData.map((day, dayIndex) => {
          const workoutPositions = getDayLayout(day.workouts, dayIndex);
          const x = 100 + dayIndex * 100;

          return (
            <div key={dayIndex} className="day-column">
              {/* Day Label */}
              <div
                className={`day-label ${day.isToday ? 'today' : ''}`}
                style={{ left: `${(x / 800) * 100}%` }}
              >
                <div className="day-circle">
                  {day.dayShort.charAt(0)}
                </div>
              </div>

              {/* Workouts */}
              {day.workouts.map((workout, workoutIndex) => {
                const position = workoutPositions[workoutIndex];
                const colors = WORKOUT_COLORS[workout.type];
                const size = position.size;

                return (
                  <motion.div
                    key={workout.id}
                    className={`cosmic-bubble ${workout.completed ? 'completed' : ''} ${workout.isToday ? 'today' : ''} ${selectedWorkout === workout.id ? 'selected' : ''}`}
                    style={{
                      left: `${(x / 800) * 100}%`,
                      top: `${(position.y / 500) * 100}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      '--bubble-color': colors.primary,
                      '--bubble-glow': colors.glow,
                    } as React.CSSProperties}
                    onClick={() => handleWorkoutClick(workout, day.day)}
                    onHoverStart={() => setHoveredDay(dayIndex)}
                    onHoverEnd={() => setHoveredDay(null)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: dayIndex * 0.1 + workoutIndex * 0.05 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Outer ring */}
                    <div className="bubble-ring" />

                    {/* Inner content */}
                    <div className="bubble-content">
                      {workout.isToday && (
                        <div className="now-badge">NOW</div>
                      )}
                      {!workout.isToday && (
                        <div className="bubble-icon">{colors.icon}</div>
                      )}
                      {workout.completed && (
                        <div className="completed-check">✓</div>
                      )}
                    </div>

                    {/* Hover tooltip */}
                    <AnimatePresence>
                      {hoveredDay === dayIndex && (
                        <motion.div
                          className="bubble-tooltip"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <div className="tooltip-title">{workout.title}</div>
                          {workout.duration && (
                            <div className="tooltip-detail">{workout.duration}</div>
                          )}
                          {workout.distance && (
                            <div className="tooltip-detail">{workout.distance}</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Add button for empty days */}
              {day.workouts.length === 0 && (
                <motion.div
                  className="add-workout-button"
                  style={{
                    left: `${(x / 800) * 100}%`,
                    top: '50%',
                  }}
                  onClick={() => onAddClick?.(day.day)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: dayIndex * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="add-icon">+</div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
