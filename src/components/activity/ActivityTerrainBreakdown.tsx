/**
 * Activity Terrain Breakdown Component
 * Displays trail-specific terrain analysis with visual distribution
 */

import { type TerrainAnalysis } from '@/engine/trailAnalysis';

interface ActivityTerrainBreakdownProps {
  terrain: TerrainAnalysis;
}

export function ActivityTerrainBreakdown({ terrain }: ActivityTerrainBreakdownProps) {
  const totalKm = terrain.flatKm + terrain.rollingKm + terrain.hillyKm + terrain.steepKm + terrain.downhillKm;

  if (totalKm === 0) {
    return null;
  }

  const terrainTypes = [
    { label: 'Flat (0-3%)', km: terrain.flatKm, color: '#10b981', icon: '—' },
    { label: 'Rolling (3-6%)', km: terrain.rollingKm, color: '#3b82f6', icon: '〰' },
    { label: 'Hilly (6-10%)', km: terrain.hillyKm, color: '#f59e0b', icon: '⛰' },
    { label: 'Steep (>10%)', km: terrain.steepKm, color: '#ef4444', icon: '⛰️' },
    { label: 'Downhill', km: terrain.downhillKm, color: '#8b5cf6', icon: '↓' }
  ];

  return (
    <div style={{ marginBottom: '32px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--bolt-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '22px' }}>📊</span>
        Terrain Breakdown
      </h3>

      <div
        style={{
          background: 'var(--bolt-surface)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--bolt-border)'
        }}
      >
        {/* Visual Distribution Bar */}
        <div
          style={{
            display: 'flex',
            height: '40px',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '20px',
            border: '1px solid var(--bolt-border)'
          }}
        >
          {terrainTypes.map((type, idx) =>
            type.km > 0 ? (
              <div
                key={idx}
                style={{
                  backgroundColor: type.color,
                  width: `${(type.km / totalKm) * 100}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '12px',
                  transition: 'all 0.3s'
                }}
                title={`${type.label}: ${type.km.toFixed(1)} km`}
              >
                {type.icon}
              </div>
            ) : null
          )}
        </div>

        {/* Detailed Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px'
          }}
        >
          {terrainTypes.map((type, idx) =>
            type.km > 0 ? (
              <div key={idx}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: type.color
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--bolt-text-muted)' }}>
                    {type.label}
                  </span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--bolt-text)' }}>
                  {type.km.toFixed(1)} km
                </div>
                <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                  {((type.km / totalKm) * 100).toFixed(0)}%
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Trail Metrics */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid var(--bolt-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}
        >
          {terrain.vam && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                VAM (Climbing Power)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--bolt-teal)' }}>
                {terrain.vam.toFixed(0)} m/hr
              </div>
              <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                {terrain.vam < 300 ? 'Easy' : terrain.vam < 500 ? 'Moderate' : terrain.vam < 800 ? 'Strong' : 'Elite'}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
              Downhill Confidence
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--bolt-text)' }}>
              {((1 - terrain.downhillBrakingScore) * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
              {terrain.downhillBrakingScore < 0.2
                ? 'Very confident'
                : terrain.downhillBrakingScore < 0.4
                  ? 'Confident'
                  : terrain.downhillBrakingScore < 0.6
                    ? 'Cautious'
                    : 'Very cautious'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
              Trail Technicality
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--bolt-text)' }}>
              {(terrain.technicalityScore * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
              {terrain.technicalityScore < 0.3
                ? 'Smooth'
                : terrain.technicalityScore < 0.5
                  ? 'Moderate'
                  : terrain.technicalityScore < 0.7
                    ? 'Technical'
                    : 'Highly technical'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
