import { useState, useEffect, useCallback } from 'react';
import useSession from './useSession';
import {
  fetchStrengthExercises,
  fetchMESessionTemplates,
  fetchUserTerrainAccess,
  upsertUserTerrainAccess,
  detectTerrainFromActivities,
  getMETemplateForUser,
  logStrengthSession,
  recordSoreness,
  getRecentSoreness,
  getPendingFollowupChecks,
  getActiveLoadAdjustment,
  checkAndRevertAdjustmentIfRecovered,
} from '@/services/strengthTrainingService';
import {
  integrateStrengthTraining,
  shouldPromptSorenessCheck,
  getStrengthCoachingMessage,
} from '@/lib/adaptive-coach/strength-integration';
import type {
  StrengthExercise,
  MESessionTemplate,
  UserTerrainAccess,
  SorenessRecord,
  StrengthLoadAdjustment,
  MEAssignment,
  LoadRegulationDecision,
  CompletedExercise,
} from '@/types/strengthTraining';
import type { WeeklyPlan, TrainingPhase } from '@/lib/adaptive-coach/types';

interface UseStrengthTrainingReturn {
  exercises: StrengthExercise[];
  templates: MESessionTemplate[];
  terrainAccess: UserTerrainAccess | null;
  recentSoreness: SorenessRecord[];
  activeLoadAdjustment: StrengthLoadAdjustment | null;
  pendingFollowups: SorenessRecord[];
  meAssignment: MEAssignment | null;
  loadRegulation: LoadRegulationDecision | null;
  coachingMessage: string;
  loading: boolean;
  error: string | null;
  updateTerrainAccess: (access: Partial<UserTerrainAccess>) => Promise<void>;
  submitSoreness: (data: Omit<SorenessRecord, 'id' | 'userId' | 'recordedAt'>) => Promise<void>;
  completeStrengthSession: (
    templateId: string | null,
    exercises: CompletedExercise[],
    notes: string
  ) => Promise<void>;
  checkRecovery: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  shouldPromptSoreness: { shouldPrompt: boolean; type: 'immediate' | 'followup_48h' };
}

export function useStrengthTraining(
  weeklyPlan: WeeklyPlan | null,
  phase: TrainingPhase
): UseStrengthTrainingReturn {
  const { user } = useSession();
  const userId = user?.id;

  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [templates, setTemplates] = useState<MESessionTemplate[]>([]);
  const [terrainAccess, setTerrainAccess] = useState<UserTerrainAccess | null>(null);
  const [recentSoreness, setRecentSoreness] = useState<SorenessRecord[]>([]);
  const [activeLoadAdjustment, setActiveLoadAdjustment] = useState<StrengthLoadAdjustment | null>(null);
  const [pendingFollowups, setPendingFollowups] = useState<SorenessRecord[]>([]);
  const [meAssignment, setMeAssignment] = useState<MEAssignment | null>(null);
  const [loadRegulation, setLoadRegulation] = useState<LoadRegulationDecision | null>(null);
  const [coachingMessage, setCoachingMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastStrengthSession, setLastStrengthSession] = useState<Date | null>(null);
  const [lastSorenessRecord, setLastSorenessRecord] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        exercisesData,
        templatesData,
        terrainData,
        sorenessData,
        adjustmentData,
        followupsData,
      ] = await Promise.all([
        fetchStrengthExercises(),
        fetchMESessionTemplates(),
        fetchUserTerrainAccess(userId),
        getRecentSoreness(userId, 7),
        getActiveLoadAdjustment(userId),
        getPendingFollowupChecks(userId),
      ]);

      setExercises(exercisesData);
      setTemplates(templatesData);
      setTerrainAccess(terrainData);
      setRecentSoreness(sorenessData);
      setActiveLoadAdjustment(adjustmentData);
      setPendingFollowups(followupsData);

      if (sorenessData.length > 0) {
        setLastSorenessRecord(new Date(sorenessData[0].recordedAt));
      }

      if (weeklyPlan) {
        const integrationResult = integrateStrengthTraining({
          weeklyPlan,
          terrainAccess: terrainData,
          recentSoreness: sorenessData,
          activeLoadAdjustment: adjustmentData,
          isAdvancedUser: false,
          phase,
        });

        setMeAssignment(integrationResult.meAssignment);
        setLoadRegulation(integrationResult.loadRegulation);
        setCoachingMessage(
          getStrengthCoachingMessage(integrationResult.loadRegulation, integrationResult.meAssignment, phase)
        );
      }
    } catch (err) {
      console.error('Error loading strength training data:', err);
      setError('Failed to load strength training data');
    } finally {
      setLoading(false);
    }
  }, [userId, weeklyPlan, phase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateTerrainAccess = useCallback(
    async (access: Partial<UserTerrainAccess>) => {
      console.log('[useStrengthTraining] updateTerrainAccess called with:', access);
      if (!userId) {
        console.log('[useStrengthTraining] No userId, returning early');
        return;
      }

      console.log('[useStrengthTraining] Calling upsertUserTerrainAccess...');
      const updated = await upsertUserTerrainAccess(userId, access);
      console.log('[useStrengthTraining] upsertUserTerrainAccess result:', updated);
      if (updated) {
        setTerrainAccess(updated);
        await loadData();
        console.log('[useStrengthTraining] Data reloaded');
      } else {
        console.log('[useStrengthTraining] No updated data returned');
      }
    },
    [userId, loadData]
  );

  const submitSoreness = useCallback(
    async (data: Omit<SorenessRecord, 'id' | 'userId' | 'recordedAt'>) => {
      if (!userId) return;

      const record = await recordSoreness(userId, data);
      if (record) {
        setRecentSoreness((prev) => [record, ...prev]);
        setLastSorenessRecord(new Date(record.recordedAt));
        await loadData();
      }
    },
    [userId, loadData]
  );

  const completeStrengthSession = useCallback(
    async (templateId: string | null, exercises: CompletedExercise[], notes: string) => {
      if (!userId) return;

      const session = await logStrengthSession(userId, {
        sessionDate: new Date().toISOString().split('T')[0],
        templateId,
        sessionType: templateId ? 'me' : 'strength',
        exercisesCompleted: exercises,
        durationMinutes: null,
        notes,
      });

      if (session) {
        setLastStrengthSession(new Date());
      }
    },
    [userId]
  );

  const checkRecovery = useCallback(async () => {
    if (!userId) return false;
    const recovered = await checkAndRevertAdjustmentIfRecovered(userId);
    if (recovered) {
      await loadData();
    }
    return recovered;
  }, [userId, loadData]);

  const shouldPromptSoreness = shouldPromptSorenessCheck(lastStrengthSession, lastSorenessRecord);

  return {
    exercises,
    templates,
    terrainAccess,
    recentSoreness,
    activeLoadAdjustment,
    pendingFollowups,
    meAssignment,
    loadRegulation,
    coachingMessage,
    loading,
    error,
    updateTerrainAccess,
    submitSoreness,
    completeStrengthSession,
    checkRecovery,
    refreshData: loadData,
    shouldPromptSoreness,
  };
}
