import type { PhysiologicalInputs } from '@/types/physiology';
import { PHYSIOLOGICAL_RANGES } from '@/types/physiology';

type PhysiologicalControlsProps = {
  inputs: PhysiologicalInputs;
  onChange: (inputs: PhysiologicalInputs) => void;
};

export default function PhysiologicalControls({
  inputs,
  onChange,
}: PhysiologicalControlsProps) {
  const updateInput = <K extends keyof PhysiologicalInputs>(
    key: K,
    value: PhysiologicalInputs[K]
  ) => {
    onChange({ ...inputs, [key]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="whatif-control">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🍌</span>
            Fueling Rate
          </label>
          <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
            {inputs.fuelingRate} {PHYSIOLOGICAL_RANGES.fuelingRate.unit}
          </span>
        </div>
        <input
          type="range"
          min={PHYSIOLOGICAL_RANGES.fuelingRate.min}
          max={PHYSIOLOGICAL_RANGES.fuelingRate.max}
          step={PHYSIOLOGICAL_RANGES.fuelingRate.step}
          value={inputs.fuelingRate}
          onChange={(e) => updateInput('fuelingRate', parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: 'var(--brand)',
          }}
        />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span className="small" style={{ color: 'var(--muted)' }}>
            {PHYSIOLOGICAL_RANGES.fuelingRate.min} {PHYSIOLOGICAL_RANGES.fuelingRate.unit}
          </span>
          <span className="small" style={{ color: 'var(--muted)' }}>
            {PHYSIOLOGICAL_RANGES.fuelingRate.max} {PHYSIOLOGICAL_RANGES.fuelingRate.unit}
          </span>
        </div>
        <div className="small" style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.5 }}>
          Typical range: 40-80 g/hr for most athletes. Higher rates for ultras.
        </div>
      </div>

      <div className="whatif-control">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🥤</span>
            Fluid Intake
          </label>
          <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
            {inputs.fluidIntake} {PHYSIOLOGICAL_RANGES.fluidIntake.unit}
          </span>
        </div>
        <input
          type="range"
          min={PHYSIOLOGICAL_RANGES.fluidIntake.min}
          max={PHYSIOLOGICAL_RANGES.fluidIntake.max}
          step={PHYSIOLOGICAL_RANGES.fluidIntake.step}
          value={inputs.fluidIntake}
          onChange={(e) => updateInput('fluidIntake', parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: 'var(--brand)',
          }}
        />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span className="small" style={{ color: 'var(--muted)' }}>
            {PHYSIOLOGICAL_RANGES.fluidIntake.min} {PHYSIOLOGICAL_RANGES.fluidIntake.unit}
          </span>
          <span className="small" style={{ color: 'var(--muted)' }}>
            {PHYSIOLOGICAL_RANGES.fluidIntake.max} {PHYSIOLOGICAL_RANGES.fluidIntake.unit}
          </span>
        </div>
        <div className="small" style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.5 }}>
          Adjust based on sweat rate and heat. 500-800 ml/hr is typical.
        </div>
      </div>

      <div className="whatif-control">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🧂</span>
            Sodium Intake
          </label>
          <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
            {inputs.sodiumIntake} {PHYSIOLOGICAL_RANGES.sodiumIntake.unit}
          </span>
        </div>
        <input
          type="range"
          min={PHYSIOLOGICAL_RANGES.sodiumIntake.min}
          max={PHYSIOLOGICAL_RANGES.sodiumIntake.max}
          step={PHYSIOLOGICAL_RANGES.sodiumIntake.step}
          value={inputs.sodiumIntake}
          onChange={(e) => updateInput('sodiumIntake', parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: 'var(--brand)',
          }}
        />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span className="small" style={{ color: 'var(--muted)' }}>
            {PHYSIOLOGICAL_RANGES.sodiumIntake.min} {PHYSIOLOGICAL_RANGES.sodiumIntake.unit}
          </span>
          <span className="small" style={{ color: 'var(--muted)' }}>
            {PHYSIOLOGICAL_RANGES.sodiumIntake.max} {PHYSIOLOGICAL_RANGES.sodiumIntake.unit}
          </span>
        </div>
        <div className="small" style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.5 }}>
          Electrolyte replacement to prevent cramping. 500-1000 mg/hr recommended.
        </div>
      </div>

      <div style={{
        padding: 12,
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        borderLeft: '4px solid var(--brand)',
      }}>
        <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
          Real-time Recalculation
        </div>
        <div className="small" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          As you adjust sliders, all charts and metrics update instantly to show impact on energy, hydration, and performance.
        </div>
      </div>
    </div>
  );
}
