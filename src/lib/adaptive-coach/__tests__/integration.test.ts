/**
 * Integration tests for Module 1: Types & Adapters
 * Verifies compatibility with existing Mizzion structures
 */

import { describe, it, expect } from 'vitest';
import { buildAthleteProfile, convertRaceToEvent } from '../adapters';
import type { 
  AthleteProfile, 
  RaceEvent, 
  WorkoutType,
  TrainingPhase
} from '../types';
import { SAFE_ACWR_RANGE } from '../types';

describe('Adaptive Coach Module 1 Integration', () => {
  describe('Type Exports', () => {
    it('should export all essential types', () => {
      const workoutType: WorkoutType = "easy";
      const phase: TrainingPhase = "base";
      
      expect(workoutType).toBe("easy");
      expect(phase).toBe("base");
    });

    it('should have correct ACWR safety bounds', () => {
      expect(SAFE_ACWR_RANGE.min).toBe(0.8);
      expect(SAFE_ACWR_RANGE.max).toBe(1.3);
      expect(SAFE_ACWR_RANGE.optimal).toBe(1.0);
    });
  });

  describe('Adapter Functions', () => {
    it('should build athlete profile from existing data', () => {
      const mockUserProfile = {
        id: "test-user",
        user_id: "user-123",
        goalType: "ultra" as const,
        experienceLevel: "intermediate" as const,
        daysPerWeek: 5,
        avgMileage: 40,
        deviceConnected: true,
        planTemplate: "ultra-100k",
        planStartDate: "2024-01-01",
        aiAdaptationLevel: 1 as const,
        onboardingCompleted: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01"
      };

      const mockLogEntries = [
        { title: "Run", dateISO: "2024-01-01", km: 10, durationMin: 60 },
        { title: "Run", dateISO: "2024-01-08", km: 12, durationMin: 70 },
      ];

      const mockRaces = [
        { id: "race1", name: "Test 50K", dateISO: "2024-06-01", distanceKm: 50 }
      ];

      const result = buildAthleteProfile(mockUserProfile, mockLogEntries, mockRaces);

      expect(result).toBeDefined();
      expect(result.yearsTraining).toBeGreaterThan(0);
      expect(result.weeklyMileageHistory).toBeDefined();
      expect(result.recentRaces).toHaveLength(1);
      expect(result.longestRaceCompletedKm).toBe(50);
    });

    it('should convert race to event format', () => {
      const mockRace = {
        id: "leadville",
        name: "Leadville 100",
        dateISO: "2025-08-16",
        distanceKm: 160.9
      };

      const result = convertRaceToEvent(mockRace);

      expect(result.id).toBe("leadville");
      expect(result.name).toBe("Leadville 100");
      expect(result.raceType).toBe("100M");
      expect(result.verticalGain).toBe(0);
    });

    it('should correctly infer race types', () => {
      const marathon = convertRaceToEvent({
        id: "1", name: "Marathon", dateISO: "2025-01-01", distanceKm: 42.2
      });
      expect(marathon.raceType).toBe("Marathon");

      const ultra50K = convertRaceToEvent({
        id: "2", name: "50K", dateISO: "2025-01-01", distanceKm: 50
      });
      expect(ultra50K.raceType).toBe("50K");

      const ultra100M = convertRaceToEvent({
        id: "3", name: "100 Miler", dateISO: "2025-01-01", distanceKm: 160
      });
      expect(ultra100M.raceType).toBe("100M");
    });
  });

  describe('Type Compatibility', () => {
    it('should create valid athlete profile structure', () => {
      const profile: Partial<AthleteProfile> = {
        age: 35,
        yearsTraining: 5,
        averageMileage: 50,
        category: "Cat2",
        recoveryRatio: "3:1"
      };

      expect(profile.category).toBe("Cat2");
      expect(profile.recoveryRatio).toBe("3:1");
    });

    it('should create valid race event structure', () => {
      const race: RaceEvent = {
        name: "UTMB",
        date: "2025-08-29",
        distanceKm: 170,
        verticalGain: 10000,
        raceType: "100M",
        altitude: 1000,
        terrain: "mountain",
        climate: "temperate"
      };

      expect(race.raceType).toBe("100M");
      expect(race.verticalGain).toBe(10000);
    });
  });
});
