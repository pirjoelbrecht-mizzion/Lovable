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
  if (value <= 1.02) return temp ? `${temp}C - mild warmth` : 'Mild warmth';
  if (value <= 1.05) return temp ? `${temp}C - warm` : 'Warm conditions';
  if (value <= 1.10) return temp ? `${temp}C - hot` : 'Hot conditions';
  return temp ? `${temp}C - extreme heat` : 'Extreme heat';
}

function getFatigueDescription(value: number, readiness?: number): string {
  if (value <= 1.005) return 'Peak readiness';
  if (value <= 1.02) return readiness ? `Readiness ${readiness}` : 'Slight fatigue';
  if (value <= 1.05) return readiness ? `Readiness ${readiness}` : 'Moderate fatigue';
  return readiness ? `Readiness ${readiness}` : 'High fatigue';
}

function getStatusBadge(value: number, type: Factor['type']): { text: string; className: string } {
  const thresholds = {
    terrain: { yellow: 1.02, red: 1.05 },
    elevation: { yellow: 1.03, red: 1.08 },
    climate: { yellow: 1.02, red: 1.05 },
    fatigue: { yellow: 1.02, red: 1.05 },
  };

  const { yellow, red } = thresholds[type];

  if (value <= 1.005) return { text: 'Neutral', className: 'neutral' };
  if (value <= yellow) return { text: 'Minor', className: 'minor' };
  if (value <= red) return { text: 'Moderate', className: 'moderate' };
  return { text: 'Significant', className: 'significant' };
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
      icon: '💪',
      description: getFatigueDescription(factors.fatiguePenalty, readinessScore),
      type: 'fatigue',
    },
  ];

  const combinedMultiplier = factorsList.reduce((acc, f) => acc * f.value, 1);
  const combinedPenalty = (combinedMultiplier - 1) * 100;

  const getBadgeStyles = (className: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      neutral: { bg: 'rgba(70, 231, 177, 0.15)', border: 'rgba(70, 231, 177, 0.3)', text: '#46E7B1' },
      minor: { bg: 'rgba(255, 183, 77, 0.15)', border: 'rgba(255, 183, 77, 0.3)', text: '#FFB74D' },
      moderate: { bg: 'rgba(255, 138, 101, 0.15)', border: 'rgba(255, 138, 101, 0.3)', text: '#FF8A65' },
      significant: { bg: 'rgba(255, 92, 122, 0.15)', border: 'rgba(255, 92, 122, 0.3)', text: '#FF5C7A' },
    };
    return colors[className] || colors.neutral;
  };

  const getValueColor = (className: string) => {
    const colors: Record<string, string> = {
      neutral: '#46E7B1',
      minor: '#FFB74D',
      moderate: '#FF8A65',
      significant: '#FF5C7A',
    };
    return colors[className] || '#fff';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {factorsList.map((factor) => {
        const badge = getStatusBadge(factor.value, factor.type);
        const badgeStyles = getBadgeStyles(badge.className);
        const valueColor = getValueColor(badge.className);

        return (
          <div
            key={factor.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(255, 92, 122, 0.15) 0%, rgba(255, 138, 101, 0.1) 100%)',
                border: '1px solid rgba(255, 92, 122, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}>
                {factor.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {factor.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                  {factor.description}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 700, color: valueColor, fontSize: '1.1rem' }}>
                  {factor.value.toFixed(3)}x
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: badgeStyles.bg,
                    color: badgeStyles.text,
                    border: `1px solid ${badgeStyles.border}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  {badge.text}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {formatImpact(factor.value)}
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          marginTop: 8,
          padding: 16,
          background: combinedPenalty > 5
            ? 'linear-gradient(135deg, rgba(255, 92, 122, 0.1) 0%, rgba(255, 138, 101, 0.05) 100%)'
            : combinedPenalty > 2
            ? 'linear-gradient(135deg, rgba(255, 183, 77, 0.1) 0%, rgba(255, 183, 77, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(70, 231, 177, 0.1) 0%, rgba(70, 231, 177, 0.05) 100%)',
          border: combinedPenalty > 5
            ? '1px solid rgba(255, 92, 122, 0.2)'
            : combinedPenalty > 2
            ? '1px solid rgba(255, 183, 77, 0.2)'
            : '1px solid rgba(70, 231, 177, 0.2)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '1.4rem' }}>⚡</span>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          Combined Impact:
        </span>
        <span style={{
          fontWeight: 700,
          fontSize: '1.2rem',
          color: combinedPenalty > 5 ? '#FF5C7A' : combinedPenalty > 2 ? '#FFB74D' : '#46E7B1'
        }}>
          {combinedPenalty > 0.1 ? `+${combinedPenalty.toFixed(1)}%` : '0.0%'}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' }}>
          {combinedPenalty > 0.1 ? 'Total Performance Penalty' : 'Optimal Conditions'}
        </span>
      </div>
    </div>
  );
}
