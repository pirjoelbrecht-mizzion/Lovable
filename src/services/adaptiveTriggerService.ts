/**
 * ======================================================================
 *  ADAPTIVE TRIGGER SERVICE
 *  Centralized event bus for Module 4 execution triggers
 * ======================================================================
 *
 * This service provides a centralized mechanism for triggering Module 4
 * execution when key athlete data changes. It acts as an event bus that
 * other parts of the application can use to signal data updates.
 *
 * Trigger Events:
 * - acwr:updated - ACWR recalculated
 * - weather:updated - Weather data refreshed
 * - races:updated - Race calendar modified
 * - readiness:updated - Readiness score updated
 * - location:updated - Location or travel mode changed
 * - fatigue:updated - Fatigue logged
 * - workout:completed - Training session completed
 */

export type TriggerEvent =
  | 'acwr:updated'
  | 'weather:updated'
  | 'races:updated'
  | 'readiness:updated'
  | 'location:updated'
  | 'fatigue:updated'
  | 'workout:completed'
  | 'motivation:updated';

export interface TriggerData {
  source: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Trigger Module 4 execution via event
 */
export function triggerModule4(event: TriggerEvent, data?: Partial<TriggerData>): void {
  const triggerData: TriggerData = {
    source: data?.source || 'unknown',
    timestamp: Date.now(),
    metadata: data?.metadata || {},
  };

  console.log(`[AdaptiveTrigger] Triggering Module 4: ${event}`, triggerData);

  // Dispatch custom event
  window.dispatchEvent(new CustomEvent(event, {
    detail: triggerData,
  }));

  // Store last trigger time
  const key = `trigger:${event}:last`;
  localStorage.setItem(key, triggerData.timestamp.toString());
}

/**
 * Get last trigger time for an event
 */
export function getLastTriggerTime(event: TriggerEvent): number {
  const key = `trigger:${event}:last`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Check if enough time has passed since last trigger
 * (prevents excessive triggering)
 */
export function shouldThrottle(event: TriggerEvent, minIntervalMs: number = 5 * 60 * 1000): boolean {
  const lastTrigger = getLastTriggerTime(event);
  const now = Date.now();
  return (now - lastTrigger) < minIntervalMs;
}

/**
 * Trigger ACWR update
 */
export function triggerACWRUpdate(source: string = 'acwr-calculator'): void {
  if (shouldThrottle('acwr:updated', 10 * 60 * 1000)) {
    console.log('[AdaptiveTrigger] ACWR trigger throttled');
    return;
  }
  triggerModule4('acwr:updated', { source });
}

/**
 * Trigger weather update
 */
export function triggerWeatherUpdate(source: string = 'weather-service'): void {
  if (shouldThrottle('weather:updated', 30 * 60 * 1000)) {
    console.log('[AdaptiveTrigger] Weather trigger throttled');
    return;
  }
  triggerModule4('weather:updated', { source });
}

/**
 * Trigger race calendar update
 */
export function triggerRacesUpdate(source: string = 'race-manager'): void {
  triggerModule4('races:updated', { source });
}

/**
 * Trigger readiness score update
 */
export function triggerReadinessUpdate(source: string = 'readiness-calculator'): void {
  if (shouldThrottle('readiness:updated', 10 * 60 * 1000)) {
    console.log('[AdaptiveTrigger] Readiness trigger throttled');
    return;
  }
  triggerModule4('readiness:updated', { source });
}

/**
 * Trigger location update
 */
export function triggerLocationUpdate(source: string = 'location-service'): void {
  triggerModule4('location:updated', { source });
}

/**
 * Trigger fatigue log
 */
export function triggerFatigueUpdate(fatigueLevel: number, source: string = 'fatigue-logger'): void {
  triggerModule4('fatigue:updated', {
    source,
    metadata: { fatigueLevel },
  });
}

/**
 * Trigger workout completion
 */
export function triggerWorkoutCompleted(workoutId: string, source: string = 'workout-logger'): void {
  triggerModule4('workout:completed', {
    source,
    metadata: { workoutId },
  });
}

/**
 * Trigger motivation profile update
 */
export function triggerMotivationUpdate(source: string = 'motivation-detector'): void {
  if (shouldThrottle('motivation:updated', 60 * 60 * 1000)) {
    console.log('[AdaptiveTrigger] Motivation trigger throttled');
    return;
  }
  triggerModule4('motivation:updated', { source });
}
