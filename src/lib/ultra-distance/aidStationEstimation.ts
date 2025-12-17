export interface AidStationConfig {
  distanceKm: number;
  name?: string;
  type: 'water' | 'minor' | 'major' | 'crew' | 'drop-bag';
  hasMedical?: boolean;
  hasDropBag?: boolean;
  elevation?: number;
}

export interface AidStationTimeEstimate {
  stationIndex: number;
  distanceKm: number;
  stationType: AidStationConfig['type'];
  baseTimeMinutes: number;
  fatigueAdjustedMinutes: number;
  recommendedMinutes: number;
  activities: string[];
  warning?: string;
}

export interface RaceAidStationPlan {
  stations: AidStationTimeEstimate[];
  totalAidTimeMinutes: number;
  averagePerStation: number;
  recommendations: string[];
}

const AID_STATION_BASE_TIMES: Record<AidStationConfig['type'], number> = {
  'water': 1.5,
  'minor': 3,
  'major': 5,
  'crew': 8,
  'drop-bag': 10,
};

const AID_STATION_ACTIVITIES: Record<AidStationConfig['type'], string[]> = {
  'water': ['Fill bottles', 'Quick snack'],
  'minor': ['Fill bottles', 'Eat solid food', 'Quick bathroom break'],
  'major': ['Full resupply', 'Eat hot food', 'Change socks if needed', 'Assess condition'],
  'crew': ['Crew assistance', 'Full gear change option', 'Detailed nutrition', 'Mental reset'],
  'drop-bag': ['Access drop bag', 'Full resupply', 'Gear change', 'Extended break if needed'],
};

export function estimateAidStationTime(
  station: AidStationConfig,
  progressKm: number,
  totalDistanceKm: number,
  elapsedHours: number,
  fatigueLevel: number,
  temperatureC: number,
  isNight: boolean
): AidStationTimeEstimate {
  const baseTime = AID_STATION_BASE_TIMES[station.type];

  const progressRatio = progressKm / totalDistanceKm;
  let progressMultiplier = 1.0;

  if (progressRatio > 0.75) {
    progressMultiplier = 1.4;
  } else if (progressRatio > 0.5) {
    progressMultiplier = 1.2;
  } else if (progressRatio > 0.25) {
    progressMultiplier = 1.1;
  }

  const fatigueMultiplier = 1 + (fatigueLevel / 100) * 0.5;

  let heatMultiplier = 1.0;
  if (temperatureC > 30) {
    heatMultiplier = 1.4;
  } else if (temperatureC > 25) {
    heatMultiplier = 1.2;
  } else if (temperatureC > 20) {
    heatMultiplier = 1.1;
  }

  const nightMultiplier = isNight ? 1.15 : 1.0;

  const fatigueAdjustedTime = baseTime * fatigueMultiplier * progressMultiplier;
  const recommendedTime = fatigueAdjustedTime * heatMultiplier * nightMultiplier;

  const activities = [...AID_STATION_ACTIVITIES[station.type]];

  if (temperatureC > 25) {
    activities.push('Cool down with water/ice');
  }
  if (isNight && station.type !== 'water') {
    activities.push('Check headlamp batteries');
  }
  if (station.hasMedical && fatigueLevel > 70) {
    activities.push('Quick medical check');
  }

  let warning: string | undefined;
  if (recommendedTime > 15) {
    warning = 'Extended stop - watch for stiffening muscles';
  } else if (fatigueLevel > 80 && station.type === 'water') {
    warning = 'Consider longer stop despite water-only station';
  }

  return {
    stationIndex: 0,
    distanceKm: station.distanceKm,
    stationType: station.type,
    baseTimeMinutes: baseTime,
    fatigueAdjustedMinutes: Math.round(fatigueAdjustedTime * 10) / 10,
    recommendedMinutes: Math.round(recommendedTime * 10) / 10,
    activities,
    warning,
  };
}

export function generateDefaultAidStations(
  totalDistanceKm: number,
  totalElevationM: number
): AidStationConfig[] {
  const stations: AidStationConfig[] = [];

  if (totalDistanceKm <= 42.195) {
    const interval = totalDistanceKm / 5;
    for (let i = 1; i < 5; i++) {
      stations.push({
        distanceKm: Math.round(interval * i * 10) / 10,
        type: 'water',
      });
    }
    return stations;
  }

  if (totalDistanceKm <= 55) {
    const positions = [10, 20, 30, 40, 50].filter(d => d < totalDistanceKm);
    positions.forEach((dist, i) => {
      stations.push({
        distanceKm: dist,
        type: i % 2 === 0 ? 'minor' : 'water',
      });
    });
    return stations;
  }

  if (totalDistanceKm <= 85) {
    const positions = [10, 20, 30, 40, 50, 60, 70, 80].filter(d => d < totalDistanceKm);
    positions.forEach((dist, i) => {
      let type: AidStationConfig['type'] = 'water';
      if (dist === 40 || dist === 80) {
        type = 'major';
      } else if (i % 2 === 1) {
        type = 'minor';
      }
      stations.push({ distanceKm: dist, type });
    });
    return stations;
  }

  if (totalDistanceKm <= 110) {
    for (let dist = 10; dist < totalDistanceKm; dist += 10) {
      let type: AidStationConfig['type'] = 'minor';

      if (dist === 50 || dist === 100) {
        type = 'major';
      } else if (dist % 20 === 0) {
        type = 'drop-bag';
      }

      stations.push({
        distanceKm: dist,
        type,
        hasDropBag: type === 'drop-bag' || type === 'major',
      });
    }
    return stations;
  }

  for (let dist = 8; dist < totalDistanceKm; dist += 8) {
    let type: AidStationConfig['type'] = 'minor';

    if (Math.abs(dist - 50) < 5 || Math.abs(dist - 100) < 5 || Math.abs(dist - 150) < 5) {
      type = 'crew';
    } else if (dist % 24 < 8) {
      type = 'major';
    } else if (dist % 16 < 8) {
      type = 'drop-bag';
    }

    stations.push({
      distanceKm: Math.round(dist),
      type,
      hasDropBag: type === 'drop-bag' || type === 'major' || type === 'crew',
      hasMedical: type === 'crew' || type === 'major',
    });
  }

  return stations;
}

export function calculateTotalAidStationTime(
  stations: AidStationConfig[],
  totalDistanceKm: number,
  estimatedMovingTimeMin: number,
  temperatureC: number,
  hasNightSection: boolean,
  athleteExperienceLevel: 'beginner' | 'intermediate' | 'experienced' | 'elite'
): RaceAidStationPlan {
  const estimates: AidStationTimeEstimate[] = [];
  const recommendations: string[] = [];

  const experienceMultiplier = {
    'beginner': 1.3,
    'intermediate': 1.1,
    'experienced': 1.0,
    'elite': 0.85,
  }[athleteExperienceLevel];

  let totalAidTime = 0;

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const progressRatio = station.distanceKm / totalDistanceKm;
    const elapsedHours = (progressRatio * estimatedMovingTimeMin) / 60;

    const fatigueLevel = Math.min(100,
      progressRatio * 80 +
      (progressRatio > 0.5 ? (progressRatio - 0.5) * 40 : 0)
    );

    const isNight = hasNightSection && elapsedHours > 10;

    const estimate = estimateAidStationTime(
      station,
      station.distanceKm,
      totalDistanceKm,
      elapsedHours,
      fatigueLevel,
      temperatureC,
      isNight
    );

    estimate.stationIndex = i;
    estimate.recommendedMinutes = Math.round(
      estimate.recommendedMinutes * experienceMultiplier * 10
    ) / 10;

    estimates.push(estimate);
    totalAidTime += estimate.recommendedMinutes;
  }

  if (temperatureC > 25) {
    recommendations.push('Plan extra time at aid stations for cooling');
    recommendations.push('Consider ice in bottles and bandana');
  }

  if (hasNightSection) {
    recommendations.push('Major stations during night: prepare headlamp backup');
    recommendations.push('Night transitions slower - budget extra minutes');
  }

  if (athleteExperienceLevel === 'beginner') {
    recommendations.push('As a newer ultra runner, build in buffer time at stations');
    recommendations.push('Practice aid station routine in training');
  }

  const majorStations = estimates.filter(e =>
    e.stationType === 'major' || e.stationType === 'crew' || e.stationType === 'drop-bag'
  );
  if (majorStations.length > 0) {
    recommendations.push(
      `${majorStations.length} major stops planned - prepare checklist for each`
    );
  }

  return {
    stations: estimates,
    totalAidTimeMinutes: Math.round(totalAidTime),
    averagePerStation: Math.round((totalAidTime / stations.length) * 10) / 10,
    recommendations,
  };
}

export function estimateQuickAidStationTime(
  distanceKm: number,
  athleteLevel: 'beginner' | 'intermediate' | 'experienced' | 'elite' = 'intermediate'
): number {
  const stations = generateDefaultAidStations(distanceKm, 0);

  const baseTimePerStation = {
    'water': 1.5,
    'minor': 3,
    'major': 5,
    'crew': 8,
    'drop-bag': 10,
  };

  const levelMultiplier = {
    'beginner': 1.4,
    'intermediate': 1.15,
    'experienced': 1.0,
    'elite': 0.8,
  }[athleteLevel];

  let totalTime = 0;
  for (const station of stations) {
    totalTime += baseTimePerStation[station.type];
  }

  const progressionFactor = distanceKm > 100 ? 1.25 : distanceKm > 50 ? 1.15 : 1.0;

  return Math.round(totalTime * levelMultiplier * progressionFactor);
}
