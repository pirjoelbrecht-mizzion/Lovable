/**
 * Motivation Archetype Card Component
 *
 * Displays the athlete's current motivation archetype with visual branding,
 * description, and options to update preferences.
 */

import { useState, useEffect } from 'react';
import type { ArchetypeType, MotivationProfile } from '@/lib/motivationDetection';
import { getUserMotivationProfile } from '@/lib/motivationDetection';
import {
  getArchetypeDescription,
  getArchetypeQuote,
  ARCHETYPE_THEMES
} from '@/lib/motivationCoach';
import { getArchetypePreferences, saveArchetypePreferences } from '@/lib/database-motivation';
import type { ArchetypePreferencesRecord } from '@/lib/database-motivation';
import { getCurrentUserId } from '@/lib/supabase';

interface MotivationArchetypeCardProps {
  onSettingsClick?: () => void;
  compact?: boolean;
}

const ARCHETYPE_NAMES: Record<ArchetypeType, string> = {
  performer: 'The Performer',
  adventurer: 'The Adventurer',
  mindful: 'The Mindful Mover',
  health: 'The Health Builder',
  transformer: 'The Transformer',
  connector: 'The Connector'
};

export default function MotivationArchetypeCard({
  onSettingsClick,
  compact = false
}: MotivationArchetypeCardProps) {
  const [profile, setProfile] = useState<MotivationProfile | null>(null);
  const [preferences, setPreferences] = useState<ArchetypePreferencesRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    loadArchetypeData();
  }, []);

  async function loadArchetypeData() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const [profileData, prefsData] = await Promise.all([
        getUserMotivationProfile(userId),
        getArchetypePreferences()
      ]);

      setProfile(profileData);
      setPreferences(prefsData);

      if (profileData) {
        setQuote(getArchetypeQuote(profileData.dominant));
      }
    } catch (error) {
      console.error('Error loading archetype data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="archetype-card loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="archetype-card empty">
        <p>Complete training activities to discover your motivation archetype</p>
      </div>
    );
  }

  const theme = ARCHETYPE_THEMES[profile.dominant];
  const name = ARCHETYPE_NAMES[profile.dominant];
  const description = getArchetypeDescription(profile.dominant);
  const confidence = Math.round(profile.confidence * 100);

  if (compact) {
    return (
      <div
        className="archetype-card compact"
        style={{ background: theme.gradient }}
        onClick={onSettingsClick}
      >
        <div className="archetype-compact-content">
          <span className="archetype-icon">{theme.icon}</span>
          <div className="archetype-compact-text">
            <div className="archetype-name">{name}</div>
            <div className="archetype-confidence">{confidence}% confidence</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="archetype-card" style={{ borderColor: theme.primaryColor }}>
      <div className="archetype-header" style={{ background: theme.gradient }}>
        <div className="archetype-icon-large">{theme.icon}</div>
        <div className="archetype-header-text">
          <h3>{name}</h3>
          <div className="archetype-confidence-badge">
            {confidence}% confidence
          </div>
        </div>
      </div>

      <div className="archetype-body">
        <p className="archetype-description">{description}</p>

        {quote && (
          <blockquote className="archetype-quote">
            <span className="quote-mark">"</span>
            {quote}
            <span className="quote-mark">"</span>
          </blockquote>
        )}

        <div className="archetype-scores">
          <h4>Your Motivation Profile</h4>
          <div className="score-bars">
            {Object.entries(profile.scores).map(([archetype, score]) => (
              <div key={archetype} className="score-bar">
                <div className="score-label">
                  {ARCHETYPE_THEMES[archetype as ArchetypeType].icon} {ARCHETYPE_NAMES[archetype as ArchetypeType]}
                </div>
                <div className="score-progress">
                  <div
                    className="score-fill"
                    style={{
                      width: `${score * 100}%`,
                      background: archetype === profile.dominant ? theme.gradient : '#e5e7eb'
                    }}
                  />
                </div>
                <div className="score-value">{Math.round(score * 100)}%</div>
              </div>
            ))}
          </div>
        </div>

        {preferences && (
          <div className="archetype-preferences">
            <h4>Your Preferences</h4>
            <div className="preference-chips">
              {preferences.enable_variety_suggestions && (
                <span className="preference-chip">Variety suggestions enabled</span>
              )}
              {preferences.enable_group_suggestions && (
                <span className="preference-chip">Group run suggestions</span>
              )}
              {preferences.enable_encouragement && (
                <span className="preference-chip">Encouragement messages</span>
              )}
            </div>
          </div>
        )}

        {onSettingsClick && (
          <button className="archetype-settings-btn" onClick={onSettingsClick}>
            Customize Coaching Style
          </button>
        )}
      </div>

      <style>{`
        .archetype-card {
          background: white;
          border-radius: 16px;
          border: 2px solid;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .archetype-card.compact {
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .archetype-card.compact:hover {
          transform: translateY(-2px);
        }

        .archetype-compact-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }

        .archetype-icon {
          font-size: 28px;
        }

        .archetype-compact-text {
          color: white;
        }

        .archetype-name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 2px;
        }

        .archetype-confidence {
          font-size: 12px;
          opacity: 0.9;
        }

        .archetype-card.loading,
        .archetype-card.empty {
          padding: 48px 24px;
          text-align: center;
          color: #6b7280;
        }

        .archetype-header {
          padding: 24px;
          color: white;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .archetype-icon-large {
          font-size: 64px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .archetype-header-text h3 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
        }

        .archetype-confidence-badge {
          background: rgba(255, 255, 255, 0.25);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          display: inline-block;
        }

        .archetype-body {
          padding: 24px;
        }

        .archetype-description {
          font-size: 16px;
          line-height: 1.6;
          color: #374151;
          margin: 0 0 20px 0;
        }

        .archetype-quote {
          background: #f9fafb;
          border-left: 4px solid currentColor;
          padding: 16px 20px;
          margin: 0 0 24px 0;
          font-style: italic;
          color: #4b5563;
          border-radius: 0 8px 8px 0;
        }

        .quote-mark {
          font-size: 24px;
          font-weight: bold;
          opacity: 0.3;
        }

        .archetype-scores h4,
        .archetype-preferences h4 {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin: 0 0 12px 0;
        }

        .score-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .score-bar {
          display: grid;
          grid-template-columns: 140px 1fr 50px;
          align-items: center;
          gap: 12px;
        }

        .score-label {
          font-size: 13px;
          color: #374151;
          font-weight: 500;
        }

        .score-progress {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .score-value {
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
          text-align: right;
        }

        .archetype-preferences {
          margin-top: 24px;
        }

        .preference-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .preference-chip {
          background: #e0f2fe;
          color: #0369a1;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
        }

        .archetype-settings-btn {
          width: 100%;
          margin-top: 24px;
          padding: 12px 24px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .archetype-settings-btn:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
