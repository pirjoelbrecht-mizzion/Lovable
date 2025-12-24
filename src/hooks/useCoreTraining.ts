import { useState, useEffect, useCallback, useMemo } from 'react';
import useSession from '@/lib/useSession';
import {
  fetchCoreExercises,
  fetchMETemplates,
  getUserCoreProgress,
  getUserMEProgress,
  updateUserMEProgress,
  resetMEProgression,
  recordCoreSoreness,
  determineCoreEmphasis,
  getCoreFrequencyForPeriod,
  calculateMEProgressionState,
  calculateSorenessAdjustment,
  selectCoreExercisesForSession,
  getMETemplateForWorkout,
  getDefaultFallbackTemplate,
  determineUpperBodyEligibility,
} from '@/services/coreTrainingService';
import type {
  CoreExercise,
  CoreEmphasis,
  CoreFrequencyConfig,
  UserCoreProgress,
  UserMEProgress,
  MEProgressionState,
  MESessionTemplate,
  MECategory,
  UpperBodyEligibility,
  UserTerrainAccess,
} from '@/types/strengthTraining';

type RaceType = 'vk' | 'ultra' | 'skimo' | 'trail' | 'road' | 'marathon';
type TrainingPeriod = 'transition' | 'base' | 'intensity' | 'recovery' | 'taper' | 'goal';

interface UseCoreTrainingOptions {
  raceType?: RaceType;
  period?: TrainingPeriod;
  terrainAccess?: UserTerrainAccess | null;
  painReports?: string[];
  isRecoveryWeek?: boolean;
}

interface UseCoreTrainingReturn {
  coreExercises: CoreExercise[];
  coreEmphasis: CoreEmphasis | null;
  coreFrequency: CoreFrequencyConfig;
  coreProgress: UserCoreProgress | null;
  selectedCoreSession: CoreExercise[];
  meProgress: UserMEProgress | null;
  meProgressionState: MEProgressionState | null;
  meTemplates: MESessionTemplate[];
  currentMETemplate: MESessionTemplate | null;
  upperBodyEligibility: UpperBodyEligibility;
  sorenessAdjustment: { adjustmentPercent: number; reason: string };
  loading: boolean;
  error: string | null;
  completeMESession: (workoutNumber: number) => Promise<void>;
  restartMEProgression: () => Promise<void>;
  reportCoreSoreness: (level: number) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useCoreTraining(options: UseCoreTrainingOptions = {}): UseCoreTrainingReturn {
  const {
    raceType = 'trail',
    period = 'base',
    terrainAccess = null,
    painReports = [],
    isRecoveryWeek = false,
  } = options;

  const { user } = useSession();
  const userId = user?.id;

  const [coreExercises, setCoreExercises] = useState<CoreExercise[]>([]);
  const [coreProgress, setCoreProgress] = useState<UserCoreProgress | null>(null);
  const [meProgress, setMeProgress] = useState<UserMEProgress | null>(null);
  const [meTemplates, setMeTemplates] = useState<MESessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const upperBodyEligibility = useMemo(() => {
    return determineUpperBodyEligibility(terrainAccess, raceType as RaceType);
  }, [terrainAccess, raceType]);

  const coreEmphasis = useMemo(() => {
    const usesPoles = terrainAccess?.usesPoles || false;
    return determineCoreEmphasis(raceType as RaceType, painReports, usesPoles);
  }, [raceType, painReports, terrainAccess]);

  const coreFrequency = useMemo(() => {
    return getCoreFrequencyForPeriod(period as TrainingPeriod, isRecoveryWeek);
  }, [period, isRecoveryWeek]);

  const meProgressionState = useMemo(() => {
    return calculateMEProgressionState(meProgress);
  }, [meProgress]);

  const sorenessAdjustment = useMemo(() => {
    if (!coreProgress) {
      return { adjustmentPercent: 0, reason: 'No soreness data' };
    }
    return calculateSorenessAdjustment(
      coreProgress.sorenessLevel || 0,
      coreProgress.sorenessReportedAt || null
    );
  }, [coreProgress]);

  const selectedCoreSession = useMemo(() => {
    if (!coreExercises.length || !coreEmphasis) return [];

    const eccentricLimit = painReports.includes('knee_downhill') ? 'moderate' : undefined;
    const difficulty = period === 'transition' ? 'beginner' : 'intermediate';

    return selectCoreExercisesForSession(
      coreExercises,
      coreEmphasis,
      5,
      difficulty,
      eccentricLimit as 'low' | 'moderate' | undefined
    );
  }, [coreExercises, coreEmphasis, painReports, period]);

  const currentMETemplate = useMemo(() => {
    if (!meTemplates.length || !meProgressionState) return null;

    const template = getMETemplateForWorkout(
      meTemplates,
      meProgressionState.targetWorkoutNumber,
      upperBodyEligibility
    );

    return template || getDefaultFallbackTemplate(upperBodyEligibility.type !== 'none');
  }, [meTemplates, meProgressionState, upperBodyEligibility]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [exercises, templates, coreProgressData, meProgressData] = await Promise.all([
        fetchCoreExercises(),
        fetchMETemplates(undefined, upperBodyEligibility.type !== 'none'),
        getUserCoreProgress(userId),
        getUserMEProgress(userId, 'gym_lower'),
      ]);

      setCoreExercises(exercises);
      setMeTemplates(templates);
      setCoreProgress(coreProgressData);
      setMeProgress(meProgressData);
    } catch (err) {
      console.error('Error loading core training data:', err);
      setError('Failed to load core training data');
    } finally {
      setLoading(false);
    }
  }, [userId, upperBodyEligibility]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completeMESession = useCallback(
    async (workoutNumber: number) => {
      if (!userId) return;
      await updateUserMEProgress(userId, 'gym_lower', workoutNumber);
      await loadData();
    },
    [userId, loadData]
  );

  const restartMEProgression = useCallback(async () => {
    if (!userId) return;
    await resetMEProgression(userId, 'gym_lower');
    await loadData();
  }, [userId, loadData]);

  const reportCoreSoreness = useCallback(
    async (level: number) => {
      if (!userId) return;
      await recordCoreSoreness(userId, level);
      await loadData();
    },
    [userId, loadData]
  );

  return {
    coreExercises,
    coreEmphasis,
    coreFrequency,
    coreProgress,
    selectedCoreSession,
    meProgress,
    meProgressionState,
    meTemplates,
    currentMETemplate,
    upperBodyEligibility,
    sorenessAdjustment,
    loading,
    error,
    completeMESession,
    restartMEProgression,
    reportCoreSoreness,
    refreshData: loadData,
  };
}
