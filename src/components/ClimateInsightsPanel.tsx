import { useState, useEffect } from 'react';
import { getClimatePerformanceData, createTestClimateData, type ClimatePerformanceData } from '@/services/locationAnalytics';

type ClimateInsightsPanelProps = {
  daysBack?: number;
};

export default function ClimateInsightsPanel({ daysBack = 90 }: ClimateInsightsPanelProps) {
  const [data, setData] = useState<ClimatePerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<30 | 90 | 180 | 365>(90);
  const [actualWindow, setActualWindow] = useState<number>(90);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    loadData();
  }, [timeWindow]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[ClimateInsights] Loading data for timeWindow:', timeWindow);
      const result = await getClimatePerformanceData(timeWindow);
      console.log('[ClimateInsights] Result:', result);
      setData(result.data);
      setActualWindow(result.timeWindow);
      setUsedFallback(result.usedFallback);
    } catch (error) {
      console.error('[ClimateInsights] Error loading climate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: '#0f1115',
          borderRadius: 12,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ color: '#64748b', textAlign: 'center' }}>Loading climate insights...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          background: '#0f1115',
          borderRadius: 12,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 12 }}>
          Climate Performance Insights
        </h3>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 12 }}>
            No climate data available yet. This feature tracks how your performance varies across different locations and weather conditions.
          </p>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: '#94a3b8' }}>What you'll see here:</strong>
          </p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>Average pace in different climates</li>
            <li>Temperature and humidity impact on performance</li>
            <li>Climate adaptation recommendations</li>
            <li>Location-based performance comparisons</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
            Keep training to build your climate performance profile!
          </p>
          <button
            onClick={async () => {
              try {
                console.log('[ClimateInsights] Button clicked - starting test data generation');
                setLoading(true);
                const success = await createTestClimateData();
                console.log('[ClimateInsights] Test data generation result:', success);
                if (success) {
                  console.log('[ClimateInsights] Reloading data...');
                  await loadData();
                  console.log('[ClimateInsights] Data reloaded');
                } else {
                  console.error('[ClimateInsights] Test data generation failed');
                  alert('Failed to generate test data. Check console for details.');
                }
              } catch (error) {
                console.error('[ClimateInsights] Error in button click handler:', error);
                alert('Error generating test data: ' + error);
                setLoading(false);
              }
            }}
            style={{
              marginTop: 16,
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Generate Test Climate Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#0f1115',
        borderRadius: 12,
        padding: 20,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>
            Climate Performance Insights
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {[30, 90, 180, 365].map((days) => (
              <button
                key={days}
                onClick={() => setTimeWindow(days as any)}
                style={{
                  background: timeWindow === days ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          {usedFallback
            ? `Limited data - using last ${actualWindow} days`
            : `Based on last ${actualWindow} days of training data`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((location, idx) => {
          const paceImpact = location.pace_delta_vs_baseline || 0;
          const isSlower = paceImpact > 0;
          const impactColor = Math.abs(paceImpact) > 10 ? '#ef4444' : Math.abs(paceImpact) > 5 ? '#f59e0b' : '#22c55e';

          return (
            <div
              key={location.location}
              style={{
                background: idx === 0 ? 'rgba(59, 130, 246, 0.1)' : '#0a0b0d',
                border: idx === 0 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                    {location.location}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {location.sample_count} training sessions
                  </div>
                </div>
                {idx === 0 && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      letterSpacing: 0.5,
                    }}
                  >
                    MOST TRAINED
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>
                    AVG TEMP
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                    {location.avg_temp.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>
                    AVG HUMIDITY
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                    {location.avg_humidity.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>
                    AVG PACE
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                    {location.avg_pace.toFixed(2)} min/km
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    lineHeight: 1,
                  }}
                >
                  {isSlower ? '🔥' : '❄️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>
                    PACE IMPACT VS BASELINE
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: impactColor }}>
                    {isSlower ? '+' : ''}{paceImpact.toFixed(1)}% {isSlower ? 'slower' : 'faster'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#64748b',
                    textAlign: 'right',
                  }}
                >
                  {location.avg_heart_rate.toFixed(0)} bpm
                </div>
              </div>

              {Math.abs(paceImpact) > 5 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 10px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#fbbf24',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Climate Adaptation Tip:</strong>{' '}
                  {isSlower
                    ? 'Your pace is significantly affected by heat/humidity here. Consider early morning training or extending warm-up periods.'
                    : 'Excellent adaptation to local climate! Performance is optimal in these conditions.'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: '12px 14px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 8,
          fontSize: 12,
          color: '#60a5fa',
          lineHeight: 1.5,
        }}
      >
        <strong>💡 Climate Intelligence:</strong> Data shows how temperature and humidity affect your
        performance across locations. Use this to adjust training intensity and race pacing strategies.
      </div>
    </div>
  );
}
