import { useState, useEffect } from 'react';
import {
  getRaceFeedbackTrend,
  getDNFHistory,
  calculateFeedbackCompletionRate
} from '../services/feedbackService';
import {
  analyzeRaceLimiters,
  analyzeDNFPatterns
} from '../lib/adaptive-coach/weighted-feedback-processor';
import type { RaceFeedback, DNFEvent } from '../types/feedback';

export function FeedbackInsightsCard() {
  const [raceFeedback, setRaceFeedback] = useState<RaceFeedback[]>([]);
  const [dnfEvents, setDNFEvents] = useState<DNFEvent[]>([]);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedbackData();
  }, []);

  async function loadFeedbackData() {
    setLoading(true);
    try {
      const [races, dnfs] = await Promise.all([
        getRaceFeedbackTrend(90),
        getDNFHistory(365),
      ]);

      setRaceFeedback(races);
      setDNFEvents(dnfs);

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const startDateStr = startDate.toISOString().split('T')[0];

      const stats = await calculateFeedbackCompletionRate(startDateStr, endDate);
      setCompletionRate(stats.completionRate);
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <div className="spinner" />
        <p className="small" style={{ color: 'var(--muted)', marginTop: 12 }}>
          Loading feedback insights...
        </p>
      </div>
    );
  }

  const raceLimiters = analyzeRaceLimiters(raceFeedback);
  const dnfPatterns = analyzeDNFPatterns(dnfEvents);

  const topLimiter = Object.entries(raceLimiters)
    .sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 className="h3" style={{ marginBottom: 16 }}>
        Feedback Insights
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="small" style={{ color: 'var(--muted)', marginBottom: 8, display: 'block' }}>
            Feedback Completion Rate (Last 30 days)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                flex: 1,
                height: 8,
                background: 'var(--card)',
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionRate}%`,
                  background: completionRate > 80
                    ? 'var(--success)'
                    : completionRate > 60
                    ? 'var(--warning)'
                    : 'var(--danger)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span className="small" style={{ fontWeight: 600, minWidth: 45 }}>
              {Math.round(completionRate)}%
            </span>
          </div>
        </div>

        {raceFeedback.length > 0 && (
          <div>
            <label className="small" style={{ color: 'var(--muted)', marginBottom: 8, display: 'block' }}>
              Most Common Race Limiter
            </label>
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--accent-bg)',
                borderRadius: 8,
                border: '1px solid var(--accent)'
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="small" style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {topLimiter?.[0] || 'None'}
                </span>
                <span className="small" style={{ color: 'var(--muted)' }}>
                  {topLimiter?.[1] || 0} races
                </span>
              </div>
            </div>
          </div>
        )}

        {dnfEvents.length > 0 && (
          <div>
            <label className="small" style={{ color: 'var(--muted)', marginBottom: 8, display: 'block' }}>
              DNF Analysis
            </label>
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--warning-bg)',
                borderRadius: 8,
                border: '1px solid var(--warning)'
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="small" style={{ fontWeight: 600 }}>
                  Total DNFs: {dnfPatterns.totalDNFs}
                </span>
                <span className="small" style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>
                  Most common: {dnfPatterns.mostCommonCause}
                </span>
              </div>
              {dnfPatterns.preventiveRecommendations.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className="small" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6 }}>
                    Preventive Actions:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11 }}>
                    {dnfPatterns.preventiveRecommendations.slice(0, 2).map((rec, i) => (
                      <li key={i} className="small">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {raceFeedback.length === 0 && dnfEvents.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              background: 'var(--card)',
              borderRadius: 8
            }}
          >
            <p className="small" style={{ color: 'var(--muted)' }}>
              No race or DNF feedback yet. Complete a race or simulation to see insights here.
            </p>
          </div>
        )}

        <div
          style={{
            paddingTop: 12,
            borderTop: '1px solid var(--line)'
          }}
        >
          <p className="small" style={{ color: 'var(--muted)', fontSize: 11, lineHeight: 1.5 }}>
            Your feedback helps your AI coach learn and adapt. Race feedback is 5× more valuable than training feedback.
          </p>
        </div>
      </div>
    </div>
  );
}
