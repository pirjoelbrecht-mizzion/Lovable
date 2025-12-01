import { type AthleteBaselines } from '@/hooks/useAthleteBaselines';
import { type WeeklyMetric } from '@/hooks/useWeeklyMetrics';
import { generateInsightMessage, categorizeRiskLevel } from '@/utils/analytics';
import { getACWRZoneStatus, generateACWRZoneFeedback, type ACWRZone } from '@/utils/acwrZones';

interface AIInsightProps {
  metrics: WeeklyMetric[];
  baselines: AthleteBaselines | null;
  metricType: 'acwr' | 'fatigue' | 'efficiency' | 'hr_drift' | 'weekly_load';
}

export default function AIInsight({ metrics, baselines, metricType }: AIInsightProps) {
  if (!metrics.length || !baselines) {
    return null;
  }

  const latest = metrics[metrics.length - 1];

  const getRiskLevelClass = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'high':
        return 'ai-insight-high';
      case 'moderate':
        return 'ai-insight-moderate';
      case 'low':
        return 'ai-insight-low';
    }
  };

  const getRiskIcon = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'high':
        return '⚠️';
      case 'moderate':
        return '⚡';
      case 'low':
        return '✓';
    }
  };

  if (metricType === 'acwr' && latest.acwr !== null) {
    const zone: ACWRZone = getACWRZoneStatus(
      latest.acwr,
      baselines.acwrLowerBound,
      baselines.acwrUpperBound
    );

    const riskLevel: 'low' | 'moderate' | 'high' =
      zone === 'sweet-spot' ? 'low' :
      zone === 'caution' || zone === 'underload' ? 'moderate' : 'high';

    const message = generateACWRZoneFeedback(latest.acwr, zone, latest.totalDistanceKm);
    const deviation = ((latest.acwr - baselines.acwrMean) / baselines.acwrMean * 100).toFixed(0);

    const zoneLabel =
      zone === 'underload' ? 'Recovery/Underload' :
      zone === 'sweet-spot' ? 'Sweet Spot' :
      zone === 'caution' ? 'Caution Zone' :
      zone === 'high-risk' ? 'High Risk' : 'Extreme Risk';

    return (
      <div className={`ai-insight ${getRiskLevelClass(riskLevel)}`}>
        <div className="ai-insight-header">
          <span className="ai-insight-icon">{getRiskIcon(riskLevel)}</span>
          <strong className="ai-insight-title">AI Coach Insight: Workload ({zoneLabel})</strong>
        </div>
        <p className="ai-insight-message">{message}</p>
        <div className="ai-insight-details">
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Current ACWR:</span>
            <span className="ai-insight-value">{latest.acwr.toFixed(2)}</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Universal Zone:</span>
            <span className="ai-insight-value">0.8 - 1.3</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Your Zone:</span>
            <span className="ai-insight-value">
              {baselines.acwrLowerBound.toFixed(2)} - {baselines.acwrUpperBound.toFixed(2)}
            </span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">vs Your Avg:</span>
            <span className="ai-insight-value">{deviation > 0 ? '+' : ''}{deviation}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'fatigue' && latest.fatigueIndex !== null) {
    const riskLevel = latest.fatigueIndex > baselines.fatigueThreshold ? 'high' : 'low';
    const message = generateInsightMessage('fatigue', latest.fatigueIndex, baselines.fatigueThreshold, baselines.fatigueThreshold);

    return (
      <div className={`ai-insight ${getRiskLevelClass(riskLevel)}`}>
        <div className="ai-insight-header">
          <span className="ai-insight-icon">{getRiskIcon(riskLevel)}</span>
          <strong className="ai-insight-title">AI Coach Insight: Fatigue</strong>
        </div>
        <p className="ai-insight-message">{message}</p>
        <div className="ai-insight-details">
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Current Fatigue:</span>
            <span className="ai-insight-value">{latest.fatigueIndex}/100</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Your Threshold:</span>
            <span className="ai-insight-value">{baselines.fatigueThreshold.toFixed(0)}/100</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Weekly Volume:</span>
            <span className="ai-insight-value">{latest.totalDistanceKm.toFixed(1)} km</span>
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'efficiency' && latest.efficiencyScore !== null) {
    const deviation = ((latest.efficiencyScore - baselines.baselineEfficiency) / baselines.baselineEfficiency * 100).toFixed(0);
    const message = generateInsightMessage('efficiency', latest.efficiencyScore, baselines.baselineEfficiency, 5);
    const riskLevel: 'low' | 'moderate' | 'high' = Math.abs(parseFloat(deviation)) > 10 ? 'moderate' : 'low';

    const trendMessage = baselines.efficiencyTrendSlope > 0
      ? `Your efficiency is trending upward (+${(baselines.efficiencyTrendSlope * 10).toFixed(2)}/week). Aerobic adaptations are progressing well.`
      : baselines.efficiencyTrendSlope < -0.1
      ? `Your efficiency is declining (${(baselines.efficiencyTrendSlope * 10).toFixed(2)}/week). Focus on easy base building and recovery.`
      : 'Your efficiency is stable. Continue current training approach.';

    return (
      <div className={`ai-insight ${getRiskLevelClass(riskLevel)}`}>
        <div className="ai-insight-header">
          <span className="ai-insight-icon">{getRiskIcon(riskLevel)}</span>
          <strong className="ai-insight-title">AI Coach Insight: Efficiency</strong>
        </div>
        <p className="ai-insight-message">{message}</p>
        <p className="ai-insight-trend">{trendMessage}</p>
        <div className="ai-insight-details">
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Current Efficiency:</span>
            <span className="ai-insight-value">{latest.efficiencyScore.toFixed(1)}</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Your Baseline:</span>
            <span className="ai-insight-value">{baselines.baselineEfficiency.toFixed(1)}</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Change:</span>
            <span className="ai-insight-value">{deviation > 0 ? '+' : ''}{deviation}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'weekly_load') {
    const avgLoad = metrics.length > 4
      ? metrics.slice(-4).reduce((sum, m) => sum + m.totalDistanceKm, 0) / 4
      : baselines.acwrMean * latest.totalDistanceKm;

    const deviation = ((latest.totalDistanceKm - avgLoad) / avgLoad * 100).toFixed(0);
    const riskLevel: 'low' | 'moderate' | 'high' =
      Math.abs(parseFloat(deviation)) > 30 ? 'high' :
      Math.abs(parseFloat(deviation)) > 15 ? 'moderate' : 'low';

    let message = '';
    if (parseFloat(deviation) > 30) {
      message = `Weekly volume is ${deviation}% above your recent average. This rapid increase may elevate injury risk. Consider adding an extra rest day.`;
    } else if (parseFloat(deviation) > 15) {
      message = `Weekly volume is ${deviation}% above average. Monitor fatigue closely and maintain proper recovery protocols.`;
    } else if (parseFloat(deviation) < -30) {
      message = `Weekly volume is significantly reduced (${Math.abs(parseFloat(deviation))}% below average). Good for recovery, but extend periods may lead to detraining.`;
    } else {
      message = `Weekly volume is well-balanced at ${latest.totalDistanceKm.toFixed(1)} km. Continue current progression.`;
    }

    return (
      <div className={`ai-insight ${getRiskLevelClass(riskLevel)}`}>
        <div className="ai-insight-header">
          <span className="ai-insight-icon">{getRiskIcon(riskLevel)}</span>
          <strong className="ai-insight-title">AI Coach Insight: Training Load</strong>
        </div>
        <p className="ai-insight-message">{message}</p>
        <div className="ai-insight-details">
          <div className="ai-insight-stat">
            <span className="ai-insight-label">This Week:</span>
            <span className="ai-insight-value">{latest.totalDistanceKm.toFixed(1)} km</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">4-Week Avg:</span>
            <span className="ai-insight-value">{avgLoad.toFixed(1)} km</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Run Count:</span>
            <span className="ai-insight-value">{latest.runCount}</span>
          </div>
          <div className="ai-insight-stat">
            <span className="ai-insight-label">Quality Sessions:</span>
            <span className="ai-insight-value">{latest.qualitySessions}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
