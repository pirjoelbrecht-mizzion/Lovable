/**
 * Race Plan Database Operations
 *
 * Unified database layer for Race Plans (v2), handling both v1 legacy data
 * and new v2 unified structure. Provides CRUD operations with automatic
 * migration support.
 */

import { supabase } from '@/lib/supabase';
import type { RacePlan, ScenarioType } from '@/types/racePlanV2';
import { dbRowToRacePlan, racePlanToDbRow } from '@/utils/racePlanAdapters';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single RacePlan by ID
 * Automatically handles v1→v2 migration on read
 */
export async function getRacePlan(id: string): Promise<RacePlan | null> {
  try {
    const { data, error } = await supabase
      .from('race_simulations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching race plan:', error);
      return null;
    }

    if (!data) return null;

    // Convert to RacePlan (handles both v1 and v2)
    const plan = dbRowToRacePlan(data);

    // If it was v1, update to v2 in database
    if (data.schema_version === 1 && plan) {
      await updateRacePlanSchema(id, plan);
    }

    return plan;
  } catch (err) {
    console.error('Error in getRacePlan:', err);
    return null;
  }
}

/**
 * List all RacePlans for the current user
 * @param scenarioType - Filter by scenario type (optional)
 * @param limit - Max number of results (default: 50)
 */
export async function listRacePlans(
  scenarioType?: ScenarioType,
  limit: number = 50
): Promise<RacePlan[]> {
  try {
    let query = supabase
      .from('race_simulations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (scenarioType) {
      query = query.eq('scenario_type', scenarioType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing race plans:', error);
      return [];
    }

    if (!data) return [];

    // Convert all rows to RacePlan format
    return data
      .map(row => dbRowToRacePlan(row))
      .filter((plan): plan is RacePlan => plan !== null);
  } catch (err) {
    console.error('Error in listRacePlans:', err);
    return [];
  }
}

/**
 * Get all RacePlans for a specific race
 */
export async function getRacePlansForRace(raceId: string): Promise<RacePlan[]> {
  try {
    const { data, error } = await supabase
      .from('race_simulations')
      .select('*')
      .eq('race_id', raceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching race plans for race:', error);
      return [];
    }

    if (!data) return [];

    return data
      .map(row => dbRowToRacePlan(row))
      .filter((plan): plan is RacePlan => plan !== null);
  } catch (err) {
    console.error('Error in getRacePlansForRace:', err);
    return [];
  }
}

/**
 * Get version history for a RacePlan (follows parent_id chain)
 */
export async function getRacePlanHistory(planId: string): Promise<RacePlan[]> {
  try {
    // Get all plans with this parent_id
    const { data, error } = await supabase
      .from('race_simulations')
      .select('*')
      .eq('parent_id', planId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching race plan history:', error);
      return [];
    }

    if (!data) return [];

    return data
      .map(row => dbRowToRacePlan(row))
      .filter((plan): plan is RacePlan => plan !== null);
  } catch (err) {
    console.error('Error in getRacePlanHistory:', err);
    return [];
  }
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new RacePlan
 */
export async function createRacePlan(plan: RacePlan): Promise<RacePlan | null> {
  try {
    const dbRow = racePlanToDbRow(plan);

    const { data, error } = await supabase
      .from('race_simulations')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.error('Error creating race plan:', error);
      return null;
    }

    return dbRowToRacePlan(data);
  } catch (err) {
    console.error('Error in createRacePlan:', err);
    return null;
  }
}

/**
 * Create a new RacePlan as a child of an existing one (for version tracking)
 */
export async function createRacePlanVersion(
  parentPlan: RacePlan,
  updates: Partial<RacePlan>
): Promise<RacePlan | null> {
  try {
    const newPlan: RacePlan = {
      ...parentPlan,
      ...updates,
      metadata: {
        ...parentPlan.metadata,
        ...updates.metadata,
        parent_id: parentPlan.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Remove id so a new one is generated
    delete newPlan.id;

    return await createRacePlan(newPlan);
  } catch (err) {
    console.error('Error in createRacePlanVersion:', err);
    return null;
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update an existing RacePlan
 */
export async function updateRacePlan(id: string, plan: Partial<RacePlan>): Promise<RacePlan | null> {
  try {
    // Fetch existing plan
    const existing = await getRacePlan(id);
    if (!existing) return null;

    // Merge updates
    const updated: RacePlan = {
      ...existing,
      ...plan,
      metadata: {
        ...existing.metadata,
        ...plan.metadata,
        updated_at: new Date().toISOString(),
      },
    };

    const dbRow = racePlanToDbRow(updated);

    const { data, error } = await supabase
      .from('race_simulations')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating race plan:', error);
      return null;
    }

    return dbRowToRacePlan(data);
  } catch (err) {
    console.error('Error in updateRacePlan:', err);
    return null;
  }
}

/**
 * Update just the inputs of a RacePlan (conditions, nutrition, pacing)
 */
export async function updateRacePlanInputs(
  id: string,
  inputs: Partial<RacePlan['inputs']>
): Promise<RacePlan | null> {
  const existing = await getRacePlan(id);
  if (!existing) return null;

  return updateRacePlan(id, {
    inputs: {
      ...existing.inputs,
      ...inputs,
    },
  });
}

/**
 * Update just the outputs of a RacePlan (simulation results)
 */
export async function updateRacePlanOutputs(
  id: string,
  outputs: Partial<RacePlan['outputs']>
): Promise<RacePlan | null> {
  const existing = await getRacePlan(id);
  if (!existing) return null;

  return updateRacePlan(id, {
    outputs: {
      ...existing.outputs,
      ...outputs,
    },
  });
}

/**
 * Internal function to update schema version after lazy migration
 */
async function updateRacePlanSchema(id: string, plan: RacePlan): Promise<void> {
  try {
    const dbRow = racePlanToDbRow(plan);

    await supabase
      .from('race_simulations')
      .update({
        schema_version: 2,
        race_plan: dbRow.race_plan,
      })
      .eq('id', id);
  } catch (err) {
    console.error('Error updating race plan schema:', err);
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a RacePlan
 */
export async function deleteRacePlan(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('race_simulations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting race plan:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteRacePlan:', err);
    return false;
  }
}

/**
 * Delete all RacePlans for a specific race
 */
export async function deleteRacePlansForRace(raceId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('race_simulations')
      .delete()
      .eq('race_id', raceId);

    if (error) {
      console.error('Error deleting race plans for race:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteRacePlansForRace:', err);
    return false;
  }
}

// ============================================================================
// MIGRATION OPERATIONS
// ============================================================================

/**
 * Manually trigger migration of a specific v1 record to v2
 */
export async function migrateRacePlanToV2(id: string): Promise<RacePlan | null> {
  const plan = await getRacePlan(id);
  if (!plan) return null;

  // getRacePlan automatically migrates, so just return the result
  return plan;
}

/**
 * Get count of v1 vs v2 records for the current user
 */
export async function getRacePlanMigrationStatus(): Promise<{
  v1Count: number;
  v2Count: number;
  total: number;
}> {
  try {
    const { data: v1Data } = await supabase
      .from('race_simulations')
      .select('id', { count: 'exact', head: true })
      .eq('schema_version', 1);

    const { data: v2Data } = await supabase
      .from('race_simulations')
      .select('id', { count: 'exact', head: true })
      .eq('schema_version', 2);

    const v1Count = v1Data?.length || 0;
    const v2Count = v2Data?.length || 0;

    return {
      v1Count,
      v2Count,
      total: v1Count + v2Count,
    };
  } catch (err) {
    console.error('Error getting migration status:', err);
    return { v1Count: 0, v2Count: 0, total: 0 };
  }
}

// ============================================================================
// SCENARIO-SPECIFIC OPERATIONS
// ============================================================================

/**
 * Create a What-If scenario from an existing RacePlan
 */
export async function createWhatIfScenario(
  basePlan: RacePlan,
  name: string
): Promise<RacePlan | null> {
  const whatIfPlan: RacePlan = {
    ...basePlan,
    metadata: {
      ...basePlan.metadata,
      scenario_type: 'whatif',
      parent_id: basePlan.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ui: {
      ...basePlan.ui,
      message: `What-If scenario: ${name}`,
    },
  };

  delete whatIfPlan.id;

  return createRacePlan(whatIfPlan);
}

/**
 * Convert a What-If scenario to a Race Plan
 */
export async function convertWhatIfToRacePlan(whatIfId: string): Promise<RacePlan | null> {
  const whatIfPlan = await getRacePlan(whatIfId);
  if (!whatIfPlan || whatIfPlan.metadata.scenario_type !== 'whatif') {
    return null;
  }

  const racePlan: RacePlan = {
    ...whatIfPlan,
    metadata: {
      ...whatIfPlan.metadata,
      scenario_type: 'race',
      parent_id: whatIfPlan.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  delete racePlan.id;

  return createRacePlan(racePlan);
}
