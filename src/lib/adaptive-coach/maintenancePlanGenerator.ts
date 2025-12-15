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

  // Build daily workouts
  const days: any[] = [];

  // Sunday: Long run or rest
  if (longRunDay === 'sunday') {
    days.push({
      day: 'Sunday',
      dayOfWeek: 0,
      date: '',
      workout: {
        type: 'long',
        title: 'Long Run',
        distanceKm: longRunVolume,
        durationMin: Math.round(longRunVolume * 8),
        description: 'Long easy run. Stay aerobic, practice nutrition. Enjoy the trails.',
        purpose: 'Aerobic endurance maintenance',
        intensityZones: ['Zone 2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.35),
      },
      isHard: false,
    });
  } else {
    days.push({
      day: 'Sunday',
      dayOfWeek: 0,
      date: '',
      workout: {
        type: 'rest',
        title: 'Rest Day',
        distanceKm: 0,
        durationMin: 0,
        description: 'Complete rest after Saturday long run.',
        purpose: 'Recovery',
      },
      isHard: false,
    });
  }

  // Monday: Easy or rest
  days.push({
    day: 'Monday',
    dayOfWeek: 1,
    date: '',
    workout: {
      type: 'easy',
      title: 'Easy Run',
      distanceKm: remainingEasy * 0.15,
      durationMin: Math.round(remainingEasy * 0.15 * 8),
      description: 'Easy recovery pace. Keep it conversational.',
      purpose: 'Active recovery',
      intensityZones: ['Zone 1-2'],
      verticalGain: Math.round((athlete.averageVertical || 0) * 0.08),
    },
    isHard: false,
  });

  // Tuesday: Easy
  days.push({
    day: 'Tuesday',
    dayOfWeek: 2,
    date: '',
    workout: {
      type: 'easy',
      title: 'Easy Run',
      distanceKm: remainingEasy * 0.20,
      durationMin: Math.round(remainingEasy * 0.20 * 8),
      description: 'Comfortable easy pace.',
      purpose: 'Aerobic maintenance',
      intensityZones: ['Zone 2'],
      verticalGain: Math.round((athlete.averageVertical || 0) * 0.12),
    },
    isHard: false,
  });

  // Wednesday: Tempo or Easy
  if (includeWorkouts) {
    days.push({
      day: 'Wednesday',
      dayOfWeek: 3,
      date: '',
      workout: {
        type: 'tempo',
        title: 'Tempo Run',
        distanceKm: moderateVolume * 0.60,
        durationMin: Math.round(moderateVolume * 0.60 * 6.5),
        description: 'Warm up 10min easy, 20-30min at comfortably hard pace (marathon effort), cool down 10min easy.',
        purpose: 'Lactate threshold maintenance',
        intensityZones: ['Zone 3-4'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.15),
      },
      isHard: true,
    });
  } else {
    days.push({
      day: 'Wednesday',
      dayOfWeek: 3,
      date: '',
      workout: {
        type: 'easy',
        title: 'Easy Run',
        distanceKm: remainingEasy * 0.20,
        durationMin: Math.round(remainingEasy * 0.20 * 8),
        description: 'Easy conversational pace.',
        purpose: 'Aerobic maintenance',
        intensityZones: ['Zone 2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.12),
      },
      isHard: false,
    });
  }

  // Thursday: Easy
  days.push({
    day: 'Thursday',
    dayOfWeek: 4,
    date: '',
    workout: {
      type: 'easy',
      title: 'Easy Run',
      distanceKm: remainingEasy * 0.20,
      durationMin: Math.round(remainingEasy * 0.20 * 8),
      description: 'Easy pace.',
      purpose: 'Recovery between workouts',
      intensityZones: ['Zone 2'],
      verticalGain: Math.round((athlete.averageVertical || 0) * 0.12),
    },
    isHard: false,
  });

  // Friday: Rest day (mandatory for safety compliance)
  days.push({
    day: 'Friday',
    dayOfWeek: 5,
    date: '',
    workout: {
      type: 'rest',
      title: 'Rest Day',
      distanceKm: 0,
      durationMin: 0,
      description: 'Complete rest or gentle cross-training (yoga, swimming).',
      purpose: 'Recovery',
    },
    isHard: false,
  });

  // Saturday: Easy or long run
  if (longRunDay === 'saturday') {
    days.push({
      day: 'Saturday',
      dayOfWeek: 6,
      date: '',
      workout: {
        type: 'long',
        title: 'Long Run',
        distanceKm: longRunVolume,
        durationMin: Math.round(longRunVolume * 8),
        description: 'Long easy run. Stay aerobic, practice nutrition.',
        purpose: 'Aerobic endurance maintenance',
        intensityZones: ['Zone 2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.35),
      },
      isHard: false,
    });
  } else {
    days.push({
      day: 'Saturday',
      dayOfWeek: 6,
      date: '',
      workout: {
        type: 'easy',
        title: 'Easy Run',
        distanceKm: remainingEasy * 0.15,
        durationMin: Math.round(remainingEasy * 0.15 * 8),
        description: 'Short easy run before long run tomorrow.',
        purpose: 'Active recovery',
        intensityZones: ['Zone 1-2'],
        verticalGain: Math.round((athlete.averageVertical || 0) * 0.08),
      },
      isHard: false,
    });
  }

  // Calculate totals
  const totalDistance = days.reduce((sum, d) => sum + (d.workout.distanceKm || 0), 0);
  const totalVert = days.reduce((sum, d) => sum + (d.workout.verticalGain || 0), 0);

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
