import { useState, useEffect } from 'react';
import { generateProactiveRecommendations, type WorkoutRecommendation } from '@/services/proactiveRecommendations';

export default function ProactiveRecommendationsWidget() {
  const [recommendations, setRecommendations] = useState<WorkoutRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    try {
      const recs = await generateProactiveRecommendations();
      setRecommendations(recs);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (recommendations.length === 0) {
    return null;
  }

  const priorityColors = {
    high: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: 'rgb(239, 68, 68)',
    },
    medium: {
      bg: 'rgba(251, 191, 36, 0.1)',
      border: 'rgba(251, 191, 36, 0.3)',
      text: 'rgb(251, 191, 36)',
    },
    low: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: 'rgb(59, 130, 246)',
    },
  };

  const typeIcons = {
    optimal_window: '⏰',
    weather_alert: '🌤️',
    recovery_day: '💤',
    heat_warning: '🌡️',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {recommendations.map((rec, idx) => {
        const colors = priorityColors[rec.priority];
        const icon = typeIcons[rec.type];

        return (
          <div
            key={idx}
            style={{
              padding: '1rem',
              backgroundColor: colors.bg,
              border: `2px solid ${colors.border}`,
              borderRadius: '10px',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: colors.text, marginBottom: '0.25rem' }}>
                {rec.title}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {rec.message}
              </div>
              {rec.suggestedTime && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  💡 Suggested: {rec.suggestedTime}
                </div>
              )}
              {rec.weatherContext && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {rec.weatherContext.temperature.toFixed(0)}°C · {rec.weatherContext.conditions}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
