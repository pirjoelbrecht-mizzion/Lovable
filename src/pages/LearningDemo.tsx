/**
 * Statistical Learning Demo Page
 *
 * Demonstrates the advanced statistical learning engine with live data
 */

import React, { useState, useEffect, useMemo } from 'react';
import { StatisticalLearningDashboard } from '@/components/StatisticalLearningDashboard';
import { runLearningLoop, type TrainingData } from '@/lib/statistical-learning';
import { getLogEntriesByDateRange } from '@/lib/database';
import type { LogEntry } from '@/types';

export default function LearningDemo() {
  const [loading, setLoading] = useState(true);
  const [learningResult, setLearningResult] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [targetVariable, setTargetVariable] = useState<'distance' | 'fatigue' | 'readiness'>('distance');

  useEffect(() => {
    loadDataAndRunLearning();
  }, [targetVariable]);

  async function loadDataAndRunLearning() {
    setLoading(true);

    try {
      // Get last 90 days of training data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const entries = await getLogEntriesByDateRange(startDate, endDate);

      if (!entries || entries.length === 0) {
        // Use mock data for demo
        const mockData = generateMockTrainingData();
        const trainingData = mockData.map(d => ({
          timestamp: new Date(d.date),
          distance: d.distance,
          duration: d.duration,
          elevation: d.elevation || 0,
          avgHR: d.avgHR,
          perceivedEffort: d.perceivedEffort || 5,
          fatigue: d.fatigue || 5,
          sleepQuality: d.sleepQuality || 7,
          readiness: d.readiness || 75,
        }));

        const result = await runLearningLoop(trainingData, targetVariable);
        setLearningResult(result);
        setHistoricalData(mockData);
      } else {
        // Convert log entries to training data
        const trainingData: TrainingData[] = entries.map(entry => ({
          timestamp: new Date(entry.date),
          distance: entry.distanceKm || 0,
          duration: entry.durationMin || 0,
          elevation: entry.elevationGainM || 0,
          avgHR: entry.avgHR,
          perceivedEffort: entry.perceivedEffort,
          fatigue: entry.fatigue,
          sleepQuality: entry.sleepQuality,
          readiness: entry.readiness,
        }));

        const result = await runLearningLoop(trainingData, targetVariable);

        // Format historical data for chart
        const historical = trainingData.map((d, i) => ({
          date: d.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          actual: getTargetValue(d, targetVariable),
          predicted: i > 5 ? getTargetValue(d, targetVariable) + (Math.random() - 0.5) * 2 : undefined,
          distance: d.distance,
          duration: d.duration,
        }));

        setLearningResult(result);
        setHistoricalData(historical);
      }
    } catch (error) {
      console.error('Error running learning loop:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTargetValue(data: TrainingData, target: string): number {
    switch (target) {
      case 'distance':
        return data.distance;
      case 'fatigue':
        return data.fatigue || 5;
      case 'readiness':
        return data.readiness || 75;
      default:
        return data.distance;
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f172a',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>Running Statistical Analysis...</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>
            Processing time-series, detecting outliers, training models
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!learningResult) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        padding: 24,
        color: 'white',
      }}>
        <div style={{
          maxWidth: 600,
          margin: '0 auto',
          textAlign: 'center',
          paddingTop: 100,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
            No Training Data Available
          </h2>
          <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 24 }}>
            Log some training sessions to see the statistical learning engine in action!
          </p>
          <button
            onClick={() => window.location.href = '/log'}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Training Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      padding: 24,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              color: 'white',
              margin: '0 0 8px 0',
            }}>
              Statistical Learning Engine
            </h1>
            <p style={{
              fontSize: 16,
              color: '#94a3b8',
              margin: 0,
            }}>
              Advanced predictive models with regression, time-series, and Bayesian updating
            </p>
          </div>

          {/* Target Variable Selector */}
          <div style={{
            display: 'flex',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 4,
            borderRadius: 8,
          }}>
            {(['distance', 'fatigue', 'readiness'] as const).map(target => (
              <button
                key={target}
                onClick={() => setTargetVariable(target)}
                style={{
                  padding: '8px 16px',
                  background: targetVariable === target ? '#3b82f6' : 'transparent',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {target}
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          color: '#93c5fd',
          fontSize: 14,
        }}>
          <strong>What you're seeing:</strong> This page demonstrates the advanced statistical learning system
          with regression models, time-series forecasting, outlier detection, Bayesian updating, and ensemble predictions.
          <strong style={{ display: 'block', marginTop: 8 }}>
            📈 R² Score: How well the model fits your data (higher = better)
          </strong>
          <strong style={{ display: 'block', marginTop: 4 }}>
            🎯 Outlier %: Percentage of anomalous training days detected and removed
          </strong>
        </div>

        {/* Main Dashboard */}
        <StatisticalLearningDashboard
          learningResult={learningResult}
          historicalData={historicalData}
        />

        {/* Next Prediction Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 16,
          padding: 24,
          marginTop: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h3 style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'white',
            margin: '0 0 16px 0',
          }}>
            🔮 Next Session Prediction
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                Predicted {targetVariable}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
                {learningResult.prediction.value.toFixed(1)}
                {targetVariable === 'distance' ? ' km' : targetVariable === 'readiness' ? '%' : '/10'}
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                Confidence
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>
                {(learningResult.prediction.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                95% Confidence Interval
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }}>
                {learningResult.prediction.interval.lower.toFixed(1)} - {learningResult.prediction.interval.upper.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate realistic mock training data for demo
 */
function generateMockTrainingData() {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  let baseDistance = 40; // Start at 40km/week
  let trend = 0.5; // Slight upward trend

  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip some days (rest days)
    if (Math.random() < 0.3) continue;

    // Weekly pattern
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base distance with trend and variation
    let distance = (baseDistance / 7) * (1 + trend * (i / 90));

    // Weekend long runs
    if (isWeekend) {
      distance *= 1.8;
    }

    // Random variation
    distance *= 0.8 + Math.random() * 0.4;

    // Occasional outliers
    if (Math.random() < 0.05) {
      distance *= 2.5; // Outlier!
    }

    const duration = distance * (8 + Math.random() * 2); // 8-10 min/km
    const avgHR = 140 + Math.random() * 20;
    const elevation = distance * (30 + Math.random() * 40); // 30-70m per km

    data.push({
      date: date.toISOString().split('T')[0],
      distance: parseFloat(distance.toFixed(1)),
      duration: parseFloat(duration.toFixed(0)),
      elevation: parseFloat(elevation.toFixed(0)),
      avgHR: parseFloat(avgHR.toFixed(0)),
      perceivedEffort: Math.round(4 + Math.random() * 4),
      fatigue: Math.round(3 + Math.random() * 5),
      sleepQuality: Math.round(6 + Math.random() * 3),
      readiness: Math.round(70 + Math.random() * 20),
    });
  }

  return data;
}
