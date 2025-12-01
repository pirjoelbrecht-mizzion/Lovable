/**
 * Unified Race Plan Hook (V2)
 *
 * Single React hook for managing Race Plans across Race Mode, What-If Simulator,
 * and Pacing Strategy. Replaces multiple fragmented hooks with a unified interface.
 *
 * Features:
 * - Automatic v1→v2 migration on load
 * - Optimistic updates for better UX
 * - Local state synchronization with database
 * - Support for version tracking and scenario comparison
 */

import { useState, useEffect, useCallback } from 'react';
import type { RacePlan, RaceReference, ScenarioType } from '@/types/racePlanV2';
import { createDefaultRacePlan, validateRacePlan, cloneRacePlan, isRacePlanModified } from '@/types/racePlanV2';
import {
  getRacePlan,
  createRacePlan,
  updateRacePlan,
  updateRacePlanInputs,
  updateRacePlanOutputs,
  deleteRacePlan,
  getRacePlansForRace,
  createWhatIfScenario,
  createRacePlanVersion,
} from '@/lib/racePlanDatabase';

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseRacePlanResult {
  // State
  plan: RacePlan | null;
  originalPlan: RacePlan | null;
  isModified: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  load: (id: string) => Promise<void>;
  create: (race: RaceReference, scenarioType?: ScenarioType) => Promise<void>;
  save: () => Promise<boolean>;
  reset: () => void;
  revert: () => void;

  // Update methods
  updateConditions: (conditions: Partial<RacePlan['inputs']['conditions']>) => void;
  updateNutrition: (nutrition: Partial<RacePlan['inputs']['nutrition']>) => void;
  updatePacing: (pacing: RacePlan['inputs']['pacing']) => void;
  updateOverrides: (overrides: Partial<RacePlan['inputs']['overrides']>) => void;
  setOutputs: (outputs: Partial<RacePlan['outputs']>) => void;

  // Advanced actions
  createVersion: () => Promise<string | null>;
  createWhatIf: (name: string) => Promise<string | null>;
  deletePlan: () => Promise<boolean>;

  // Validation
  validate: () => { valid: boolean; errors: string[] };
}

/**
 * Main unified hook for Race Plan management
 */
export function useRacePlan(initialPlanId?: string): UseRacePlanResult {
  const [plan, setPlan] = useState<RacePlan | null>(null);
  const [originalPlan, setOriginalPlan] = useState<RacePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isModified = plan && originalPlan ? isRacePlanModified(plan, originalPlan) : false;

  // Load a race plan by ID
  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedPlan = await getRacePlan(id);

      if (loadedPlan) {
        setPlan(cloneRacePlan(loadedPlan));
        setOriginalPlan(cloneRacePlan(loadedPlan));
      } else {
        setError('Race plan not found');
      }
    } catch (err) {
      console.error('Error loading race plan:', err);
      setError('Failed to load race plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new race plan
  const create = useCallback(async (race: RaceReference, scenarioType: ScenarioType = 'race') => {
    setIsLoading(true);
    setError(null);

    try {
      const newPlan = createDefaultRacePlan(race, scenarioType);
      setPlan(newPlan);
      setOriginalPlan(cloneRacePlan(newPlan));
    } catch (err) {
      console.error('Error creating race plan:', err);
      setError('Failed to create race plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save the current plan to database
  const save = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;

    setIsSaving(true);
    setError(null);

    try {
      // Validate before saving
      const validation = validateRacePlan(plan);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return false;
      }

      let savedPlan: RacePlan | null;

      if (plan.id) {
        // Update existing
        savedPlan = await updateRacePlan(plan.id, plan);
      } else {
        // Create new
        savedPlan = await createRacePlan(plan);
      }

      if (savedPlan) {
        setPlan(cloneRacePlan(savedPlan));
        setOriginalPlan(cloneRacePlan(savedPlan));
        return true;
      } else {
        setError('Failed to save race plan');
        return false;
      }
    } catch (err) {
      console.error('Error saving race plan:', err);
      setError('Failed to save race plan');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [plan]);

  // Reset to a clean state
  const reset = useCallback(() => {
    setPlan(null);
    setOriginalPlan(null);
    setError(null);
  }, []);

  // Revert to original plan
  const revert = useCallback(() => {
    if (originalPlan) {
      setPlan(cloneRacePlan(originalPlan));
      setError(null);
    }
  }, [originalPlan]);

  // Update conditions
  const updateConditions = useCallback((conditions: Partial<RacePlan['inputs']['conditions']>) => {
    setPlan(current => {
      if (!current) return null;
      return {
        ...current,
        inputs: {
          ...current.inputs,
          conditions: {
            ...current.inputs.conditions,
            ...conditions,
          },
        },
        metadata: {
          ...current.metadata,
          updated_at: new Date().toISOString(),
        },
      };
    });
  }, []);

  // Update nutrition
  const updateNutrition = useCallback((nutrition: Partial<RacePlan['inputs']['nutrition']>) => {
    setPlan(current => {
      if (!current) return null;
      return {
        ...current,
        inputs: {
          ...current.inputs,
          nutrition: {
            ...current.inputs.nutrition,
            ...nutrition,
          },
        },
        metadata: {
          ...current.metadata,
          updated_at: new Date().toISOString(),
        },
      };
    });
  }, []);

  // Update pacing
  const updatePacing = useCallback((pacing: RacePlan['inputs']['pacing']) => {
    setPlan(current => {
      if (!current) return null;
      return {
        ...current,
        inputs: {
          ...current.inputs,
          pacing,
        },
        metadata: {
          ...current.metadata,
          updated_at: new Date().toISOString(),
        },
      };
    });
  }, []);

  // Update overrides
  const updateOverrides = useCallback((overrides: Partial<RacePlan['inputs']['overrides']>) => {
    setPlan(current => {
      if (!current) return null;
      return {
        ...current,
        inputs: {
          ...current.inputs,
          overrides: {
            ...current.inputs.overrides,
            ...overrides,
          },
        },
        metadata: {
          ...current.metadata,
          updated_at: new Date().toISOString(),
        },
      };
    });
  }, []);

  // Set simulation outputs
  const setOutputs = useCallback((outputs: Partial<RacePlan['outputs']>) => {
    setPlan(current => {
      if (!current) return null;
      return {
        ...current,
        outputs: {
          ...current.outputs,
          ...outputs,
        },
        metadata: {
          ...current.metadata,
          updated_at: new Date().toISOString(),
        },
      };
    });
  }, []);

  // Create a new version of the current plan
  const createVersion = useCallback(async (): Promise<string | null> => {
    if (!plan) return null;

    try {
      const newVersion = await createRacePlanVersion(plan, {});
      return newVersion?.id || null;
    } catch (err) {
      console.error('Error creating plan version:', err);
      return null;
    }
  }, [plan]);

  // Create a What-If scenario from current plan
  const createWhatIf = useCallback(async (name: string): Promise<string | null> => {
    if (!plan) return null;

    try {
      const whatIfPlan = await createWhatIfScenario(plan, name);
      return whatIfPlan?.id || null;
    } catch (err) {
      console.error('Error creating What-If scenario:', err);
      return null;
    }
  }, [plan]);

  // Delete the current plan
  const deletePlan = useCallback(async (): Promise<boolean> => {
    if (!plan?.id) return false;

    try {
      const success = await deleteRacePlan(plan.id);
      if (success) {
        reset();
      }
      return success;
    } catch (err) {
      console.error('Error deleting plan:', err);
      return false;
    }
  }, [plan, reset]);

  // Validate the current plan
  const validate = useCallback(() => {
    if (!plan) {
      return { valid: false, errors: ['No plan to validate'] };
    }
    return validateRacePlan(plan);
  }, [plan]);

  // Load initial plan on mount
  useEffect(() => {
    if (initialPlanId) {
      load(initialPlanId);
    }
  }, [initialPlanId, load]);

  return {
    plan,
    originalPlan,
    isModified,
    isLoading,
    isSaving,
    error,
    load,
    create,
    save,
    reset,
    revert,
    updateConditions,
    updateNutrition,
    updatePacing,
    updateOverrides,
    setOutputs,
    createVersion,
    createWhatIf,
    deletePlan,
    validate,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for listing race plans
 */
export function useRacePlanList(scenarioType?: ScenarioType) {
  const [plans, setPlans] = useState<RacePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { listRacePlans } = await import('@/lib/racePlanDatabase');
      const loadedPlans = await listRacePlans(scenarioType);
      setPlans(loadedPlans);
    } catch (err) {
      console.error('Error loading race plans:', err);
      setError('Failed to load race plans');
    } finally {
      setIsLoading(false);
    }
  }, [scenarioType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plans, isLoading, error, refresh };
}

/**
 * Hook for managing race plans for a specific race
 */
export function useRacePlansForRace(raceId: string) {
  const [plans, setPlans] = useState<RacePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!raceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const loadedPlans = await getRacePlansForRace(raceId);
      setPlans(loadedPlans);
    } catch (err) {
      console.error('Error loading race plans for race:', err);
      setError('Failed to load race plans');
    } finally {
      setIsLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plans, isLoading, error, refresh };
}
