import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type {
  RacePlan,
  RacePlanConditions,
  RacePlanNutrition,
  RacePlanPacing,
  RacePlanSimulationResults,
} from '@/types/racePlan';
import { createDefaultRacePlan, cloneRacePlan, isRacePlanModified } from '@/types/racePlan';

interface RacePlanStoreContext {
  racePlan: RacePlan | null;
  originalRacePlan: RacePlan | null;
  isModified: boolean;
  isLoading: boolean;

  initializeRacePlan: (raceId: string, raceName: string) => void;
  loadRacePlan: (plan: RacePlan) => void;

  updateConditions: (conditions: Partial<RacePlanConditions>) => void;
  updateNutrition: (nutrition: Partial<RacePlanNutrition>) => void;
  updatePacing: (pacing: Partial<RacePlanPacing>) => void;
  setSimulationResults: (results: RacePlanSimulationResults) => void;

  resetToOriginal: () => void;
  resetPlan: () => void;

  markAsSaved: () => void;
}

const RacePlanContext = createContext<RacePlanStoreContext | undefined>(undefined);

export function RacePlanProvider({ children }: { children: ReactNode }) {
  const [racePlan, setRacePlan] = useState<RacePlan | null>(null);
  const [originalRacePlan, setOriginalRacePlan] = useState<RacePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isModified = racePlan && originalRacePlan
    ? isRacePlanModified(racePlan, originalRacePlan)
    : false;

  const updateTimestamp = useCallback((plan: RacePlan): RacePlan => {
    return {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const initializeRacePlan = useCallback((raceId: string, raceName: string) => {
    const newPlan = createDefaultRacePlan(raceId, raceName);
    setRacePlan(newPlan);
    setOriginalRacePlan(cloneRacePlan(newPlan));
  }, []);

  const loadRacePlan = useCallback((plan: RacePlan) => {
    setRacePlan(cloneRacePlan(plan));
    setOriginalRacePlan(cloneRacePlan(plan));
  }, []);

  const updateConditions = useCallback((conditions: Partial<RacePlanConditions>) => {
    setRacePlan((current) => {
      if (!current) return null;
      const updated = updateTimestamp({
        ...current,
        conditions: {
          ...current.conditions,
          ...conditions,
        },
      });
      return updated;
    });
  }, [updateTimestamp]);

  const updateNutrition = useCallback((nutrition: Partial<RacePlanNutrition>) => {
    setRacePlan((current) => {
      if (!current) return null;
      const updated = updateTimestamp({
        ...current,
        nutrition: {
          ...current.nutrition,
          ...nutrition,
        },
      });
      return updated;
    });
  }, [updateTimestamp]);

  const updatePacing = useCallback((pacing: Partial<RacePlanPacing>) => {
    setRacePlan((current) => {
      if (!current) return null;
      const updated = updateTimestamp({
        ...current,
        pacing: {
          ...current.pacing,
          ...pacing,
        },
      });
      return updated;
    });
  }, [updateTimestamp]);

  const setSimulationResults = useCallback((results: RacePlanSimulationResults) => {
    setRacePlan((current) => {
      if (!current) return null;
      return {
        ...current,
        simulation: results,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const resetToOriginal = useCallback(() => {
    if (originalRacePlan) {
      setRacePlan(cloneRacePlan(originalRacePlan));
    }
  }, [originalRacePlan]);

  const resetPlan = useCallback(() => {
    setRacePlan(null);
    setOriginalRacePlan(null);
  }, []);

  const markAsSaved = useCallback(() => {
    if (racePlan) {
      setOriginalRacePlan(cloneRacePlan(racePlan));
    }
  }, [racePlan]);

  const value: RacePlanStoreContext = {
    racePlan,
    originalRacePlan,
    isModified,
    isLoading,

    initializeRacePlan,
    loadRacePlan,

    updateConditions,
    updateNutrition,
    updatePacing,
    setSimulationResults,

    resetToOriginal,
    resetPlan,

    markAsSaved,
  };

  return (
    <RacePlanContext.Provider value={value}>
      {children}
    </RacePlanContext.Provider>
  );
}

export function useRacePlanStore(): RacePlanStoreContext {
  const context = useContext(RacePlanContext);
  if (context === undefined) {
    throw new Error('useRacePlanStore must be used within a RacePlanProvider');
  }
  return context;
}

export function useRacePlanConditions() {
  const { racePlan, updateConditions } = useRacePlanStore();
  return {
    conditions: racePlan?.conditions ?? null,
    updateConditions,
  };
}

export function useRacePlanNutrition() {
  const { racePlan, updateNutrition } = useRacePlanStore();
  return {
    nutrition: racePlan?.nutrition ?? null,
    updateNutrition,
  };
}

export function useRacePlanPacing() {
  const { racePlan, updatePacing } = useRacePlanStore();
  return {
    pacing: racePlan?.pacing ?? null,
    updatePacing,
  };
}

export function useRacePlanSimulation() {
  const { racePlan, setSimulationResults } = useRacePlanStore();
  return {
    simulation: racePlan?.simulation ?? null,
    setSimulationResults,
  };
}
