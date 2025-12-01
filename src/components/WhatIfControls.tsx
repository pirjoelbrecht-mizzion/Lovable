import { useState } from 'react';
import type { SimulationOverrides } from '@/types/whatif';
import { OVERRIDE_RANGES, type OverrideRange } from '@/types/whatif';
import { getPresetScenarios } from '@/utils/whatifSimulation';

type WhatIfControlsProps = {
  overrides: SimulationOverrides;
  onChange: (overrides: SimulationOverrides) => void;
  onReset: () => void;
  currentValues: {
    temperature?: number;
    humidity?: number;
    elevation?: number;
    readiness?: number;
    surface?: 'road' | 'trail' | 'mixed';
  };
};

export default function WhatIfControls({
  overrides,
  onChange,
  onReset,
  currentValues,
}: WhatIfControlsProps) {
  const [showPresets, setShowPresets] = useState(false);

  const updateOverride = <K extends keyof SimulationOverrides>(
    key: K,
    value: SimulationOverrides[K]
  ) => {
    onChange({ ...overrides, [key]: value });
  };

  const clearOverride = (key: keyof SimulationOverrides) => {
    const newOverrides = { ...overrides };
    delete newOverrides[key];
    onChange(newOverrides);
  };

  const applyPreset = (presetOverrides: SimulationOverrides) => {
    onChange(presetOverrides);
    setShowPresets(false);
  };

  const hasAnyOverrides = Object.keys(overrides).length > 0;

  const renderSlider = (
    key: keyof SimulationOverrides,
    label: string,
    range: OverrideRange,
    current?: number
  ) => {
    const value = overrides[key] as number | undefined;
    const isActive = value !== undefined;
    const displayValue = isActive ? value : (current ?? range.default);

    return (
      <div className="whatif-control" key={key}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontWeight: 500, fontSize: '0.95rem' }}>
            {label}
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            {current !== undefined && !isActive && (
              <span className="small" style={{ color: 'var(--muted)' }}>
                Current: {current}{range.unit}
              </span>
            )}
            {isActive && (
              <>
                <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                  {displayValue}{range.unit}
                </span>
                <button
                  className="btn small"
                  onClick={() => clearOverride(key)}
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  Reset
                </button>
              </>
            )}
            {!isActive && (
              <span style={{ fontWeight: 600 }}>
                {displayValue}{range.unit}
              </span>
            )}
          </div>
        </div>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={displayValue}
          onChange={(e) => updateOverride(key, parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: isActive ? 'var(--brand)' : 'var(--muted)',
          }}
        />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span className="small" style={{ color: 'var(--muted)' }}>{range.min}{range.unit}</span>
          <span className="small" style={{ color: 'var(--muted)' }}>{range.max}{range.unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="whatif-controls">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="h2" style={{ margin: 0 }}>Adjust Conditions</h3>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn small"
            onClick={() => setShowPresets(!showPresets)}
            style={{ padding: '6px 12px' }}
          >
            {showPresets ? 'Hide' : 'Presets'}
          </button>
          {hasAnyOverrides && (
            <button
              className="btn small"
              onClick={onReset}
              style={{ padding: '6px 12px', background: 'var(--warning)' }}
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {showPresets && (
        <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <div className="small" style={{ marginBottom: 12, fontWeight: 600 }}>Quick Scenarios</div>
          <div className="grid cols-2" style={{ gap: 8 }}>
            {getPresetScenarios().map((preset) => (
              <button
                key={preset.name}
                className="btn"
                onClick={() => applyPreset(preset.overrides)}
                style={{
                  padding: '8px',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  background: 'var(--bg)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{preset.name}</div>
                <div className="small" style={{ color: 'var(--muted)' }}>
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {renderSlider('temperature', 'Temperature', OVERRIDE_RANGES.temperature, currentValues.temperature)}
        {renderSlider('humidity', 'Humidity', OVERRIDE_RANGES.humidity, currentValues.humidity)}
        {renderSlider('elevation', 'Elevation Gain', OVERRIDE_RANGES.elevation, currentValues.elevation)}
        {renderSlider('readiness', 'Readiness Score', OVERRIDE_RANGES.readiness, currentValues.readiness)}

        <div className="whatif-control">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontWeight: 500, fontSize: '0.95rem' }}>
              Surface Type
            </label>
            <div className="row" style={{ gap: 8 }}>
              {overrides.surface && (
                <button
                  className="btn small"
                  onClick={() => clearOverride('surface')}
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {(['road', 'mixed', 'trail'] as const).map((surface) => {
              const isActive = overrides.surface === surface;
              const isCurrent = currentValues.surface === surface && !overrides.surface;

              return (
                <button
                  key={surface}
                  className="btn"
                  onClick={() => updateOverride('surface', surface)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: isActive ? 'var(--brand)' : isCurrent ? 'var(--bg-secondary)' : 'var(--bg)',
                    border: isActive ? '2px solid var(--brand)' : isCurrent ? '2px solid var(--muted)' : '1px solid var(--line)',
                    fontWeight: isActive || isCurrent ? 600 : 400,
                  }}
                >
                  {surface.charAt(0).toUpperCase() + surface.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {hasAnyOverrides && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          borderLeft: '4px solid var(--brand)',
        }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Active Overrides:</div>
          <div className="small" style={{ color: 'var(--muted)' }}>
            {Object.keys(overrides).length} condition{Object.keys(overrides).length !== 1 ? 's' : ''} adjusted
          </div>
        </div>
      )}
    </div>
  );
}
