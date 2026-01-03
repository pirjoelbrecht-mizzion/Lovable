export type InternalSportCategory =
  | 'run'
  | 'walk'
  | 'cross_train'
  | 'strength'
  | 'water'
  | 'winter'
  | 'team'
  | 'other';

export interface SportMapping {
  sportCategory: InternalSportCategory;
  countsForRunningLoad: boolean;
  contributesToFatigue: 'full' | 'partial' | 'light' | 'none';
}

const RUN_FAMILY = new Set([
  'Run',
  'TrailRun',
  'VirtualRun'
]);

const WALK_FAMILY = new Set([
  'Walk',
  'Hike',
  'SpeedWalk'
]);

const CYCLING_FAMILY = new Set([
  'Ride',
  'VirtualRide',
  'EBikeRide',
  'Handcycle',
  'Velomobile',
  'InlineSkate',
  'Skateboard',
  'Wheelchair'
]);

const FITNESS_FAMILY = new Set([
  'Workout',
  'WeightTraining',
  'Crossfit',
  'CircuitTraining',
  'Yoga',
  'Pilates',
  'StairStepper',
  'Elliptical',
  'HighIntensityIntervalTraining'
]);

const WATER_FAMILY = new Set([
  'Swim',
  'OpenWaterSwim',
  'Surfing',
  'Windsurf',
  'Kitesurf',
  'StandUpPaddling',
  'Kayaking',
  'Canoeing',
  'Rowing',
  'RowingMachine'
]);

const WINTER_FAMILY = new Set([
  'AlpineSki',
  'BackcountrySki',
  'NordicSki',
  'Snowboard',
  'Snowshoe'
]);

export function mapSportType(sportType: string): SportMapping {
  if (RUN_FAMILY.has(sportType)) {
    return {
      sportCategory: 'run',
      countsForRunningLoad: true,
      contributesToFatigue: 'full'
    };
  }

  if (WALK_FAMILY.has(sportType)) {
    return {
      sportCategory: 'walk',
      countsForRunningLoad: false,
      contributesToFatigue: 'partial'
    };
  }

  if (CYCLING_FAMILY.has(sportType)) {
    return {
      sportCategory: 'cross_train',
      countsForRunningLoad: false,
      contributesToFatigue: 'partial'
    };
  }

  if (FITNESS_FAMILY.has(sportType)) {
    return {
      sportCategory: 'strength',
      countsForRunningLoad: false,
      contributesToFatigue: 'light'
    };
  }

  if (WATER_FAMILY.has(sportType)) {
    return {
      sportCategory: 'water',
      countsForRunningLoad: false,
      contributesToFatigue: 'partial'
    };
  }

  if (WINTER_FAMILY.has(sportType)) {
    return {
      sportCategory: 'winter',
      countsForRunningLoad: false,
      contributesToFatigue: 'partial'
    };
  }

  return {
    sportCategory: 'other',
    countsForRunningLoad: false,
    contributesToFatigue: 'none'
  };
}

export function getSportCategoryLabel(category: InternalSportCategory): string {
  const labels: Record<InternalSportCategory, string> = {
    run: 'Run',
    walk: 'Walk/Hike',
    cross_train: 'Cross-Training',
    strength: 'Strength',
    water: 'Water Sports',
    winter: 'Winter Sports',
    team: 'Team Sports',
    other: 'Other'
  };
  return labels[category] || 'Unknown';
}

export function getSportCategoryIcon(category: InternalSportCategory): string {
  const icons: Record<InternalSportCategory, string> = {
    run: '🏃',
    walk: '🚶',
    cross_train: '🚴',
    strength: '💪',
    water: '🏊',
    winter: '⛷️',
    team: '⚽',
    other: '🏅'
  };
  return icons[category] || '📊';
}
