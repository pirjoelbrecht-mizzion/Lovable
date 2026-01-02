import type { AthleteProfile, WeeklyPlan } from './types';

export interface MaintenancePlanInput {
  athlete: AthleteProfile;
  targetWeeklyVolume?: number;
  includeWorkouts: boolean;
  preferLongRunDay?: 'saturday' | 'sunday';
}

export interface MaintenancePlanResult {
  plan: WeeklyPlan;
  volumeBreakdown: {
    easy: number;
    moderate: number;
    long: number;
  };
  explanation: string;
}

/**
 * Generate maintenance week plan (no race goal)
 * Uses 80/20 principle: 80% easy, 20% moderate
 */
export function generateMaintenancePlan(input: MaintenancePlanInput): MaintenancePlanResult {
  const { athlete, targetWeeklyVolume, includeWorkouts, preferLongRunDay } = input;

  // Determine target volume
  const volume = targetWeeklyVolume || athlete.averageMileage || getDefaultVolume(athlete);

  // Apply 80/20 principle
  const easyVolume = volume * 0.80;
  const moderateVolume = volume * 0.20;

  // Long run: 30% of weekly volume or max 25km
  const longRunDay = preferLongRunDay || 'sunday';
  const longRunVolume = Math.min(volume * 0.30, 25);
  const remainingEasy = easyVolume - longRunVolume;

  // Get current Monday for date generation
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  // Helper to get date string for day index (0 = Sunday, 1 = Monday, etc.)
  const getDateForDay = (dayIndex: number): string => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIndex);
    return date.toISOString().slice(0, 10);
  };

  // Build daily workouts (Monday through Sunday)
  const days: any[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Monday: Easy
  days.push({
    day: 'Monday',
    date: getDateForDay(0),
    sessions: [{
      type: 'easy',
      title: 'Easy Run',
      distanceKm: remainingEasy * 0.15,
      durationMin: Math.round(remainingEasy * 0.15 * 8),
      description: 'Easy recovery pace. Keep it conversational.',
      purpose: 'Active recovery',
      intensityZones: ['Z2'],
      verticalGain: Math.round((athlete.averageVertical || 0) * 0.08),
    }],
  });

  // Tuesday: Easy
  days.push({
    day: 'Tuesday',
    date: getDateForDay(1),
    sessions: [{
      type: 'easy',
      title: 'Easy Run',
      distanceKm: remainingEasy * 0.20,
      durationMin: Math.round(remainingEasy * 0.20 * 8),
      description: 'Comfortable easy pace.',
      purpose: 'Aerobic maintenance',
      intensityZones: ['Z2'],
      verticalGain: Math.round((athlete.averageVertical || 0) * 0.12),
    }],
  });

  // Wednesday: Strength Training
  days.push({
    day: 'Wednesday',
    date: getDateForDay(2),
    sessions: [{
      type: 'strength',
      title: 'Strength Training',
      distanceKm: 0,
      durationMin: 45,
      description: 'Muscular Endurance session. Focus on terrain-specific strength work.',
      purpose: 'Running-specific strength and injury prevention',
      intensityZones: [],
      verticalGain: 0,
    }],
  });

  // Thursday: Easy
  days.push({
    day: 'Thursday',
    date: getDateForDay(3),
    sessions: [{
      type: 'easy',
      title: 'Easy Run',
      distanceKm: remainingEasy * 0.20,
      durationMin: Math.round(remainingEasy * 0.20 * 8),
      description: 'Easy pace.',
      purpose: 'Recovery between workouts',
      intensityZones: ['Z2'],
      verticalGain: Math.round((athlete.averageVertical || 0) * 0.12),
    }],
  });

  // Friday: Rest day
  days.push({
    day: 'Friday',
    date: getDateForDay(4),
    sessions: [],  // Rest day = empty sessions array
  });

  // Saturday: Easy or long run
  if (longRunDay === 'saturday') {
    days.push({
      day: 'Saturday',
      date: getDateForDay(5),
      sessions: [{
        type: 'long',
        title: 'Long Run',
        distanceKm: longRunVolume,
        durationMin: Math.round(longRunVolume * 8),
        description: 'Long easy run. Stay aerobic, practice nutrition.',
        purpose: 'Aerobic endurance maintenance',
        intensityZones: ['Z2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.35),
      }],
    });
  } else {
    days.push({
      day: 'Saturday',
      date: getDateForDay(5),
      sessions: [{
        type: 'easy',
        title: 'Easy Run',
        distanceKm: remainingEasy * 0.15,
        durationMin: Math.round(remainingEasy * 0.15 * 8),
        description: 'Short easy run before long run tomorrow.',
        purpose: 'Active recovery',
        intensityZones: ['Z2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.08),
      }],
    });
  }

  // Sunday: Long run or rest
  if (longRunDay === 'sunday') {
    days.push({
      day: 'Sunday',
      date: getDateForDay(6),
      sessions: [{
        type: 'long',
        title: 'Long Run',
        distanceKm: longRunVolume,
        durationMin: Math.round(longRunVolume * 8),
        description: 'Long easy run. Stay aerobic, practice nutrition. Enjoy the trails.',
        purpose: 'Aerobic endurance maintenance',
        intensityZones: ['Z2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.35),
      }],
    });
  } else {
    days.push({
      day: 'Sunday',
      date: getDateForDay(6),
      sessions: [],  // Rest day = empty sessions array
    });
  }

  // Calculate totals
  const totalDistance = days.reduce((sum, d) => sum + d.sessions.reduce((s, w) => s + (w.distanceKm || 0), 0), 0);
  const totalVert = days.reduce((sum, d) => sum + d.sessions.reduce((s, w) => s + (w.verticalGain || 0), 0), 0);

  const plan: WeeklyPlan = {
    weekNumber: 1,
    phase: 'base',
    startDate: '',
    endDate: '',
    targetMileage: volume,
    actualMileage: totalDistance,
    targetVert: (athlete.averageVertical || 0),
    actualVert: totalVert,
    days,
    coachNotes: `Maintenance training week. Focus on consistency and enjoying your runs. No progressive overload required.`,
    emphasis: 'aerobic',
    recoveryRatio: athlete.recoveryRatio || '3:1',
  };

  const explanation = `This is a maintenance training week designed to preserve your fitness without a specific race goal.

**Total Volume:** ${volume.toFixed(1)}km following 80/20 training
- Easy running: ${easyVolume.toFixed(1)}km (80%)
- Moderate effort: ${(includeWorkouts ? moderateVolume : 0).toFixed(1)}km (20%)

**Key Sessions:**
- Long Run: ${longRunVolume.toFixed(1)}km on ${longRunDay === 'sunday' ? 'Sunday' : 'Saturday'}
${includeWorkouts ? `- Tempo Run: ${(moderateVolume * 0.60).toFixed(1)}km on Wednesday` : ''}
- Rest Day: Friday (mandatory recovery)

The goal is consistent training, not progressive overload. Adjust as needed based on how you feel.`;

  return {
    plan,
    volumeBreakdown: {
      easy: easyVolume,
      moderate: includeWorkouts ? moderateVolume : 0,
      long: longRunVolume,
    },
    explanation,
  };
}

/**
 * Get default volume for athlete category if no history available
 */
function getDefaultVolume(athlete: AthleteProfile): number {
  const category = athlete.category || 'Cat1';

  if (category === 'Cat2') {
    return 60; // Experienced: 60km/week default
  }

  return 40; // Beginner: 40km/week default
}
