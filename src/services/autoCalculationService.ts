/**
 * Auto-Calculation Service
 *
 * Centralized service that automatically triggers all necessary calculations
 * when data is imported, synced, or modified. Eliminates manual calculation triggers.
 *
 * Architecture:
 * 1. Event-driven: Listens to data change events
 * 2. Queue-based: Processes calculations efficiently
 * 3. Idempotent: Safe to run multiple times
 * 4. Background: Non-blocking for user experience
 */

import { getCurrentUserId } from '@/lib/supabase';
import { emit } from '@/lib/bus';

export type CalculationJob = {
  id: string;
  type: 'weekly_metrics' | 'pace_profile' | 'fitness_index' | 'user_profile' | 'full_recalc';
  userId: string;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
};

class AutoCalculationService {
  private queue: CalculationJob[] = [];
  private processing = false;
  private currentJob: CalculationJob | null = null;
  private listeners: Map<string, Set<(job: CalculationJob) => void>> = new Map();

  constructor() {
    // Initialize service
    this.setupEventListeners();
  }

  /**
   * Setup listeners for data change events
   */
  private setupEventListeners() {
    // Listen for import completion events
    window.addEventListener('log:import-complete', ((e: CustomEvent) => {
      console.log('[AutoCalc] Detected import completion:', e.detail.count, 'entries');
      this.scheduleFullRecalculation('Data import completed');
    }) as EventListener);

    // Listen for single run additions
    window.addEventListener('log:added-run', ((e: CustomEvent) => {
      console.log('[AutoCalc] Detected new run:', e.detail);
      this.scheduleIncrementalUpdate(e.detail.dateISO);
    }) as EventListener);

    // Listen for manual updates
    window.addEventListener('log:updated', (() => {
      console.log('[AutoCalc] Detected log update');
      this.scheduleFullRecalculation('Log updated');
    }) as EventListener);
  }

  /**
   * Schedule a full recalculation (for imports, migrations, etc.)
   */
  async scheduleFullRecalculation(reason: string = 'Manual trigger') {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('[AutoCalc] No user ID, skipping calculation');
      return;
    }

    console.log(`[AutoCalc] Scheduling full recalculation: ${reason}`);

    // Add all calculation jobs to queue
    const jobs: CalculationJob[] = [
      {
        id: `weekly_metrics_${Date.now()}`,
        type: 'weekly_metrics',
        userId,
        priority: 'high',
        retries: 0,
        status: 'pending',
        createdAt: Date.now(),
      },
      {
        id: `pace_profile_${Date.now()}`,
        type: 'pace_profile',
        userId,
        priority: 'high',
        retries: 0,
        status: 'pending',
        createdAt: Date.now(),
      },
      {
        id: `user_profile_${Date.now()}`,
        type: 'user_profile',
        userId,
        priority: 'high',
        retries: 0,
        status: 'pending',
        createdAt: Date.now(),
      },
      {
        id: `fitness_index_${Date.now()}`,
        type: 'fitness_index',
        userId,
        priority: 'normal',
        retries: 0,
        status: 'pending',
        createdAt: Date.now(),
      },
    ];

    // Remove duplicate pending jobs of same type
    this.queue = this.queue.filter(existingJob =>
      !jobs.some(newJob =>
        newJob.type === existingJob.type &&
        existingJob.status === 'pending'
      )
    );

    // Add new jobs
    this.queue.push(...jobs);

    // Sort by priority
    this.sortQueue();

    // Start processing
    this.processQueue();
  }

  /**
   * Schedule incremental update (for single run additions)
   */
  async scheduleIncrementalUpdate(dateISO: string) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    console.log(`[AutoCalc] Scheduling incremental update for ${dateISO}`);

    // For incremental updates, only recalculate affected week
    const job: CalculationJob = {
      id: `incremental_${Date.now()}`,
      type: 'weekly_metrics',
      userId,
      priority: 'normal',
      retries: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.push(job);
    this.sortQueue();
    this.processQueue();
  }

  /**
   * Sort queue by priority and creation time
   */
  private sortQueue() {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Process the calculation queue
   */
  private async processQueue() {
    if (this.processing) {
      console.log('[AutoCalc] Already processing, queue will continue');
      return;
    }

    if (this.queue.length === 0) {
      console.log('[AutoCalc] Queue empty');
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.currentJob = job;
      job.status = 'processing';
      job.startedAt = Date.now();

      console.log(`[AutoCalc] Processing job: ${job.type} (${job.id})`);
      this.notifyListeners('processing', job);

      try {
        await this.executeJob(job);

        job.status = 'completed';
        job.completedAt = Date.now();
        const duration = job.completedAt - job.startedAt!;
        console.log(`[AutoCalc] ✅ Completed ${job.type} in ${duration}ms`);
        this.notifyListeners('completed', job);

      } catch (error: any) {
        console.error(`[AutoCalc] ❌ Failed ${job.type}:`, error);

        job.retries++;
        job.error = error.message;

        if (job.retries < 3) {
          // Retry with lower priority
          job.status = 'pending';
          job.priority = 'low';
          this.queue.push(job);
          console.log(`[AutoCalc] Retrying ${job.type} (attempt ${job.retries + 1}/3)`);
        } else {
          job.status = 'failed';
          console.error(`[AutoCalc] Failed ${job.type} after 3 retries`);
          this.notifyListeners('failed', job);
        }
      }

      this.currentJob = null;
    }

    this.processing = false;
    console.log('[AutoCalc] Queue processing complete');

    // Emit completion event
    emit('log:updated', undefined);
  }

  /**
   * Execute a specific calculation job
   */
  private async executeJob(job: CalculationJob): Promise<void> {
    switch (job.type) {
      case 'weekly_metrics':
        await this.calculateWeeklyMetrics(job.userId);
        break;

      case 'pace_profile':
        await this.calculatePaceProfile(job.userId);
        break;

      case 'user_profile':
        await this.updateUserProfile(job.userId);
        break;

      case 'fitness_index':
        await this.calculateFitnessIndex(job.userId);
        break;

      case 'full_recalc':
        await this.calculateWeeklyMetrics(job.userId);
        await this.calculatePaceProfile(job.userId);
        await this.updateUserProfile(job.userId);
        await this.calculateFitnessIndex(job.userId);
        break;

      default:
        throw new Error(`Unknown job type: ${(job as any).type}`);
    }
  }

  /**
   * Calculate weekly metrics (ACWR, efficiency, etc.)
   */
  private async calculateWeeklyMetrics(userId: string): Promise<void> {
    console.log('[AutoCalc] Computing weekly metrics...');

    const { getLogEntriesByDateRange } = await import('@/lib/database');
    const { saveDerivedMetricsWeekly } = await import('@/lib/database');

    // Fetch all log entries
    const entries = await getLogEntriesByDateRange('2000-01-01', '2100-12-31');

    if (entries.length === 0) {
      console.log('[AutoCalc] No entries to process');
      return;
    }

    console.log(`[AutoCalc] Processing ${entries.length} log entries`);

    // Aggregate by week
    const weeklyMap = new Map<string, typeof entries>();

    for (const entry of entries) {
      const date = new Date(entry.dateISO);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      const weekStart = monday.toISOString().split('T')[0];

      if (!weeklyMap.has(weekStart)) {
        weeklyMap.set(weekStart, []);
      }
      weeklyMap.get(weekStart)!.push(entry);
    }

    const sortedWeeks = Array.from(weeklyMap.keys()).sort();
    const weeklyLoads: number[] = [];
    const derivedMetrics: any[] = [];

    for (let idx = 0; idx < sortedWeeks.length; idx++) {
      const weekStart = sortedWeeks[idx];
      const weekEntries = weeklyMap.get(weekStart)!;

      const totalKm = weekEntries.reduce((sum, e) => sum + e.km, 0);
      const totalDuration = weekEntries.reduce((sum, e) => sum + (e.durationMin || 0), 0);

      const entriesWithHR = weekEntries.filter(e => e.hrAvg);
      const avgHr = entriesWithHR.length > 0
        ? entriesWithHR.reduce((sum, e) => sum + e.hrAvg!, 0) / entriesWithHR.length
        : null;

      const entriesWithPace = weekEntries.filter(e => e.durationMin && e.km > 0);
      const avgPace = entriesWithPace.length > 0
        ? (() => {
            const pace = entriesWithPace.reduce((sum, e) => sum + (e.durationMin! / e.km), 0) / entriesWithPace.length;
            return (pace > 0 && pace < 15) ? pace : null;
          })()
        : null;

      const longRunKm = Math.max(...weekEntries.map(e => e.km), 0);
      const elevationGain = weekEntries.reduce((sum, e) => sum + (e.elevationGain || 0), 0);

      const acuteLoad = totalKm;
      weeklyLoads.push(acuteLoad);

      let chronicLoad = null;
      let acwr = null;
      if (idx >= 4) {
        chronicLoad = (weeklyLoads[idx-1] + weeklyLoads[idx-2] + weeklyLoads[idx-3] + weeklyLoads[idx-4]) / 4;
        if (chronicLoad > 0) {
          acwr = acuteLoad / chronicLoad;
        }
      }

      const efficiencyScore = avgHr && avgPace ? avgHr / avgPace : null;
      const paces = entriesWithPace.map(e => e.durationMin! / e.km);
      const monotony = paces.length > 2 ? (() => {
        const sum = paces.reduce((a, b) => a + b, 0);
        const mean = sum / paces.length;
        const variance = paces.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / paces.length;
        const stdDev = Math.sqrt(variance);
        return mean === 0 || stdDev === 0 ? 1.0 : mean / stdDev;
      })() : 1.0;
      const strain = totalKm * monotony;

      const qualitySessions = weekEntries.filter(e =>
        e.hrAvg && e.hrAvg > 160 && e.km >= 5
      ).length;

      derivedMetrics.push({
        user_id: userId,
        week_start_date: weekStart,
        total_distance_km: totalKm,
        total_duration_min: totalDuration,
        avg_hr: avgHr,
        avg_pace: avgPace,
        long_run_km: longRunKm,
        acute_load: acuteLoad,
        chronic_load: chronicLoad,
        acwr: acwr,
        efficiency_score: efficiencyScore,
        fatigue_index: 0,
        hr_drift_pct: null,
        cadence_avg: null,
        monotony: monotony,
        strain: strain,
        elevation_gain_m: elevationGain,
        run_count: weekEntries.length,
        quality_sessions: qualitySessions,
        metadata: {},
      });
    }

    console.log(`[AutoCalc] Computed ${derivedMetrics.length} weeks of metrics`);

    // Save to database
    await saveDerivedMetricsWeekly(derivedMetrics);
    console.log('[AutoCalc] Weekly metrics saved to database');
  }

  /**
   * Calculate and update user's pace profile from activities
   */
  private async calculatePaceProfile(userId: string): Promise<void> {
    console.log('[AutoCalc] Updating pace profile...');

    const { getLogEntriesByDateRange } = await import('@/lib/database');
    const { autoEstimateProfile } = await import('@/utils/stravaImport');
    const { updateUserProfile } = await import('@/state/userData');
    const { getCurrentUserProfile, saveUserProfile } = await import('@/lib/userProfile');

    const entries = await getLogEntriesByDateRange('2020-01-01', '2030-12-31');

    const runsWithData = entries
      .filter(e => e.km > 0 && e.durationMin && e.hrAvg)
      .map(e => ({
        pace: e.durationMin! / e.km,
        avgHr: e.hrAvg!
      }));

    if (runsWithData.length === 0) {
      console.log('[AutoCalc] No runs with pace/HR data for profile calculation');
      return;
    }

    console.log(`[AutoCalc] Analyzing ${runsWithData.length} runs for pace profile`);

    const profile = autoEstimateProfile(runsWithData);
    if (profile) {
      // Update localStorage (for backward compatibility)
      updateUserProfile({
        paceBase: profile.paceBase,
        heartRateBase: profile.heartRateBase,
        hrMax: profile.hrMax,
        hrResting: profile.hrResting,
        hrThreshold: profile.hrThreshold
      });

      // Update Supabase profile
      const currentProfile = await getCurrentUserProfile();
      await saveUserProfile({
        ...currentProfile,
        pace_base: profile.paceBase,
        hr_base: profile.heartRateBase,
        hr_max: profile.hrMax,
        hr_resting: profile.hrResting,
        hr_threshold: profile.hrThreshold,
      });

      console.log(`[AutoCalc] ✅ Updated pace profile: ${profile.paceBase.toFixed(2)} min/km, HR ${profile.heartRateBase} bpm`);
    }
  }

  /**
   * Update user profile calculations
   */
  private async updateUserProfile(userId: string): Promise<void> {
    console.log('[AutoCalc] Updating user profile metrics...');

    // This could include other profile-level calculations
    // For now, pace profile calculation handles this

    console.log('[AutoCalc] User profile updated');
  }

  /**
   * Calculate fitness index over time
   */
  private async calculateFitnessIndex(userId: string): Promise<void> {
    console.log('[AutoCalc] Calculating fitness indices...');

    const { getLogEntriesByDateRange } = await import('@/lib/database');
    const { updateFitnessForWeek } = await import('@/lib/fitnessCalculator');

    const entries = await getLogEntriesByDateRange('2000-01-01', '2100-12-31');

    // Get unique weeks
    const weeks = new Set<string>();
    entries.forEach(e => {
      const date = new Date(e.dateISO);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      weeks.add(monday.toISOString().split('T')[0]);
    });

    const sortedWeeks = Array.from(weeks).sort();
    console.log(`[AutoCalc] Updating fitness for ${sortedWeeks.length} weeks`);

    // Update fitness for each week (in batches to avoid overwhelming the system)
    const BATCH_SIZE = 10;
    for (let i = 0; i < sortedWeeks.length; i += BATCH_SIZE) {
      const batch = sortedWeeks.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(week => updateFitnessForWeek(week)));
    }

    console.log('[AutoCalc] Fitness indices updated');
  }

  /**
   * Add listener for calculation events
   */
  on(event: 'processing' | 'completed' | 'failed', handler: (job: CalculationJob) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: 'processing' | 'completed' | 'failed', job: CalculationJob) {
    this.listeners.get(event)?.forEach(handler => handler(job));
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentJob: this.currentJob,
      pendingJobs: this.queue.filter(j => j.status === 'pending').length,
    };
  }

  /**
   * Manually trigger full recalculation
   */
  async triggerManualRecalc() {
    console.log('[AutoCalc] Manual recalculation triggered');
    await this.scheduleFullRecalculation('Manual trigger');
  }
}

// Singleton instance
export const autoCalculationService = new AutoCalculationService();

// Export convenience functions
export function scheduleAutoCalculation() {
  return autoCalculationService.scheduleFullRecalculation('Manual call');
}

export function getCalculationStatus() {
  return autoCalculationService.getStatus();
}
