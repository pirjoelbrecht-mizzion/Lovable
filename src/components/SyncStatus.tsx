import { useEffect, useState } from 'react';
import { hasSupabase, isAuthed } from '@/lib/supabase';
import { getMigrationStatus, needsMigration, migrateLogEntriesToSupabase } from '@/lib/migration';
import { toast } from './ToastHost';

export default function SyncStatus() {
  const [status, setStatus] = useState<'synced' | 'offline' | 'syncing' | 'needsMigration'>('offline');
  const [authed, setAuthed] = useState(false);
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (!hasSupabase) {
        setStatus('offline');
        return;
      }

      const authenticated = await isAuthed();
      setAuthed(authenticated);

      if (!authenticated) {
        setStatus('offline');
        return;
      }

      const needs = await needsMigration();
      if (needs) {
        setStatus('needsMigration');
        setShowMigration(true);
      } else {
        setStatus('synced');
      }
    }

    checkStatus();

    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleMigrate() {
    setStatus('syncing');
    const result = await migrateLogEntriesToSupabase();

    if (result.success) {
      toast(`Migrated ${result.itemsMigrated} log entries to cloud!`, 'success');
      setStatus('synced');
      setShowMigration(false);
    } else {
      toast(`Migration failed: ${result.error}`, 'error');
      setStatus('needsMigration');
    }
  }

  if (!hasSupabase || !authed) {
    return null;
  }

  const statusColors = {
    synced: 'var(--good)',
    offline: 'var(--muted)',
    syncing: 'var(--brand)',
    needsMigration: 'var(--warning)',
  };

  const statusLabels = {
    synced: '✓ Synced',
    offline: 'Offline',
    syncing: '⟳ Syncing…',
    needsMigration: '⚠ Migration needed',
  };

  return (
    <>
      <div
        style={{
          fontSize: 12,
          color: statusColors[status],
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {statusLabels[status]}
      </div>

      {showMigration && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: 460,
              maxWidth: '92%',
              background: 'var(--card)',
            }}
          >
            <h2 className="h2">Migrate Data to Cloud</h2>
            <p className="small" style={{ marginTop: 8 }}>
              You have local training data that hasn't been synced to the cloud yet.
              Would you like to migrate it now?
            </p>
            <div className="row" style={{ marginTop: 14, gap: 8 }}>
              <button
                className="btn"
                onClick={() => setShowMigration(false)}
                disabled={status === 'syncing'}
              >
                Later
              </button>
              <button
                className="btn primary"
                onClick={handleMigrate}
                disabled={status === 'syncing'}
              >
                {status === 'syncing' ? 'Migrating…' : 'Migrate Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
