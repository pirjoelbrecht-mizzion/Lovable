import { migrateLocalSettingsToSupabase } from './userSettings';
import { migrateLocalMessagesToSupabase } from './coachMessages';
import { syncLogEntries } from './database';

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) return;

  try {
    await migrateLocalSettingsToSupabase();
    await migrateLocalMessagesToSupabase();

    syncLogEntries().catch(err => {
      console.error('Failed to sync log entries on app init:', err);
    });

    // Initialize auto-calculation service
    try {
      const { autoCalculationService } = await import('@/services/autoCalculationService');
      console.log('[App] Auto-calculation service initialized');

      // Setup status monitoring
      autoCalculationService.on('completed', (job) => {
        console.log(`[App] ✅ Calculation completed: ${job.type} (${job.completedAt! - job.startedAt!}ms)`);
      });

      autoCalculationService.on('failed', (job) => {
        console.error(`[App] ❌ Calculation failed: ${job.type}`, job.error);
      });
    } catch (error) {
      console.error('[App] Failed to initialize auto-calculation service:', error);
    }

    initialized = true;
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}
