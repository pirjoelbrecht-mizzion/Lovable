/**
 * Activity Performance Insights Component
 * Displays performance analysis and recommendations
 */

import { type PerformanceAnalysis } from '@/engine/trailAnalysis';

interface ActivityPerformanceInsightsProps {
  performance: PerformanceAnalysis;
}

export function ActivityPerformanceInsights({ performance }: ActivityPerformanceInsightsProps) {
  if (!performance || performance.recommendations.length === 0) {
    return null;
  }

  const getEfficiencyColor = (score: number): string => {
    if (score >= 80) return 'var(--bolt-teal)';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getEfficiencyLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

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
        <span style={{ fontSize: '22px' }}>💡</span>
        Performance Insights
      </h3>

      <div
        style={{
          background: 'var(--bolt-surface)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--bolt-border)'
        }}
      >
        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}
        >
          {/* Efficiency Score */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
              Efficiency Score
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: getEfficiencyColor(performance.efficiencyScore)
              }}
            >
              {performance.efficiencyScore}/100
            </div>
            <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
              {getEfficiencyLabel(performance.efficiencyScore)}
            </div>
          </div>

          {/* Aerobic Decoupling */}
          {performance.aerobicDecoupling !== undefined && !isNaN(performance.aerobicDecoupling) && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                Aerobic Decoupling
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color:
                    performance.aerobicDecoupling < 5
                      ? 'var(--bolt-teal)'
                      : performance.aerobicDecoupling < 10
                        ? '#f59e0b'
                        : '#ef4444'
                }}
              >
                {performance.aerobicDecoupling > 0 ? '+' : ''}
                {performance.aerobicDecoupling.toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                {performance.aerobicDecoupling < 5
                  ? 'Excellent pacing'
                  : performance.aerobicDecoupling < 10
                    ? 'Moderate drift'
                    : 'Significant fatigue'}
              </div>
            </div>
          )}

          {/* HR Drift on Climbs */}
          {performance.hrDriftOnClimbs !== undefined && !isNaN(performance.hrDriftOnClimbs) && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                HR Drift on Climbs
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color:
                    performance.hrDriftOnClimbs < 10
                      ? 'var(--bolt-teal)'
                      : performance.hrDriftOnClimbs < 15
                        ? '#f59e0b'
                        : '#ef4444'
                }}
              >
                {performance.hrDriftOnClimbs.toFixed(1)} bpm
              </div>
              <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                {performance.hrDriftOnClimbs < 10
                  ? 'Steady climbing'
                  : performance.hrDriftOnClimbs < 15
                    ? 'Moderate variation'
                    : 'High variation'}
              </div>
            </div>
          )}

          {/* Heat Strain */}
          {performance.heatStrainIndex !== undefined && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
                Heat Strain Index
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color:
                    performance.heatStrainIndex < 28
                      ? 'var(--bolt-teal)'
                      : performance.heatStrainIndex < 35
                        ? '#f59e0b'
                        : '#ef4444'
                }}
              >
                {performance.heatStrainIndex.toFixed(0)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)' }}>
                {performance.heatStrainIndex < 28
                  ? 'Comfortable'
                  : performance.heatStrainIndex < 35
                    ? 'Moderate stress'
                    : 'High stress'}
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {performance.recommendations.length > 0 && (
          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid var(--bolt-border)'
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--bolt-text)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {performance.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px',
                    background: 'rgba(var(--bolt-teal-rgb), 0.05)',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--bolt-teal)'
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>💬</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'var(--bolt-text)'
                    }}
                  >
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
