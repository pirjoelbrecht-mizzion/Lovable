import { useState } from 'react';
import type { SeasonPlan, Macrocycle } from '@/types/seasonPlan';
import { adjustMacrocycleDuration, recalculateMacrocycleDates } from '@/utils/seasonPlanGenerator';

interface SeasonPlanEditorProps {
  seasonPlan: SeasonPlan;
  onSave: (updatedPlan: SeasonPlan) => void;
  onCancel: () => void;
}

export default function SeasonPlanEditor({ seasonPlan, onSave, onCancel }: SeasonPlanEditorProps) {
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>(seasonPlan.macrocycles);
  const [hasChanges, setHasChanges] = useState(false);

  const raceDate = new Date(macrocycles.find(m => m.phase === 'race')?.startDate || new Date());

  const handleWeekChange = (index: number, delta: number) => {
    const currentMacro = macrocycles[index];
    const newWeeks = currentMacro.durationWeeks + delta;

    const adjusted = adjustMacrocycleDuration(currentMacro, newWeeks, raceDate);
    const updatedMacros = [...macrocycles];
    updatedMacros[index] = adjusted;

    const recalculated = recalculateMacrocycleDates(updatedMacros, raceDate);
    setMacrocycles(recalculated);
    setHasChanges(true);
  };

  const handleReset = () => {
    setMacrocycles(
      seasonPlan.macrocycles.map(m => ({
        ...m,
        durationWeeks: m.originalWeeks || m.durationWeeks,
        isManual: false,
        adjustedWeeks: undefined,
      }))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    const updatedPlan: SeasonPlan = {
      ...seasonPlan,
      macrocycles,
      isManual: true,
      lastGenerated: new Date().toISOString(),
      seasonStart: macrocycles[0].startDate,
      seasonEnd: macrocycles[macrocycles.length - 1].endDate,
      totalWeeks: macrocycles.reduce((sum, m) => sum + m.durationWeeks, 0),
    };

    onSave(updatedPlan);
  };

  const totalWeeks = macrocycles.reduce((sum, m) => sum + m.durationWeeks, 0);

  return (
    <div className="card" style={{ padding: 24, background: 'var(--bg-secondary)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="h2" style={{ margin: 0 }}>Edit Season Plan</h3>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={handleReset} disabled={!hasChanges}>
            Reset to Auto
          </button>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
        <div className="small" style={{ color: 'var(--muted)' }}>
          Total Season Duration: <strong>{totalWeeks} weeks</strong>
        </div>
        <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
          {new Date(macrocycles[0].startDate).toLocaleDateString()} - {new Date(macrocycles[macrocycles.length - 1].endDate).toLocaleDateString()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {macrocycles.map((macro, index) => {
          const isLocked = macro.phase === 'race';
          const hasMinimum = macro.phase === 'taper' || macro.phase === 'recovery';
          const minWeeks = hasMinimum ? (macro.phase === 'taper' ? 2 : 1) : 1;

          return (
            <div
              key={index}
              style={{
                padding: 16,
                background: 'var(--bg)',
                borderRadius: 8,
                borderLeft: `4px solid ${macro.color}`,
                opacity: isLocked ? 0.7 : 1,
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {macro.displayName}
                    {isLocked && <span className="small" style={{ marginLeft: 8, color: 'var(--muted)' }}>🔒 Locked</span>}
                    {macro.isManual && <span className="small" style={{ marginLeft: 8, color: 'var(--brand)' }}>✏️ Edited</span>}
                  </div>
                  <div className="small" style={{ color: 'var(--muted)' }}>
                    {new Date(macro.startDate).toLocaleDateString()} - {new Date(macro.endDate).toLocaleDateString()}
                  </div>
                  {macro.originalWeeks !== macro.durationWeeks && (
                    <div className="small" style={{ color: 'var(--muted)', marginTop: 2 }}>
                      Original: {macro.originalWeeks} weeks
                    </div>
                  )}
                </div>

                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn"
                    onClick={() => handleWeekChange(index, -1)}
                    disabled={isLocked || macro.durationWeeks <= minWeeks}
                    style={{ padding: '4px 12px', fontSize: 16 }}
                  >
                    −
                  </button>
                  <div style={{ minWidth: 80, textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>
                      {macro.durationWeeks}
                    </div>
                    <div className="small" style={{ color: 'var(--muted)' }}>
                      weeks
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => handleWeekChange(index, 1)}
                    disabled={isLocked}
                    style={{ padding: '4px 12px', fontSize: 16 }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <div style={{ marginTop: 20, padding: 12, background: 'var(--brand-bg)', borderRadius: 8, border: '1px solid var(--brand)' }}>
          <div className="small" style={{ color: 'var(--brand)' }}>
            ℹ️ You have unsaved changes. Click "Save Changes" to apply your edits.
          </div>
        </div>
      )}
    </div>
  );
}
