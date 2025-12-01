import { useState, useEffect, useCallback } from 'react';
import type { SeasonPlan } from '@/types/seasonPlan';
import type { Race } from '@/utils/races';
import { buildSeasonPlan, generateFullSeasonPlan, filterFutureMacrocycles } from '@/utils/seasonPlanGenerator';
import { getRacePlan, updateRacePlan } from '@/lib/racePlanDatabase';

export interface UseSeasonPlanResult {
  seasonPlan: SeasonPlan | null;
  isLoading: boolean;
  error: string | null;
  generatePlan: (race: Race, athleteReadiness?: number) => Promise<void>;
  generateFullPlan: (races: Race[], showHistory?: boolean) => Promise<void>;
  savePlan: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSeasonPlan(raceId?: string): UseSeasonPlanResult {
  const [seasonPlan, setSeasonPlan] = useState<SeasonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExistingPlan = useCallback(async (raceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const racePlan = await getRacePlan(raceId);

      if (racePlan && (racePlan as any).seasonPlan) {
        setSeasonPlan((racePlan as any).seasonPlan);
      }
    } catch (err) {
      console.error('Error loading season plan:', err);
      setError('Failed to load season plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generatePlan = useCallback(async (race: Race, athleteReadiness: number = 80) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!race.dateISO || !race.distanceKm) {
        setError('Race must have a date and distance');
        return;
      }

      const raceDate = new Date(race.dateISO);
      const raceType = race.distanceKm > 50 ? 'ultra' : 'marathon';

      const plan = buildSeasonPlan(race.id, race.name, {
        raceDate,
        raceType,
        raceDistanceKm: race.distanceKm,
        athleteReadiness,
      });

      setSeasonPlan(plan);
    } catch (err) {
      console.error('Error generating season plan:', err);
      setError('Failed to generate season plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const savePlan = useCallback(async (): Promise<boolean> => {
    if (!seasonPlan) return false;

    setIsLoading(true);
    setError(null);

    try {
      const existingPlan = await getRacePlan(seasonPlan.raceId);

      if (existingPlan) {
        const updated = await updateRacePlan(existingPlan.id!, {
          ...existingPlan,
          race: {
            ...existingPlan.race,
            id: seasonPlan.raceId,
            name: seasonPlan.raceName,
          },
        } as any);

        if (updated) {
          (updated as any).seasonPlan = seasonPlan;
          await updateRacePlan(existingPlan.id!, updated);
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Error saving season plan:', err);
      setError('Failed to save season plan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [seasonPlan]);

  const generateFullPlan = useCallback(async (races: Race[], showHistory: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const fullPlan = generateFullSeasonPlan(races);

      if (!fullPlan) {
        setError('No upcoming races found');
        setSeasonPlan(null);
        return;
      }

      const finalPlan = showHistory ? fullPlan : filterFutureMacrocycles(fullPlan);
      setSeasonPlan(finalPlan);
    } catch (err) {
      console.error('Error generating full season plan:', err);
      setError('Failed to generate season plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (raceId) {
      await loadExistingPlan(raceId);
    }
  }, [raceId, loadExistingPlan]);

  useEffect(() => {
    if (raceId) {
      loadExistingPlan(raceId);
    }
  }, [raceId, loadExistingPlan]);

  return {
    seasonPlan,
    isLoading,
    error,
    generatePlan,
    generateFullPlan,
    savePlan,
    refresh,
  };
}
