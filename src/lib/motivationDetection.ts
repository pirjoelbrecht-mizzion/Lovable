/**
 * Motivation Detection Engine
 *
 * Analyzes user behavior, preferences, and training patterns to automatically
 * detect and track motivation archetypes. Integrates with existing training data
 * and onboarding responses.
 */

import { supabase } from './supabase';
import type { LogEntry } from '@/types';

export type ArchetypeType = 'performer' | 'adventurer' | 'mindful' | 'health' | 'transformer' | 'connector';

export interface ArchetypeScores {
  performer: number;
  adventurer: number;
  mindful: number;
  health: number;
  transformer: number;
  connector: number;
}

export interface MotivationProfile {
  scores: ArchetypeScores;
  dominant: ArchetypeType;
  confidence: number;
  lastUpdated: string;
}

export interface TrainingMetrics {
  totalKm: number;
  totalSessions: number;
  avgSessionKm: number;
  longestRunKm: number;
  restDaysCount: number;
  avgSessionsPerWeek: number;
  avgHR?: number;
  trailPercentage: number;
  elevationTotalM: number;
  consistencyScore: number;
  hrZoneDistribution?: {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
  };
}

export interface OnboardingResponses {
  primaryMotivation?: string;
  goalType?: string;
  whyRunning?: string;
  idealRun?: string;
  keepGoingFactor?: string;
  selectedWords?: string[];
  freeText?: string;
}

interface ArchetypeWeights {
  [key: string]: {
    [archetype in ArchetypeType]: number;
  };
}

const KEYWORD_WEIGHTS: ArchetypeWeights = {
  fast: { performer: 0.4, adventurer: 0, mindful: 0, health: 0, transformer: 0.2, connector: 0 },
  goal: { performer: 0.4, adventurer: 0, mindful: 0, health: 0, transformer: 0.2, connector: 0 },
  race: { performer: 0.4, adventurer: 0, mindful: 0, health: 0, transformer: 0.2, connector: 0 },
  pr: { performer: 0.4, adventurer: 0, mindful: 0, health: 0, transformer: 0.2, connector: 0 },
  compete: { performer: 0.4, adventurer: 0, mindful: 0, health: 0, transformer: 0.1, connector: 0 },

  nature: { performer: 0, adventurer: 0.5, mindful: 0.1, health: 0, transformer: 0, connector: 0 },
  trail: { performer: 0, adventurer: 0.5, mindful: 0.1, health: 0, transformer: 0, connector: 0 },
  explore: { performer: 0, adventurer: 0.5, mindful: 0.1, health: 0, transformer: 0, connector: 0 },
  mountain: { performer: 0, adventurer: 0.5, mindful: 0, health: 0, transformer: 0, connector: 0 },
  adventure: { performer: 0, adventurer: 0.5, mindful: 0, health: 0, transformer: 0, connector: 0 },

  balance: { performer: 0, adventurer: 0, mindful: 0.5, health: 0.2, transformer: 0, connector: 0 },
  peace: { performer: 0, adventurer: 0, mindful: 0.5, health: 0.2, transformer: 0, connector: 0 },
  calm: { performer: 0, adventurer: 0, mindful: 0.5, health: 0.2, transformer: 0, connector: 0 },
  stress: { performer: 0, adventurer: 0, mindful: 0.5, health: 0.1, transformer: 0, connector: 0 },
  meditation: { performer: 0, adventurer: 0, mindful: 0.5, health: 0, transformer: 0, connector: 0 },

  healthy: { performer: 0, adventurer: 0, mindful: 0.2, health: 0.5, transformer: 0, connector: 0 },
  energy: { performer: 0, adventurer: 0, mindful: 0.2, health: 0.5, transformer: 0, connector: 0 },
  routine: { performer: 0, adventurer: 0, mindful: 0.2, health: 0.5, transformer: 0, connector: 0 },
  wellness: { performer: 0, adventurer: 0, mindful: 0.2, health: 0.5, transformer: 0, connector: 0 },
  fitness: { performer: 0, adventurer: 0, mindful: 0.1, health: 0.5, transformer: 0, connector: 0 },

  change: { performer: 0.2, adventurer: 0, mindful: 0, health: 0, transformer: 0.5, connector: 0 },
  stronger: { performer: 0.2, adventurer: 0, mindful: 0, health: 0, transformer: 0.5, connector: 0 },
  rebuild: { performer: 0, adventurer: 0, mindful: 0, health: 0, transformer: 0.5, connector: 0 },
  transform: { performer: 0.1, adventurer: 0, mindful: 0, health: 0, transformer: 0.5, connector: 0 },
  growth: { performer: 0.1, adventurer: 0, mindful: 0.1, health: 0, transformer: 0.5, connector: 0 },

  together: { performer: 0, adventurer: 0, mindful: 0, health: 0, transformer: 0.1, connector: 0.5 },
  team: { performer: 0, adventurer: 0, mindful: 0, health: 0, transformer: 0, connector: 0.5 },
  share: { performer: 0, adventurer: 0, mindful: 0, health: 0, transformer: 0, connector: 0.5 },
  community: { performer: 0, adventurer: 0, mindful: 0, health: 0, transformer: 0, connector: 0.5 },
  friends: { performer: 0, adventurer: 0, mindful: 0, health: 0, transformer: 0, connector: 0.5 },
};

/**
 * Analyzes onboarding responses to extract motivation signals
 */
export function analyzeOnboardingResponses(responses: OnboardingResponses): Partial<ArchetypeScores> {
  const scores: ArchetypeScores = {
    performer: 0,
    adventurer: 0,
    mindful: 0,
    health: 0,
    transformer: 0,
    connector: 0,
  };

  const allText = [
    responses.primaryMotivation,
    responses.whyRunning,
    responses.idealRun,
    responses.keepGoingFactor,
    responses.freeText,
    ...(responses.selectedWords || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  Object.entries(KEYWORD_WEIGHTS).forEach(([keyword, weights]) => {
    if (allText.includes(keyword)) {
      Object.entries(weights).forEach(([archetype, weight]) => {
        scores[archetype as ArchetypeType] += weight;
      });
    }
  });

  if (responses.goalType) {
    const goalTypeMap: { [key: string]: Partial<ArchetypeScores> } = {
      '5k': { performer: 0.3, health: 0.2 },
      '10k': { performer: 0.3, health: 0.1 },
      marathon: { performer: 0.4, transformer: 0.2 },
      ultra: { adventurer: 0.5, performer: 0.2 },
      trail: { adventurer: 0.5 },
    };

    const goalScores = goalTypeMap[responses.goalType] || {};
    Object.entries(goalScores).forEach(([archetype, weight]) => {
      scores[archetype as ArchetypeType] += weight;
    });
  }

  return scores;
}

/**
 * Analyzes training behavior from historical log entries
 */
export function analyzeTrainingBehavior(metrics: TrainingMetrics): Partial<ArchetypeScores> {
  const scores: ArchetypeScores = {
    performer: 0,
    adventurer: 0,
    mindful: 0,
    health: 0,
    transformer: 0,
    connector: 0,
  };

  if (metrics.avgHR && metrics.hrZoneDistribution) {
    const hardEffortPercent = (metrics.hrZoneDistribution.z4 || 0) + (metrics.hrZoneDistribution.z5 || 0);
    const easyEffortPercent = (metrics.hrZoneDistribution.z1 || 0) + (metrics.hrZoneDistribution.z2 || 0);

    if (hardEffortPercent > 0.25) {
      scores.performer += 0.3;
    }

    if (easyEffortPercent > 0.6) {
      scores.mindful += 0.3;
      scores.health += 0.2;
    }
  }

  if (metrics.avgSessionKm > 15) {
    scores.adventurer += 0.3;
  }

  if (metrics.longestRunKm > 25) {
    scores.adventurer += 0.4;
  }

  if (metrics.trailPercentage > 0.5) {
    scores.adventurer += 0.4;
  }

  if (metrics.elevationTotalM > 5000) {
    scores.adventurer += 0.3;
  }

  if (metrics.restDaysCount >= 4) {
    scores.mindful += 0.3;
    scores.health += 0.3;
  }

  if (metrics.consistencyScore > 0.8) {
    scores.health += 0.3;
    scores.performer += 0.2;
  }

  if (metrics.avgSessionsPerWeek >= 5) {
    scores.performer += 0.3;
  }

  if (metrics.avgSessionsPerWeek >= 2 && metrics.avgSessionsPerWeek <= 3) {
    scores.health += 0.2;
  }

  return scores;
}

/**
 * Combines multiple signal sources and normalizes to create final archetype profile
 */
export function calculateMotivationProfile(
  onboardingScores: Partial<ArchetypeScores>,
  trainingScores: Partial<ArchetypeScores>,
  weights: { onboarding: number; training: number } = { onboarding: 0.6, training: 0.8 }
): MotivationProfile {
  const combinedScores: ArchetypeScores = {
    performer: 0,
    adventurer: 0,
    mindful: 0,
    health: 0,
    transformer: 0,
    connector: 0,
  };

  const archetypes: ArchetypeType[] = ['performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector'];

  archetypes.forEach((archetype) => {
    const onboardingScore = (onboardingScores[archetype] || 0) * weights.onboarding;
    const trainingScore = (trainingScores[archetype] || 0) * weights.training;
    combinedScores[archetype] = onboardingScore + trainingScore;
  });

  const total = Object.values(combinedScores).reduce((sum, score) => sum + score, 0);

  if (total > 0) {
    archetypes.forEach((archetype) => {
      combinedScores[archetype] = combinedScores[archetype] / total;
    });
  }

  const sortedArchetypes = archetypes.sort((a, b) => combinedScores[b] - combinedScores[a]);
  const dominant = sortedArchetypes[0];
  const topScore = combinedScores[dominant];
  const secondScore = combinedScores[sortedArchetypes[1]];

  const confidence = topScore - secondScore;

  return {
    scores: combinedScores,
    dominant,
    confidence: Math.min(confidence * 2, 1),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetches and analyzes training metrics from log_entries
 */
export async function fetchTrainingMetrics(userId: string, weeksBack: number = 8): Promise<TrainingMetrics | null> {
  if (!supabase) return null;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeksBack * 7);

    const { data: entries, error } = await supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    if (!entries || entries.length === 0) return null;

    const totalKm = entries.reduce((sum, e) => sum + (e.km || 0), 0);
    const totalSessions = entries.length;
    const avgSessionKm = totalKm / totalSessions;
    const longestRunKm = Math.max(...entries.map((e) => e.km || 0));

    const sessionsWithHR = entries.filter((e) => e.hr_avg);
    const avgHR = sessionsWithHR.length > 0
      ? sessionsWithHR.reduce((sum, e) => sum + (e.hr_avg || 0), 0) / sessionsWithHR.length
      : undefined;

    const datesWithRuns = new Set(entries.map((e) => e.date));
    const totalDays = weeksBack * 7;
    const restDaysCount = totalDays - datesWithRuns.size;

    const avgSessionsPerWeek = totalSessions / weeksBack;

    const weeklySessionCounts = new Map<number, number>();
    entries.forEach((entry) => {
      const weekNum = Math.floor((new Date().getTime() - new Date(entry.date).getTime()) / (7 * 24 * 60 * 60 * 1000));
      weeklySessionCounts.set(weekNum, (weeklySessionCounts.get(weekNum) || 0) + 1);
    });

    const weeklyVariance = Array.from(weeklySessionCounts.values())
      .map((count) => Math.abs(count - avgSessionsPerWeek))
      .reduce((sum, diff) => sum + diff, 0) / weeksBack;
    const consistencyScore = Math.max(0, 1 - weeklyVariance / avgSessionsPerWeek);

    return {
      totalKm,
      totalSessions,
      avgSessionKm,
      longestRunKm,
      restDaysCount,
      avgSessionsPerWeek,
      avgHR,
      trailPercentage: 0,
      elevationTotalM: 0,
      consistencyScore,
    };
  } catch (error) {
    console.error('Error fetching training metrics:', error);
    return null;
  }
}

/**
 * Main function: Detects user's motivation archetype
 */
export async function detectMotivationArchetype(
  userId: string,
  onboardingResponses?: OnboardingResponses
): Promise<MotivationProfile | null> {
  const trainingMetrics = await fetchTrainingMetrics(userId, 8);

  const onboardingScores = onboardingResponses
    ? analyzeOnboardingResponses(onboardingResponses)
    : {};

  const trainingScores = trainingMetrics
    ? analyzeTrainingBehavior(trainingMetrics)
    : {};

  if (Object.keys(onboardingScores).length === 0 && Object.keys(trainingScores).length === 0) {
    return {
      scores: {
        performer: 0.16,
        adventurer: 0.16,
        mindful: 0.17,
        health: 0.17,
        transformer: 0.17,
        connector: 0.17,
      },
      dominant: 'health',
      confidence: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const profile = calculateMotivationProfile(onboardingScores, trainingScores);

  return profile;
}

/**
 * Saves motivation profile to database
 */
export async function saveMotivationProfile(
  userId: string,
  profile: MotivationProfile,
  triggerEvent: string,
  trainingContext?: any
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.rpc('record_motivation_snapshot', {
      p_user_id: userId,
      p_archetype_scores: profile.scores,
      p_dominant_archetype: profile.dominant,
      p_confidence: profile.confidence,
      p_trigger_event: triggerEvent,
      p_trigger_details: null,
      p_training_context: trainingContext || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving motivation profile:', error);
    return false;
  }
}

/**
 * Gets user's current motivation profile
 */
export async function getUserMotivationProfile(userId: string): Promise<MotivationProfile | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('motivation_archetype, dominant_archetype, archetype_confidence, archetype_last_updated')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.motivation_archetype) return null;

    return {
      scores: data.motivation_archetype as ArchetypeScores,
      dominant: data.dominant_archetype as ArchetypeType,
      confidence: data.archetype_confidence || 0,
      lastUpdated: data.archetype_last_updated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching motivation profile:', error);
    return null;
  }
}
