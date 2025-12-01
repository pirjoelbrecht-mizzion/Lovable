import { useState, useEffect } from 'react';
import { useReadinessScore } from '@/hooks/useReadinessScore';
import ReadinessGauge from './ReadinessGauge';
import ReadinessInputModal from './ReadinessInputModal';
import { useT } from '@/i18n';
import { load } from '@/utils/storage';
import { useWearableSync } from '@/hooks/useWearableSync';
import { supabase } from '@/lib/supabase';
import { PROVIDER_ICONS, PROVIDER_DISPLAY_NAMES } from '@/types/wearable';

export default function ReadinessCard() {
  const t = useT();
  const { readiness, loading, error } = useReadinessScore();
  const [showInputModal, setShowInputModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { syncStatus, manualSync, isWithinSyncWindow } = useWearableSync();
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    loadDataSource();
  }, []);

  async function loadDataSource() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('readiness_scores')
      .select('data_source, last_synced_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setDataSource(data.data_source);
      setLastSyncTime(data.last_synced_at);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="small" style={{ color: 'var(--muted)' }}>
          {t('readiness.calculating', 'Calculating readiness...')}
        </div>
      </div>
    );
  }

  if (error || !readiness) {
    return (
      <div className="card" style={{ minHeight: 140, borderLeft: '4px solid var(--muted)' }}>
        <div className="small" style={{ color: 'var(--muted)' }}>
          {t('readiness.unavailable', 'Readiness score unavailable')}
        </div>
      </div>
    );
  }

  const categoryColors = {
    high: '#22c55e',
    moderate: '#eab308',
    low: '#ef4444',
  };

  const borderColor = categoryColors[readiness.category];

  const yesterdayScore = load<number>('readiness:yesterday', 0);
  const trend = yesterdayScore > 0 ? readiness.value - yesterdayScore : undefined;

  const componentIcons: Record<string, string> = {
    recoveryIndex: '🔄',
    freshness: '✨',
    sleep: '😴',
    hrv: '💓',
    fatigue: '⚡',
  };

  const componentLabels: Record<string, string> = {
    recoveryIndex: t('readiness.recovery', 'Recovery'),
    freshness: t('readiness.freshness', 'Freshness'),
    sleep: t('readiness.sleep', 'Sleep'),
    hrv: t('readiness.hrv', 'HRV'),
    fatigue: t('readiness.fatigue', 'Fatigue'),
  };

  return (
    <>
      <div
        className="card"
        style={{
          minHeight: 140,
          borderLeft: `4px solid ${borderColor}`,
          position: 'relative',
        }}
      >
        <div className="row" style={{ alignItems: 'center', gap: 20 }}>
          <ReadinessGauge value={readiness.value} category={readiness.category} trend={trend} size={100} />

          <div style={{ flex: 1 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <h2 className="h2" style={{ margin: 0 }}>
                {t('readiness.title', 'Daily Readiness')}
              </h2>
              <span
                className="small"
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: borderColor,
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  fontSize: 10,
                }}
              >
                {readiness.category}
              </span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>{readiness.message}</b>
            </div>

            {dataSource && (
              <div className="small" style={{ marginBottom: 8, color: 'var(--muted)' }}>
                {PROVIDER_ICONS[dataSource as keyof typeof PROVIDER_ICONS]} Synced from {PROVIDER_DISPLAY_NAMES[dataSource as keyof typeof PROVIDER_DISPLAY_NAMES]}
                {lastSyncTime && ` at ${new Date(lastSyncTime).toLocaleTimeString()}`}
              </div>
            )}

            {syncStatus === 'syncing' && (
              <div className="small" style={{ marginBottom: 8, color: 'var(--primary)' }}>
                🔄 Syncing wearable data...
              </div>
            )}

            {syncStatus === 'success' && (
              <div className="small" style={{ marginBottom: 8, color: '#22c55e' }}>
                ✓ Sync completed
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="small" style={{ marginBottom: 8, color: '#ef4444' }}>
                ⚠️ Sync failed
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn small"
                onClick={() => setShowDetails(!showDetails)}
                style={{ fontSize: 12 }}
              >
                {showDetails ? '▲' : '▼'} {t('readiness.details', 'Details')}
              </button>

              {!dataSource && isWithinSyncWindow && (
                <button
                  className="btn small"
                  onClick={manualSync}
                  disabled={syncStatus === 'syncing'}
                  style={{ fontSize: 12 }}
                >
                  {syncStatus === 'syncing' ? '⏳ Syncing...' : '🔄 Sync now'}
                </button>
              )}
            </div>
          </div>

          <button
            className="btn small"
            onClick={() => setShowInputModal(true)}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              fontSize: 12,
            }}
          >
            ✏️ {t('readiness.update', 'Update inputs')}
          </button>
        </div>

        {showDetails && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--line)',
            }}
          >
            <div className="small" style={{ marginBottom: 12, fontWeight: 600 }}>
              {t('readiness.component_breakdown', 'Component Breakdown')}
            </div>
            <div className="grid" style={{ gap: 10 }}>
              {Object.entries(readiness.components).map(([key, value]) => {
                const percentage = Math.round(value * 100);
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, minWidth: 24 }}>{componentIcons[key]}</span>
                    <span className="small" style={{ minWidth: 80 }}>
                      {componentLabels[key]}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: 'var(--line)',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: percentage > 70 ? '#22c55e' : percentage > 40 ? '#eab308' : '#ef4444',
                          transition: 'width 0.5s ease-out',
                        }}
                      />
                    </div>
                    <span className="small" style={{ minWidth: 40, textAlign: 'right' }}>
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showInputModal && (
        <ReadinessInputModal
          onClose={() => setShowInputModal(false)}
          onSave={() => {
            setShowInputModal(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
