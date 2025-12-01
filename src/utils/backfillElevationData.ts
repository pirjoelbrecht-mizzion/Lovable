/**
 * Backfill Elevation Data from Strava
 *
 * This utility fetches elevation data for existing activities from Strava API
 * and updates the log_entries table with elevation_gain values.
 */

import { getSupabase, getCurrentUserId } from '@/lib/supabase';

interface StravaActivity {
  id: number;
  total_elevation_gain: number;
  elev_high?: number;
  elev_low?: number;
  start_latlng?: [number, number];
}

async function refreshStravaToken(userId: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
      client_secret: import.meta.env.VITE_STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Strava token');
  }

  const data = await response.json();

  const supabase = getSupabase();
  if (supabase) {
    await supabase
      .from('wearable_connections')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'strava');
  }

  return data.access_token;
}

export async function backfillElevationData(): Promise<{ updated: number; errors: number }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  console.log('[ElevationBackfill] Starting elevation data backfill...');

  // 1. Get Strava connection
  const { data: connection } = await supabase
    .from('wearable_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .maybeSingle();

  if (!connection?.access_token) {
    throw new Error('Strava not connected. Please connect Strava first.');
  }

  let accessToken = connection.access_token;

  // 2. Refresh token if expired
  if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
    console.log('[ElevationBackfill] Access token expired, refreshing...');
    accessToken = await refreshStravaToken(userId, connection.refresh_token);
  }

  // 3. Get all Strava activities without elevation data
  const { data: activities } = await supabase
    .from('log_entries')
    .select('id, external_id, date, title')
    .eq('user_id', userId)
    .eq('data_source', 'strava')
    .not('external_id', 'is', null)
    .is('elevation_gain', null) // Only get activities missing elevation
    .order('date', { ascending: false });

  if (!activities || activities.length === 0) {
    console.log('[ElevationBackfill] No activities found needing elevation data');
    return { updated: 0, errors: 0 };
  }

  console.log(`[ElevationBackfill] Found ${activities.length} activities to backfill`);

  let updated = 0;
  let errors = 0;

  // 4. Process in batches to avoid rate limits
  const BATCH_SIZE = 100;
  const RATE_LIMIT_DELAY = 1000; // 1 second between batches

  for (let i = 0; i < activities.length; i += BATCH_SIZE) {
    const batch = activities.slice(i, i + BATCH_SIZE);
    console.log(`[ElevationBackfill] Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(activities.length / BATCH_SIZE)}`);

    for (const activity of batch) {
      try {
        // Fetch detailed activity from Strava
        const response = await fetch(
          `https://www.strava.com/api/v3/activities/${activity.external_id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.log('[ElevationBackfill] Token expired mid-batch, refreshing...');
            accessToken = await refreshStravaToken(userId, connection.refresh_token);
            continue; // Retry this activity
          }
          console.warn(`[ElevationBackfill] Failed to fetch activity ${activity.external_id}: ${response.status}`);
          errors++;
          continue;
        }

        const stravaActivity: StravaActivity = await response.json();

        // Update database with elevation data
        const { error: updateError } = await supabase
          .from('log_entries')
          .update({
            elevation_gain: stravaActivity.total_elevation_gain || 0,
          })
          .eq('id', activity.id);

        if (updateError) {
          console.error(`[ElevationBackfill] Failed to update activity ${activity.id}:`, updateError);
          errors++;
        } else {
          updated++;
          if (updated % 50 === 0) {
            console.log(`[ElevationBackfill] Progress: ${updated}/${activities.length} activities updated`);
          }
        }

        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error: any) {
        console.error(`[ElevationBackfill] Error processing activity ${activity.id}:`, error);
        errors++;
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < activities.length) {
      console.log(`[ElevationBackfill] Waiting ${RATE_LIMIT_DELAY}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  console.log(`[ElevationBackfill] ✅ Backfill complete: ${updated} updated, ${errors} errors`);

  // 5. Trigger recalculation of weekly metrics
  if (updated > 0) {
    console.log('[ElevationBackfill] Triggering metrics recalculation...');
    const { autoCalculationService } = await import('@/services/autoCalculationService');
    await autoCalculationService.scheduleFullRecalculation('Elevation data backfilled');
  }

  return { updated, errors };
}

/**
 * Estimate elevation gain from distance and terrain type
 * Used as fallback when Strava data is unavailable
 */
export function estimateElevationGain(distanceKm: number, surface: string = 'trail'): number {
  // Average elevation gain per km by surface type
  const elevationRates: Record<string, number> = {
    trail: 80,      // 80m gain per km (hilly trail)
    mountain: 120,  // 120m gain per km (mountain trail)
    road: 20,       // 20m gain per km (rolling road)
    flat: 5,        // 5m gain per km (flat)
  };

  const rate = elevationRates[surface] || elevationRates.trail;
  return Math.round(distanceKm * rate);
}

/**
 * Backfill elevation using estimation for activities without Strava data
 */
export async function backfillElevationEstimates(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const userId = await getCurrentUserId();
  if (!userId) return 0;

  // Get user's preferred surface
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('surface')
    .eq('user_id', userId)
    .maybeSingle();

  const surface = profile?.surface || 'trail';

  // Get activities without elevation data and not from Strava
  const { data: activities } = await supabase
    .from('log_entries')
    .select('id, km')
    .eq('user_id', userId)
    .is('elevation_gain', null)
    .neq('data_source', 'strava');

  if (!activities || activities.length === 0) {
    return 0;
  }

  console.log(`[ElevationEstimate] Estimating elevation for ${activities.length} activities`);

  let updated = 0;

  for (const activity of activities) {
    const estimatedElevation = estimateElevationGain(activity.km, surface);

    const { error } = await supabase
      .from('log_entries')
      .update({ elevation_gain: estimatedElevation })
      .eq('id', activity.id);

    if (!error) {
      updated++;
    }
  }

  console.log(`[ElevationEstimate] ✅ Estimated elevation for ${updated} activities`);

  return updated;
}
