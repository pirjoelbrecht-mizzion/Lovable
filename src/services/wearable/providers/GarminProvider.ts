import { ProviderInterface, WearableMetric } from '../../../types/wearable';
import { supabase } from '../../../lib/supabase';

export class GarminProvider implements ProviderInterface {
  name = 'garmin' as const;

  async isConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('wearable_connections')
      .select('connection_status')
      .eq('user_id', user.id)
      .eq('provider', 'garmin')
      .maybeSingle();

    return data?.connection_status === 'connected';
  }

  async fetchMetrics(dateISO: string): Promise<WearableMetric | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: connection } = await supabase
        .from('wearable_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('provider', 'garmin')
        .maybeSingle();

      if (!connection?.access_token) return null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/garmin-fetch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${connection.access_token}`
          },
          body: JSON.stringify({ date: dateISO })
        }
      );

      if (!response.ok) return null;

      const data = await response.json();

      return {
        timestamp: new Date(dateISO).getTime(),
        source: 'garmin',
        restingHR: data.restingHeartRate,
        hrv: data.hrv,
        sleepHours: data.sleep?.durationInSeconds ? data.sleep.durationInSeconds / 3600 : undefined,
        sleepQuality: data.sleep?.sleepScore,
        bodyBattery: data.bodyBattery,
        stressLevel: data.averageStressLevel
      };
    } catch (error) {
      console.error('Garmin fetch error:', error);
      return null;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/garmin-refresh-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}
