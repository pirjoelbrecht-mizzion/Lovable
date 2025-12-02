/**
 * Types for hydration and fueling recommendations
 */

export interface HydrationRecommendation {
  liters: number;
  litersPerHour: number;
  sodiumMg: number;
  carryAmount: string;
  recommendations: string[];
}

export interface FuelingRecommendation {
  carbsPerHour: number;
  totalCarbs: number;
  gelsNeeded: number;
  recommendations: string[];
}

export interface NutritionPlan {
  hydration: HydrationRecommendation;
  fueling: FuelingRecommendation;
  timeline: Array<{
    time: number;
    action: string;
  }>;
}
