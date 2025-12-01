/**
 * Trail Load Demo Page
 *
 * Demonstrates the combined distance + vertical tracking system
 * for trail runners with safety alerts and coach integration.
 */

import { useState, useEffect } from 'react';
import WeeklyDistanceVertChart from '@/components/WeeklyDistanceVertChart';
import { getCurrentUserProfile } from '@/lib/userProfile';
import { isTrailRunner, getLoadConfig } from '@/utils/trailLoad';
import { checkTrailLoadProgression, sendTrailLoadAlertToCoach } from '@/services/trailLoadAlerts';
import type { UserProfile } from '@/types/onboarding';

const sampleData = [
  { week: 'Week -5', distance: 45, vertical: 800 },
  { week: 'Week -4', distance: 50, vertical: 900 },
  { week: 'Week -3', distance: 48, vertical: 850 },
  { week: 'Week -2', distance: 55, vertical: 950 },
  { week: 'Week -1', distance: 52, vertical: 900 },
  { week: 'This Week', distance: 68, vertical: 1200 },
];

export default function TrailLoadDemo() {
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [showCombinedLoad, setShowCombinedLoad] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const userProfile = await getCurrentUserProfile();
    setProfile(userProfile);
  };

  const handleSendAlert = async () => {
    const alert = await checkTrailLoadProgression(sampleData, profile);
    if (alert) {
      const success = await sendTrailLoadAlertToCoach(alert, profile);
      if (success) {
        setAlertSent(true);
        setTimeout(() => setAlertSent(false), 3000);
      }
    }
  };

  const config = getLoadConfig(profile);
  const isTrail = isTrailRunner(profile);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', margin: '0 0 12px 0' }}>
          Trail Running Load Tracker
        </h1>
        <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 16px 0' }}>
          Combined distance and vertical gain tracking with 10% progression rule
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              Runner Type
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>
              {isTrail ? '⛰️ Trail Runner' : '🏃 Road Runner'}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 200,
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              Vertical to Distance Ratio
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>
              {config.verticalToKmRatio}m : 1km
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 200,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              Max Weekly Increase
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>
              {(config.maxWeeklyIncrease * config.experienceMultiplier * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#60a5fa', margin: '0 0 12px 0' }}>
          💡 How it Works
        </h3>
        <ul style={{ color: '#94a3b8', fontSize: 14, margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>
            <strong>Combined Load:</strong> Distance + (Vertical / Ratio) = Total Training Load
          </li>
          <li>
            <strong>10% Rule:</strong> Total load should not increase by more than 10% week-over-week
          </li>
          <li>
            <strong>Color Coding:</strong> 🟢 Safe (&lt;5%) | 🟡 Caution (5-10%) | 🔴 Over Limit
            (&gt;10%)
          </li>
          <li>
            <strong>Trail-Specific:</strong> Only active when profile indicates trail running
          </li>
        </ul>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setShowCombinedLoad(!showCombinedLoad)}
            style={{
              padding: '10px 16px',
              background: showCombinedLoad
                ? 'rgba(168, 85, 247, 0.2)'
                : 'rgba(100, 116, 139, 0.2)',
              border: showCombinedLoad
                ? '1px solid rgba(168, 85, 247, 0.4)'
                : '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: 8,
              color: showCombinedLoad ? '#c084fc' : '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {showCombinedLoad ? '✓' : '○'} Show Combined Load
          </button>

          <button
            onClick={() => setShowWarnings(!showWarnings)}
            style={{
              padding: '10px 16px',
              background: showWarnings
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(100, 116, 139, 0.2)',
              border: showWarnings
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: 8,
              color: showWarnings ? '#f87171' : '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {showWarnings ? '✓' : '○'} Show Warnings
          </button>

          <button
            onClick={handleSendAlert}
            style={{
              padding: '10px 16px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 8,
              color: '#60a5fa',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🧠 Send Alert to Coach
          </button>

          {alertSent && (
            <div
              style={{
                padding: '10px 16px',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: 8,
                color: '#4ade80',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ✓ Alert sent to coach
            </div>
          )}
        </div>
      </div>

      <WeeklyDistanceVertChart
        data={sampleData}
        profile={profile}
        showCombinedLoad={showCombinedLoad}
        showWarnings={showWarnings}
      />

      <div
        style={{
          marginTop: 24,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', margin: '0 0 12px 0' }}>
          🎯 Integration Points
        </h3>
        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong style={{ color: 'white' }}>1. Insights Page:</strong> Replace the standard
            weekly distance chart for trail runners
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong style={{ color: 'white' }}>2. ACWR System:</strong> Use{' '}
            <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: 4 }}>
              calculateACWRWithTrailLoad()
            </code>{' '}
            to include vertical in ACWR calculations
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong style={{ color: 'white' }}>3. Coach Alerts:</strong> Automatic notifications
            when unsafe progression is detected
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'white' }}>4. Profile Detection:</strong> Automatically
            activates based on surface type, goal type, or strength preference
          </p>
        </div>
      </div>
    </div>
  );
}
