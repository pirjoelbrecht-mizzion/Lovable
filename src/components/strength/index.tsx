import type { StrengthExercise, CompletedExercise, MESessionTemplate, MEAssignment, LoadRegulationDecision, UserTerrainAccess } from '@/types/strengthTraining';

export interface SorenessSubmission {
  overallSoreness: number;
  bodyAreas: any[];
  hasPain: boolean;
  notes: string;
  isFollowup: boolean;
}

export function StrengthExerciseCard(_props: any) {
  return <div>Exercise Card Placeholder</div>;
}

export function StrengthSessionView(_props: any) {
  return <div>Session View Placeholder</div>;
}

export function SorenessCheckModal(_props: any) {
  return null;
}

export function TerrainAccessSettings(_props: any) {
  return <div>Terrain Settings Placeholder</div>;
}
