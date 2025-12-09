/**
 * Backfill Activity Streams
 * Fetches GPS and sensor streams for existing activities that don't have them yet
 */

import { supabase } from '../lib/supabase';
import { stravaRichDataService } from '../services/stravaRichDataService';

export interface BackfillResult {
  total: number;
  fetched: number;
  skipped: number;
  failed: number;
  errors: Array<{ activityId: string; error: string }>;
}

/**
 * Backfill GPS streams for all Strava activities that don't have them yet
 */
export async function backfillActivityStreams(
  onProgress?: (current: number, total: number, activity: string) => void
): Promise<BackfillResult> {
  const result: BackfillResult = {
    total: 0,
    fetched: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get Strava access token from wearable_connections
    const { data: credentials } = await supabase
      .from('wearable_connections')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    if (!credentials?.access_token) {
      throw new Error('Strava not connected. Please connect Strava first in Settings → Devices.');
    }

    // Get all Strava activities that don't have streams yet
    const { data: activities, error: activitiesError } = await supabase
      .from('log_entries')
      .select('id, external_id, title')
      .eq('user_id', user.id)
      .eq('source', 'strava')
      .not('external_id', 'is', null)
      .order('date', { ascending: false });

    if (activitiesError) {
      throw activitiesError;
    }

    if (!activities || activities.length === 0) {
      console.log('No Strava activities found');
      return result;
    }

    result.total = activities.length;

    // Process each activity
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      if (onProgress) {
        onProgress(i + 1, result.total, activity.title || 'Untitled');
      }

      try {
        // Check if this activity already has GPS streams
        const { data: existingStreams } = await supabase
          .from('activity_streams')
          .select('stream_type')
          .eq('log_entry_id', activity.id)
          .eq('stream_type', 'latlng')
          .maybeSingle();

        if (existingStreams) {
          console.log(`Skipping ${activity.title} - already has GPS streams`);
          result.skipped++;
          continue;
        }

        // Fetch and store streams
        console.log(`Fetching streams for: ${activity.title}`);
        await stravaRichDataService.fetchAndStoreActivityStreams(
          activity.external_id!,
          activity.id,
          credentials.access_token
        );

        result.fetched++;

        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`Failed to fetch streams for ${activity.title}:`, error);
        result.failed++;
        result.errors.push({
          activityId: activity.id,
          error: error.message || 'Unknown error'
        });
      }
    }

    console.log(`Backfill complete:`, result);
    return result;

  } catch (error: any) {
    console.error('Backfill failed:', error);
    throw error;
  }
}

/**
 * Backfill GPS streams for a single activity
 */
export async function backfillSingleActivity(logEntryId: string): Promise<boolean> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get activity details
    const { data: activity, error: activityError } = await supabase
      .from('log_entries')
      .select('id, external_id, title, source')
      .eq('id', logEntryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (activityError || !activity) {
      throw new Error('Activity not found');
    }

    if (activity.source !== 'strava' || !activity.external_id) {
      throw new Error('Only Strava activities can have streams fetched');
    }

    // Get Strava access token
    const { data: credentials } = await supabase
      .from('oauth_credentials')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    if (!credentials?.access_token) {
      throw new Error('Strava not connected');
    }

    // Fetch and store streams
    console.log(`Fetching streams for: ${activity.title}`);
    await stravaRichDataService.fetchAndStoreActivityStreams(
      activity.external_id,
      activity.id,
      credentials.access_token
    );

    console.log(`Successfully fetched streams for ${activity.title}`);
    return true;

  } catch (error: any) {
    console.error('Failed to fetch streams:', error);
    throw error;
  }
}
