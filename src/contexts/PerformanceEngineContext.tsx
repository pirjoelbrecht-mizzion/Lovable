import { createContext, useContext, type ReactNode } from 'react';
import { usePerformanceModel } from '@/hooks/usePerformanceModel';
import type { BaselineRace } from '@/utils/computeBaseline';
import type { PerformanceModel, CalibrationInput } from '@/utils/performanceCalibration';
import type { DbPerformanceCalibration } from '@/lib/database';

type PerformanceEngineContextType = {
  model: PerformanceModel | null;
  baseline: BaselineRace | null;
  calibrations: DbPerformanceCalibration[];
  loading: boolean;
  error: Error | null;
  updateBaseline: (baseline: BaselineRace) => Promise<boolean>;
  calibrate: (input: CalibrationInput) => Promise<any>;
  refresh: () => void;
};

const PerformanceEngineContext = createContext<PerformanceEngineContextType | null>(null);

export function PerformanceEngineProvider({ children }: { children: ReactNode }) {
  const performanceModel = usePerformanceModel();

  return (
    <PerformanceEngineContext.Provider value={performanceModel}>
      {children}
    </PerformanceEngineContext.Provider>
  );
}

export function usePerformanceEngine() {
  const context = useContext(PerformanceEngineContext);
  if (!context) {
    throw new Error('usePerformanceEngine must be used within PerformanceEngineProvider');
  }
  return context;
}
