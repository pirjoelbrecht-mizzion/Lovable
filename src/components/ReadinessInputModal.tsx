import { useState, useEffect } from 'react';
import { useT } from '@/i18n';
import { saveManualReadinessInputs, calculateReadinessScore } from '@/utils/readiness';
import { saveReadinessScore } from '@/lib/database';
import Modal from './Modal';

type ReadinessInputModalProps = {
  onClose: () => void;
  onSave: () => void;
};

export default function ReadinessInputModal({ onClose, onSave }: ReadinessInputModalProps) {
  const t = useT();
  const today = new Date().toISOString().slice(0, 10);

  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [fatigueLevel, setFatigueLevel] = useState(5);
  const [hrvValue, setHrvValue] = useState<number | undefined>(undefined);
  const [hrvBaseline, setHrvBaseline] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[ReadinessInputModal] Component mounted');
    return () => console.log('[ReadinessInputModal] Component unmounted');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const inputs = {
        date: today,
        sleepHours,
        sleepQuality,
        fatigueLevel,
        hrv: hrvValue,
        hrvBaseline,
        acuteLoad: 0,
        chronicLoad: 0,
        lastHardDaysAgo: 0,
        source: 'manual' as const,
      };

      saveManualReadinessInputs(today, inputs);

      const scoreResult = await calculateReadinessScore(today);

      await saveReadinessScore({
        date: today,
        value: Math.round(scoreResult.value),
        category: scoreResult.category,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        fatigue_level: fatigueLevel,
        hrv_value: hrvValue ?? undefined,
        hrv_baseline: hrvBaseline ?? undefined,
        recovery_index: Math.round(scoreResult.components.recoveryIndex * 100),
        freshness: Math.round(scoreResult.components.freshness * 100),
        sleep: Math.round(scoreResult.components.sleep * 100),
        hrv: Math.round(scoreResult.components.hrv * 100),
        fatigue: Math.round(scoreResult.components.fatigue * 100),
        message: scoreResult.message,
        source: 'manual',
      });

      onSave();
    } catch (error) {
      console.error('Failed to save readiness inputs:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={t('readiness.update_inputs', 'Update Readiness Inputs')}>
      <div className="grid" style={{ gap: 20 }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            {t('readiness.sleep_hours', 'Sleep Hours')} ({sleepHours}h)
          </label>
          <input
            type="range"
            min="4"
            max="12"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span className="small" style={{ color: 'var(--muted)' }}>4h</span>
            <span className="small" style={{ color: 'var(--muted)' }}>12h</span>
          </div>
        </div>

        <div>
          <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            {t('readiness.sleep_quality', 'Sleep Quality')} ({sleepQuality}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={sleepQuality}
            onChange={(e) => setSleepQuality(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span className="small" style={{ color: 'var(--muted)' }}>Poor</span>
            <span className="small" style={{ color: 'var(--muted)' }}>Excellent</span>
          </div>
        </div>

        <div>
          <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            {t('readiness.fatigue_level', 'Fatigue Level')} ({fatigueLevel}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={fatigueLevel}
            onChange={(e) => setFatigueLevel(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span className="small" style={{ color: 'var(--muted)' }}>Fresh</span>
            <span className="small" style={{ color: 'var(--muted)' }}>Exhausted</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div className="small" style={{ marginBottom: 12, color: 'var(--muted)' }}>
            {t('readiness.optional_fields', 'Optional Fields')}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              {t('readiness.hrv_value', 'HRV Value (ms)')}
            </label>
            <input
              type="number"
              value={hrvValue || ''}
              onChange={(e) => setHrvValue(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 58"
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              {t('readiness.hrv_baseline', 'HRV Baseline (ms)')}
            </label>
            <input
              type="number"
              value={hrvBaseline || ''}
              onChange={(e) => setHrvBaseline(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 60"
              className="input"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="row" style={{ gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
