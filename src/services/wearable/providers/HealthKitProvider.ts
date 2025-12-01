import { ProviderInterface, WearableMetric } from '../../../types/wearable';
import { supabase } from '../../../lib/supabase';

export class HealthKitProvider implements ProviderInterface {
  name = 'apple' as const;

  async isConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('wearable_connections')
      .select('connection_status')
      .eq('user_id', user.id)
      .eq('provider', 'apple')
      .maybeSingle();

    return data?.connection_status === 'connected';
  }

  async fetchMetrics(dateISO: string): Promise<WearableMetric | null> {
    try {
      if (typeof window === 'undefined' || !(window as any).webkit?.messageHandlers?.healthKit) {
        console.warn('HealthKit not available on this platform');
        return null;
      }

      return new Promise((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'healthkit_metrics') {
            window.removeEventListener('message', messageHandler);

            const data = event.data.payload;
            resolve({
              timestamp: new Date(dateISO).getTime(),
              source: 'apple',
              restingHR: data.restingHeartRate,
              hrv: data.heartRateVariabilitySDNN,
              sleepHours: data.sleepAnalysis?.duration ? data.sleepAnalysis.duration / 3600 : undefined,
              sleepQuality: data.sleepAnalysis?.quality
            });
          }
        };

        window.addEventListener('message', messageHandler);

        (window as any).webkit.messageHandlers.healthKit.postMessage({
          action: 'fetchMetrics',
          date: dateISO
        });

        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error('HealthKit fetch error:', error);
      return null;
    }
  }
}
