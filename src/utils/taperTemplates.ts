import type { RacePriority } from '@/utils/races';
import { getSupabase, getCurrentUserId } from '@/lib/supabase';

export interface VolumeReductionPoint {
  day: number;
  volumePercent: number;
}

export interface WorkoutModifications {
  sharpness?: 'none' | 'minimal' | 'light' | 'moderate' | 'maintain' | 'short_intervals' | 'race_pace_touches';
  longRun?: 'normal' | 'reduce_30pct' | 'reduce_40pct' | 'reduce_50pct' | 'reduce_60pct' | 'reduce_70pct';
  racePacing?: 'effort_based' | 'split_based' | 'none';
}

export interface TaperTemplate {
  id?: string;
  userId?: string;
  name: string;
  racePriority: RacePriority;
  minDistanceKm: number;
  maxDistanceKm: number | null;
  taperDurationDays: number;
  volumeReductionCurve: VolumeReductionPoint[];
  workoutModifications: WorkoutModifications;
  isSystemTemplate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaperPlanDay {
  dayOffset: number;
  volumeScale: number;
  intensityAdjustment: string;
  notes: string[];
}

export interface TaperPlan {
  template: TaperTemplate;
  startDate: string;
  raceDate: string;
  days: TaperPlanDay[];
  totalVolumereduction: number;
}

const DEFAULT_TEMPLATES: TaperTemplate[] = [
  {
    name: 'A Race: 5-10km',
    racePriority: 'A',
    minDistanceKm: 5,
    maxDistanceKm: 10,
    taperDurationDays: 5,
    volumeReductionCurve: [
      { day: -5, volumePercent: 85 },
      { day: -4, volumePercent: 80 },
      { day: -3, volumePercent: 75 },
      { day: -2, volumePercent: 65 },
      { day: -1, volumePercent: 50 },
    ],
    workoutModifications: {
      sharpness: 'maintain',
      longRun: 'reduce_30pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'A Race: Half Marathon',
    racePriority: 'A',
    minDistanceKm: 10.1,
    maxDistanceKm: 25,
    taperDurationDays: 7,
    volumeReductionCurve: [
      { day: -7, volumePercent: 85 },
      { day: -6, volumePercent: 80 },
      { day: -5, volumePercent: 75 },
      { day: -4, volumePercent: 70 },
      { day: -3, volumePercent: 65 },
      { day: -2, volumePercent: 55 },
      { day: -1, volumePercent: 45 },
    ],
    workoutModifications: {
      sharpness: 'short_intervals',
      longRun: 'reduce_40pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'A Race: Marathon to 50km',
    racePriority: 'A',
    minDistanceKm: 25.1,
    maxDistanceKm: 50,
    taperDurationDays: 10,
    volumeReductionCurve: [
      { day: -10, volumePercent: 90 },
      { day: -9, volumePercent: 85 },
      { day: -8, volumePercent: 80 },
      { day: -7, volumePercent: 75 },
      { day: -6, volumePercent: 70 },
      { day: -5, volumePercent: 65 },
      { day: -4, volumePercent: 60 },
      { day: -3, volumePercent: 55 },
      { day: -2, volumePercent: 50 },
      { day: -1, volumePercent: 40 },
    ],
    workoutModifications: {
      sharpness: 'race_pace_touches',
      longRun: 'reduce_50pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'A Race: 50-100km Ultra',
    racePriority: 'A',
    minDistanceKm: 50.1,
    maxDistanceKm: 100,
    taperDurationDays: 12,
    volumeReductionCurve: [
      { day: -12, volumePercent: 90 },
      { day: -11, volumePercent: 85 },
      { day: -10, volumePercent: 80 },
      { day: -9, volumePercent: 75 },
      { day: -8, volumePercent: 70 },
      { day: -7, volumePercent: 65 },
      { day: -6, volumePercent: 60 },
      { day: -5, volumePercent: 55 },
      { day: -4, volumePercent: 50 },
      { day: -3, volumePercent: 45 },
      { day: -2, volumePercent: 40 },
      { day: -1, volumePercent: 35 },
    ],
    workoutModifications: {
      sharpness: 'minimal',
      longRun: 'reduce_60pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'A Race: 100+ Mile Ultra',
    racePriority: 'A',
    minDistanceKm: 100.1,
    maxDistanceKm: null,
    taperDurationDays: 14,
    volumeReductionCurve: [
      { day: -14, volumePercent: 90 },
      { day: -13, volumePercent: 85 },
      { day: -12, volumePercent: 80 },
      { day: -11, volumePercent: 75 },
      { day: -10, volumePercent: 70 },
      { day: -9, volumePercent: 65 },
      { day: -8, volumePercent: 60 },
      { day: -7, volumePercent: 55 },
      { day: -6, volumePercent: 50 },
      { day: -5, volumePercent: 45 },
      { day: -4, volumePercent: 40 },
      { day: -3, volumePercent: 35 },
      { day: -2, volumePercent: 30 },
      { day: -1, volumePercent: 25 },
    ],
    workoutModifications: {
      sharpness: 'none',
      longRun: 'reduce_70pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'B Race: Under 30km',
    racePriority: 'B',
    minDistanceKm: 0,
    maxDistanceKm: 30,
    taperDurationDays: 3,
    volumeReductionCurve: [
      { day: -3, volumePercent: 90 },
      { day: -2, volumePercent: 80 },
      { day: -1, volumePercent: 70 },
    ],
    workoutModifications: {
      sharpness: 'maintain',
      longRun: 'normal',
    },
    isSystemTemplate: true,
  },
  {
    name: 'B Race: 30-60km',
    racePriority: 'B',
    minDistanceKm: 30.1,
    maxDistanceKm: 60,
    taperDurationDays: 5,
    volumeReductionCurve: [
      { day: -5, volumePercent: 90 },
      { day: -4, volumePercent: 85 },
      { day: -3, volumePercent: 80 },
      { day: -2, volumePercent: 70 },
      { day: -1, volumePercent: 60 },
    ],
    workoutModifications: {
      sharpness: 'light',
      longRun: 'reduce_30pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'B Race: 60km+',
    racePriority: 'B',
    minDistanceKm: 60.1,
    maxDistanceKm: null,
    taperDurationDays: 7,
    volumeReductionCurve: [
      { day: -7, volumePercent: 90 },
      { day: -6, volumePercent: 85 },
      { day: -5, volumePercent: 80 },
      { day: -4, volumePercent: 75 },
      { day: -3, volumePercent: 70 },
      { day: -2, volumePercent: 65 },
      { day: -1, volumePercent: 55 },
    ],
    workoutModifications: {
      sharpness: 'moderate',
      longRun: 'reduce_40pct',
    },
    isSystemTemplate: true,
  },
  {
    name: 'C Race: Train Through',
    racePriority: 'C',
    minDistanceKm: 0,
    maxDistanceKm: null,
    taperDurationDays: 1,
    volumeReductionCurve: [{ day: -1, volumePercent: 90 }],
    workoutModifications: {
      sharpness: 'normal',
      longRun: 'normal',
      racePacing: 'effort_based',
    },
    isSystemTemplate: true,
  },
];

export function getTaperDurationForRace(priority: RacePriority, distanceKm: number): number {
  const template = getTaperTemplate(priority, distanceKm);
  return template.taperDurationDays;
}

export function getTaperTemplate(
  priority: RacePriority,
  distanceKm: number,
  customTemplates: TaperTemplate[] = []
): TaperTemplate {
  const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];

  const matching = allTemplates.find(
    t =>
      t.racePriority === priority &&
      distanceKm >= t.minDistanceKm &&
      (t.maxDistanceKm === null || distanceKm <= t.maxDistanceKm)
  );

  if (matching) {
    return matching;
  }

  return DEFAULT_TEMPLATES.find(t => t.racePriority === 'C')!;
}

export async function fetchUserTaperTemplates(): Promise<TaperTemplate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('taper_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[taperTemplates] Error fetching user templates:', error);
    return [];
  }

  return (data || []).map(dbTemplateToTemplate);
}

export async function getTaperTemplateForRace(
  priority: RacePriority,
  distanceKm: number
): Promise<TaperTemplate> {
  const userTemplates = await fetchUserTaperTemplates();
  return getTaperTemplate(priority, distanceKm, userTemplates);
}

export function buildTaperPlan(
  template: TaperTemplate,
  raceDate: Date,
  baseWeeklyVolume: number
): TaperPlan {
  const startDate = new Date(raceDate);
  startDate.setDate(startDate.getDate() - template.taperDurationDays);

  const days: TaperPlanDay[] = [];
  let totalReduction = 0;

  for (const point of template.volumeReductionCurve) {
    const volumeScale = point.volumePercent / 100;
    const reduction = 1 - volumeScale;
    totalReduction += reduction;

    const notes: string[] = [];

    if (point.day === -1) {
      notes.push('Race tomorrow - very light, short shakeout or rest');
      notes.push('Focus on hydration, nutrition, and mental preparation');
    } else if (point.day <= -7 && point.day >= -10) {
      notes.push('Early taper - maintain some intensity with reduced volume');
      if (template.workoutModifications.sharpness === 'race_pace_touches') {
        notes.push('Include short race-pace efforts to maintain sharpness');
      }
    } else if (point.day <= -3 && point.day >= -6) {
      notes.push('Mid-taper - further volume reduction');
      notes.push('Keep some quality but prioritize freshness');
    } else if (point.day === -2) {
      notes.push('Final easy days - trust your training');
      notes.push('Light activity only, optional short strides');
    }

    days.push({
      dayOffset: point.day,
      volumeScale,
      intensityAdjustment: getIntensityAdjustment(point.day, template),
      notes,
    });
  }

  return {
    template,
    startDate: startDate.toISOString().split('T')[0],
    raceDate: raceDate.toISOString().split('T')[0],
    days,
    totalVolumereduction: totalReduction / template.volumeReductionCurve.length,
  };
}

function getIntensityAdjustment(dayOffset: number, template: TaperTemplate): string {
  if (dayOffset >= -2) {
    return 'very_light';
  }

  if (dayOffset >= -5) {
    return 'light';
  }

  const sharpness = template.workoutModifications.sharpness;

  if (sharpness === 'none' || sharpness === 'minimal') {
    return 'easy';
  }

  if (sharpness === 'maintain' || sharpness === 'short_intervals') {
    return 'moderate';
  }

  return 'light';
}

export function shouldTaper(priority: RacePriority, distanceKm: number): boolean {
  if (priority === 'C' && distanceKm < 30) {
    return false;
  }

  if (priority === 'B' && distanceKm < 15) {
    return false;
  }

  return true;
}

export function getRecoveryDays(priority: RacePriority, distanceKm: number): number {
  if (priority === 'C') {
    return distanceKm > 30 ? 2 : 1;
  }

  if (priority === 'B') {
    if (distanceKm > 60) return 4;
    if (distanceKm > 30) return 3;
    return 2;
  }

  if (distanceKm > 100) return 7;
  if (distanceKm > 50) return 5;
  if (distanceKm > 30) return 4;
  return 3;
}

export async function saveTaperTemplate(template: TaperTemplate): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbTemplate = templateToDbTemplate(template, userId);

  const { error } = await supabase.from('taper_templates').insert([dbTemplate]);

  if (error) {
    console.error('[taperTemplates] Error saving template:', error);
    return false;
  }

  return true;
}

function templateToDbTemplate(template: TaperTemplate, userId: string) {
  return {
    user_id: userId,
    name: template.name,
    race_priority: template.racePriority,
    min_distance_km: template.minDistanceKm,
    max_distance_km: template.maxDistanceKm,
    taper_duration_days: template.taperDurationDays,
    volume_reduction_curve: template.volumeReductionCurve,
    workout_modifications: template.workoutModifications,
    is_system_template: template.isSystemTemplate,
  };
}

function dbTemplateToTemplate(db: any): TaperTemplate {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    racePriority: db.race_priority,
    minDistanceKm: db.min_distance_km,
    maxDistanceKm: db.max_distance_km,
    taperDurationDays: db.taper_duration_days,
    volumeReductionCurve: db.volume_reduction_curve,
    workoutModifications: db.workout_modifications,
    isSystemTemplate: db.is_system_template,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
