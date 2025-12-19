export async function fetchStrengthExercises() {
  return [];
}

export async function fetchMESessionTemplates() {
  return [];
}

export async function detectTerrainFromActivities(_userId: string) {
  return { maxGrade: 0, avgElevationVariance: 0 };
}

export async function fetchUserTerrainAccess(_userId: string) {
  return null;
}

export async function upsertUserTerrainAccess(_userId: string, _access: any) {
  return null;
}

export async function getMETemplateForUser(_userId: string) {
  return null;
}

export async function logStrengthSession(_userId: string, _session: any) {
  return null;
}

export async function recordSoreness(_userId: string, _data: any) {
  return null;
}

export async function getRecentSoreness(_userId: string, _days: number) {
  return [];
}

export async function getPendingFollowupChecks(_userId: string) {
  return [];
}

export async function getActiveLoadAdjustment(_userId: string) {
  return null;
}

export async function checkAndRevertAdjustmentIfRecovered(_userId: string) {
  return false;
}

export function determineMEType(_terrainAccess: any) {
  return {
    meType: 'gym_based' as any,
    templateId: '',
    reason: 'Default assignment',
    alternativeTemplates: [],
  };
}
