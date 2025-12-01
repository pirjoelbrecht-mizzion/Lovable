/**
 * Statistical Learning Dashboard
 *
 * Visualizes the advanced learning loop:
 * - Model performance metrics
 * - Trend detection with confidence
 * - Outlier identification
 * - Ensemble model contributions
 * - Bayesian uncertainty
 * - Prediction intervals
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
  Cell,
} from 'recharts';
import type { LearningState, LearningLoopResult } from '@/lib/statistical-learning/learning-loop';

interface Props {
  learningResult: LearningLoopResult;
  historicalData: Array<{
    date: string;
    actual: number;
    predicted?: number;
  }>;
}

export function StatisticalLearningDashboard({ learningResult, historicalData }: Props) {
  const { state, prediction, recommendations, insights } = learningResult;

  // Prepare data for visualization
  const chartData = useMemo(() => {
    return historicalData.map((d, idx) => ({
      ...d,
      isOutlier: state.dataQuality.outliers.includes(idx),
      lowerBound: d.predicted ? d.predicted - prediction.uncertainty : undefined,
      upperBound: d.predicted ? d.predicted + prediction.uncertainty : undefined,
    }));
  }, [historicalData, state.dataQuality.outliers, prediction.uncertainty]);

  // Model contribution data
  const contributionData = prediction.modelContributions.map(c => ({
    model: c.modelId.replace(/_/g, ' '),
    contribution: (c.weight * 100).toFixed(1),
    prediction: c.prediction.toFixed(1),
  }));

  // Bayesian uncertainty data
  const uncertaintyData = state.bayesianModel?.posterior.uncertainty.map((u, i) => ({
    feature: `Feature ${i + 1}`,
    uncertainty: u,
    mean: state.bayesianModel.posterior.mean[i],
    lower: state.bayesianModel.posterior.credibleIntervals[i].lower,
    upper: state.bayesianModel.posterior.credibleIntervals[i].upper,
  })) || [];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: 16,
      padding: 24,
      color: 'white',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>
          🧠 Statistical Learning Engine
        </h2>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
          Advanced predictive models with uncertainty quantification
        </p>
      </div>

      {/* Performance Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <MetricCard
          title="Model R² Score"
          value={`${(state.performance.r2 * 100).toFixed(1)}%`}
          subtitle={state.performance.r2 > 0.7 ? 'Excellent fit' : state.performance.r2 > 0.5 ? 'Good fit' : 'Fair fit'}
          color="#10b981"
        />
        <MetricCard
          title="MAE"
          value={state.performance.mae.toFixed(2)}
          subtitle="Mean Absolute Error"
          color="#3b82f6"
        />
        <MetricCard
          title="Confidence"
          value={`${(prediction.confidence * 100).toFixed(1)}%`}
          subtitle="Ensemble confidence"
          color="#8b5cf6"
        />
        <MetricCard
          title="Data Quality"
          value={`${(100 - state.dataQuality.outlierPercentage).toFixed(1)}%`}
          subtitle={`${state.dataQuality.outliers.length} outliers removed`}
          color="#f59e0b"
        />
      </div>

      {/* Trend Analysis */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>
          📈 Trend Detection (Mann-Kendall Test)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <TrendBadge trend={state.trendAnalysis.direction} />
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            Slope: <strong style={{ color: 'white' }}>{(state.trendAnalysis.slope * 7).toFixed(2)} km/week</strong>
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            Confidence: <strong style={{ color: 'white' }}>{(state.trendAnalysis.confidence * 100).toFixed(1)}%</strong>
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            p-value: <strong style={{ color: 'white' }}>{state.trendAnalysis.pValue.toFixed(4)}</strong>
          </div>
        </div>
      </div>

      {/* Main Chart: Predictions with Uncertainty */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>
          Predictions with Uncertainty Intervals
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend />

            {/* Uncertainty band */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="url(#uncertaintyGradient)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="url(#uncertaintyGradient)"
              fillOpacity={1}
            />

            {/* Actual values with outlier highlighting */}
            <Scatter name="Actual" dataKey="actual">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOutlier ? '#ef4444' : '#10b981'}
                  r={entry.isOutlier ? 6 : 4}
                />
              ))}
            </Scatter>

            {/* Predicted values */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              name="Predicted"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Ensemble Model Contributions */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>
          Ensemble Model Contributions
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={contributionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="model" stroke="#94a3b8" style={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
            <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="contribution" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bayesian Uncertainty (if available) */}
      {state.bayesianModel && uncertaintyData.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>
            Bayesian Model: Coefficient Uncertainty
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={uncertaintyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis type="number" stroke="#94a3b8" style={{ fontSize: 12 }} />
              <YAxis dataKey="feature" type="category" stroke="#94a3b8" style={{ fontSize: 11 }} width={80} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="mean" fill="#10b981" radius={[0, 4, 4, 0]}>
                <Cell />
              </Bar>
              <ReferenceLine x={0} stroke="#fff" strokeOpacity={0.3} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
            <strong>Observations:</strong> {state.bayesianModel.observations} |
            <strong> Model Confidence:</strong> {(state.performance.confidence * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Insights and Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Insights */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: 12,
          padding: 16,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0' }}>
            💡 Model Insights
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
            {insights.map((insight, i) => (
              <li key={i} style={{ marginBottom: 8 }}>{insight}</li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 12,
          padding: 16,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0' }}>
            🎯 Recommendations
          </h3>
          {recommendations.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
              {recommendations.map((rec, i) => (
                <li key={i} style={{ marginBottom: 8 }}>{rec}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>
              No specific recommendations - models are performing well!
            </p>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div style={{
        marginTop: 24,
        paddingTop: 16,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: 13,
        color: '#94a3b8',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <strong>Last Updated:</strong> {state.lastUpdated.toLocaleString()}
        </div>
        <div>
          <strong>Training Samples:</strong> {state.observationCount}
        </div>
        <div>
          <strong>Ensemble Diversity:</strong> {prediction.uncertainty.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: 16,
    }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) {
  const config = {
    increasing: { icon: '📈', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Increasing' },
    decreasing: { icon: '📉', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Decreasing' },
    stable: { icon: '➡️', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Stable' },
  }[trend];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      background: config.bg,
      border: `1px solid ${config.color}40`,
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      color: config.color,
    }}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
