import type { Race } from '@/utils/races';
import type { SimulationOverrides } from '@/types/whatif';

type RaceContextHeaderProps = {
  race: Race;
  readinessScore: number;
  overrides: SimulationOverrides;
  onSave?: () => void;
  onReset?: () => void;
};

export default function RaceContextHeader({
  race,
  readinessScore,
  overrides,
  onSave,
  onReset,
}: RaceContextHeaderProps) {
  const temperature = overrides.temperature ?? 20;
  const humidity = overrides.humidity ?? 50;
  const elevation = overrides.elevation ?? race.elevationM ?? 0;
  const readiness = overrides.readiness ?? readinessScore;

  return (
    <div style={{
      padding: '20px 24px',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
      borderRadius: 12,
      border: '1px solid rgba(59, 130, 246, 0.2)',
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span>🔮</span>
            <span>What-If Race Simulation — {race.name}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: '0.95rem',
            color: 'var(--muted)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: readiness >= 80 ? 'rgba(34, 197, 94, 0.1)' : readiness >= 60 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: 6,
              border: `1px solid ${readiness >= 80 ? 'rgba(34, 197, 94, 0.3)' : readiness >= 60 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}>
              <span>⚡</span>
              <span style={{ fontWeight: 600 }}>Readiness {readiness}</span>
            </div>
            {elevation > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 6,
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}>
                <span>🏔️</span>
                <span style={{ fontWeight: 600 }}>Elevation +{elevation}m</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 6,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <span>🌡️</span>
              <span style={{ fontWeight: 600 }}>Weather: {temperature}°C / {humidity}% RH</span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          {onSave && (
            <button
              className="btn primary"
              onClick={onSave}
              style={{
                padding: '8px 16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>💾</span>
              Save Scenario
            </button>
          )}
          {onReset && (
            <button
              className="btn"
              onClick={onReset}
              style={{
                padding: '8px 16px',
                fontWeight: 600,
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
