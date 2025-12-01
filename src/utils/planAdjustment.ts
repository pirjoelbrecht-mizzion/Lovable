import { type ClimateConditions } from './locationTracking';
import { savePlanAdjustment } from '@/lib/database';
import { type WeekPlan } from '@/lib/plan';

export interface SessionAdjustment {
  originalType: string;
  newType: string;
  targetPace?: number;
  targetHR?: number;
  notes: string;
  reason: string;
}

export interface PlanAdjustmentResult {
  adjusted: boolean;
  modifications: SessionAdjustment[];
  message: string;
}

export function adjustTrainingPlan(
  plan: WeekPlan,
  climateStress: number,
  location: { city?: string; country?: string },
  conditions: ClimateConditions
): PlanAdjustmentResult {
  const modifications: SessionAdjustment[] = [];
  let adjusted = false;

  const adjustedPlan = plan.map((day, idx) => {
    const sessions = day.sessions.map((session) => {
      const originalType = session.title;
      let newSession = { ...session };
      let modification: SessionAdjustment | null = null;

      if (
        (session.title.toLowerCase().includes('interval') ||
          session.title.toLowerCase().includes('tempo') ||
          session.notes?.toLowerCase().includes('z4') ||
          session.notes?.toLowerCase().includes('z5')) &&
        climateStress > 1.05
      ) {
        const paceAdjustment = climateStress;
        const hrReduction = (1 - (climateStress - 1) / 2);

        newSession.notes = `${session.notes || ''}\n\n💧 Climate adjustment: ${conditions.temp}°C, ${conditions.humidity}% humidity. Reduce intensity by ${Math.round((climateStress - 1) * 100)}%. Extra hydration & electrolytes recommended.`.trim();

        modification = {
          originalType,
          newType: originalType,
          targetPace: paceAdjustment,
          targetHR: hrReduction,
          notes: newSession.notes,
          reason: `Heat/humidity adjustment for ${location.city}, ${location.country}`,
        };

        adjusted = true;
      }

      if (climateStress > 1.1) {
        if (
          session.title.toLowerCase().includes('long') ||
          session.title.toLowerCase().includes('endurance')
        ) {
          newSession.notes = `${session.notes || ''}\n\n🌡️ High climate stress detected. Consider splitting this long run or running very early morning. Heat acclimation in progress.`.trim();
          adjusted = true;
        }
      }

      if (conditions.elevation > 1500) {
        const hrAdjustment = 5;
        newSession.notes = `${session.notes || ''}\n\n🏔️ Altitude detected: ${conditions.elevation}m. Expect HR +${hrAdjustment} bpm. Allow extra recovery time.`.trim();
        adjusted = true;
      }

      if (modification) {
        modifications.push(modification);
      }

      return newSession;
    });

    return {
      ...day,
      sessions,
    };
  });

  let message = `Training plan adjusted for ${location.city}, ${location.country}. `;

  if (climateStress > 1.05) {
    message += `Climate stress factor: ${climateStress.toFixed(2)}x. Reduced intensity for heat (${conditions.temp}°C) and humidity (${conditions.humidity}%). `;
  }

  if (conditions.elevation > 1500) {
    message += `Altitude adjustment for ${conditions.elevation}m elevation. `;
  }

  message += 'Focus on hydration and listen to your body.';

  if (adjusted) {
    savePlanAdjustment({
      adjustment_date: new Date().toISOString().slice(0, 10),
      reason: `Location change to ${location.city}, ${location.country}`,
      climate_stress_factor: climateStress,
      modifications: {
        climateStress,
        conditions,
        adjustments: modifications,
      },
    }).catch((err) => console.error('Failed to save adjustment:', err));
  }

  return {
    adjusted,
    modifications,
    message,
  };
}

export function detectJetLag(timezoneShift: number): boolean {
  return Math.abs(timezoneShift) >= 3;
}

export function applyJetLagAdjustment(
  plan: WeekPlan,
  timezoneShift: number,
  location: { city?: string; country?: string }
): PlanAdjustmentResult {
  if (!detectJetLag(timezoneShift)) {
    return {
      adjusted: false,
      modifications: [],
      message: 'No jet lag adjustment needed',
    };
  }

  const modifications: SessionAdjustment[] = [];
  let adjusted = false;

  const adjustedPlan = plan.map((day, idx) => {
    if (idx < 2) {
      const sessions = day.sessions.map((session) => {
        if (
          session.title.toLowerCase().includes('interval') ||
          session.title.toLowerCase().includes('tempo') ||
          session.title.toLowerCase().includes('hard')
        ) {
          const originalType = session.title;
          const newSession = {
            ...session,
            title: 'Easy Run',
            notes: `⏰ Jet lag adjustment (${Math.abs(timezoneShift)}h shift to ${location.city}). Originally scheduled: ${originalType}. Swapped to easy run for recovery. Resume hard workouts in 48h.`,
          };

          modifications.push({
            originalType,
            newType: 'Easy Run',
            notes: newSession.notes,
            reason: `Jet lag recovery - ${Math.abs(timezoneShift)}h timezone shift`,
          });

          adjusted = true;
          return newSession;
        }
        return session;
      });

      return {
        ...day,
        sessions,
      };
    }

    return day;
  });

  if (adjusted) {
    savePlanAdjustment({
      adjustment_date: new Date().toISOString().slice(0, 10),
      reason: `Jet lag adjustment - ${Math.abs(timezoneShift)}h timezone shift to ${location.city}`,
      climate_stress_factor: 1.0,
      modifications: {
        timezoneShift,
        jetLagDetected: true,
        adjustments: modifications,
      },
    }).catch((err) => console.error('Failed to save adjustment:', err));
  }

  return {
    adjusted,
    modifications,
    message: `✈️ Jet lag detected (${Math.abs(timezoneShift)}h shift). Hard workouts delayed 48h for adaptation to ${location.city}, ${location.country}.`,
  };
}

export function calculateLongFlightPenalty(distanceKm: number): number {
  if (distanceKm < 500) return 0;
  if (distanceKm < 2000) return 0.05; // 5% recovery penalty
  if (distanceKm < 5000) return 0.10; // 10% recovery penalty
  return 0.15; // 15% recovery penalty for very long flights
}
