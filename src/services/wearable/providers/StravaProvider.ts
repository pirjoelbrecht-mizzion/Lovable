import { ProviderInterface, WearableMetric } from '../../../types/wearable';
import { supabase } from '../../../lib/supabase';
import { LogEntry } from '../../../types';
import { getValidatedAPIDateRange, filterByImportDateLimit, logImportFilterStats } from '../../../utils/importDateLimits';

export class StravaProvider implements ProviderInterface {
  name = 'strava' as const;

  async isConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('wearable_connections')
      .select('connection_status')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    return data?.connection_status === 'connected';
  }

  async fetchMetrics(dateISO: string): Promise<WearableMetric | null> {
    return null;
  }

  async fetchActivities(startDate: string, endDate: string): Promise<LogEntry[]> {
    try {
      const accessToken = await this.ensureValidToken();
      if (!accessToken) return [];

      // CRITICAL: Apply 2-year import limitation
      const validatedRange = getValidatedAPIDateRange(startDate);
      if (validatedRange.wasLimited) {
        console.warn(`[StravaProvider] Start date limited from ${startDate} to ${validatedRange.startDate} (2-year maximum)`);
      }

      const after = Math.floor(new Date(validatedRange.startDate).getTime() / 1000);
      const before = Math.floor(new Date(validatedRange.endDate).getTime() / 1000);

      // Fetch all activities with pagination
      let allActivities: any[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        console.log(`Fetching Strava activities page ${page}...`);

        const response = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=${perPage}&page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          console.error('Strava API error:', response.status, await response.text());
          break;
        }

        const activities = await response.json();

        if (activities.length === 0) {
          console.log('No more activities to fetch');
          break;
        }

        allActivities = allActivities.concat(activities);
        console.log(`Fetched ${activities.length} activities (total: ${allActivities.length})`);

        // If we got less than perPage, we've reached the end
        if (activities.length < perPage) {
          break;
        }

        page++;
      }

      const logEntries: LogEntry[] = await Promise.all(
        allActivities
          .filter((act: any) => act.type === 'Run')
          .map(async (act: any) => {
            const paceSecsPerKm = act.distance > 0 ? (act.moving_time / (act.distance / 1000)) : 0;
            const paceMin = Math.floor(paceSecsPerKm / 60);
            const paceSec = Math.round(paceSecsPerKm % 60);

            console.log('Strava activity map data:', {
              id: act.id,
              name: act.name,
              hasMap: !!act.map,
              hasSummaryPolyline: !!act.map?.summary_polyline,
              hasPolyline: !!act.map?.polyline,
              summaryPolylineLength: act.map?.summary_polyline?.length,
              polylineLength: act.map?.polyline?.length
            });

            let elevationStream: number[] | undefined;
            let distanceStream: number[] | undefined;

            try {
              const streamResponse = await fetch(
                `https://www.strava.com/api/v3/activities/${act.id}/streams?keys=altitude,distance&key_by_type=true`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                }
              );

              if (streamResponse.ok) {
                const streams = await streamResponse.json();
                elevationStream = streams.altitude?.data;
                distanceStream = streams.distance?.data;
                console.log(`Fetched elevation data for ${act.name}:`, {
                  elevationPoints: elevationStream?.length,
                  distancePoints: distanceStream?.length
                });
              }
            } catch (streamError) {
              console.error(`Failed to fetch elevation data for activity ${act.id}:`, streamError);
            }

            // Use location_city if provided by Strava
            // Note: Geocoding disabled due to API rate limits and CORS restrictions
            const location = act.location_city || undefined;

            return {
              title: act.name || 'Run',
              dateISO: act.start_date_local.split('T')[0],
              km: Math.round(act.distance / 1000 * 10) / 10,
              durationMin: Math.round(act.moving_time / 60),
              hrAvg: act.average_heartrate ? Math.round(act.average_heartrate) : undefined,
              source: 'Strava' as const,
              externalId: act.id.toString(),
              mapPolyline: act.map?.polyline || undefined,
              mapSummaryPolyline: act.map?.summary_polyline || undefined,
              elevationGain: act.total_elevation_gain ? Math.round(act.total_elevation_gain) : undefined,
              elevationStream,
              distanceStream,
              temperature: act.average_temp || undefined,
              location: location || undefined
            };
          })
      );

      console.log(`Fetched ${logEntries.length} runs from Strava (from ${allActivities.length} total activities)`);
      console.log('Sample log entry:', logEntries[0]);

      // CRITICAL: Double-check with date filter (defense in depth)
      const filterResult = filterByImportDateLimit(logEntries, (entry) => entry.dateISO);
      logImportFilterStats('Strava API Import', filterResult.stats);

      if (filterResult.rejected.length > 0) {
        console.warn(`[StravaProvider] Filtered out ${filterResult.rejected.length} activities older than 2 years`);
      }

      return filterResult.accepted;
    } catch (error) {
      console.error('Strava fetch error:', error);
      return [];
    }
  }

  private mapStravaTypeToWorkout(workoutType: number | undefined): string {
    if (!workoutType) return 'easy';

    switch (workoutType) {
      case 1: return 'intervals';
      case 2: return 'tempo';
      case 3: return 'long';
      case 10: return 'easy';
      case 11: return 'intervals';
      case 12: return 'tempo';
      default: return 'easy';
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: connection } = await supabase
        .from('wearable_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .maybeSingle();

      if (!connection?.id) return false;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-token-refresh`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId: connection.id }),
        }
      );

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text());
        return false;
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  private async ensureValidToken(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: connection } = await supabase
      .from('wearable_connections')
      .select('access_token, token_expires_at, id')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    if (!connection?.access_token) return null;

    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt && expiresAt < fiveMinutesFromNow) {
      console.log('Token expiring soon, refreshing...');
      const refreshed = await this.refreshToken();
      if (!refreshed) return null;

      const { data: newConnection } = await supabase
        .from('wearable_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .maybeSingle();

      return newConnection?.access_token || null;
    }

    return connection.access_token;
  }
}
