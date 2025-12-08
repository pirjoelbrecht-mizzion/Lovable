/**
 * Activity Terrain Breakdown Component
 * Displays trail-specific terrain analysis with visual distribution
 */

import { useState } from 'react';
import { type TerrainAnalysis } from '@/engine/trailAnalysis';

interface ActivityTerrainBreakdownProps {
  terrain: TerrainAnalysis;
  activityElevationGain?: number; // Total elevation from activity data (e.g., Strava)
}

export function ActivityTerrainBreakdown({ terrain, activityElevationGain }: ActivityTerrainBreakdownProps) {
  const [showAllClimbs, setShowAllClimbs] = useState(false);
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

        {/* Climb Analysis Section */}
        {terrain.climbs && terrain.climbs.length > 0 && (
          <div
            style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid var(--bolt-border)'
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--bolt-text)', margin: 0 }}>
                  🏔️ Climb Analysis ({terrain.significantClimbsCount} significant climbs)
                </h4>
                {terrain.climbs.length > 3 && (
                  <button
                    onClick={() => setShowAllClimbs(!showAllClimbs)}
                    style={{
                      fontSize: '12px',
                      color: 'var(--bolt-teal)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {showAllClimbs ? 'Show Less' : 'Show All Climbs'}
                  </button>
                )}
              </div>

              {/* Elevation accounting */}
              {terrain.totalClimbElevationM !== undefined && terrain.totalClimbElevationM > 0 && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--bolt-text-muted)',
                    padding: '8px 12px',
                    background: 'var(--bolt-background)',
                    borderRadius: '6px',
                    border: '1px solid var(--bolt-border)'
                  }}
                >
                  <div>
                    <strong>{terrain.significantClimbElevationM?.toFixed(0) || 0}m</strong> from significant climbs
                    {terrain.smallClimbElevationM !== undefined && terrain.smallClimbElevationM > 0 && (
                      <>
                        {' + '}
                        <strong>{terrain.smallClimbElevationM.toFixed(0)}m</strong> from smaller climbs
                      </>
                    )}
                  </div>
                  {activityElevationGain !== undefined && activityElevationGain > terrain.totalClimbElevationM && (
                    <div style={{ marginTop: '4px' }}>
                      {' + '}
                      <strong>{(activityElevationGain - terrain.totalClimbElevationM).toFixed(0)}m</strong> from rolling terrain
                      {' = '}
                      <strong>{activityElevationGain.toFixed(0)}m</strong> total gain
                    </div>
                  )}
                  {activityElevationGain === undefined && (
                    <div style={{ marginTop: '4px' }}>
                      {' = '}
                      <strong>{terrain.totalClimbElevationM.toFixed(0)}m</strong> from climbs detected
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
                padding: '16px',
                background: 'var(--bolt-background)',
                borderRadius: '8px',
                border: '1px solid var(--bolt-border)'
              }}
            >
              {terrain.peakVam && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                    Peak VAM
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: getVAMColor(terrain.peakVam) }}>
                    {terrain.peakVam.toFixed(0)} m/hr
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                    {getVAMLabel(terrain.peakVam)}
                  </div>
                </div>
              )}

              {terrain.averageClimbVam && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                    Average VAM
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--bolt-teal)' }}>
                    {terrain.averageClimbVam.toFixed(0)} m/hr
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                    Across all climbs
                  </div>
                </div>
              )}

              {terrain.vamFirstToLastDropoffPct !== undefined && terrain.climbs.length >= 2 && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                    Fatigue Resistance
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: getFatigueColor(terrain.vamFirstToLastDropoffPct)
                    }}
                  >
                    {Math.abs(terrain.vamFirstToLastDropoffPct).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                    {terrain.vamFirstToLastDropoffPct > -10
                      ? 'Excellent'
                      : terrain.vamFirstToLastDropoffPct > -25
                        ? 'Good'
                        : terrain.vamFirstToLastDropoffPct > -40
                          ? 'Moderate'
                          : 'Needs work'}
                  </div>
                </div>
              )}

              {terrain.totalClimbingTimeMin && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                    Climbing Time
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--bolt-text)' }}>
                    {formatDuration(terrain.totalClimbingTimeMin)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                    {terrain.totalClimbingDistanceKm && `${terrain.totalClimbingDistanceKm.toFixed(1)} km`}
                  </div>
                </div>
              )}
            </div>

            {/* AI Insights */}
            {terrain.vamFirstToLastDropoffPct !== undefined && terrain.climbs.length >= 2 && (
              <div
                style={{
                  padding: '12px',
                  background: 'var(--bolt-background)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid var(--bolt-border)',
                  fontSize: '13px',
                  color: 'var(--bolt-text)',
                  lineHeight: '1.6'
                }}
              >
                <strong>💡 Insight:</strong>{' '}
                {getClimbInsight(
                  terrain.vamFirstClimb || 0,
                  terrain.vamLastClimb || 0,
                  terrain.vamFirstToLastDropoffPct,
                  terrain.peakVam || 0
                )}
              </div>
            )}

            {/* Individual Climb Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(showAllClimbs ? terrain.climbs : terrain.climbs.slice(0, 3)).map((climb, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--bolt-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--bolt-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--bolt-text-muted)',
                        minWidth: '32px'
                      }}
                    >
                      #{climb.climbNumber}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--bolt-text)',
                          marginBottom: '2px'
                        }}
                      >
                        {climb.elevationGainM.toFixed(0)}m gain
                        <span style={{ color: 'var(--bolt-text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                          {climb.distanceKm.toFixed(1)}km @ {climb.averageGradePct.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                        {getCategoryLabel(climb.category)} • {climb.durationMin && `${formatDuration(climb.durationMin)}`}
                      </div>
                    </div>
                  </div>
                  {climb.vam && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: getVAMColor(climb.vam) }}>
                        {climb.vam.toFixed(0)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--bolt-text-muted)' }}>m/hr</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getVAMColor(vam: number): string {
  if (vam >= 600) return '#10b981'; // Green - strong
  if (vam >= 400) return '#f59e0b'; // Orange - moderate
  if (vam >= 300) return '#ef4444'; // Red - struggling
  return '#6b7280'; // Gray - very slow
}

function getVAMLabel(vam: number): string {
  if (vam >= 800) return 'Elite climbing';
  if (vam >= 600) return 'Strong climbing';
  if (vam >= 400) return 'Moderate pace';
  if (vam >= 300) return 'Conservation';
  return 'Fatigue detected';
}

function getFatigueColor(dropoffPct: number): string {
  if (dropoffPct > -10) return '#10b981'; // Green - minimal fatigue
  if (dropoffPct > -25) return '#f59e0b'; // Orange - moderate fatigue
  return '#ef4444'; // Red - significant fatigue
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    easy: 'Easy climb',
    moderate: 'Moderate climb',
    hard: 'Hard climb',
    extreme: 'Extreme climb'
  };
  return labels[category] || category;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function getClimbInsight(
  firstVAM: number,
  lastVAM: number,
  dropoffPct: number,
  peakVAM: number
): string {
  if (dropoffPct > -5) {
    return 'Excellent pacing and fatigue resistance. Your climbing power remained consistent throughout the activity.';
  } else if (dropoffPct > -15) {
    return `Good climbing performance with only ${Math.abs(dropoffPct).toFixed(0)}% VAM decline. Strong endurance on sequential climbs.`;
  } else if (dropoffPct > -30) {
    return `${Math.abs(dropoffPct).toFixed(0)}% VAM drop from first to last climb suggests moderate fatigue. Consider muscular endurance training for better resistance.`;
  } else {
    return `Significant ${Math.abs(dropoffPct).toFixed(0)}% VAM decline detected. Focus on back-to-back climb intervals and muscular endurance to improve fatigue resistance.`;
  }
}
