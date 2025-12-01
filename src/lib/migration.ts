import { load, save } from '@/utils/storage';
import { bulkInsertLogEntries } from './database';
import { updateFitnessForWeek } from './fitnessCalculator';
import type { LogEntry } from '@/types';

export type MigrationStatus = {
  completed: boolean;
  lastMigrationDate?: string;
  itemsMigrated?: number;
};

export async function getMigrationStatus(): Promise<MigrationStatus> {
  return load<MigrationStatus>('migration:status', { completed: false });
}

export async function setMigrationStatus(status: MigrationStatus): Promise<void> {
  save('migration:status', status);
}

export async function migrateLogEntriesToSupabase(): Promise<{
  success: boolean;
  itemsMigrated: number;
  error?: string;
}> {
  try {
    const entries = load<LogEntry[]>('logEntries', []);
    if (entries.length === 0) {
      return { success: true, itemsMigrated: 0 };
    }

    const inserted = await bulkInsertLogEntries(entries);

    if (inserted > 0) {
      const uniqueWeeks = new Set<string>();
      entries.forEach(e => {
        const d = new Date(e.dateISO);
        d.setDate(d.getDate() - d.getDay());
        uniqueWeeks.add(d.toISOString().slice(0, 10));
      });

      for (const weekStart of uniqueWeeks) {
        await updateFitnessForWeek(weekStart);
      }

      await setMigrationStatus({
        completed: true,
        lastMigrationDate: new Date().toISOString(),
        itemsMigrated: inserted,
      });

      return {
        success: true,
        itemsMigrated: inserted,
      };
    }

    return {
      success: false,
      itemsMigrated: 0,
      error: 'No items were inserted',
    };
  } catch (err: any) {
    return {
      success: false,
      itemsMigrated: 0,
      error: err?.message || 'Unknown error',
    };
  }
}

export async function needsMigration(): Promise<boolean> {
  const status = await getMigrationStatus();
  if (status.completed) return false;

  const entries = load<LogEntry[]>('logEntries', []);
  return entries.length > 0;
}
