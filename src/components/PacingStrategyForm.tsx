import { useState, useEffect } from 'react';
import type { PacingSegment } from '@/types/pacing';
import type { DbPacingStrategy } from '@/lib/database';
import { formatPace, parsePace, validatePace, validateSegment } from '@/types/pacing';
import { savePacingStrategy, deletePacingStrategy } from '@/lib/database';

interface PacingStrategyFormProps {
  raceId: string;
  raceName: string;
  raceDistanceKm: number;
  existingStrategy?: DbPacingStrategy | null;
  onSave: (strategy: DbPacingStrategy) => void;
  onCancel?: () => void;
  onGenerateAuto?: () => void;
}

export default function PacingStrategyForm({
  raceId,
  raceName,
  raceDistanceKm,
  existingStrategy,
  onSave,
  onCancel,
  onGenerateAuto,
}: PacingStrategyFormProps) {
  const [name, setName] = useState(existingStrategy?.name || `${raceName} Pacing Plan`);
  const [segments, setSegments] = useState<PacingSegment[]>(
    existingStrategy?.segments || [
      { distanceKm: Math.min(5, raceDistanceKm), targetPace: 6.0, targetHR: 140, notes: 'Easy start' }
    ]
  );
  const [paceInputs, setPaceInputs] = useState<string[]>(
    existingStrategy?.segments.map(s => formatPace(s.targetPace)) || [formatPace(6.0)]
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (existingStrategy) {
      setName(existingStrategy.name);
      setSegments(existingStrategy.segments);
      setPaceInputs(existingStrategy.segments.map(s => formatPace(s.targetPace)));
    }
  }, [existingStrategy]);

  const handleSegmentChange = (index: number, field: keyof PacingSegment, value: any) => {
    const newSegments = [...segments];
    newSegments[index] = {
      ...newSegments[index],
      [field]: value,
    };
    setSegments(newSegments);
    setErrors([]);
  };

  const handlePaceInputChange = (index: number, paceStr: string) => {
    // Update the input string immediately (allow free typing)
    const newPaceInputs = [...paceInputs];
    newPaceInputs[index] = paceStr;
    setPaceInputs(newPaceInputs);
    setErrors([]);
  };

  const handlePaceBlur = (index: number) => {
    // When user leaves the field, try to parse and update the actual pace
    const paceStr = paceInputs[index];
    const pace = parsePace(paceStr);
    if (pace > 0) {
      handleSegmentChange(index, 'targetPace', pace);
      // Format it nicely
      const newPaceInputs = [...paceInputs];
      newPaceInputs[index] = formatPace(pace);
      setPaceInputs(newPaceInputs);
    } else {
      // Reset to last valid value
      const newPaceInputs = [...paceInputs];
      newPaceInputs[index] = formatPace(segments[index].targetPace);
      setPaceInputs(newPaceInputs);
    }
  };

  const addSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const nextDistance = Math.min(lastSegment.distanceKm + 5, raceDistanceKm);

    if (nextDistance <= lastSegment.distanceKm) {
      setErrors(['Cannot add segment beyond race distance']);
      return;
    }

    setSegments([
      ...segments,
      {
        distanceKm: nextDistance,
        targetPace: lastSegment.targetPace,
        targetHR: lastSegment.targetHR,
        notes: '',
      },
    ]);
    setPaceInputs([...paceInputs, formatPace(lastSegment.targetPace)]);
    setErrors([]);
  };

  const removeSegment = (index: number) => {
    if (segments.length <= 1) {
      setErrors(['Must have at least one segment']);
      return;
    }
    setSegments(segments.filter((_, i) => i !== index));
    setPaceInputs(paceInputs.filter((_, i) => i !== index));
    setErrors([]);
  };

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!name.trim()) {
      validationErrors.push('Strategy name is required');
    }

    if (segments.length === 0) {
      validationErrors.push('At least one segment is required');
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (!validatePace(segment.targetPace)) {
        validationErrors.push(`Segment ${i + 1}: Pace must be between 3:00 and 15:00 min/km`);
      }

      if (!validateSegment(segment, raceDistanceKm)) {
        validationErrors.push(`Segment ${i + 1}: Invalid distance or HR values`);
      }

      if (i > 0 && segment.distanceKm <= segments[i - 1].distanceKm) {
        validationErrors.push(`Segment ${i + 1}: Distance must be greater than previous segment`);
      }
    }

    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.distanceKm < raceDistanceKm) {
      validationErrors.push(`Last segment (${lastSegment.distanceKm}km) must reach race distance (${raceDistanceKm}km)`);
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const strategy: DbPacingStrategy = {
        race_id: raceId,
        name: name.trim(),
        mode: existingStrategy?.mode || 'manual',
        segments,
      };

      const success = await savePacingStrategy(strategy);
      if (success) {
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('pacing-strategy-updated', {
          detail: { raceId }
        }));
        onSave(strategy);
      } else {
        setErrors(['Failed to save pacing strategy']);
      }
    } catch (error) {
      console.error('Error saving pacing strategy:', error);
      setErrors(['An error occurred while saving']);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingStrategy) return;
    if (!confirm('Delete this pacing strategy?')) return;

    try {
      const success = await deletePacingStrategy(raceId);
      if (success) {
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('pacing-strategy-updated', {
          detail: { raceId }
        }));
        if (onCancel) {
          onCancel();
        }
      }
    } catch (error) {
      console.error('Error deleting pacing strategy:', error);
      setErrors(['Failed to delete pacing strategy']);
    }
  };

  return (
    <div className="card">
      <h3 className="h2" style={{ marginBottom: 16 }}>Edit Pacing Strategy</h3>

      <div style={{ marginBottom: 16 }}>
        <label className="small" style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>
          Strategy Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Conservative Marathon Plan"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--line)' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
                Distance (km)
              </th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
                Target Pace
              </th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
                Target HR (bpm)
              </th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
                Notes
              </th>
              <th style={{ padding: '8px', width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment, index) => (
              <tr key={index} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px' }}>
                  <input
                    type="number"
                    value={segment.distanceKm}
                    onChange={(e) => handleSegmentChange(index, 'distanceKm', parseFloat(e.target.value))}
                    step="0.1"
                    min="0.1"
                    max={raceDistanceKm}
                    style={{
                      width: '80px',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                    }}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <input
                    type="text"
                    value={paceInputs[index] || formatPace(segment.targetPace)}
                    onChange={(e) => handlePaceInputChange(index, e.target.value)}
                    onBlur={() => handlePaceBlur(index)}
                    placeholder="6:00"
                    style={{
                      width: '80px',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                    }}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <input
                    type="number"
                    value={segment.targetHR || ''}
                    onChange={(e) => handleSegmentChange(index, 'targetHR', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="140"
                    min="100"
                    max="220"
                    style={{
                      width: '80px',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                    }}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <input
                    type="text"
                    value={segment.notes || ''}
                    onChange={(e) => handleSegmentChange(index, 'notes', e.target.value)}
                    placeholder="Optional notes"
                    style={{
                      width: '100%',
                      minWidth: '150px',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                    }}
                  />
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {segments.length > 1 && (
                    <button
                      onClick={() => removeSegment(index)}
                      className="btn small"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: 'var(--bad-bg)',
            border: '1px solid var(--bad)',
            borderRadius: 8,
          }}
        >
          <div className="small" style={{ fontWeight: 600, marginBottom: 8, color: 'var(--bad)' }}>
            Validation Errors:
          </div>
          {errors.map((error, i) => (
            <div key={i} className="small" style={{ color: 'var(--bad)', marginBottom: 4 }}>
              • {error}
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={addSegment}
          className="btn"
          style={{ flex: '1 1 auto', minWidth: 120 }}
        >
          ➕ Add Segment
        </button>

        {onGenerateAuto && (
          <button
            onClick={onGenerateAuto}
            className="btn"
            style={{ flex: '1 1 auto', minWidth: 120 }}
          >
            ⚡ Auto-Generate
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn primary"
          style={{ flex: '1 1 auto', minWidth: 120 }}
        >
          {saving ? 'Saving...' : '💾 Save Strategy'}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="btn"
            style={{ flex: '1 1 auto', minWidth: 120 }}
          >
            Cancel
          </button>
        )}

        {existingStrategy && (
          <button
            onClick={handleDelete}
            className="btn"
            style={{ flex: '1 1 auto', minWidth: 120, background: 'var(--bad)' }}
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}
