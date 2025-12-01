import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getCurrentUserId } from '@/lib/supabase';
import { learnHeatTolerance, getHeatToleranceProfile, type HeatToleranceProfile } from '@/lib/environmental-learning/heatTolerance';
import { learnAltitudeResponse, getAltitudeProfile, type AltitudeProfile } from '@/lib/environmental-learning/altitudeResponse';
import { learnOptimalTrainingTime, getOptimalTimeProfile, type OptimalTimeProfile } from '@/lib/environmental-learning/optimalTime';
import { backfillEnvironmentalData } from '@/services/environmentalDataEnrichment';
import { toast } from './ToastHost';

export default function EnvironmentalLearningDashboard() {
  const [heatProfile, setHeatProfile] = useState<HeatToleranceProfile | null>(null);
  const [altitudeProfile, setAltitudeProfile] = useState<AltitudeProfile | null>(null);
  const [optimalTimeProfile, setOptimalTimeProfile] = useState<OptimalTimeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRelearning, setIsRelearning] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const [heat, altitude, time] = await Promise.all([
        getHeatToleranceProfile(userId),
        getAltitudeProfile(userId),
        getOptimalTimeProfile(userId),
      ]);

      setHeatProfile(heat);
      setAltitudeProfile(altitude);
      setOptimalTimeProfile(time);
    } catch (err) {
      console.error('Error loading profiles:', err);
      toast('Error loading environmental profiles', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRelearn() {
    setIsRelearning(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      toast('Backfilling environmental data...', 'info');
      const enrichedCount = await backfillEnvironmentalData(200);
      toast(`Enriched ${enrichedCount} activities`, 'success');

      toast('Learning heat tolerance...', 'info');
      const heat = await learnHeatTolerance(userId);
      setHeatProfile(heat);

      toast('Learning altitude response...', 'info');
      const altitude = await learnAltitudeResponse(userId);
      setAltitudeProfile(altitude);

      toast('Learning optimal training times...', 'info');
      const time = await learnOptimalTrainingTime(userId);
      setOptimalTimeProfile(time);

      toast('Environmental learning complete!', 'success');
    } catch (err) {
      console.error('Error relearning:', err);
      toast('Error during learning process', 'error');
    } finally {
      setIsRelearning(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Loading environmental profiles...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Environmental Learning</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            AI-powered insights from your training history
          </p>
        </div>
        <button
          onClick={handleRelearn}
          disabled={isRelearning}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isRelearning ? 'not-allowed' : 'pointer',
            opacity: isRelearning ? 0.6 : 1,
          }}
        >
          {isRelearning ? 'Learning...' : 'Re-learn from Data'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <HeatToleranceCard profile={heatProfile} />
        <AltitudeResponseCard profile={altitudeProfile} />
        <OptimalTimeCard profile={optimalTimeProfile} />
      </div>
    </div>
  );
}

function HeatToleranceCard({ profile }: { profile: HeatToleranceProfile | null }) {
  if (!profile || profile.confidenceScore === 0) {
    return (
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>Heat Tolerance</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Not enough data yet. Log more runs in different temperatures to unlock heat tolerance insights.
        </p>
      </div>
    );
  }

  const chartData = {
    labels: profile.paceAdjustmentCurve.map(p => `${p.temp}°C`),
    datasets: [{
      label: 'Pace Impact (%)',
      data: profile.paceAdjustmentCurve.map(p => p.adjustmentPct),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.1)',
      tension: 0.4,
    }],
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Heat Tolerance</h3>
        <div
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            backgroundColor: profile.confidenceScore >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)',
            color: profile.confidenceScore >= 70 ? 'var(--success-color)' : 'var(--warning-color)',
          }}
        >
          {profile.confidenceScore}% confidence
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Optimal Temp</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.optimalTempC}°C</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Heat Threshold</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.heatThresholdC}°C</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acclimatization</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.acclimatizationRate} days</div>
        </div>
      </div>

      {profile.paceAdjustmentCurve.length > 0 && (
        <div style={{ height: '200px' }}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: {
                  title: { display: true, text: 'Pace Impact (%)' },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}

function AltitudeResponseCard({ profile }: { profile: AltitudeProfile | null }) {
  if (!profile || profile.confidenceScore === 0) {
    return (
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>Altitude Response</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Not enough data yet. Log more runs at different altitudes to unlock altitude insights.
        </p>
      </div>
    );
  }

  const chartData = {
    labels: profile.altitudeDegradationCurve.map(p => `${p.altitudeM}m`),
    datasets: [{
      label: 'Pace Impact (%)',
      data: profile.altitudeDegradationCurve.map(p => p.paceAdjustmentPct),
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      tension: 0.4,
    }],
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Altitude Response</h3>
        <div
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            backgroundColor: profile.confidenceScore >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)',
            color: profile.confidenceScore >= 70 ? 'var(--success-color)' : 'var(--warning-color)',
          }}
        >
          {profile.confidenceScore}% confidence
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sea Level Pace</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.seaLevelBasePace.toFixed(2)} min/km</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Altitude Trained</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.maxTrainingAltitude}m</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acclimatization</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.acclimatizationDays} days</div>
        </div>
      </div>

      {profile.altitudeDegradationCurve.length > 0 && (
        <div style={{ height: '200px' }}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: {
                  title: { display: true, text: 'Pace Impact (%)' },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}

function OptimalTimeCard({ profile }: { profile: OptimalTimeProfile | null }) {
  if (!profile || profile.confidenceScore === 0) {
    return (
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>Optimal Training Time</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Not enough data yet. Log more runs at different times of day to unlock time-of-day insights.
        </p>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Optimal Training Time</h3>
        <div
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            backgroundColor: profile.confidenceScore >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)',
            color: profile.confidenceScore >= 70 ? 'var(--success-color)' : 'var(--warning-color)',
          }}
        >
          {profile.confidenceScore}% confidence
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Your Best Time
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, textTransform: 'capitalize' }}>
          {profile.bestTimeOfDay.replace('_', ' ')}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          You are a {profile.isEarlyBird ? 'morning' : 'evening'} runner
        </div>
      </div>

      {profile.performanceByHour.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
          {profile.performanceByHour.slice(0, 12).map(p => (
            <div
              key={p.hour}
              style={{
                padding: '0.5rem',
                backgroundColor: p.efficiencyScore > 0 ? 'var(--success-bg)' : 'var(--secondary-bg)',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.hour}:00</div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: p.efficiencyScore > 0 ? 'var(--success-color)' : 'var(--text-secondary)',
                }}
              >
                {p.efficiencyScore > 0 ? '+' : ''}{p.efficiencyScore.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
