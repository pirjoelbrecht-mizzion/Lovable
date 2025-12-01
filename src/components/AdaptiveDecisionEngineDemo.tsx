/**
 * ======================================================================
 *  ADAPTIVE DECISION ENGINE - INTEGRATION DEMO
 *  Shows how to integrate ADE into any page/component
 * ======================================================================
 */

import { useState } from 'react';
import { useAdaptiveDecisionEngine, useDecisionStats } from '@/hooks/useAdaptiveDecisionEngine';
import TrainingAdjustmentExplanation from './TrainingAdjustmentExplanation';
import type { AdaptiveContext } from '@/engine';

export default function AdaptiveDecisionEngineDemo() {
  const {
    decision,
    isLoading,
    error,
    computeAndApplyDecision,
    refreshLatestDecision,
    history,
    loadHistory
  } = useAdaptiveDecisionEngine();

  const { stats, safetyOverrideCount } = useDecisionStats(30);

  const [showHistory, setShowHistory] = useState(false);

  /**
   * Example: Trigger ADE computation with real context
   */
  const handleComputeDecision = async () => {
    // Build context from app state (this is just example data)
    const context: AdaptiveContext = {
      athlete: {
        id: 'user-123',
        name: 'Demo User',
        category: 'Cat1',
        experienceLevel: 'intermediate',
        weeklyVolumeCeiling: 80
      },
      plan: {
        weekStart: new Date().toISOString().split('T')[0],
        weekNumber: 12,
        phase: 'build',
        targetMileage: 60,
        days: [
          {
            date: '2025-11-18',
            workout: {
              id: '1',
              type: 'easy',
              distanceKm: 10,
              durationMinutes: 60,
              notes: 'Easy recovery run'
            }
          },
          {
            date: '2025-11-19',
            workout: {
              id: '2',
              type: 'intervals',
              distanceKm: 12,
              durationMinutes: 75,
              notes: '5x1km @ threshold pace'
            }
          },
          {
            date: '2025-11-20',
            workout: {
              id: '3',
              type: 'easy',
              distanceKm: 8,
              durationMinutes: 50,
              notes: 'Easy run'
            }
          },
          {
            date: '2025-11-21',
            workout: {
              id: '4',
              type: 'tempo',
              distanceKm: 14,
              durationMinutes: 85,
              notes: 'Tempo run'
            }
          },
          {
            date: '2025-11-22',
            workout: {
              id: '5',
              type: 'rest',
              distanceKm: 0,
              durationMinutes: 0,
              notes: 'Rest day'
            }
          },
          {
            date: '2025-11-23',
            workout: {
              id: '6',
              type: 'long',
              distanceKm: 20,
              durationMinutes: 140,
              notes: 'Long run'
            }
          },
          {
            date: '2025-11-24',
            workout: {
              id: '7',
              type: 'easy',
              distanceKm: 6,
              durationMinutes: 40,
              notes: 'Recovery run'
            }
          }
        ]
      },
      acwr: {
        current: 1.85, // High - should trigger adjustment
        projected: 1.9,
        trend: 'rising',
        riskLevel: 'high'
      },
      climate: {
        currentTemp: 32,
        humidity: 75,
        heatIndex: 38,
        wbgt: 29,
        level: 'orange', // High heat - should trigger adjustment
        conditions: 'Hot and humid'
      },
      motivation: {
        archetype: 'performer',
        confidence: 0.85,
        recentEngagement: 0.9
      },
      races: {
        mainRace: {
          id: 'race-1',
          name: 'Desert Ultra 100K',
          date: '2025-12-15',
          distanceKm: 100,
          priority: 'A',
          verticalGain: 2500,
          climate: 'hot'
        },
        nextRace: {
          id: 'race-1',
          name: 'Desert Ultra 100K',
          date: '2025-12-15',
          distanceKm: 100,
          priority: 'A',
          verticalGain: 2500,
          climate: 'hot'
        },
        allUpcoming: [],
        daysToMainRace: 27,
        daysToNextRace: 27
      },
      history: {
        completionRate: 0.85,
        averageFatigue: 6.5,
        missedWorkouts: 1,
        lastHardWorkout: 3
      },
      location: {
        currentElevation: 1200,
        recentElevationGain: 2000,
        terrainType: 'mixed',
        isTravel: false
      }
    };

    await computeAndApplyDecision(context);
  };

  const handleLoadHistory = async () => {
    await loadHistory(20);
    setShowHistory(true);
  };

  return (
    <div className="ade-demo">
      <div className="ade-header">
        <h2>Adaptive Decision Engine</h2>
        <p>
          The brain of the training system - integrates all learning modules to make intelligent
          adjustments
        </p>
      </div>

      {/* Control Panel */}
      <div className="ade-controls">
        <button onClick={handleComputeDecision} disabled={isLoading} className="btn-primary">
          {isLoading ? 'Computing...' : 'Compute New Decision'}
        </button>

        <button onClick={refreshLatestDecision} disabled={isLoading} className="btn-secondary">
          Refresh Latest
        </button>

        <button onClick={handleLoadHistory} className="btn-secondary">
          View History
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="ade-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats Panel */}
      {stats && (
        <div className="ade-stats">
          <h3>Decision Analytics (Last 30 Days)</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalDecisions}</div>
              <div className="stat-label">Total Decisions</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{safetyOverrideCount}</div>
              <div className="stat-label">Safety Overrides</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{Math.round(stats.averageConfidence * 100)}%</div>
              <div className="stat-label">Avg Confidence</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.mostCommonLayer}</div>
              <div className="stat-label">Most Active Layer</div>
            </div>
          </div>

          <div className="layer-rates">
            <h4>Layer Application Rates</h4>
            {Object.entries(stats.layerApplicationRate).map(([layer, rate]) => (
              <div key={layer} className="layer-rate-bar">
                <span className="layer-name">{layer}</span>
                <div className="rate-bar">
                  <div
                    className="rate-fill"
                    style={{ width: `${Math.round(rate * 100)}%` }}
                  />
                </div>
                <span className="rate-percent">{Math.round(rate * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Decision Display */}
      {decision && (
        <div className="ade-decision">
          <h3>Latest Adaptive Decision</h3>
          <TrainingAdjustmentExplanation decision={decision} expanded={true} />
        </div>
      )}

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="ade-history">
          <h3>Decision History</h3>
          <div className="history-list">
            {history.map((entry, idx) => (
              <div key={entry.id} className="history-entry">
                <div className="history-header">
                  <span className="history-date">
                    {new Date(entry.applied_at).toLocaleString()}
                  </span>
                  <span className="history-confidence">
                    {Math.round(entry.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="history-details">
                  <div className="detail-item">
                    <strong>Layers Applied:</strong> {entry.layer_count}
                  </div>
                  {entry.safety_override_count > 0 && (
                    <div className="detail-item safety">
                      <strong>Safety Overrides:</strong> {entry.safety_override_count}
                    </div>
                  )}
                </div>

                {entry.safety_flags.length > 0 && (
                  <div className="history-flags">
                    {entry.safety_flags.map((flag, fidx) => (
                      <div key={fidx} className="safety-flag">
                        {flag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .ade-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .ade-header {
          margin-bottom: 32px;
        }

        .ade-header h2 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .ade-header p {
          margin: 0;
          color: #6B7280;
          font-size: 16px;
        }

        .ade-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 14px;
        }

        .btn-primary {
          background: #3B82F6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563EB;
        }

        .btn-primary:disabled {
          background: #9CA3AF;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #F3F4F6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #E5E7EB;
        }

        .ade-error {
          background: #FEF2F2;
          border-left: 4px solid #DC2626;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #991B1B;
        }

        .ade-stats {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .ade-stats h3 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #F9FAFB;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #3B82F6;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #6B7280;
          font-weight: 500;
        }

        .layer-rates {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 2px solid #E5E7EB;
        }

        .layer-rates h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .layer-rate-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .layer-name {
          min-width: 150px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .rate-bar {
          flex: 1;
          height: 24px;
          background: #E5E7EB;
          border-radius: 4px;
          overflow: hidden;
        }

        .rate-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6, #2563EB);
          transition: width 0.3s;
        }

        .rate-percent {
          min-width: 50px;
          text-align: right;
          font-size: 13px;
          font-weight: 600;
          color: #3B82F6;
        }

        .ade-decision {
          margin-bottom: 24px;
        }

        .ade-decision h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .ade-history {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .ade-history h3 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .history-entry {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 16px;
          border-left: 3px solid #3B82F6;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .history-date {
          font-size: 13px;
          color: #6B7280;
        }

        .history-confidence {
          font-size: 12px;
          font-weight: 600;
          color: #3B82F6;
          background: #E0F2FE;
          padding: 4px 8px;
          border-radius: 10px;
        }

        .history-details {
          display: flex;
          gap: 24px;
          margin-bottom: 8px;
        }

        .detail-item {
          font-size: 13px;
          color: #374151;
        }

        .detail-item.safety {
          color: #DC2626;
          font-weight: 600;
        }

        .history-flags {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
        }

        .safety-flag {
          background: #FEF2F2;
          color: #991B1B;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}
