import { calculateTrainingLoad, getAdaptationScale } from './loadAnalysis';
import { getCurrentFitness } from './fitnessCalculator';
import { savePlanWeek, getPlanWeek } from './database';
import type { PlanWeek, Session } from '@/utils/adapt';

function getWeekStartDate(date?: Date): string {
  const d = date || new Date();
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = d.getDay();
  // Calculate days to subtract to get to Monday (week start)
  // If Sunday (0), go back 6 days. Otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d.toISOString().slice(0, 10);
}

function scaleSession(session: Session, scale: number): Session {
  if (!session.km) return session;

  const newKm = Math.max(1, Math.round(session.km * scale));
  const scalePct = Math.round((scale - 1) * 100);
  const scaleNote = scalePct > 0
    ? `+${scalePct}% volume`
    : scalePct < 0
    ? `${scalePct}% volume`
    : '';

  return {
    ...session,
    km: newKm,
    notes: scaleNote ? `${session.notes || ''} • ${scaleNote}`.trim() : session.notes,
  };
}

export async function generateAdaptivePlan(basePlan: PlanWeek): Promise<{
  plan: PlanWeek;
  adaptationReason: string;
  intensityScale: number;
}> {
  const load = await calculateTrainingLoad();
  const { scale, reason } = getAdaptationScale(load.progressionRatio);

  const adaptedPlan: PlanWeek = basePlan.map(day => ({
    ...day,
    sessions: day.sessions.map(session => scaleSession(session, scale)),
  }));

  const weekStart = getWeekStartDate();
  await savePlanWeek({
    week_start_date: weekStart,
    plan_data: adaptedPlan,
    intensity_scale: scale,
    adaptation_reason: reason,
  });

  return {
    plan: adaptedPlan,
    adaptationReason: reason,
    intensityScale: scale,
  };
}

export async function getAdaptedPlanForWeek(weekStartDate?: string): Promise<{
  plan: PlanWeek | null;
  adaptationReason?: string;
  intensityScale?: number;
}> {
  const weekStart = weekStartDate || getWeekStartDate();
  const stored = await getPlanWeek(weekStart);

  if (!stored) {
    return { plan: null };
  }

  return {
    plan: stored.plan_data,
    adaptationReason: stored.adaptation_reason,
    intensityScale: stored.intensity_scale,
  };
}

export async function shouldAdaptPlan(): Promise<{
  shouldAdapt: boolean;
  reason: string;
  recommendedScale: number;
}> {
  const load = await calculateTrainingLoad();
  const { scale, reason } = getAdaptationScale(load.progressionRatio);

  const shouldAdapt = scale !== 1.0;

  return {
    shouldAdapt,
    reason,
    recommendedScale: scale,
  };
}

export async function getTrainingInsights(): Promise<{
  progressionRatio: number;
  last7DaysKm: number;
  last28DaysKm: number;
  recommendation: string;
  fitnessScore: number;
}> {
  const load = await calculateTrainingLoad();
  const fitness = await getCurrentFitness();

  return {
    progressionRatio: load.progressionRatio,
    last7DaysKm: load.last7DaysKm,
    last28DaysKm: load.last28DaysKm,
    recommendation: load.recommendation,
    fitnessScore: fitness,
  };
}
