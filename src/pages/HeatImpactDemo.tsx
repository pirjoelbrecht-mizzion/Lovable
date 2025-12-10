import React, { useState } from 'react';
import { WeatherImpactCardCosmic } from '../components/cosmic';
import { Sparkles, Eye } from 'lucide-react';

const mockHeatData = {
  overallScore: 78,
  severity: 'HIGH' as const,
  temperature: 88,
  humidity: 72,
  heatIndex: 102,
  wbgt: 85,
  timeline: [
    { time: '8:00', heatIndex: 85, pace: 8.5 },
    { time: '8:30', heatIndex: 92, pace: 8.8 },
    { time: '9:00', heatIndex: 98, pace: 9.2 },
    { time: '9:30', heatIndex: 102, pace: 9.5 },
    { time: '10:00', heatIndex: 106, pace: 10.1 },
    { time: '10:30', heatIndex: 105, pace: 10.3 },
    { time: '11:00', heatIndex: 103, pace: 9.9 },
  ],
  recommendations: {
    hydration: [
      'Increase fluid intake to 24-32 oz per hour',
      'Consider electrolyte supplements every 30 minutes',
      'Pre-hydrate 2 hours before activity',
    ],
    pacing: [
      'Reduce target pace by 45-60 seconds per mile',
      'Start conservatively in the first 30% of run',
      'Plan walk breaks every 2 miles',
    ],
    timing: [
      'Start before 7:00 AM to avoid peak heat',
      'Consider indoor training during afternoon hours',
      'Evening sessions after 7:00 PM are optimal',
    ],
    recovery: [
      'Ice bath within 30 minutes post-activity',
      'Continue hydration for 2-3 hours after run',
      'Monitor heart rate variability for 48 hours',
    ],
  },
};

const mockModerateData = {
  overallScore: 42,
  severity: 'MODERATE' as const,
  temperature: 78,
  humidity: 55,
  heatIndex: 82,
  wbgt: 72,
  timeline: [
    { time: '7:00', heatIndex: 75, pace: 8.2 },
    { time: '7:30', heatIndex: 78, pace: 8.3 },
    { time: '8:00', heatIndex: 82, pace: 8.5 },
    { time: '8:30', heatIndex: 85, pace: 8.7 },
    { time: '9:00', heatIndex: 87, pace: 8.8 },
  ],
  recommendations: {
    hydration: [
      'Maintain 16-20 oz of fluid per hour',
      'Consider electrolytes for runs over 90 minutes',
    ],
    pacing: [
      'Reduce target pace by 15-20 seconds per mile',
      'Monitor effort level in second half',
    ],
    timing: [
      'Morning sessions before 9:00 AM preferred',
      'Afternoon training is acceptable with precautions',
    ],
  },
};

const mockExtremeData = {
  overallScore: 94,
  severity: 'EXTREME' as const,
  temperature: 96,
  humidity: 85,
  heatIndex: 118,
  wbgt: 92,
  timeline: [
    { time: '12:00', heatIndex: 110, pace: 10.5 },
    { time: '12:30', heatIndex: 115, pace: 11.2 },
    { time: '13:00', heatIndex: 118, pace: 11.8 },
    { time: '13:30', heatIndex: 120, pace: 12.5 },
    { time: '14:00', heatIndex: 119, pace: 13.2 },
  ],
  recommendations: {
    hydration: [
      'CRITICAL: 32+ oz per hour with electrolytes',
      'Consider IV hydration before activity',
      'Have cooling towels and ice available',
    ],
    pacing: [
      'REDUCE PACE BY 90+ SECONDS PER MILE',
      'Mandatory walk breaks every mile',
      'Consider postponing or indoor alternative',
    ],
    timing: [
      'AVOID outdoor training during these conditions',
      'Reschedule to early morning (before 6 AM)',
      'Use indoor facilities if possible',
    ],
    recovery: [
      'IMMEDIATE cooling protocol required',
      'Monitor for heat illness symptoms for 24 hours',
      'Extended rest period recommended',
    ],
  },
};

export default function HeatImpactDemo() {
  const [selectedScenario, setSelectedScenario] = useState<'moderate' | 'high' | 'extreme'>('high');

  const scenarios = {
    moderate: mockModerateData,
    high: mockHeatData,
    extreme: mockExtremeData,
  };

  const currentData = scenarios[selectedScenario];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cosmic-bg-darker)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={32} color="var(--neon-cyan)" />
            <h1 style={{
              fontSize: '36px',
              fontWeight: '900',
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              margin: 0
            }}>
              Heat Impact Analysis
            </h1>
            <Sparkles size={32} color="var(--neon-purple)" />
          </div>
          <p style={{
            fontSize: '16px',
            color: 'var(--muted)',
            maxWidth: '600px',
            lineHeight: '1.6'
          }}>
            Experience the neon-cosmic transformation of environmental performance analysis.
            Select a scenario below to see how different heat conditions are visualized.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setSelectedScenario('moderate')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: selectedScenario === 'moderate'
                  ? '2px solid var(--neon-yellow)'
                  : '2px solid var(--hologram-border)',
                background: selectedScenario === 'moderate'
                  ? 'var(--neon-yellow-glow)'
                  : 'var(--cosmic-surface)',
                color: 'var(--text)',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: selectedScenario === 'moderate'
                  ? '0 0 20px var(--neon-yellow-glow)'
                  : 'none'
              }}
            >
              Moderate Heat
            </button>
            <button
              onClick={() => setSelectedScenario('high')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: selectedScenario === 'high'
                  ? '2px solid var(--neon-orange)'
                  : '2px solid var(--hologram-border)',
                background: selectedScenario === 'high'
                  ? 'var(--neon-orange-glow)'
                  : 'var(--cosmic-surface)',
                color: 'var(--text)',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: selectedScenario === 'high'
                  ? '0 0 20px var(--neon-orange-glow)'
                  : 'none'
              }}
            >
              High Heat
            </button>
            <button
              onClick={() => setSelectedScenario('extreme')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: selectedScenario === 'extreme'
                  ? '2px solid var(--neon-red)'
                  : '2px solid var(--hologram-border)',
                background: selectedScenario === 'extreme'
                  ? 'var(--neon-red-glow)'
                  : 'var(--cosmic-surface)',
                color: 'var(--text)',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: selectedScenario === 'extreme'
                  ? '0 0 20px var(--neon-red-glow)'
                  : 'none'
              }}
            >
              Extreme Heat
            </button>
          </div>
        </div>

        <WeatherImpactCardCosmic
          data={currentData}
          showTimeline={true}
        />

        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: 'var(--muted)',
          fontSize: '14px'
        }}>
          <Eye size={16} />
          <span>Cosmic design optimized for mobile and desktop</span>
        </div>
      </div>
    </div>
  );
}
