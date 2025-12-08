/**
 * Backfill photos and segments for existing Strava activities
 * Fetches and stores actual photo URLs and segment data
 */

import { supabase } from '@/lib/supabase';

interface StravaPhoto {
  unique_id: string;
  urls: {
    '100': string;
    '600': string;
  };
  caption?: string;
  location?: [number, number];
}

export async function backfillPhotoFlags(): Promise<{
  updated: number;
  errors: number;
}> {
  console.log('[Backfill] Starting photo/segment data backfill...');

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Backfill] No authenticated user');
      return { updated: 0, errors: 1 };
    }

    // Get Strava access token from wearable_connections
    const { data: connection } = await supabase
      .from('wearable_connections')
      .select('access_token, refresh_token, token_expires_at, connection_status')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    if (!connection?.access_token) {
      console.error('[Backfill] No Strava connection found. Please connect Strava first in the Devices tab.');
      return { updated: 0, errors: 1 };
    }

    if (connection.connection_status !== 'connected') {
      console.error(`[Backfill] Strava connection status is: ${connection.connection_status}. Please reconnect Strava.`);
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

    // Helper function to add delay between requests
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Process activities sequentially with rate limiting
    // Strava allows 100 requests per 15 minutes, so we add delays
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      try {
        console.log(`[Backfill] Processing ${i + 1}/${activities.length}: "${activity.title}"`);

        // Add delay between requests (1 second = 60 requests/min = safe for 100/15min limit)
        if (i > 0) {
          await delay(1000);
        }

        // Fetch detailed activity from Strava to get photo count
        const activityResponse = await fetch(
          `https://www.strava.com/api/v3/activities/${activity.external_id}`,
          {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`
            }
          }
        );

        if (activityResponse.status === 429) {
          console.warn(`[Backfill] Rate limited! Waiting 60 seconds before continuing...`);
          await delay(60000); // Wait 1 minute
          errors++;
          continue;
        }

        if (!activityResponse.ok) {
          console.warn(`[Backfill] Failed to fetch activity ${activity.external_id}: ${activityResponse.status}`);
          errors++;
          continue;
        }

        const activityData = await activityResponse.json();
        const photoCount = activityData.total_photo_count || 0;
        const hasSegments = (activityData.segment_efforts?.length || 0) > 0;

        // If activity has photos, fetch and store them
        if (photoCount > 0) {
          console.log(`[Backfill] Fetching ${photoCount} photos for "${activity.title}"...`);

          // Add delay before photos request to avoid hitting rate limit
          await delay(500);

          try {
            const photosResponse = await fetch(
              `https://www.strava.com/api/v3/activities/${activity.external_id}/photos?size=600`,
              {
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`
                }
              }
            );

            if (photosResponse.status === 429) {
              console.warn(`[Backfill] Rate limited on photos! Waiting 60 seconds...`);
              await delay(60000);
              errors++;
              continue;
            }

            if (photosResponse.ok) {
              const photos: StravaPhoto[] = await photosResponse.json();

              if (photos.length > 0) {
                // Delete existing photos for this activity
                await supabase
                  .from('activity_photos')
                  .delete()
                  .eq('log_entry_id', activity.id);

                // Filter and map photos, ensuring all required fields have values
                const photosToInsert = photos
                  .filter(photo => photo.urls && (photo.urls['100'] || photo.urls['600']))
                  .map((photo, index) => {
                    // Use available URL sizes, with fallbacks
                    const thumbnail = photo.urls['100'] || photo.urls['600'] || '';
                    const full = photo.urls['600'] || photo.urls['100'] || '';

                    return {
                      user_id: user.id,
                      log_entry_id: activity.id,
                      url_full: full,
                      url_thumbnail: thumbnail,
                      caption: photo.caption || null,
                      latitude: photo.location?.[0] || null,
                      longitude: photo.location?.[1] || null,
                      display_order: index
                    };
                  })
                  .filter(photo => photo.url_thumbnail && photo.url_full); // Only insert photos with valid URLs

                if (photosToInsert.length > 0) {
                  const { error: photoError } = await supabase
                    .from('activity_photos')
                    .insert(photosToInsert);

                  if (photoError) {
                    console.error(`[Backfill] Error storing photos for ${activity.id}:`, photoError);
                  } else {
                    console.log(`[Backfill] ✓ Stored ${photosToInsert.length} photos for "${activity.title}"`);
                  }
                } else {
                  console.log(`[Backfill] No valid photo URLs found for "${activity.title}"`);
                }
              }
            }
          } catch (photoError) {
            console.error(`[Backfill] Error fetching photos for ${activity.id}:`, photoError);
          }
        }

        // Update the activity flags
        const { error: updateError } = await supabase
          .from('log_entries')
          .update({
            has_photos: photoCount > 0,
            has_segments: hasSegments
          })
          .eq('id', activity.id);

        if (updateError) {
          console.error(`[Backfill] Error updating activity ${activity.id}:`, updateError);
          errors++;
        } else {
          if (photoCount > 0 || hasSegments) {
            console.log(`[Backfill] Updated "${activity.title}": photos=${photoCount}, segments=${hasSegments}`);
          }
          updated++;
        }
      } catch (err) {
        console.error(`[Backfill] Error processing activity ${activity.id}:`, err);
        errors++;
      }
    }

    console.log(`[Backfill] Complete! Updated: ${updated}, Errors: ${errors}`);
    return { updated, errors };

  } catch (error) {
    console.error('[Backfill] Unexpected error:', error);
    return { updated: 0, errors: 1 };
  }
}
