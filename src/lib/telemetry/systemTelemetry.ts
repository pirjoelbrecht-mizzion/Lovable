import { supabase } from '../supabase';

export type TelemetryEventType =
  | 'sport_mapping_fallback'
  | 'database_lookup_success'
  | 'database_lookup_failure'
  | 'phase_2_check'
  | 'config_read';

export type TelemetryEventCategory =
  | 'sport_mapping'
  | 'governance'
  | 'system_config'
  | 'performance';

interface TelemetryEvent {
  eventType: TelemetryEventType;
  eventCategory: TelemetryEventCategory;
  metadata?: Record<string, any>;
}

let telemetryBuffer: TelemetryEvent[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000;

let flushTimer: NodeJS.Timeout | null = null;

export async function trackTelemetry(event: TelemetryEvent): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[Telemetry] No authenticated user, skipping telemetry event');
    return;
  }

  telemetryBuffer.push(event);

  if (telemetryBuffer.length >= BUFFER_SIZE) {
    await flushTelemetry();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTelemetry();
    }, FLUSH_INTERVAL);
  }
}

async function flushTelemetry(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (telemetryBuffer.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const events = telemetryBuffer.map(event => ({
    user_id: user.id,
    event_type: event.eventType,
    event_category: event.eventCategory,
    metadata: event.metadata || {},
  }));

  telemetryBuffer = [];

  const { error } = await supabase
    .from('system_telemetry')
    .insert(events);

  if (error) {
    console.error('[Telemetry] Failed to flush events:', error);
  }
}

export async function trackSportMappingFallback(sportType: string, reason: string): Promise<void> {
  console.warn(`[Telemetry] Sport mapping fallback used for ${sportType}: ${reason}`);

  await trackTelemetry({
    eventType: 'sport_mapping_fallback',
    eventCategory: 'sport_mapping',
    metadata: {
      sportType,
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function trackDatabaseLookup(
  sportType: string,
  success: boolean,
  executionTimeMs?: number
): Promise<void> {
  await trackTelemetry({
    eventType: success ? 'database_lookup_success' : 'database_lookup_failure',
    eventCategory: 'sport_mapping',
    metadata: {
      sportType,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function trackPhase2Check(enabled: boolean): Promise<void> {
  await trackTelemetry({
    eventType: 'phase_2_check',
    eventCategory: 'governance',
    metadata: {
      enabled,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function getTelemetryStats(days: number = 7): Promise<{
  totalEvents: number;
  fallbackCount: number;
  fallbackRate: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('system_telemetry')
    .select('event_type, metadata')
    .eq('user_id', user.id)
    .eq('event_category', 'sport_mapping')
    .gte('created_at', since.toISOString());

  if (error) {
    console.error('[Telemetry] Failed to fetch stats:', error);
    return {
      totalEvents: 0,
      fallbackCount: 0,
      fallbackRate: 0,
      successCount: 0,
      failureCount: 0,
      avgExecutionTime: 0,
    };
  }

  const totalEvents = data?.length || 0;
  const fallbackCount = data?.filter(e => e.event_type === 'sport_mapping_fallback').length || 0;
  const successCount = data?.filter(e => e.event_type === 'database_lookup_success').length || 0;
  const failureCount = data?.filter(e => e.event_type === 'database_lookup_failure').length || 0;

  const executionTimes = data
    ?.filter(e => e.metadata?.executionTimeMs)
    .map(e => e.metadata.executionTimeMs as number) || [];

  const avgExecutionTime = executionTimes.length > 0
    ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
    : 0;

  const fallbackRate = totalEvents > 0 ? (fallbackCount / totalEvents) : 0;

  return {
    totalEvents,
    fallbackCount,
    fallbackRate,
    successCount,
    failureCount,
    avgExecutionTime,
  };
}

export async function checkFallbackThreshold(thresholdPercent: number = 1.0): Promise<{
  exceeded: boolean;
  currentRate: number;
  threshold: number;
}> {
  const stats = await getTelemetryStats(7);
  const exceeded = stats.fallbackRate * 100 > thresholdPercent;

  if (exceeded) {
    console.warn(
      `[Telemetry] Fallback threshold exceeded! Current rate: ${(stats.fallbackRate * 100).toFixed(2)}%, Threshold: ${thresholdPercent}%`
    );
  }

  return {
    exceeded,
    currentRate: stats.fallbackRate * 100,
    threshold: thresholdPercent,
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushTelemetry();
  });
}
