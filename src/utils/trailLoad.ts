/**
 * Trail Running Load Calculation Utilities
 *
 * Combines distance and vertical gain into a unified "training load" metric
 * for trail runners. Applies the 10% progression rule to the combined load.
 */

import type { UserProfile } from '@/types/onboarding';

export interface TrailLoadConfig {
  verticalToKmRatio: number;
  maxWeeklyIncrease: number;
  experienceMultiplier: number;
}

export interface WeeklyLoad {
  week: string;
  distance: number;
  vertical: number;
  combinedLoad: number;
  distThreshold?: number;
  vertThreshold?: number;
  combinedThreshold?: number;
  overDist: boolean;
  overVert: boolean;
  overCombined: boolean;
  distChangePercent?: number;
  vertChangePercent?: number;
  combinedChangePercent?: number;
}

export function isTrailRunner(profile: Partial<UserProfile> | null): boolean {
  if (!profile) return false;

  return (
    profile.surface === 'trail' ||
    profile.surface === 'mixed' ||
    profile.goalType === 'ultra' ||
    profile.strengthPreference === 'mountain' ||
    profile.strengthPreference === 'ultra'
  );
}

export function getLoadConfig(profile: Partial<UserProfile> | null): TrailLoadConfig {
  const experienceLevel = profile?.experienceLevel || 'beginner';
  const strengthPref = profile?.strengthPreference;

  let verticalToKmRatio = 100;
  let experienceMultiplier = 1.0;

  if (experienceLevel === 'advanced' || experienceLevel === 'expert') {
    verticalToKmRatio = 80;
    experienceMultiplier = 1.1;
  } else if (strengthPref === 'mountain' || strengthPref === 'ultra') {
    verticalToKmRatio = 90;
    experienceMultiplier = 1.05;
  }

  return {
    verticalToKmRatio,
    maxWeeklyIncrease: 0.10,
    experienceMultiplier,
  };
}

export function calculateCombinedLoad(
  distanceKm: number,
  verticalM: number,
  config: TrailLoadConfig
): number {
  const verticalKmEquivalent = verticalM / config.verticalToKmRatio;
  return distanceKm + verticalKmEquivalent;
}

export function calculateWeeklyLoads(
  weekData: Array<{ week: string; distance: number; vertical: number }>,
  config: TrailLoadConfig
): WeeklyLoad[] {
  const loads: WeeklyLoad[] = [];

  for (let i = 0; i < weekData.length; i++) {
    const current = weekData[i];
    const combinedLoad = calculateCombinedLoad(current.distance, current.vertical, config);

    let load: WeeklyLoad = {
      week: current.week,
      distance: current.distance,
      vertical: current.vertical,
      combinedLoad,
      overDist: false,
      overVert: false,
      overCombined: false,
    };

    if (i > 0) {
      const prev = loads[i - 1];

      const maxDistIncrease = config.maxWeeklyIncrease * config.experienceMultiplier;
      const maxVertIncrease = config.maxWeeklyIncrease * config.experienceMultiplier;
      const maxCombinedIncrease = config.maxWeeklyIncrease * config.experienceMultiplier;

      load.distThreshold = prev.distance * (1 + maxDistIncrease);
      load.vertThreshold = prev.vertical * (1 + maxVertIncrease);
      load.combinedThreshold = prev.combinedLoad * (1 + maxCombinedIncrease);

      load.overDist = current.distance > load.distThreshold;
      load.overVert = current.vertical > load.vertThreshold;
      load.overCombined = combinedLoad > load.combinedThreshold;

      load.distChangePercent = prev.distance > 0
        ? ((current.distance - prev.distance) / prev.distance) * 100
        : 0;
      load.vertChangePercent = prev.vertical > 0
        ? ((current.vertical - prev.vertical) / prev.vertical) * 100
        : 0;
      load.combinedChangePercent = prev.combinedLoad > 0
        ? ((combinedLoad - prev.combinedLoad) / prev.combinedLoad) * 100
        : 0;
    }

    loads.push(load);
  }

  return loads;
}

export function getSafetyWarning(load: WeeklyLoad | undefined): string | null {
  if (!load) return null;
  const combinedChange = load.combinedChangePercent || 0;

  if (combinedChange >= 15) {
    return `🚨 Total training load increased by ${combinedChange.toFixed(1)}% — significantly above safe limits. High injury risk! Consider taking a rest day and reducing volume.`;
  }

  if (combinedChange > 10) {
    return `⚠️ Total training load increased by ${combinedChange.toFixed(1)}% — above the recommended 10% limit. Consider reducing either distance or vertical gain to stay within safe progression.`;
  }

  if (load.overDist && load.overVert) {
    return `⚠️ Both distance (+${load.distChangePercent?.toFixed(1)}%) and vertical (+${load.vertChangePercent?.toFixed(1)}%) increased beyond 10%. This significantly increases injury risk.`;
  }

  if (load.overDist) {
    return `⚠️ Distance increased by ${load.distChangePercent?.toFixed(1)}% — above the recommended 10% limit.`;
  }

  if (load.overVert) {
    return `⚠️ Vertical gain increased by ${load.vertChangePercent?.toFixed(1)}% — above the recommended 10% limit.`;
  }

  return null;
}

export function getSafetyColor(load: WeeklyLoad | undefined): string {
  if (!load) return '#10b981'; // Default to green/safe
  const combinedChange = load.combinedChangePercent || 0;

  if (combinedChange >= 15) {
    return '#ef4444';
  }

  if (combinedChange > 10) {
    return '#f59e0b';
  }

  if (combinedChange >= 5 && combinedChange <= 10) {
    return '#fbbf24';
  }

  return '#10b981';
}

export function formatLoadSummary(load: WeeklyLoad | undefined, config: TrailLoadConfig): string {
  if (!load) {
    return 'No training data yet';
  }
  const vertKmEquiv = (load.vertical / config.verticalToKmRatio).toFixed(1);
  return `${load.distance.toFixed(1)}km + ${load.vertical.toFixed(0)}m vert (≈${vertKmEquiv}km) = ${load.combinedLoad.toFixed(1)}km total load`;
}
