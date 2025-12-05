import { getSupabase, getCurrentUserId } from './supabase';
import type { LogEntry } from '@/types';
import { load, save } from '@/utils/storage';

// Request cache to prevent concurrent duplicate requests
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds

function getCachedRequest<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key);

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.promise as Promise<T>;
  }

  const promise = fetchFn().finally(() => {
    // Clean up after a short delay
    setTimeout(() => requestCache.delete(key), CACHE_TTL);
  });

  requestCache.set(key, { promise, timestamp: now });
  return promise;
}

/**
 * Sanitize string to remove null bytes and other invalid characters
 * PostgreSQL cannot store \u0000 (null bytes) in text fields
 */
function sanitizeString(value: any): any {
  if (typeof value === 'string') {
    // Remove null bytes (\u0000) and other control characters that PostgreSQL can't handle
    return value.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeString);
  }
  if (value && typeof value === 'object') {
    const sanitized: any = {};
    for (const key in value) {
      sanitized[key] = sanitizeString(value[key]);
    }
    return sanitized;
  }
  return value;
}

export type DbLogEntry = {
  id?: string;
  user_id?: string;
  title: string;
  date: string;
  km: number;
  duration_min?: number;
  hr_avg?: number;
  source?: string;
  external_id?: string;
  data_source?: string;
  map_polyline?: string;
  map_summary_polyline?: string;
  elevation_gain?: number;        // Total elevation gain in meters (Column U)
  elevation_loss?: number;        // Total elevation loss in meters (Column V)
  elevation_low?: number;         // Lowest elevation point in meters (Column W)
  elevation_stream?: number[];
  distance_stream?: number[];
  temperature?: number;
  weather_conditions?: string;
  location_name?: string;
  humidity?: number;
  created_at?: string;
  updated_at?: string;
};

export type DbWeeklyMetric = {
  id?: string;
  user_id?: string;
  week_start_date: string;
  total_km: number;
  avg_hr?: number;
  avg_rpe?: number;
  completion_rate?: number;
  progression_ratio?: number;
  created_at?: string;
  updated_at?: string;
};

export type DbFitnessIndex = {
  id?: string;
  user_id?: string;
  date: string;
  fitness_score: number;
  factors?: Record<string, any>;
  created_at?: string;
};

export type DbPlanWeek = {
  id?: string;
  user_id?: string;
  week_start_date: string;
  plan_data: any;
  intensity_scale?: number;
  adaptation_reason?: string;
  created_at?: string;
  updated_at?: string;
};

function toDbLogEntry(entry: LogEntry): DbLogEntry {
  return {
    title: entry.title,
    date: entry.dateISO,
    km: entry.km,
    duration_min: entry.durationMin,
    hr_avg: entry.hrAvg,
    source: entry.source || 'Manual',
    external_id: entry.externalId,
    data_source: entry.source === 'Strava' ? 'strava' : undefined,
    map_polyline: entry.mapPolyline,
    map_summary_polyline: entry.mapSummaryPolyline,
    elevation_gain: entry.elevationGain,        // CRITICAL FIX: Use correct column name
    elevation_loss: entry.elevationLoss,        // CRITICAL FIX: Use correct column name
    elevation_low: entry.elevationLow,          // CRITICAL FIX: Use correct column name
    elevation_stream: entry.elevationStream,
    distance_stream: entry.distanceStream,
    temperature: entry.temperature,
    weather_conditions: entry.weather,
    location_name: entry.location,
    humidity: entry.humidity,
  };
}

function fromDbLogEntry(db: any): LogEntry {
  return {
    id: db.id,
    title: db.title,
    dateISO: db.date,
    km: db.km,
    durationMin: db.duration_min,
    hrAvg: db.hr_avg,
    source: db.source,
    externalId: db.external_id,
    mapPolyline: db.map_polyline,
    mapSummaryPolyline: db.map_summary_polyline,
    elevationGain: db.elevation_gain,        // CRITICAL FIX: Use correct column name
    elevationLoss: db.elevation_loss,        // CRITICAL FIX: Use correct column name
    elevationLow: db.elevation_low,          // CRITICAL FIX: Use correct column name
    elevationStream: db.elevation_stream,
    distanceStream: db.distance_stream,
    temperature: db.temperature,
    weather: db.weather_conditions,
    location: db.location_name,
    humidity: db.humidity,
  };
}

export async function saveLogEntry(entry: LogEntry): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const entries = load<LogEntry[]>('logEntries', []);
    entries.push(entry);
    save('logEntries', entries);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const entries = load<LogEntry[]>('logEntries', []);
    entries.push(entry);
    save('logEntries', entries);
    return true;
  }

  const dbEntry = { ...toDbLogEntry(entry), user_id: userId };
  const { data, error } = await supabase.from('log_entries').insert([dbEntry]).select();

  if (error) {
    console.error('Failed to save log entry to Supabase:', error);
    const entries = load<LogEntry[]>('logEntries', []);
    entries.push(entry);
    save('logEntries', entries);
    return false;
  }

  if (data && data[0]) {
    try {
      const { enrichLogEntryWithEnvironment, saveEnvironmentalTrainingData } = await import('@/services/environmentalDataEnrichment');
      const enrichedData = await enrichLogEntryWithEnvironment(data[0] as any);
      await saveEnvironmentalTrainingData(data[0].id, enrichedData);
    } catch (err) {
      console.error('Error enriching environmental data:', err);
    }

    // Trigger terrain analysis and pace profile recalculation if activity has elevation data
    if (entry.elevationStream && entry.distanceStream && entry.durationMin) {
      try {
        const { analyzeActivityTerrain, saveTerrainAnalysis } = await import('@/engine/historicalAnalysis/analyzeActivityTerrain');
        const { recalculatePaceProfileBackground } = await import('@/engine/historicalAnalysis/calculateUserPaceProfile');

        const analysis = analyzeActivityTerrain(entry, data[0].id, userId);
        if (analysis) {
          await saveTerrainAnalysis(analysis);
          recalculatePaceProfileBackground(userId);
        }
      } catch (err) {
        console.error('Error analyzing terrain or updating pace profile:', err);
      }
    }
  }

  return true;
}

export async function bulkInsertLogEntries(entries: LogEntry[]): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) {
    const existing = load<LogEntry[]>('logEntries', []);
    const merged = [...existing, ...entries];
    const unique = merged.filter((e, i, arr) =>
      arr.findIndex(x => x.dateISO === e.dateISO && x.km === e.km) === i
    );
    save('logEntries', unique);
    return entries.length;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const existing = load<LogEntry[]>('logEntries', []);
    const merged = [...existing, ...entries];
    const unique = merged.filter((e, i, arr) =>
      arr.findIndex(x => x.dateISO === e.dateISO && x.km === e.km) === i
    );
    save('logEntries', unique);
    return entries.length;
  }

  const dbEntries = entries.map(e => {
    const entry = toDbLogEntry(e);
    const sanitizedEntry = sanitizeString({
      ...entry,
      user_id: userId,
      duration_min: entry.duration_min ?? 0,
    });
    return sanitizedEntry;
  });

  console.log('[bulkInsertLogEntries] Checking for existing entries...');
  const dates = [...new Set(dbEntries.map(e => e.date))];

  // Build a set for deduplication
  // Priority: external_id + data_source > date + km
  const existingSet = new Set<string>();

  // Query in batches to avoid URL length limits (max ~50 dates per batch)
  const DATE_BATCH_SIZE = 50;
  for (let i = 0; i < dates.length; i += DATE_BATCH_SIZE) {
    const dateBatch = dates.slice(i, i + DATE_BATCH_SIZE);
    const { data: existing } = await supabase
      .from('log_entries')
      .select('date, km, external_id, data_source')
      .eq('user_id', userId)
      .in('date', dateBatch);

    (existing || []).forEach(e => {
      // If has external_id, use it as primary key
      if (e.external_id && e.data_source) {
        existingSet.add(`ext:${e.data_source}:${e.external_id}`);
      }
      // Also add date+km combination for fallback
      existingSet.add(`date:${e.date}|${e.km}`);
    });
  }

  console.log(`[bulkInsertLogEntries] Found ${existingSet.size} existing entries to check against`);

  const newEntries = dbEntries.filter(e => {
    // Check if this entry already exists by external_id
    if (e.external_id && e.data_source) {
      if (existingSet.has(`ext:${e.data_source}:${e.external_id}`)) {
        console.log(`[bulkInsertLogEntries] Skipping duplicate external activity: ${e.data_source}:${e.external_id}`);
        return false;
      }
    }
    // Fallback: check by date+km
    if (existingSet.has(`date:${e.date}|${e.km}`)) {
      console.log(`[bulkInsertLogEntries] Skipping duplicate by date+km: ${e.date} ${e.km}km`);
      return false;
    }
    return true;
  });

  const skippedCount = dbEntries.length - newEntries.length;
  console.log(`[bulkInsertLogEntries] Found ${newEntries.length} new entries, ${skippedCount} already exist`);

  if (newEntries.length === 0) {
    return 0;
  }

  const BATCH_SIZE = 100;
  let insertedCount = 0;

  for (let i = 0; i < newEntries.length; i += BATCH_SIZE) {
    const batch = newEntries.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('log_entries')
      .insert(batch)
      .select();

    if (error) {
      console.error('[bulkInsertLogEntries] Batch insert error:', error);
    } else {
      insertedCount += data?.length || batch.length;

      if (data && data.length > 0) {
        try {
          const { enrichLogEntryWithEnvironment, saveEnvironmentalTrainingData } = await import('@/services/environmentalDataEnrichment');
          for (const entry of data) {
            const enrichedData = await enrichLogEntryWithEnvironment(entry as any);
            await saveEnvironmentalTrainingData(entry.id, enrichedData);
          }
          console.log(`[bulkInsertLogEntries] Enriched ${data.length} entries with environmental data`);
        } catch (err) {
          console.error('Error enriching environmental data:', err);
        }
      }
    }
  }

  console.log(`[bulkInsertLogEntries] Successfully inserted ${insertedCount} entries`);

  // Trigger terrain analysis and pace profile recalculation after bulk import
  if (insertedCount > 0) {
    try {
      const { analyzeUserActivities } = await import('@/engine/historicalAnalysis/analyzeActivityTerrain');
      const { recalculatePaceProfileBackground } = await import('@/engine/historicalAnalysis/calculateUserPaceProfile');

      console.log('[bulkInsertLogEntries] Analyzing terrain for newly imported activities...');
      const analyzedCount = await analyzeUserActivities(userId);
      console.log(`[bulkInsertLogEntries] Analyzed ${analyzedCount} activities`);

      if (analyzedCount > 0) {
        recalculatePaceProfileBackground(userId);
        console.log('[bulkInsertLogEntries] Triggered pace profile recalculation');
      }
    } catch (err) {
      console.error('Error analyzing terrain or updating pace profile:', err);
    }
  }

  return insertedCount;
}

/**
 * Update existing log entries with missing elevation data
 * This is useful when re-importing activities that already exist but lack elevation info
 */
export async function updateEntriesWithElevationData(entries: LogEntry[]): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[updateEntriesWithElevationData] No Supabase connection');
    return 0;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[updateEntriesWithElevationData] No user ID');
    return 0;
  }

  console.log(`[updateEntriesWithElevationData] Processing ${entries.length} entries for elevation updates`);

  // Filter to only entries that have elevation data
  const entriesWithElevation = entries.filter(e =>
    e.elevationGain !== undefined ||
    e.elevationLoss !== undefined ||
    e.elevationLow !== undefined
  );

  if (entriesWithElevation.length === 0) {
    console.log('[updateEntriesWithElevationData] No entries with elevation data to update');
    return 0;
  }

  console.log(`[updateEntriesWithElevationData] Found ${entriesWithElevation.length} entries with elevation data`);

  let updatedCount = 0;

  // Process each entry
  for (const entry of entriesWithElevation) {
    try {
      // Find existing entry by external_id or date+km
      let query = supabase
        .from('log_entries')
        .select('id, elevation_gain, elevation_loss, elevation_low')
        .eq('user_id', userId);

      if (entry.externalId && entry.source) {
        query = query
          .eq('external_id', entry.externalId)
          .eq('data_source', entry.source.toLowerCase());
      } else {
        query = query
          .eq('date', entry.dateISO)
          .eq('km', entry.km);
      }

      const { data: existing } = await query.maybeSingle();

      if (!existing) {
        continue; // Entry doesn't exist, skip
      }

      // Check if elevation data is missing or zero
      const needsUpdate =
        existing.elevation_gain === null ||
        existing.elevation_gain === 0 ||
        existing.elevation_loss === null ||
        existing.elevation_low === null;

      if (!needsUpdate) {
        continue; // Already has elevation data, skip
      }

      // Update with new elevation data
      const updateData: any = {};

      if (entry.elevationGain !== undefined) {
        updateData.elevation_gain = entry.elevationGain;
      }
      if (entry.elevationLoss !== undefined) {
        updateData.elevation_loss = entry.elevationLoss;
      }
      if (entry.elevationLow !== undefined) {
        updateData.elevation_low = entry.elevationLow;
      }
      if (entry.elevationStream) {
        updateData.elevation_stream = entry.elevationStream;
      }
      if (entry.distanceStream) {
        updateData.distance_stream = entry.distanceStream;
      }

      const { error } = await supabase
        .from('log_entries')
        .update(updateData)
        .eq('id', existing.id);

      if (error) {
        console.error(`[updateEntriesWithElevationData] Error updating entry ${existing.id}:`, error);
      } else {
        updatedCount++;
        console.log(`[updateEntriesWithElevationData] Updated entry ${existing.id} with elevation data`);
      }
    } catch (err) {
      console.error('[updateEntriesWithElevationData] Error processing entry:', err);
    }
  }

  console.log(`[updateEntriesWithElevationData] Successfully updated ${updatedCount} entries with elevation data`);
  return updatedCount;
}

export async function getLogEntries(limit = 100): Promise<LogEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return load<LogEntry[]>('logEntries', []);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return load<LogEntry[]>('logEntries', []);
  }

  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch log entries:', error);
    return load<LogEntry[]>('logEntries', []);
  }

  return (data || []).map(fromDbLogEntry);
}

export async function syncLogEntries(): Promise<LogEntry[]> {
  const { mergeDedup, cleanupDuplicates } = await import('@/utils/log');
  const supabase = getSupabase();
  const localEntries = load<LogEntry[]>('logEntries', []);

  if (!supabase) {
    const cleaned = cleanupDuplicates(localEntries);
    save('logEntries', cleaned);
    return cleaned;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const cleaned = cleanupDuplicates(localEntries);
    save('logEntries', cleaned);
    return cleaned;
  }

  // Select only essential fields to avoid JSON size limits with large polylines
  const { data, error } = await supabase
    .from('log_entries')
    .select(`
      id, user_id, date, type, duration_min, km, hr_avg,
      source, created_at, updated_at, external_id, data_source,
      map_polyline, map_summary_polyline, elevation_gain, elevation_stream, distance_stream,
      temperature, weather_conditions, location_name, humidity, altitude_m, terrain_type,
      weather_data, elevation_loss, elevation_low
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to sync log entries:', error);
    const cleaned = cleanupDuplicates(localEntries);
    save('logEntries', cleaned);
    return cleaned;
  }

  const dbEntries = (data || []).map(fromDbLogEntry);
  console.log('[syncLogEntries] Local entries:', localEntries.length);
  console.log('[syncLogEntries] DB entries:', dbEntries.length);

  // DEBUG: Check elevation data
  const entriesWithElevation = dbEntries.filter(e => e.elevationGain && e.elevationGain > 0);
  const totalElevation = dbEntries.reduce((sum, e) => sum + (e.elevationGain || 0), 0);
  console.log('[syncLogEntries] Entries with elevation:', entriesWithElevation.length);
  console.log('[syncLogEntries] Total elevation gain:', totalElevation, 'm');
  console.log('[syncLogEntries] Sample entry with elevation:', entriesWithElevation[0]);
  const dbWithMap = dbEntries.find(e => e.mapSummaryPolyline || e.mapPolyline);
  console.log('[syncLogEntries] Sample DB entry with map:', dbWithMap);
  console.log('[syncLogEntries] DB entry map fields:', {
    hasMapPolyline: !!dbWithMap?.mapPolyline,
    hasSummaryPolyline: !!dbWithMap?.mapSummaryPolyline,
    mapPolylineLength: dbWithMap?.mapPolyline?.length,
    summaryPolylineLength: dbWithMap?.mapSummaryPolyline?.length
  });
  const merged = mergeDedup(localEntries, dbEntries);
  console.log('[syncLogEntries] Merged entries:', merged.length);
  console.log('[syncLogEntries] Sample merged entry with map:', merged.find(e => e.mapSummaryPolyline || e.mapPolyline));
  save('logEntries', merged);
  return merged;
}

export async function getLogEntriesByDateRange(startDate: string, endDate: string): Promise<LogEntry[]> {
  const supabase = getSupabase();
  console.log('[getLogEntriesByDateRange] Supabase available:', !!supabase);

  if (!supabase) {
    const entries = load<LogEntry[]>('logEntries', []);
    console.log('[getLogEntriesByDateRange] No Supabase, returning', entries.length, 'entries from localStorage');
    return entries.filter(e => e.dateISO >= startDate && e.dateISO <= endDate);
  }

  const userId = await getCurrentUserId();
  console.log('[getLogEntriesByDateRange] User ID:', userId);

  if (!userId) {
    const entries = load<LogEntry[]>('logEntries', []);
    console.log('[getLogEntriesByDateRange] No user, returning', entries.length, 'entries from localStorage');
    return entries.filter(e => e.dateISO >= startDate && e.dateISO <= endDate);
  }

  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch log entries by date range:', error);
    const entries = load<LogEntry[]>('logEntries', []);
    return entries.filter(e => e.dateISO >= startDate && e.dateISO <= endDate);
  }

  console.log('[getLogEntriesByDateRange] Fetched', data?.length || 0, 'entries from database');
  return (data || []).map(fromDbLogEntry);
}

export async function saveWeeklyMetric(metric: DbWeeklyMetric): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbMetric = { ...metric, user_id: userId };
  const { error } = await supabase.from('weekly_metrics').upsert([dbMetric], {
    onConflict: 'user_id,week_start_date',
  });

  if (error) {
    console.error('Failed to save weekly metric:', error);
    return false;
  }

  return true;
}

export async function getWeeklyMetrics(limit = 12): Promise<DbWeeklyMetric[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('weekly_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch weekly metrics:', error);
    return [];
  }

  return data || [];
}

export async function saveFitnessIndex(index: DbFitnessIndex): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbIndex = { ...index, user_id: userId };
  const { error } = await supabase.from('fitness_index').upsert([dbIndex], {
    onConflict: 'user_id,date',
  });

  if (error) {
    console.error('Failed to save fitness index:', error);
    return false;
  }

  return true;
}

export async function getFitnessHistory(days = 84): Promise<DbFitnessIndex[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('fitness_index')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to fetch fitness history:', error);
    return [];
  }

  return data || [];
}

export async function savePlanWeek(plan: DbPlanWeek): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    save('planner:week', plan.plan_data);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    save('planner:week', plan.plan_data);
    return true;
  }

  const dbPlan = { ...plan, user_id: userId };
  const { error } = await supabase.from('plan_weeks').upsert([dbPlan], {
    onConflict: 'user_id,week_start_date',
  });

  if (error) {
    console.error('Failed to save plan week:', error);
    save('planner:week', plan.plan_data);
    return false;
  }

  return true;
}

export async function getPlanWeek(weekStartDate: string): Promise<DbPlanWeek | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const planData = load('planner:week', null);
    if (!planData) return null;
    return {
      week_start_date: weekStartDate,
      plan_data: planData,
    };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const planData = load('planner:week', null);
    if (!planData) return null;
    return {
      week_start_date: weekStartDate,
      plan_data: planData,
    };
  }

  const { data, error } = await supabase
    .from('plan_weeks')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch plan week:', error);
    const planData = load('planner:week', null);
    if (!planData) return null;
    return {
      week_start_date: weekStartDate,
      plan_data: planData,
    };
  }

  if (!data) {
    const planData = load('planner:week', null);
    if (!planData) return null;
    return {
      week_start_date: weekStartDate,
      plan_data: planData,
    };
  }

  return data;
}

export type DbRaceSimulation = {
  id?: string;
  user_id?: string;
  race_id: string;
  race_name: string;
  race_distance_km: number;
  race_date: string;
  predicted_time_min: number;
  avg_pace: number;
  confidence: 'high' | 'medium' | 'low';
  terrain_factor?: number;
  elevation_factor?: number;
  climate_factor?: number;
  fatigue_penalty?: number;
  confidence_score?: number;
  readiness_score?: number;
  weeks_to_race?: number;
  simulation_message?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbReadinessScore = {
  id?: string;
  user_id?: string;
  date: string;
  value: number;
  category: 'high' | 'moderate' | 'low';
  recovery_index?: number;
  freshness?: number;
  sleep?: number;
  hrv?: number;
  fatigue?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  fatigue_level?: number;
  hrv_value?: number;
  hrv_baseline?: number;
  source?: string;
  message?: string;
  created_at?: string;
  updated_at?: string;
};

export async function saveRaceSimulation(simulation: DbRaceSimulation): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbSim = { ...simulation, user_id: userId };
  const { error } = await supabase.from('race_simulations').insert([dbSim]);

  if (error) {
    console.error('Failed to save race simulation:', error);
    return false;
  }

  return true;
}

export async function getRaceSimulations(limit = 10): Promise<DbRaceSimulation[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('race_simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch race simulations:', error);
    return [];
  }

  return data || [];
}

export async function saveReadinessScore(score: DbReadinessScore): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbScore = { ...score, user_id: userId };
  const { error } = await supabase.from('readiness_scores').upsert([dbScore], {
    onConflict: 'user_id,date',
  });

  if (error) {
    console.error('Failed to save readiness score:', error);
    return false;
  }

  return true;
}

export async function getReadinessScoreByDate(date: string): Promise<DbReadinessScore | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('readiness_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch readiness score:', error);
    return null;
  }

  return data;
}

export async function getReadinessHistory(days = 7): Promise<DbReadinessScore[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('readiness_scores')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to fetch readiness history:', error);
    return [];
  }

  return data || [];
}

export type DbEvent = {
  id?: string;
  user_id?: string;
  name: string;
  type: 'street' | 'trail' | 'other';
  date: string;
  distance_km?: number;
  expected_time?: string;
  elevation_gain?: number;
  location?: string;
  priority?: 'A' | 'B' | 'C';
  notes?: string;
  goal?: string;
  gpx_file_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbTravelLocation = {
  id?: string;
  user_id?: string;
  location: string;
  start_date: string;
  end_date: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
};

export type DbLocationHistory = {
  id?: string;
  user_id?: string;
  latitude: number;
  longitude: number;
  country?: string;
  city?: string;
  climate_data?: {
    temp: number;
    humidity: number;
    elevation: number;
  };
  detected_at?: string;
};

export type DbPlanAdjustment = {
  id?: string;
  user_id?: string;
  adjustment_date: string;
  reason: string;
  climate_stress_factor?: number;
  modifications?: Record<string, any>;
  created_at?: string;
};

export async function getEvents(limit = 50): Promise<DbEvent[]> {
  return getCachedRequest(`events-${limit}`, async () => {
    const supabase = getSupabase();
    if (!supabase) {
      console.log('No Supabase, loading from localStorage');
      const localEvents = load<DbEvent[]>('calendar:events', []);
      console.log('Loaded events from localStorage:', localEvents);
      return localEvents;
    }

    const userId = await getCurrentUserId();
    console.log('Getting events for user:', userId);

    if (!userId) {
      console.log('No user ID, loading from localStorage');
      const localEvents = load<DbEvent[]>('calendar:events', []);
      console.log('Loaded events from localStorage:', localEvents);
      return localEvents;
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch events from Supabase:', error);
      console.log('Falling back to localStorage');
      const localEvents = load<DbEvent[]>('calendar:events', []);
      console.log('Loaded events from localStorage:', localEvents);
      return localEvents;
    }

    console.log('Loaded events from Supabase:', data);

    // Always merge with localStorage events
    const localEvents = load<DbEvent[]>('calendar:events', []);
    console.log('Checking localStorage for events:', localEvents);

    if (localEvents.length > 0) {
      console.log('Found localStorage events to merge:', localEvents);
      // Add local events that aren't in Supabase yet
      const mergedEvents = [...(data || []), ...localEvents];
      // Remove duplicates by id
      const uniqueEvents = mergedEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );
      console.log('Merged events (final):', uniqueEvents);
      return uniqueEvents;
    }

    console.log('No localStorage events found, returning Supabase data only');
    return data || [];
  });
}

export async function saveEvent(event: DbEvent): Promise<boolean | string> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not available, saving to localStorage');
    const events = load<DbEvent[]>('calendar:events', []);
    const newId = Math.random().toString(36).slice(2);
    events.push({ ...event, id: newId });
    save('calendar:events', events);
    return newId;
  }

  const userId = await getCurrentUserId();
  console.log('Current user ID:', userId);

  if (!userId) {
    console.warn('No user ID, saving to localStorage');
    const events = load<DbEvent[]>('calendar:events', []);
    // Generate a proper UUID for localStorage fallback
    const newId = crypto.randomUUID();
    events.push({ ...event, id: newId });
    save('calendar:events', events);
    return newId;
  }

  const dbEvent = { ...event, user_id: userId };
  console.log('Attempting to save event to Supabase:', dbEvent);

  const { data, error } = await supabase.from('events').insert([dbEvent]).select();

  if (error) {
    console.error('Failed to save event to Supabase:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);

    console.warn('Falling back to localStorage');
    const events = load<DbEvent[]>('calendar:events', []);
    // Generate a proper UUID for localStorage fallback
    const newId = crypto.randomUUID();
    events.push({ ...event, id: newId });
    save('calendar:events', events);
    return newId;
  }

  console.log('Event saved successfully to Supabase:', data);
  return data && data[0] ? data[0].id : true;
}

export async function updateEvent(id: string, event: Partial<DbEvent>): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('No Supabase, updating in localStorage');
    const events = load<DbEvent[]>('calendar:events', []);
    const index = events.findIndex(e => e.id === id);
    if (index >= 0) {
      events[index] = { ...events[index], ...event };
      save('calendar:events', events);
      console.log('Event updated in localStorage:', events[index]);
    }
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('No user ID for update');
    return false;
  }

  console.log('Updating event in Supabase:', id, event);
  const { error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update event:', error);
    console.error('Error details:', error.code, error.message);

    // Fallback to localStorage
    const events = load<DbEvent[]>('calendar:events', []);
    const index = events.findIndex(e => e.id === id);
    if (index >= 0) {
      events[index] = { ...events[index], ...event };
      save('calendar:events', events);
      console.log('Event updated in localStorage fallback:', events[index]);
    }
    return true;
  }

  console.log('Event updated successfully in Supabase');
  return true;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('No Supabase, deleting from localStorage');
    const events = load<DbEvent[]>('calendar:events', []);
    const filtered = events.filter(e => e.id !== id);
    save('calendar:events', filtered);
    console.log('Event deleted from localStorage');
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('No user ID for delete');
    return false;
  }

  console.log('Deleting event from Supabase:', id);
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete event:', error);
    console.error('Error details:', error.code, error.message);

    // Fallback to localStorage
    const events = load<DbEvent[]>('calendar:events', []);
    const filtered = events.filter(e => e.id !== id);
    save('calendar:events', filtered);
    console.log('Event deleted from localStorage fallback');
    return true;
  }

  console.log('Event deleted successfully from Supabase');
  return true;
}

export async function getTravelLocations(): Promise<DbTravelLocation[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return load<DbTravelLocation[]>('calendar:travel', []);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return load<DbTravelLocation[]>('calendar:travel', []);
  }

  const { data, error } = await supabase
    .from('travel_locations')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch travel locations:', error);
    return load<DbTravelLocation[]>('calendar:travel', []);
  }

  return data || [];
}

export async function saveTravelLocation(travel: DbTravelLocation): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const travels = load<DbTravelLocation[]>('calendar:travel', []);
    travels.push({ ...travel, id: Math.random().toString(36).slice(2) });
    save('calendar:travel', travels);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const travels = load<DbTravelLocation[]>('calendar:travel', []);
    travels.push({ ...travel, id: Math.random().toString(36).slice(2) });
    save('calendar:travel', travels);
    return true;
  }

  const dbTravel = { ...travel, user_id: userId };
  const { error } = await supabase.from('travel_locations').insert([dbTravel]);

  if (error) {
    console.error('Failed to save travel location:', error);
    return false;
  }

  return true;
}

export async function deleteTravelLocation(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const travels = load<DbTravelLocation[]>('calendar:travel', []);
    const filtered = travels.filter(t => t.id !== id);
    save('calendar:travel', filtered);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('travel_locations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete travel location:', error);
    return false;
  }

  return true;
}

export async function saveLocationHistory(location: DbLocationHistory): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbLocation = { ...location, user_id: userId };
  const { error } = await supabase.from('location_history').insert([dbLocation]);

  if (error) {
    console.error('Failed to save location history:', error);
    return false;
  }

  return true;
}

export async function getRecentLocation(): Promise<DbLocationHistory | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('location_history')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch recent location:', error);
    return null;
  }

  return data;
}

export async function savePlanAdjustment(adjustment: DbPlanAdjustment): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbAdjustment = { ...adjustment, user_id: userId };
  const { error } = await supabase.from('plan_adjustments').insert([dbAdjustment]);

  if (error) {
    console.error('Failed to save plan adjustment:', error);
    return false;
  }

  return true;
}

export type DbWhatIfScenario = {
  id?: string;
  user_id?: string;
  race_id: string;
  name: string;
  temperature?: number;
  humidity?: number;
  elevation?: number;
  readiness?: number;
  surface?: 'road' | 'trail' | 'mixed';
  start_strategy?: 'conservative' | 'target' | 'aggressive';
  fueling_rate?: number;
  fluid_intake?: number;
  sodium_intake?: number;
  hydration_pct?: number;
  gi_risk_pct?: number;
  performance_penalty_pct?: number;
  predicted_time_min: number;
  pacing_mode?: 'manual' | 'auto' | 'none';
  pacing_segments?: any;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export async function saveWhatIfScenario(scenario: DbWhatIfScenario): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbScenario = { ...scenario, user_id: userId };
  const { error } = await supabase.from('whatif_scenarios').insert([dbScenario]);

  if (error) {
    console.error('Failed to save what-if scenario:', error);
    return false;
  }

  return true;
}

export async function getWhatIfScenarios(raceId: string): Promise<DbWhatIfScenario[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('whatif_scenarios')
    .select('*')
    .eq('user_id', userId)
    .eq('race_id', raceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch what-if scenarios:', error);
    return [];
  }

  return data || [];
}

export async function deleteWhatIfScenario(scenarioId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('whatif_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete what-if scenario:', error);
    return false;
  }

  return true;
}

export type DbPacingStrategy = {
  id?: string;
  user_id?: string;
  race_id: string;
  name: string;
  mode: 'manual' | 'auto';
  segments: {
    distanceKm: number;
    targetPace: number;
    targetHR?: number;
    notes?: string;
  }[];
  created_at?: string;
  updated_at?: string;
};

export async function savePacingStrategy(strategy: DbPacingStrategy): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const strategies = load<DbPacingStrategy[]>('pacing:strategies', []);
    const existing = strategies.findIndex(s => s.race_id === strategy.race_id);
    if (existing >= 0) {
      strategies[existing] = { ...strategy, updated_at: new Date().toISOString() };
    } else {
      strategies.push({ ...strategy, id: Math.random().toString(36).slice(2), created_at: new Date().toISOString() });
    }
    save('pacing:strategies', strategies);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const strategies = load<DbPacingStrategy[]>('pacing:strategies', []);
    const existing = strategies.findIndex(s => s.race_id === strategy.race_id);
    if (existing >= 0) {
      strategies[existing] = { ...strategy, updated_at: new Date().toISOString() };
    } else {
      strategies.push({ ...strategy, id: Math.random().toString(36).slice(2), created_at: new Date().toISOString() });
    }
    save('pacing:strategies', strategies);
    return true;
  }

  const dbStrategy = {
    ...strategy,
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('pacing_strategies').upsert([dbStrategy], {
    onConflict: 'user_id,race_id',
  });

  if (error) {
    console.error('Failed to save pacing strategy:', error);
    return false;
  }

  return true;
}

export async function getPacingStrategy(raceId: string): Promise<DbPacingStrategy | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const strategies = load<DbPacingStrategy[]>('pacing:strategies', []);
    return strategies.find(s => s.race_id === raceId) || null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const strategies = load<DbPacingStrategy[]>('pacing:strategies', []);
    return strategies.find(s => s.race_id === raceId) || null;
  }

  const { data, error } = await supabase
    .from('pacing_strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('race_id', raceId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch pacing strategy:', error);
    return null;
  }

  return data;
}

export async function deletePacingStrategy(raceId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const strategies = load<DbPacingStrategy[]>('pacing:strategies', []);
    const filtered = strategies.filter(s => s.race_id !== raceId);
    save('pacing:strategies', filtered);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('pacing_strategies')
    .delete()
    .eq('user_id', userId)
    .eq('race_id', raceId);

  if (error) {
    console.error('Failed to delete pacing strategy:', error);
    return false;
  }

  return true;
}

import type { RacePlan } from '@/types/racePlan';

export function racePlanToDbScenario(plan: RacePlan): DbWhatIfScenario {
  return {
    id: plan.id,
    race_id: plan.raceId,
    name: plan.name,
    temperature: plan.conditions.temperature,
    humidity: plan.conditions.humidity,
    elevation: plan.conditions.elevation,
    readiness: plan.conditions.readiness,
    surface: plan.conditions.surface,
    start_strategy: plan.conditions.startStrategy,
    fueling_rate: plan.nutrition.fuelingRate,
    fluid_intake: plan.nutrition.fluidIntake,
    sodium_intake: plan.nutrition.sodiumIntake,
    pacing_mode: plan.pacing.mode,
    pacing_segments: plan.pacing.segments,
    predicted_time_min: plan.simulation?.predictedTimeMin ?? 0,
    hydration_pct: plan.simulation?.physiological?.hydration.hydrationPct,
    gi_risk_pct: plan.simulation?.physiological?.giRisk.riskPct,
    performance_penalty_pct: plan.simulation?.physiological?.performanceImpact.totalPenaltyPct,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}

export function dbScenarioToRacePlan(scenario: DbWhatIfScenario): RacePlan {
  return {
    id: scenario.id,
    raceId: scenario.race_id,
    name: scenario.name,
    conditions: {
      temperature: scenario.temperature,
      humidity: scenario.humidity,
      elevation: scenario.elevation,
      readiness: scenario.readiness,
      surface: scenario.surface,
      startStrategy: scenario.start_strategy,
    },
    nutrition: {
      fuelingRate: scenario.fueling_rate ?? 60,
      fluidIntake: scenario.fluid_intake ?? 600,
      sodiumIntake: scenario.sodium_intake ?? 800,
    },
    pacing: {
      mode: scenario.pacing_mode ?? 'none',
      segments: Array.isArray(scenario.pacing_segments) ? scenario.pacing_segments : [],
    },
    simulation: scenario.predicted_time_min ? {
      predictedTimeMin: scenario.predicted_time_min,
      avgPace: 0,
      factors: {
        terrain: 1,
        elevation: 1,
        climate: 1,
        fatigue: 1,
      },
    } : undefined,
    createdAt: scenario.created_at,
    updatedAt: scenario.updated_at,
  };
}

export async function saveRacePlan(plan: RacePlan): Promise<{ success: boolean; id?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false };

  const userId = await getCurrentUserId();
  if (!userId) return { success: false };

  const dbScenario = racePlanToDbScenario(plan);
  const scenarioToSave = {
    ...dbScenario,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (plan.id) {
    const { error } = await supabase
      .from('whatif_scenarios')
      .update(scenarioToSave)
      .eq('id', plan.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update race plan:', error);
      return { success: false };
    }

    return { success: true, id: plan.id };
  } else {
    const { data, error } = await supabase
      .from('whatif_scenarios')
      .insert([scenarioToSave])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save race plan:', error);
      return { success: false };
    }

    return { success: true, id: data?.id };
  }
}

export async function getRacePlan(raceId: string, planId?: string): Promise<RacePlan | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  if (planId) {
    const { data, error } = await supabase
      .from('whatif_scenarios')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch race plan:', error);
      return null;
    }

    return data ? dbScenarioToRacePlan(data) : null;
  }

  const { data, error } = await supabase
    .from('whatif_scenarios')
    .select('*')
    .eq('user_id', userId)
    .eq('race_id', raceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch race plan:', error);
    return null;
  }

  return data ? dbScenarioToRacePlan(data) : null;
}

export async function getRacePlans(raceId: string): Promise<RacePlan[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('whatif_scenarios')
    .select('*')
    .eq('user_id', userId)
    .eq('race_id', raceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch race plans:', error);
    return [];
  }

  return (data || []).map(dbScenarioToRacePlan);
}

export async function deleteRacePlan(planId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('whatif_scenarios')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete race plan:', error);
    return false;
  }

  return true;
}

export type DbAthleteLearningState = {
  id?: string;
  user_id?: string;
  baseline_hr: number;
  baseline_pace: number;
  baseline_efficiency: number;
  acwr_mean: number;
  acwr_std_dev: number;
  efficiency_trend_slope: number;
  fatigue_threshold: number;
  hr_drift_baseline: number;
  cadence_stability: number;
  injury_risk_factors?: Record<string, any>;
  computation_metadata?: Record<string, any>;
  last_computed_at?: string;
  data_quality_score: number;
  created_at?: string;
  updated_at?: string;
};

export type DbDerivedMetricWeekly = {
  id?: string;
  user_id?: string;
  week_start_date: string;
  total_distance_km: number;
  total_duration_min: number;
  avg_hr?: number;
  avg_pace?: number;
  long_run_km: number;
  acute_load: number;
  chronic_load?: number;
  acwr?: number;
  efficiency_score?: number;
  fatigue_index?: number;
  hr_drift_pct?: number;
  cadence_avg?: number;
  monotony?: number;
  strain?: number;
  elevation_gain_m: number;
  run_count: number;
  quality_sessions: number;
  metadata?: Record<string, any>;
  created_at?: string;
};

export type DbMetricComputationLog = {
  id?: string;
  user_id?: string;
  computation_type: 'baseline' | 'weekly' | 'full_recompute';
  status: 'success' | 'partial' | 'failed';
  records_processed: number;
  computation_duration_ms?: number;
  error_message?: string;
  triggered_by: 'scheduled' | 'manual' | 'auto';
  created_at?: string;
};

export async function getAthleteLearningState(): Promise<DbAthleteLearningState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('athlete_learning_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch athlete learning state:', error);
    return null;
  }

  return data;
}

export async function saveAthleteLearningState(state: DbAthleteLearningState): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbState = {
    ...state,
    user_id: userId,
    last_computed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('athlete_learning_state').upsert([dbState], {
    onConflict: 'user_id',
  });

  if (error) {
    console.error('Failed to save athlete learning state:', error);
    return false;
  }

  return true;
}

export async function getDerivedMetricsWeekly(
  startDate: string,
  endDate: string
): Promise<DbDerivedMetricWeekly[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('derived_metrics_weekly')
    .select('*')
    .eq('user_id', userId)
    .gte('week_start_date', startDate)
    .lte('week_start_date', endDate)
    .order('week_start_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch derived metrics weekly:', error);
    return [];
  }

  return data || [];
}

export async function saveDerivedMetricsWeekly(
  metrics: DbDerivedMetricWeekly[]
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbMetrics = metrics.map(m => ({
    ...m,
    user_id: userId,
  }));

  // Batch upserts with very small batches due to RLS overhead
  const BATCH_SIZE = 5;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < dbMetrics.length; i += BATCH_SIZE) {
    const batch = dbMetrics.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('derived_metrics_weekly').upsert(batch, {
      onConflict: 'user_id,week_start_date',
    });

    if (error) {
      console.error(`Failed to save derived metrics weekly (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error);
      errorCount++;
      // Continue processing remaining batches instead of failing completely
      continue;
    }
    successCount += batch.length;
    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`[saveDerivedMetricsWeekly] Progress: ${successCount}/${dbMetrics.length} records saved`);
    }
  }

  console.log(`[saveDerivedMetricsWeekly] Complete: ${successCount} saved, ${errorCount} batches failed`);
  return errorCount === 0;
}

export async function logMetricComputation(log: DbMetricComputationLog): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const dbLog = {
    ...log,
    user_id: userId,
  };

  const { error } = await supabase.from('metric_computation_log').insert([dbLog]);

  if (error) {
    console.error('Failed to log metric computation:', error);
    return false;
  }

  return true;
}

export async function getRecentComputationLogs(limit = 10): Promise<DbMetricComputationLog[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('metric_computation_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch computation logs:', error);
    return [];
  }

  return data || [];
}

export type DbPerformanceModel = {
  id?: string;
  user_id?: string;
  baseline_id: string | null;
  baseline_type: 'real' | 'derived';
  baseline_distance_km: number | null;
  baseline_time_min: number | null;
  baseline_date: string | null;
  performance_decay: number;
  calibration_count: number;
  last_calibration_date: string | null;
  confidence_score: number;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

export type DbPerformanceCalibration = {
  id?: string;
  user_id?: string;
  performance_model_id: string;
  race_id: string;
  race_name: string;
  race_distance_km: number;
  predicted_time_min: number;
  actual_time_min: number;
  time_delta_min: number;
  old_decay: number;
  new_decay: number;
  decay_delta: number;
  improvement_pct: number;
  calibration_quality: number;
  notes?: string;
  created_at?: string;
};

export async function getPerformanceModel(): Promise<DbPerformanceModel | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return load<DbPerformanceModel | null>('performance:model', null);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return load<DbPerformanceModel | null>('performance:model', null);
  }

  const { data, error } = await supabase
    .from('performance_models')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch performance model:', error);
    return load<DbPerformanceModel | null>('performance:model', null);
  }

  if (data) {
    save('performance:model', data);
  }

  return data;
}

export async function savePerformanceModel(model: DbPerformanceModel): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    save('performance:model', model);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    save('performance:model', model);
    return true;
  }

  const existing = await getPerformanceModel();

  const dbModel = {
    user_id: userId,
    baseline_id: model.baseline_id,
    baseline_type: model.baseline_type,
    baseline_distance_km: model.baseline_distance_km,
    baseline_time_min: model.baseline_time_min,
    baseline_date: model.baseline_date,
    performance_decay: model.performance_decay,
    calibration_count: model.calibration_count,
    last_calibration_date: model.last_calibration_date,
    confidence_score: model.confidence_score,
    metadata: model.metadata,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('performance_models')
      .update(dbModel)
      .eq('id', existing.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update performance model:', error);
      save('performance:model', model);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('performance_models')
      .insert([dbModel]);

    if (error) {
      console.error('Failed to insert performance model:', error);
      save('performance:model', model);
      return false;
    }
  }

  save('performance:model', model);
  return true;
}

export async function savePerformanceCalibration(
  calibration: DbPerformanceCalibration
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const calibrations = load<DbPerformanceCalibration[]>('performance:calibrations', []);
    calibrations.push({ ...calibration, id: Math.random().toString(36).slice(2) });
    save('performance:calibrations', calibrations);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const calibrations = load<DbPerformanceCalibration[]>('performance:calibrations', []);
    calibrations.push({ ...calibration, id: Math.random().toString(36).slice(2) });
    save('performance:calibrations', calibrations);
    return true;
  }

  const dbCalibration = {
    user_id: userId,
    performance_model_id: calibration.performance_model_id,
    race_id: calibration.race_id,
    race_name: calibration.race_name,
    race_distance_km: calibration.race_distance_km,
    predicted_time_min: calibration.predicted_time_min,
    actual_time_min: calibration.actual_time_min,
    time_delta_min: calibration.time_delta_min,
    old_decay: calibration.old_decay,
    new_decay: calibration.new_decay,
    decay_delta: calibration.decay_delta,
    improvement_pct: calibration.improvement_pct,
    calibration_quality: calibration.calibration_quality,
    notes: calibration.notes,
  };

  const { error } = await supabase
    .from('performance_calibrations')
    .insert([dbCalibration]);

  if (error) {
    console.error('Failed to save performance calibration:', error);
    const calibrations = load<DbPerformanceCalibration[]>('performance:calibrations', []);
    calibrations.push({ ...calibration, id: Math.random().toString(36).slice(2) });
    save('performance:calibrations', calibrations);
    return false;
  }

  return true;
}

export async function getPerformanceCalibrations(
  limit = 20
): Promise<DbPerformanceCalibration[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return load<DbPerformanceCalibration[]>('performance:calibrations', []);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return load<DbPerformanceCalibration[]>('performance:calibrations', []);
  }

  const { data, error } = await supabase
    .from('performance_calibrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch performance calibrations:', error);
    return load<DbPerformanceCalibration[]>('performance:calibrations', []);
  }

  if (data && data.length > 0) {
    save('performance:calibrations', data);
  }

  return data || [];
}

export type DbSavedRoute = {
  id?: string;
  user_id?: string;
  name: string;
  distance_km: number;
  elevation_gain_m?: number;
  surface_type?: 'road' | 'trail' | 'mixed';
  polyline?: string;
  summary_polyline?: string;
  scenic_score?: number;
  popularity_score?: number;
  strava_segment_id?: string;
  start_lat?: number;
  start_lon?: number;
  end_lat?: number;
  end_lon?: number;
  is_public?: boolean;
  shared_by?: string;
  shared_at?: string;
  reported?: boolean;
  report_count?: number;
  star_count?: number;
  tags?: string[];
  source?: 'manual' | 'strava' | 'imported';
  created_at?: string;
  updated_at?: string;
};

export async function getSavedRoutes(limit = 100, locationFilter?: { lat: number; lon: number; radiusKm?: number }): Promise<DbSavedRoute[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return load<DbSavedRoute[]>('routes:saved', []);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return load<DbSavedRoute[]>('routes:saved', []);
  }

  let query = supabase
    .from('saved_routes')
    .select('*')
    .eq('user_id', userId);

  if (locationFilter) {
    const radiusKm = locationFilter.radiusKm || 50;
    const latRange = radiusKm / 111;
    const lonRange = radiusKm / (111 * Math.cos(locationFilter.lat * Math.PI / 180));

    const bounds = {
      minLat: locationFilter.lat - latRange,
      maxLat: locationFilter.lat + latRange,
      minLon: locationFilter.lon - lonRange,
      maxLon: locationFilter.lon + lonRange,
    };

    console.log('DB: Filtering routes with bounds:', bounds);

    query = query
      .gte('start_lat', bounds.minLat)
      .lte('start_lat', bounds.maxLat)
      .gte('start_lon', bounds.minLon)
      .lte('start_lon', bounds.maxLon);
  }

  const { data, error} = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch saved routes:', error);
    return load<DbSavedRoute[]>('routes:saved', []);
  }

  if (data && data.length > 0) {
    save('routes:saved', data);
  }

  return data || [];
}

export async function saveSavedRoute(route: DbSavedRoute): Promise<{ success: boolean; id?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    const routes = load<DbSavedRoute[]>('routes:saved', []);
    const newRoute = { ...route, id: Math.random().toString(36).slice(2) };
    routes.push(newRoute);
    save('routes:saved', routes);
    return { success: true, id: newRoute.id };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const routes = load<DbSavedRoute[]>('routes:saved', []);
    const newRoute = { ...route, id: Math.random().toString(36).slice(2) };
    routes.push(newRoute);
    save('routes:saved', routes);
    return { success: true, id: newRoute.id };
  }

  const dbRoute = {
    ...route,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (route.id) {
    const { error } = await supabase
      .from('saved_routes')
      .update(dbRoute)
      .eq('id', route.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update route:', error);
      return { success: false };
    }

    return { success: true, id: route.id };
  } else {
    const { data, error } = await supabase
      .from('saved_routes')
      .insert([dbRoute])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save route:', error);
      return { success: false };
    }

    return { success: true, id: data?.id };
  }
}

export async function deleteSavedRoute(routeId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const routes = load<DbSavedRoute[]>('routes:saved', []);
    const filtered = routes.filter(r => r.id !== routeId);
    save('routes:saved', filtered);
    return true;
  }

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('saved_routes')
    .delete()
    .eq('id', routeId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete route:', error);
    return false;
  }

  return true;
}

export async function getTrainingGoalState() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('training_goal_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch training goal state:', error);
    return null;
  }

  return data;
}

export async function getTaperTemplates() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('taper_templates')
    .select('*')
    .or(`user_id.eq.${userId},is_system_template.eq.true`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch taper templates:', error);
    return [];
  }

  return data || [];
}

export async function getRaceFeedback(raceId?: string, limit = 20) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  let query = supabase
    .from('race_feedback')
    .select('*')
    .eq('user_id', userId);

  if (raceId) {
    query = query.eq('race_id', raceId);
  }

  const { data, error } = await query
    .order('race_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch race feedback:', error);
    return [];
  }

  return data || [];
}

export async function getTaperAdjustmentLog(limit = 20) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('taper_adjustments_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch taper adjustment log:', error);
    return [];
  }

  return data || [];
}
