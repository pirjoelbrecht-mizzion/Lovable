import { useState } from 'react';
import { toast } from '@/components/ToastHost';
import TrainingFrequencyConfirmation from '@/components/TrainingFrequencyConfirmation';

interface EditTrainingFrequencyProps {
  currentDaysPerWeek: number;
  onSave: (newDaysPerWeek: number) => Promise<void>;
}

export default function EditTrainingFrequency({
  currentDaysPerWeek,
  onSave,
}: EditTrainingFrequencyProps) {
  const [selectedDays, setSelectedDays] = useState(currentDaysPerWeek);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanged = selectedDays !== currentDaysPerWeek;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedDays);
      toast('Training frequency updated', 'success');
      setShowConfirmation(false);
    } catch (error: any) {
      toast(error.message || 'Failed to update frequency', 'error');
      setSelectedDays(currentDaysPerWeek);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div style={{
        padding: 20,
        background: 'var(--card)',
        borderRadius: 12,
        border: '1px solid var(--line)'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Training Frequency</h3>

        <label style={{
          display: 'block',
          fontSize: 13,
          color: 'var(--muted)',
          marginBottom: 8
        }}>
          Days per week
        </label>

        <select
          value={selectedDays}
          onChange={(e) => setSelectedDays(parseInt(e.target.value))}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--text)',
            cursor: 'pointer',
            marginBottom: 16
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((days) => (
            <option key={days} value={days}>
              {days} day{days > 1 ? 's' : ''} per week
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowConfirmation(true)}
          disabled={!hasChanged || isSaving}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            background: hasChanged && !isSaving ? '#3b82f6' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: hasChanged && !isSaving ? 'pointer' : 'not-allowed',
            opacity: hasChanged && !isSaving ? 1 : 0.6,
            transition: 'all 0.2s'
          }}
        >
          {isSaving ? 'Updating...' : 'Change training days per week'}
        </button>
      </div>

      {showConfirmation && (
        <TrainingFrequencyConfirmation
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmation(false)}
          isLoading={isSaving}
        />
      )}
    </>
  );
}
