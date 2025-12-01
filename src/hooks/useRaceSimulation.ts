// src/hooks/useRaceSimulation.ts
import { useState, useEffect } from 'react';
import { simulateRace, type RaceSimulation } from '@/utils/raceSimulation';

export function useRaceSimulation(raceId?: string) {
  const [simulation, setSimulation] = useState<RaceSimulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runSimulation() {
      try {
        setLoading(true);
        setError(null);
        const result = await simulateRace(raceId);
        setSimulation(result);
      } catch (err) {
        console.error('Failed to simulate race:', err);
        setError('Failed to simulate race');
      } finally {
        setLoading(false);
      }
    }

    runSimulation();
  }, [raceId]);

  return { simulation, loading, error };
}
