import { supabase } from '@/lib/supabase';
import { updateClimatePerformance } from '@/services/locationAnalytics';

export async function backfillStravaLocations(): Promise<{ updated: number; climateUpdated: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: connection } = await supabase
    .from('wearable_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .maybeSingle();

  if (!connection?.access_token) {
    throw new Error('Strava not connected');
  }

  let accessToken = connection.access_token;

  if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
    console.log('Access token expired, refreshing...');
    accessToken = await refreshStravaToken(user.id, connection.refresh_token);
  }

  const { data: activities } = await supabase
    .from('log_entries')
    .select('id, external_id, date, km, duration_min, hr_avg, temperature, location_name')
    .eq('user_id', user.id)
    .eq('data_source', 'strava')
    .not('external_id', 'is', null);

  if (!activities || activities.length === 0) {
    console.log('No Strava activities found');
    return { updated: 0, climateUpdated: 0 };
  }

  console.log(`Found ${activities.length} Strava activities to backfill`);

  let updated = 0;
  let climateUpdated = 0;

  for (const activity of activities) {
    try {
      const response = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.external_id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch activity ${activity.external_id}:`, response.status);

        if (response.status === 401) {
          console.log('Token expired during batch, refreshing...');
          accessToken = await refreshStravaToken(user.id, connection.refresh_token);
          continue;
        }

        continue;
      }

      const activityData = await response.json();

      const locationCity = activityData.location_city;
      const temp = activityData.average_temp;
      const humidity = activityData.humidity;

      if (!locationCity && !temp) {
        continue;
      }

      const updates: any = {};
      if (locationCity) updates.location_name = locationCity;
      if (temp !== undefined && temp !== null) updates.temperature = temp;
      if (humidity !== undefined && humidity !== null) updates.humidity = humidity;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('log_entries')
          .update(updates)
          .eq('id', activity.id);

        if (!error) {
          updated++;
          console.log(`Updated activity ${activity.external_id} with location: ${locationCity}`);

          if (locationCity && (temp || activity.temperature) && activity.km && activity.duration_min && activity.hr_avg) {
            const pace = activity.duration_min / activity.km;
            const finalTemp = temp || activity.temperature;
            const finalHumidity = humidity || 50;

            await updateClimatePerformance(
              locationCity,
              finalTemp,
              finalHumidity,
              pace,
              activity.hr_avg
            );
            climateUpdated++;
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error processing activity ${activity.external_id}:`, error);
    }
  }

  console.log(`Backfill complete: ${updated} activities updated, ${climateUpdated} climate records updated`);
  return { updated, climateUpdated };
}

async function refreshStravaToken(userId: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
      client_secret: import.meta.env.VITE_STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Strava token');
  }

  const data = await response.json();

  await supabase
    .from('wearable_connections')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', 'strava');

  return data.access_token;
}
