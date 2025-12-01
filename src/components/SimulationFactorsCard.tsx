interface Factor {
  label: string;
  value: number;
  icon: string;
  description: string;
  type: 'terrain' | 'elevation' | 'climate' | 'fatigue';
}

interface SimulationFactorsCardProps {
  factors: {
    terrainFactor: number;
    elevationFactor: number;
    climateFactor: number;
    fatiguePenalty: number;
  };
  terrainType?: string;
  elevationMeters?: number;
  temperature?: number;
  readinessScore?: number;
}

function getTerrainDescription(value: number, type?: string): string {
  if (value <= 1.005) return type || 'Flat road';
  if (value <= 1.02) return 'Light trail';
  if (value <= 1.05) return 'Technical trail';
  return 'Very technical terrain';
}

function getElevationDescription(value: number, elevationM?: number): string {
  if (value <= 1.005) return 'Flat course';
  if (value <= 1.03) return elevationM ? `${elevationM}m climb` : 'Rolling hills';
  if (value <= 1.08) return elevationM ? `${elevationM}m climb` : 'Moderate climbing';
  return elevationM ? `${elevationM}m climb` : 'Major elevation gain';
}

function getClimateDescription(value: number, temp?: number): string {
  if (value <= 1.005) return 'Ideal conditions';
  if (value <= 1.02) return temp ? `${temp}°C - mild warmth` : 'Mild warmth';
  if (value <= 1.05) return temp ? `${temp}°C - warm` : 'Warm conditions';
  if (value <= 1.10) return temp ? `${temp}°C - hot` : 'Hot conditions';
  return temp ? `${temp}°C - extreme heat` : 'Extreme heat';
}

function getFatigueDescription(value: number, readiness?: number): string {
  if (value <= 1.005) return 'Peak readiness';
  if (value <= 1.02) return readiness ? `Readiness ${readiness}` : 'Slight fatigue';
  if (value <= 1.05) return readiness ? `Readiness ${readiness}` : 'Moderate fatigue';
  return readiness ? `Readiness ${readiness}` : 'High fatigue';
}

function getColor(value: number, type: Factor['type']): string {
  const thresholds = {
    terrain: { yellow: 1.02, red: 1.05 },
    elevation: { yellow: 1.03, red: 1.08 },
    climate: { yellow: 1.02, red: 1.05 },
    fatigue: { yellow: 1.02, red: 1.05 },
  };

  const { yellow, red } = thresholds[type];

  if (value <= 1.005) return 'var(--good)';
  if (value <= yellow) return 'var(--warning)';
  if (value <= red) return 'var(--warning)';
  return 'var(--bad)';
}

function getStatusBadge(value: number, type: Factor['type']): { text: string; color: string } {
  const thresholds = {
    terrain: { yellow: 1.02, red: 1.05 },
    elevation: { yellow: 1.03, red: 1.08 },
    climate: { yellow: 1.02, red: 1.05 },
    fatigue: { yellow: 1.02, red: 1.05 },
  };

  const { yellow, red } = thresholds[type];

  if (value <= 1.005) return { text: 'Neutral', color: 'var(--good)' };
  if (value <= yellow) return { text: 'Minor', color: 'var(--warning)' };
  if (value <= red) return { text: 'Moderate', color: 'var(--warning)' };
  return { text: 'Significant', color: 'var(--bad)' };
}

function formatImpact(value: number): string {
  const pct = ((value - 1) * 100);
  if (pct <= 0.1) return 'No impact';
  return `+${pct.toFixed(1)}% slower`;
}

export default function SimulationFactorsCard({
  factors,
  terrainType,
  elevationMeters,
  temperature,
  readinessScore,
}: SimulationFactorsCardProps) {
  const factorsList: Factor[] = [
    {
      label: 'Terrain',
      value: factors.terrainFactor,
      icon: '🗺️',
      description: getTerrainDescription(factors.terrainFactor, terrainType),
      type: 'terrain',
    },
    {
      label: 'Elevation',
      value: factors.elevationFactor,
      icon: '⛰️',
      description: getElevationDescription(factors.elevationFactor, elevationMeters),
      type: 'elevation',
    },
    {
      label: 'Climate',
      value: factors.climateFactor,
      icon: '🌡️',
      description: getClimateDescription(factors.climateFactor, temperature),
      type: 'climate',
    },
    {
      label: 'Fatigue',
      value: factors.fatiguePenalty,
      icon: '💀',
      description: getFatigueDescription(factors.fatiguePenalty, readinessScore),
      type: 'fatigue',
    },
  ];

  const combinedMultiplier = factorsList.reduce((acc, f) => acc * f.value, 1);
  const combinedPenalty = (combinedMultiplier - 1) * 100;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {factorsList.map((factor) => {
          const badge = getStatusBadge(factor.value, factor.type);
          const color = getColor(factor.value, factor.type);

          return (
            <div
              key={factor.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: '1.5rem' }}>{factor.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{factor.label}</div>
                  <div className="small" style={{ color: 'var(--muted)' }}>
                    {factor.description}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700, color, fontSize: '1.1rem' }}>
                    {factor.value.toFixed(3)}×
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: badge.color + '20',
                      color: badge.color,
                      border: `1px solid ${badge.color}`,
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
                <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
                  {formatImpact(factor.value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: combinedPenalty > 5 ? 'var(--bad-bg)' : combinedPenalty > 2 ? 'var(--warning-bg)' : 'var(--good-bg)',
          borderRadius: 8,
          borderLeft: `4px solid ${combinedPenalty > 5 ? 'var(--bad)' : combinedPenalty > 2 ? 'var(--warning)' : 'var(--good)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <strong style={{ fontSize: '1rem' }}>Combined Impact:</strong>
          <span style={{
            fontWeight: 700,
            fontSize: '1.1rem',
            color: combinedPenalty > 5 ? 'var(--bad)' : combinedPenalty > 2 ? 'var(--warning)' : 'var(--good)'
          }}>
            {combinedPenalty > 0.1 ? `+${combinedPenalty.toFixed(1)}%` : '0.0%'}
          </span>
          <span style={{ color: 'var(--muted)' }}>
            {combinedPenalty > 0.1 ? 'Total Performance Penalty' : 'Optimal Conditions'}
          </span>
        </div>
      </div>
    </div>
  );
}
