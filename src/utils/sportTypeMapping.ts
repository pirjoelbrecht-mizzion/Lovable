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

export interface ExtendedSportMapping extends SportMapping {
  fatigueContribution: number;
  cardioContribution: number;
  neuromuscularContribution: number;
  metabolicContribution: number;
  runningSpecificity: number;
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

/**
 * Query contribution factors from database (Phase 2 enhancement)
 * Falls back to hardcoded mapping if database query fails
 */
export async function getSportContributionFactors(
  sportType: string
): Promise<ExtendedSportMapping> {
  try {
    const { getSupabase } = await import('@/lib/supabase');
    const supabase = getSupabase();

    if (!supabase) {
      return getDefaultExtendedMapping(sportType);
    }

    const { data, error } = await supabase
      .from('sport_contribution_factors')
      .select('*')
      .eq('sport_type', sportType)
      .maybeSingle();

    if (error || !data) {
      return getDefaultExtendedMapping(sportType);
    }

    const baseMapping = mapSportType(sportType);
    return {
      ...baseMapping,
      fatigueContribution: Number(data.fatigue_contribution),
      cardioContribution: Number(data.cardio_contribution),
      neuromuscularContribution: Number(data.neuromuscular_contribution),
      metabolicContribution: Number(data.metabolic_contribution),
      runningSpecificity: Number(data.running_specificity)
    };
  } catch (err) {
    console.error('Failed to query contribution factors:', err);
    return getDefaultExtendedMapping(sportType);
  }
}

/**
 * Get default extended mapping with Phase 2 factors set to match Phase 1 behavior
 */
function getDefaultExtendedMapping(sportType: string): ExtendedSportMapping {
  const baseMapping = mapSportType(sportType);

  let fatigueContribution = 0.0;
  let cardioContribution = 0.0;
  let neuromuscularContribution = 0.0;
  let metabolicContribution = 0.0;
  let runningSpecificity = 0.0;

  if (baseMapping.countsForRunningLoad) {
    fatigueContribution = 1.0;
    cardioContribution = 1.0;
    neuromuscularContribution = 1.0;
    metabolicContribution = 1.0;
    runningSpecificity = 1.0;
  } else {
    switch (baseMapping.contributesToFatigue) {
      case 'full':
        fatigueContribution = 1.0;
        break;
      case 'partial':
        fatigueContribution = 0.5;
        cardioContribution = 0.6;
        neuromuscularContribution = 0.5;
        metabolicContribution = 0.5;
        break;
      case 'light':
        fatigueContribution = 0.3;
        cardioContribution = 0.3;
        neuromuscularContribution = 0.4;
        metabolicContribution = 0.3;
        break;
      case 'none':
        break;
    }
  }

  return {
    ...baseMapping,
    fatigueContribution,
    cardioContribution,
    neuromuscularContribution,
    metabolicContribution,
    runningSpecificity
  };
}

/**
 * Batch query contribution factors for multiple sport types
 * Useful for analytics and bulk processing
 */
export async function getBatchSportContributionFactors(
  sportTypes: string[]
): Promise<Map<string, ExtendedSportMapping>> {
  const results = new Map<string, ExtendedSportMapping>();

  try {
    const { getSupabase } = await import('@/lib/supabase');
    const supabase = getSupabase();

    if (!supabase) {
      for (const sportType of sportTypes) {
        results.set(sportType, getDefaultExtendedMapping(sportType));
      }
      return results;
    }

    const { data, error } = await supabase
      .from('sport_contribution_factors')
      .select('*')
      .in('sport_type', sportTypes);

    if (error) {
      for (const sportType of sportTypes) {
        results.set(sportType, getDefaultExtendedMapping(sportType));
      }
      return results;
    }

    const dbFactors = new Map(data?.map(d => [d.sport_type, d]) || []);

    for (const sportType of sportTypes) {
      const dbData = dbFactors.get(sportType);

      if (dbData) {
        const baseMapping = mapSportType(sportType);
        results.set(sportType, {
          ...baseMapping,
          fatigueContribution: Number(dbData.fatigue_contribution),
          cardioContribution: Number(dbData.cardio_contribution),
          neuromuscularContribution: Number(dbData.neuromuscular_contribution),
          metabolicContribution: Number(dbData.metabolic_contribution),
          runningSpecificity: Number(dbData.running_specificity)
        });
      } else {
        results.set(sportType, getDefaultExtendedMapping(sportType));
      }
    }

    return results;
  } catch (err) {
    console.error('Failed to batch query contribution factors:', err);
    for (const sportType of sportTypes) {
      results.set(sportType, getDefaultExtendedMapping(sportType));
    }
    return results;
  }
}
