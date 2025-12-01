import { useEffect, useState } from 'react';
import { getTrainingInsights } from '@/lib/adaptivePlan';
import { getFitnessTrend } from '@/lib/fitnessCalculator';

type Insights = {
  progressionRatio: number;
  last7DaysKm: number;
  last28DaysKm: number;
  recommendation: string;
  fitnessScore: number;
};

export default function TrainingInsights() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [trend, setTrend] = useState<{ date: string; fitness_score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        const data = await getTrainingInsights();
        setInsights(data);

        const fitnessHistory = await getFitnessTrend(28);
        setTrend(fitnessHistory);
      } catch (err) {
        console.error('Failed to load training insights:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();

    const interval = setInterval(loadInsights, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="card">
        <h2 className="h2">Training Insights</h2>
        <div className="small">Loading insights…</div>
      </section>
    );
  }

  if (!insights) {
    return (
      <section className="card">
        <h2 className="h2">Training Insights</h2>
        <div className="small">No data available yet. Import your training log to see insights.</div>
      </section>
    );
  }

  const getRatioColor = (ratio: number) => {
    if (ratio > 1.5) return 'var(--bad)';
    if (ratio > 1.3) return 'var(--warning)';
    if (ratio < 0.8) return 'var(--muted)';
    return 'var(--good)';
  };

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case 'increase':
        return 'Volume is low - consider adding more training';
      case 'reduce':
        return 'High load detected - prioritize recovery';
      case 'taper':
        return 'Entering taper period - reduce volume';
      default:
        return 'Training load is balanced';
    }
  };

  return (
    <section className="card">
      <h2 className="h2">Training Insights (AI-Powered)</h2>

      <div className="grid" style={{ gap: 12, marginTop: 12 }}>
        <div>
          <div className="kv">
            <span>Progression Ratio</span>
            <b style={{ color: getRatioColor(insights.progressionRatio) }}>
              {insights.progressionRatio.toFixed(2)}
            </b>
          </div>
          <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
            Last 7 days: {insights.last7DaysKm.toFixed(1)} km | Last 28 days: {insights.last28DaysKm.toFixed(1)} km
          </div>
        </div>

        <div>
          <div className="kv">
            <span>Fitness Score</span>
            <b>{insights.fitnessScore.toFixed(0)}/100</b>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 8,
              background: 'var(--line)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${insights.fitnessScore}%`,
                background: 'var(--brand)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div className="small" style={{ background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
          <b>Recommendation:</b> {getRecommendationText(insights.recommendation)}
        </div>

        {trend.length > 0 && (
          <div>
            <div className="small" style={{ marginBottom: 6 }}>
              <b>Fitness Trend (28 days)</b>
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40 }}>
              {trend.map((t, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${t.fitness_score}%`,
                    background: 'var(--brand)',
                    borderRadius: 2,
                    minHeight: 2,
                  }}
                  title={`${t.date}: ${t.fitness_score.toFixed(0)}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
