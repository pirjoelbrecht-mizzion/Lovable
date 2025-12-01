import { useEffect, useState } from 'react';
import { WearableManager } from '../services/wearable/WearableManager';
import { WearableMetric, SyncStatus } from '../types/wearable';
import { supabase } from '../lib/supabase';

export function useWearableSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedMetric, setLastSyncedMetric] = useState<WearableMetric | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isWithinSyncWindow = (): boolean => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 4 && hour <= 8;
  };

  const hasAlreadySyncedToday = (): boolean => {
    const today = new Date().toISOString().split('T')[0];
    const lastSync = localStorage.getItem('last_wearable_sync');
    return lastSync === today;
  };

  const syncWearables = async (force: boolean = false): Promise<WearableMetric | null> => {
    if (!force && hasAlreadySyncedToday()) {
      return null;
    }

    setSyncStatus('syncing');
    setError(null);

    try {
      const manager = new WearableManager();
      const today = new Date().toISOString().split('T')[0];

      setSyncStatus('processing');
      const metric = await manager.sync(today);

      if (metric) {
        setLastSyncedMetric(metric);
        localStorage.setItem('last_wearable_sync', today);
        setSyncStatus('success');

        setTimeout(() => setSyncStatus('idle'), 3000);

        return metric;
      } else {
        setSyncStatus('idle');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      setSyncStatus('error');

      setTimeout(() => {
        setSyncStatus('idle');
        setError(null);
      }, 5000);

      return null;
    }
  };

  const manualSync = () => syncWearables(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (isWithinSyncWindow() && !hasAlreadySyncedToday()) {
          syncWearables(false);
        }
      }
    });

    if (isWithinSyncWindow() && !hasAlreadySyncedToday()) {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          syncWearables(false);
        }
      };
      checkAuth();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    syncStatus,
    lastSyncedMetric,
    error,
    manualSync,
    isWithinSyncWindow: isWithinSyncWindow()
  };
}
