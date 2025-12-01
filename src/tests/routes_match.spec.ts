import { describe, it, expect } from 'vitest';
import { suggestRoutesForTraining, type TrainingTarget } from '@/ai/brain';
import { mockRoutes } from './mockRoutes';

describe('AI Route Recommendation (suggestRoutesForTraining)', () => {
  it('ranks routes by distance and elevation similarity', async () => {
    const target: TrainingTarget = {
      distance_km: 10,
      elevation_gain_m: 400,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(mockRoutes, target);

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].route.name).toBe('Rolling Hills Circuit');
    expect(result[0].score).toBeGreaterThan(result[1]?.score || 0);
  });

  it('penalizes surface mismatches', async () => {
    const target: TrainingTarget = {
      distance_km: 10,
      elevation_gain_m: 400,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(mockRoutes, target);
    const topResult = result[0];

    expect(topResult.route.surface_type).toBe('trail');
  });

  it('returns maximum 3 route suggestions', async () => {
    const target: TrainingTarget = {
      distance_km: 10,
      elevation_gain_m: 200,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(mockRoutes, target);

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('handles missing elevation gracefully', async () => {
    const target: TrainingTarget = {
      distance_km: 10,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(mockRoutes, target);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].score).toBeGreaterThan(0);
  });

  it('provides detailed scoring breakdown', async () => {
    const target: TrainingTarget = {
      distance_km: 10,
      elevation_gain_m: 400,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(mockRoutes, target);

    expect(result[0].breakdown).toBeDefined();
    expect(result[0].breakdown?.distanceScore).toBeGreaterThan(0);
    expect(result[0].breakdown?.elevationScore).toBeGreaterThan(0);
    expect(result[0].breakdown?.surfaceScore).toBeGreaterThan(0);
  });

  it('filters out routes with invalid distance', async () => {
    const invalidRoutes = [
      ...mockRoutes,
      {
        id: 'invalid',
        name: 'Invalid Route',
        distance_km: 0,
        surface_type: 'trail',
      },
    ];

    const target: TrainingTarget = {
      distance_km: 10,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(invalidRoutes, target);

    const hasInvalidRoute = result.some(r => r.route.id === 'invalid');
    expect(hasInvalidRoute).toBe(false);
  });

  it('prioritizes exact distance matches', async () => {
    const target: TrainingTarget = {
      distance_km: 8.5,
      terrain: 'trail',
      weatherAware: false,
    };

    const result = await suggestRoutesForTraining(mockRoutes, target);

    expect(result[0].route.name).toBe('Coastal Easy Trail');
    expect(result[0].route.distance_km).toBe(8.5);
  });
});
