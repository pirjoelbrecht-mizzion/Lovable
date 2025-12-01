// src/utils/readiness.ts
import { getLogEntriesByDateRange } from '@/lib/database';
import { calculateTrainingLoad } from '@/lib/loadAnalysis';
import { load, save } from '@/utils/storage';
import type { LogEntry } from '@/types';

export type ReadinessData = {
  date: string;
  hrResting?: number;
  hrv?: number;
  hrvBaseline?: number;
  acuteLoad: number;
  chronicLoad: number;
  sleepHours?: number;
  sleepQuality?: number;
  fatigueLevel?: number; // 1-10
  lastHardDaysAgo: number;
  source?: 'manual' | 'garmin' | 'oura' | 'coros' | 'apple' | 'auto';
};

export type ReadinessScore = {
  value: number; // 0-100
  category: 'high' | 'moderate' | 'low';
  components: {
    recoveryIndex: number;
    freshness: number;
    sleep: number;
    hrv: number;
    fatigue: number;
  };
  message: string;
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getDaysSinceHardWorkout(entries: LogEntry[]): number {
  const sorted = entries.slice().sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const isHard = (entry.hrAvg && entry.hrAvg > 160) || 
                   (entry.km && entry.km > 15) ||
                   (entry.durationMin && entry.km && (entry.durationMin / entry.km) < 5.5);
    
    if (isHard) {
      const daysDiff = Math.floor(
        (new Date().getTime() - new Date(entry.dateISO).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff;
    }
  }
  
  return 7; // default: assume last hard workout was a week ago
}

export async function calculateReadinessScore(date: string = new Date().toISOString().slice(0, 10)): Promise<ReadinessScore> {
  const { saveReadinessScore: saveToDb, getReadinessScoreByDate } = await import('@/lib/database');

  const cached = await getReadinessScoreByDate(date);
  if (cached && cached.value) {
    return {
      value: cached.value,
      category: cached.category,
      components: {
        recoveryIndex: cached.recovery_index || 0,
        freshness: cached.freshness || 0,
        sleep: cached.sleep || 0,
        hrv: cached.hrv || 0,
        fatigue: cached.fatigue || 0,
      },
      message: cached.message || 'Readiness score',
    };
  }

  const trainingLoad = await calculateTrainingLoad();

  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 7);
  const entries = await getLogEntriesByDateRange(startDate.toISOString().slice(0, 10), date);

  const manualData = load<Partial<ReadinessData>>(`readiness:${date}`, {});

  const acuteToChronicRatio = trainingLoad.chronicLoad > 0 ? trainingLoad.acuteLoad / trainingLoad.chronicLoad : 1.0;
  const recoveryIndex = clamp(1 - (acuteToChronicRatio - 1) * 0.5, 0.4, 1.0);

  const daysSinceHard = getDaysSinceHardWorkout(entries);
  const freshnessFactor = 1 - Math.exp(-daysSinceHard / 2);

  const sleepHours = manualData.sleepHours || 7.5;
  const sleepModifier = clamp(sleepHours / 8, 0.6, 1.1);

  const hrvFactor = manualData.hrv && manualData.hrvBaseline
    ? clamp(manualData.hrv / manualData.hrvBaseline, 0.8, 1.2)
    : 1.0;

  const fatigueLevel = manualData.fatigueLevel || 5;
  const fatigueModifier = 1 - (fatigueLevel - 5) / 20;

  const components = {
    recoveryIndex: recoveryIndex * 0.35,
    freshness: freshnessFactor * 0.25,
    sleep: sleepModifier * 0.15,
    hrv: hrvFactor * 0.15,
    fatigue: fatigueModifier * 0.10,
  };

  const totalWeight = 0.35 + 0.25 + 0.15 + 0.15 + 0.10;
  const rawScore = (components.recoveryIndex + components.freshness +
                    components.sleep + components.hrv + components.fatigue) / totalWeight;

  const value = Math.round(rawScore * 100);

  let category: 'high' | 'moderate' | 'low';
  let message: string;

  if (value >= 80) {
    category = 'high';
    message = 'High readiness - ready for strong training';
  } else if (value >= 60) {
    category = 'moderate';
    message = 'Moderate readiness - train but watch fatigue';
  } else {
    category = 'low';
    message = 'Low readiness - recovery priority recommended';
  }

  const score = {
    value,
    category,
    components,
    message,
  };

  await saveToDb({
    date,
    value,
    category,
    recovery_index: components.recoveryIndex,
    freshness: components.freshness,
    sleep: components.sleep,
    hrv: components.hrv,
    fatigue: components.fatigue,
    sleep_hours: manualData.sleepHours,
    sleep_quality: manualData.sleepQuality,
    fatigue_level: manualData.fatigueLevel,
    hrv_value: manualData.hrv,
    hrv_baseline: manualData.hrvBaseline,
    source: manualData.source || 'auto',
    message,
  });

  save(`readiness:score:${date}`, score);

  return score;
}

export function saveManualReadinessInputs(date: string, data: Partial<ReadinessData>): void {
  const existing = load<Partial<ReadinessData>>(`readiness:${date}`, {});
  save(`readiness:${date}`, { ...existing, ...data, source: 'manual' });
}


