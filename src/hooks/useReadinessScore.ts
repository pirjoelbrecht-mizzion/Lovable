// src/hooks/useReadinessScore.ts
import { useState, useEffect } from 'react';
import { calculateReadinessScore, type ReadinessScore } from '@/utils/readiness';
import { save } from '@/utils/storage';

export function useReadinessScore(date?: string) {
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function compute() {
      try {
        setLoading(true);
        setError(null);
        const targetDate = date || new Date().toISOString().slice(0, 10);
        const score = await calculateReadinessScore(targetDate);
        setReadiness(score);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        if (targetDate === new Date().toISOString().slice(0, 10)) {
          try {
            const yesterdayScore = await calculateReadinessScore(yesterdayStr);
            save('readiness:yesterday', yesterdayScore.value);
          } catch (e) {
            console.warn('Could not fetch yesterday score for trend');
          }
        }
      } catch (err) {
        console.error('Failed to calculate readiness:', err);
        setError('Failed to calculate readiness score');
        setReadiness({
          value: 70,
          category: 'moderate',
          components: {
            recoveryIndex: 0.25,
            freshness: 0.20,
            sleep: 0.15,
            hrv: 0.10,
            fatigue: 0.10,
          },
          message: 'Unable to calculate - using default moderate readiness',
        });
      } finally {
        setLoading(false);
      }
    }

    compute();
  }, [date]);

  return { readiness, loading, error };
}
