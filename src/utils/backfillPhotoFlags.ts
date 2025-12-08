/**
 * Backfill hasPhotos and hasSegments flags for existing Strava activities
 * Run this once to update all existing activities with the correct flags
 */

import { supabase } from '@/lib/supabase';

export async function backfillPhotoFlags(): Promise<{
  updated: number;
  errors: number;
}> {
  console.log('[Backfill] Starting photo/segment flags backfill...');

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Backfill] No authenticated user');
      return { updated: 0, errors: 1 };
    }

    // Get Strava access token
    const { data: credentials } = await supabase
      .from('oauth_credentials')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    if (!credentials?.access_token) {
      console.error('[Backfill] No Strava credentials found');
      return { updated: 0, errors: 1 };
    }

    // Get all activities with external_id (Strava activities)
    const { data: activities, error } = await supabase
      .from('log_entries')
      .select('id, external_id, title')
      .eq('user_id', user.id)
      .eq('source', 'Strava')
      .not('external_id', 'is', null);

    if (error) {
      console.error('[Backfill] Error fetching activities:', error);
      return { updated: 0, errors: 1 };
    }

    if (!activities || activities.length === 0) {
      console.log('[Backfill] No Strava activities to backfill');
      return { updated: 0, errors: 0 };
    }

    console.log(`[Backfill] Found ${activities.length} Strava activities to check`);

    let updated = 0;
    let errors = 0;

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (activity) => {
          try {
            // Fetch detailed activity from Strava to get photo count
            const response = await fetch(
              `https://www.strava.com/api/v3/activities/${activity.external_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${credentials.access_token}`
                }
              }
            );

            if (!response.ok) {
              console.warn(`[Backfill] Failed to fetch activity ${activity.external_id}: ${response.status}`);
              errors++;
              return;
            }

            const data = await response.json();
            const hasPhotos = (data.total_photo_count || 0) > 0;
            const hasSegments = (data.segment_efforts?.length || 0) > 0;

            // Update the activity in database
            const { error: updateError } = await supabase
              .from('log_entries')
              .update({
                has_photos: hasPhotos,
                has_segments: hasSegments
              })
              .eq('id', activity.id);

            if (updateError) {
              console.error(`[Backfill] Error updating activity ${activity.id}:`, updateError);
              errors++;
            } else {
              if (hasPhotos || hasSegments) {
                console.log(`[Backfill] Updated "${activity.title}": photos=${hasPhotos}, segments=${hasSegments}`);
              }
              updated++;
            }
          } catch (err) {
            console.error(`[Backfill] Error processing activity ${activity.id}:`, err);
            errors++;
          }
        })
      );

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < activities.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`[Backfill] Progress: ${Math.min(i + batchSize, activities.length)}/${activities.length}`);
    }

    console.log(`[Backfill] Complete! Updated: ${updated}, Errors: ${errors}`);
    return { updated, errors };

  } catch (error) {
    console.error('[Backfill] Unexpected error:', error);
    return { updated: 0, errors: 1 };
  }
}
