import { useEffect } from 'react';
import { load, save } from '@/utils/storage';
import { saveSavedRoute, type DbSavedRoute } from '@/lib/database';

type QueuedRoute = {
  route: DbSavedRoute;
  timestamp: number;
};

const QUEUE_KEY = 'routes:offline_queue';

/**
 * Hook to manage offline route syncing.
 * Automatically syncs queued routes when connection is restored.
 */
export function useOfflineSync() {
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useOfflineSync] Connection restored, syncing queued routes...');
      await syncQueuedRoutes();
    };

    window.addEventListener('online', handleOnline);

    if (navigator.onLine) {
      syncQueuedRoutes();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}

/**
 * Queue a route for saving when offline.
 */
export function queueRouteForSync(route: DbSavedRoute): void {
  const queue = load<QueuedRoute[]>(QUEUE_KEY, []);
  queue.push({
    route,
    timestamp: Date.now(),
  });
  save(QUEUE_KEY, queue);
  console.log(`[queueRouteForSync] Queued route: ${route.name}`);
}

/**
 * Sync all queued routes to the database.
 */
export async function syncQueuedRoutes(): Promise<number> {
  if (!navigator.onLine) {
    console.log('[syncQueuedRoutes] Offline, skipping sync');
    return 0;
  }

  const queue = load<QueuedRoute[]>(QUEUE_KEY, []);

  if (queue.length === 0) {
    return 0;
  }

  console.log(`[syncQueuedRoutes] Syncing ${queue.length} queued routes...`);

  let successCount = 0;
  const failedRoutes: QueuedRoute[] = [];

  for (const item of queue) {
    try {
      const result = await saveSavedRoute(item.route);
      if (result.success) {
        successCount++;
      } else {
        failedRoutes.push(item);
      }
    } catch (error) {
      console.error(`[syncQueuedRoutes] Failed to sync route: ${item.route.name}`, error);
      failedRoutes.push(item);
    }
  }

  save(QUEUE_KEY, failedRoutes);

  console.log(`[syncQueuedRoutes] Synced ${successCount}/${queue.length} routes`);

  return successCount;
}

/**
 * Get the number of queued routes waiting to sync.
 */
export function getQueuedRouteCount(): number {
  const queue = load<QueuedRoute[]>(QUEUE_KEY, []);
  return queue.length;
}

/**
 * Clear all queued routes.
 */
export function clearRouteQueue(): void {
  save(QUEUE_KEY, []);
}
