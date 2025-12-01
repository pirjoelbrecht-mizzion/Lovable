import { useState, useEffect, useCallback } from 'react';
import {
  getPerformanceModel,
  savePerformanceModel,
  savePerformanceCalibration,
  getPerformanceCalibrations,
  type DbPerformanceModel,
  type DbPerformanceCalibration,
} from '@/lib/database';
import { computeBaseline, type BaselineRace } from '@/utils/computeBaseline';
import {
  initializePerformanceModel,
  updateBaselineInModel,
  updateCalibration,
  type PerformanceModel,
  type CalibrationInput,
} from '@/utils/performanceCalibration';

export function usePerformanceModel() {
  const [model, setModel] = useState<PerformanceModel | null>(null);
  const [baseline, setBaseline] = useState<BaselineRace | null>(null);
  const [calibrations, setCalibrations] = useState<DbPerformanceCalibration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadModel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dbModel = await getPerformanceModel();
      const detectedBaseline = await computeBaseline();

      if (dbModel) {
        const performanceModel: PerformanceModel = {
          id: dbModel.id,
          userId: dbModel.user_id,
          baselineId: dbModel.baseline_id,
          baselineType: dbModel.baseline_type,
          baselineDistanceKm: dbModel.baseline_distance_km,
          baselineTimeMin: dbModel.baseline_time_min,
          baselineDate: dbModel.baseline_date,
          performanceDecay: dbModel.performance_decay,
          calibrationCount: dbModel.calibration_count,
          lastCalibrationDate: dbModel.last_calibration_date,
          confidenceScore: dbModel.confidence_score,
          metadata: dbModel.metadata,
        };

        setModel(performanceModel);
        setBaseline(detectedBaseline);

        const calibrationHistory = await getPerformanceCalibrations(20);
        setCalibrations(calibrationHistory);
      } else if (detectedBaseline) {
        const newModel = initializePerformanceModel(detectedBaseline);
        setModel(newModel);
        setBaseline(detectedBaseline);

        const dbModel: DbPerformanceModel = {
          baseline_id: newModel.baselineId,
          baseline_type: newModel.baselineType,
          baseline_distance_km: newModel.baselineDistanceKm,
          baseline_time_min: newModel.baselineTimeMin,
          baseline_date: newModel.baselineDate,
          performance_decay: newModel.performanceDecay,
          calibration_count: newModel.calibrationCount,
          last_calibration_date: newModel.lastCalibrationDate,
          confidence_score: newModel.confidenceScore,
          metadata: newModel.metadata,
        };

        await savePerformanceModel(dbModel);
      } else {
        setModel(null);
        setBaseline(null);
      }
    } catch (err) {
      console.error('Error loading performance model:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModel();
  }, [loadModel, refreshKey]);

  const updateBaseline = useCallback(async (newBaseline: BaselineRace) => {
    if (!model) return false;

    try {
      const updatedModel = updateBaselineInModel(model, newBaseline);
      setModel(updatedModel);
      setBaseline(newBaseline);

      const dbModel: DbPerformanceModel = {
        id: updatedModel.id,
        user_id: updatedModel.userId,
        baseline_id: updatedModel.baselineId,
        baseline_type: updatedModel.baselineType,
        baseline_distance_km: updatedModel.baselineDistanceKm,
        baseline_time_min: updatedModel.baselineTimeMin,
        baseline_date: updatedModel.baselineDate,
        performance_decay: updatedModel.performanceDecay,
        calibration_count: updatedModel.calibrationCount,
        last_calibration_date: updatedModel.lastCalibrationDate,
        confidence_score: updatedModel.confidenceScore,
        metadata: updatedModel.metadata,
      };

      await savePerformanceModel(dbModel);
      return true;
    } catch (err) {
      console.error('Error updating baseline:', err);
      return false;
    }
  }, [model]);

  const calibrate = useCallback(async (calibrationInput: CalibrationInput) => {
    if (!model) return null;

    try {
      const { updatedModel, calibrationRecord } = updateCalibration(model, calibrationInput);

      setModel(updatedModel);

      const dbModel: DbPerformanceModel = {
        id: updatedModel.id,
        user_id: updatedModel.userId,
        baseline_id: updatedModel.baselineId,
        baseline_type: updatedModel.baselineType,
        baseline_distance_km: updatedModel.baselineDistanceKm,
        baseline_time_min: updatedModel.baselineTimeMin,
        baseline_date: updatedModel.baselineDate,
        performance_decay: updatedModel.performanceDecay,
        calibration_count: updatedModel.calibrationCount,
        last_calibration_date: updatedModel.lastCalibrationDate,
        confidence_score: updatedModel.confidenceScore,
        metadata: updatedModel.metadata,
      };

      await savePerformanceModel(dbModel);

      if (model.id) {
        const dbCalibration: DbPerformanceCalibration = {
          performance_model_id: model.id,
          race_id: calibrationRecord.raceId,
          race_name: calibrationRecord.raceName,
          race_distance_km: calibrationRecord.raceDistanceKm,
          predicted_time_min: calibrationRecord.predictedTimeMin,
          actual_time_min: calibrationRecord.actualTimeMin,
          time_delta_min: calibrationRecord.timeDeltaMin,
          old_decay: calibrationRecord.oldDecay,
          new_decay: calibrationRecord.newDecay,
          decay_delta: calibrationRecord.decayDelta,
          improvement_pct: calibrationRecord.improvementPct,
          calibration_quality: calibrationRecord.calibrationQuality,
          notes: calibrationRecord.notes,
        };

        await savePerformanceCalibration(dbCalibration);

        const updatedCalibrations = await getPerformanceCalibrations(20);
        setCalibrations(updatedCalibrations);
      }

      return calibrationRecord;
    } catch (err) {
      console.error('Error calibrating model:', err);
      return null;
    }
  }, [model]);

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    model,
    baseline,
    calibrations,
    loading,
    error,
    updateBaseline,
    calibrate,
    refresh,
  };
}
