import { ProviderInterface, WearableMetric } from '../../../types/wearable';
import { supabase } from '../../../lib/supabase';

export class SuuntoProvider implements ProviderInterface {
  name = 'suunto' as const;

  async isConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('wearable_connections')
      .select('connection_status')
      .eq('user_id', user.id)
      .eq('provider', 'suunto')
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
        .eq('provider', 'suunto')
        .maybeSingle();

      if (!connection?.access_token) return null;

      const headers = {
        'Authorization': `Bearer ${connection.access_token}`
      };

      const [hrRes, sleepRes, recoveryRes] = await Promise.all([
        fetch(`https://cloudapi.suunto.com/v2/heart_rate/daily?start=${dateISO}&end=${dateISO}`, { headers }),
        fetch(`https://cloudapi.suunto.com/v2/sleep/daily?start=${dateISO}&end=${dateISO}`, { headers }),
        fetch(`https://cloudapi.suunto.com/v2/recovery_time/daily?start=${dateISO}&end=${dateISO}`, { headers })
      ]);

      const hrData = hrRes.ok ? await hrRes.json() : null;
      const sleepData = sleepRes.ok ? await sleepRes.json() : null;
      const recoveryData = recoveryRes.ok ? await recoveryRes.json() : null;

      if (!hrData?.data && !sleepData?.data) return null;

      return {
        timestamp: new Date(dateISO).getTime(),
        source: 'suunto',
        restingHR: hrData?.data?.[0]?.restingHeartRate,
        hrv: hrData?.data?.[0]?.hrv,
        sleepHours: sleepData?.data?.[0]?.sleepDurationHours,
        sleepQuality: sleepData?.data?.[0]?.sleepScore,
        recoveryTime: recoveryData?.data?.[0]?.recoveryTimeHours
      };
    } catch (error) {
      console.error('Suunto fetch error:', error);
      return null;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suunto-refresh-token`,
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
