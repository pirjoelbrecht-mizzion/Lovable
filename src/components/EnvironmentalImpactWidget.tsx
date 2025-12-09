/**
 * Environmental Impact Dashboard Widget
 *
 * Shows recent heat/humidity stress trends and acclimation status
 * Quick glance at environmental training load
 */

import { useEffect, useState } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';

interface EnvironmentalStats {
  avgHeatImpact: number;
  highStressDays: number;
  totalAnalyzedRuns: number;
  currentTolerance: number;
  trend: 'improving' | 'stable' | 'declining';
}

export default function EnvironmentalImpactWidget() {
  const [stats, setStats] = useState<EnvironmentalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnvironmentalStats();
  }, []);

  async function loadEnvironmentalStats() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      // Last 4 weeks of data
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Get activities from last 4 weeks
      const { data: activities } = await supabase
        .from('log_entries')
        .select('id, date')
        .eq('user_id', userId)
        .gte('date', fourWeeksAgo.toISOString().slice(0, 10))
        .order('date', { ascending: false });

      if (!activities || activities.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Get heat metrics
      const activityIds = activities.map(a => a.id);
      const { data: heatMetrics } = await supabase
        .from('race_heat_stress_metrics')
        .select('log_entry_id, heat_impact_score, overall_severity, created_at')
        .in('log_entry_id', activityIds);

      if (!heatMetrics || heatMetrics.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Calculate stats
      const avgHeatImpact = heatMetrics.reduce((sum, m) => sum + m.heat_impact_score, 0) / heatMetrics.length;
      const highStressDays = heatMetrics.filter(m => m.heat_impact_score >= 50).length;

      // Calculate current tolerance (top 5 exposures)
      const topExposures = [...heatMetrics].sort((a, b) => b.heat_impact_score - a.heat_impact_score).slice(0, 5);
      const currentTolerance = topExposures.reduce((sum, m) => sum + m.heat_impact_score, 0) / topExposures.length * 0.9;

      // Calculate trend (recent 2 weeks vs previous 2 weeks)
      const recentMetrics = heatMetrics.filter(m => {
        const metricDate = activities.find(a => a.id === m.log_entry_id)?.date;
        return metricDate && new Date(metricDate) >= twoWeeksAgo;
      });

      const olderMetrics = heatMetrics.filter(m => {
        const metricDate = activities.find(a => a.id === m.log_entry_id)?.date;
        return metricDate && new Date(metricDate) < twoWeeksAgo;
      });

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentMetrics.length > 0 && olderMetrics.length > 0) {
        const recentAvg = recentMetrics.reduce((sum, m) => sum + m.heat_impact_score, 0) / recentMetrics.length;
        const olderAvg = olderMetrics.reduce((sum, m) => sum + m.heat_impact_score, 0) / olderMetrics.length;
        const diff = recentAvg - olderAvg;

        if (diff < -5) trend = 'improving'; // Handling heat better
        else if (diff > 5) trend = 'declining'; // Struggling more
      }

      setStats({
        avgHeatImpact: Math.round(avgHeatImpact),
        highStressDays,
        totalAnalyzedRuns: heatMetrics.length,
        currentTolerance: Math.round(currentTolerance),
        trend
      });
    } catch (error) {
      console.error('Error loading environmental stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="environmental-widget" style={widgetStyle}>
        <div className="spinner" style={{ width: '20px', height: '20px' }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="environmental-widget" style={widgetStyle}>
        <h3 style={titleStyle}>Environmental Impact</h3>
        <p style={{ fontSize: '14px', color: 'var(--bolt-text-muted)', textAlign: 'center', margin: '20px 0' }}>
          No heat stress data available yet.
          <br />
          Activities will be analyzed automatically.
        </p>
      </div>
    );
  }

  const severityColor = stats.avgHeatImpact >= 75 ? '#ff4444' :
                        stats.avgHeatImpact >= 50 ? '#ff9800' :
                        stats.avgHeatImpact >= 30 ? '#ffd700' : '#4CAF50';

  const trendIcon = stats.trend === 'improving' ? '↗️' :
                    stats.trend === 'declining' ? '↘️' : '→';

  const trendColor = stats.trend === 'improving' ? '#4CAF50' :
                     stats.trend === 'declining' ? '#ff4444' : 'var(--bolt-text-muted)';

  const trendText = stats.trend === 'improving' ? 'Adapting well' :
                    stats.trend === 'declining' ? 'Increased stress' : 'Stable';

  return (
    <div className="environmental-widget" style={widgetStyle}>
      <h3 style={titleStyle}>
        <span style={{ fontSize: '20px', marginRight: '8px' }}>🌡️</span>
        Environmental Impact
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        {/* Average Heat Impact */}
        <div style={statBoxStyle}>
          <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
            Avg Heat Stress
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: severityColor }}>
            {stats.avgHeatImpact}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)', marginTop: '2px' }}>
            last 4 weeks
          </div>
        </div>

        {/* Current Tolerance */}
        <div style={statBoxStyle}>
          <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginBottom: '4px' }}>
            Heat Tolerance
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--bolt-teal)' }}>
            {stats.currentTolerance}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--bolt-text-muted)', marginTop: '2px' }}>
            estimated
          </div>
        </div>
      </div>

      {/* Trend Indicator */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(var(--bolt-bg-tertiary-rgb), 0.5)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bolt-text)' }}>
            Acclimation Trend
          </div>
          <div style={{ fontSize: '12px', color: 'var(--bolt-text-muted)', marginTop: '2px' }}>
            {stats.totalAnalyzedRuns} runs analyzed
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>{trendIcon}</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: trendColor }}>
            {trendText}
          </span>
        </div>
      </div>

      {/* High Stress Days */}
      {stats.highStressDays > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--bolt-text)'
          }}
        >
          <strong>{stats.highStressDays}</strong> high stress days detected
          {stats.highStressDays >= 3 && ' - consider heat acclimation training'}
        </div>
      )}

      {/* Quick Tips */}
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--bolt-text-muted)' }}>
        {stats.avgHeatImpact >= 50 ? (
          <>Regular heat exposure detected. Benefits decay after 2-3 weeks without training.</>
        ) : (
          <>Comfortable training conditions. Consider heat acclimation before hot races.</>
        )}
      </div>
    </div>
  );
}

const widgetStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(var(--bolt-bg-secondary-rgb), 0.8), rgba(var(--bolt-bg-tertiary-rgb), 0.5))',
  border: '1px solid var(--bolt-border)',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--bolt-text)',
  margin: 0,
  display: 'flex',
  alignItems: 'center'
};

const statBoxStyle: React.CSSProperties = {
  background: 'rgba(var(--bolt-bg-tertiary-rgb), 0.5)',
  borderRadius: '8px',
  padding: '12px',
  textAlign: 'center'
};
