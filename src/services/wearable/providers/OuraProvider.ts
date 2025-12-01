import { ProviderInterface, WearableMetric } from '../../../types/wearable';
import { supabase } from '../../../lib/supabase';

export class OuraProvider implements ProviderInterface {
  name = 'oura' as const;

  async isConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('wearable_connections')
      .select('connection_status')
      .eq('user_id', user.id)
      .eq('provider', 'oura')
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
        .eq('provider', 'oura')
        .maybeSingle();

      if (!connection?.access_token) return null;

      const headers = {
        'Authorization': `Bearer ${connection.access_token}`
      };

      const [readinessRes, sleepRes] = await Promise.all([
        fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${dateISO}&end_date=${dateISO}`, { headers }),
        fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${dateISO}&end_date=${dateISO}`, { headers })
      ]);

      if (!readinessRes.ok && !sleepRes.ok) return null;

      const readinessData = readinessRes.ok ? await readinessRes.json() : null;
      const sleepData = sleepRes.ok ? await sleepRes.json() : null;

      const readiness = readinessData?.data?.[0];
      const sleep = sleepData?.data?.[0];

      return {
        timestamp: new Date(dateISO).getTime(),
        source: 'oura',
        restingHR: readiness?.contributors?.resting_heart_rate,
        hrv: readiness?.contributors?.hrv_balance,
        sleepHours: sleep?.total_sleep_duration ? sleep.total_sleep_duration / 3600 : undefined,
        sleepQuality: sleep?.score,
        temperature: readiness?.contributors?.body_temperature
      };
    } catch (error) {
      console.error('Oura fetch error:', error);
      return null;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oura-refresh-token`,
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
