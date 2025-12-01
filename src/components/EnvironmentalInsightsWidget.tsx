import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId } from '@/lib/supabase';
import { getHeatToleranceProfile } from '@/lib/environmental-learning/heatTolerance';
import { getAltitudeProfile } from '@/lib/environmental-learning/altitudeResponse';
import { getOptimalTimeProfile } from '@/lib/environmental-learning/optimalTime';

export default function EnvironmentalInsightsWidget() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<{
    hasHeatData: boolean;
    hasAltitudeData: boolean;
    hasTimeData: boolean;
    optimalTemp?: number;
    bestTime?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const [heat, altitude, time] = await Promise.all([
        getHeatToleranceProfile(userId),
        getAltitudeProfile(userId),
        getOptimalTimeProfile(userId),
      ]);

      setInsights({
        hasHeatData: heat !== null && heat.confidenceScore > 0,
        hasAltitudeData: altitude !== null && altitude.confidenceScore > 0,
        hasTimeData: time !== null && time.confidenceScore > 0,
        optimalTemp: heat?.optimalTempC,
        bestTime: time?.bestTimeOfDay.replace('_', ' '),
      });
    } catch (err) {
      console.error('Error loading environmental insights:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ color: 'var(--text-secondary)' }}>Loading insights...</div>
      </div>
    );
  }

  if (!insights || (!insights.hasHeatData && !insights.hasAltitudeData && !insights.hasTimeData)) {
    return (
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>🌡️ Environmental Insights</h3>
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Log more runs in different conditions to unlock personalized environmental insights.
        </p>
        <button
          onClick={() => navigate('/environmental')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Learn More
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🌡️ Environmental Insights</h3>
        <button
          onClick={() => navigate('/environmental')}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: 'transparent',
            color: 'var(--primary-color)',
            border: '1px solid var(--primary-color)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View All
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {insights.hasHeatData && insights.optimalTemp && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>🌡️</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Heat Tolerance Learned</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Your optimal temperature: {insights.optimalTemp}°C
              </div>
            </div>
          </div>
        )}

        {insights.hasAltitudeData && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>⛰️</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Altitude Response Learned</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Personalized altitude predictions enabled
              </div>
            </div>
          </div>
        )}

        {insights.hasTimeData && insights.bestTime && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>🕐</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                Best Time: {insights.bestTime}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Optimal performance window identified
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
