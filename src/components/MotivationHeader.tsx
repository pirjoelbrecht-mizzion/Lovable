/**
 * Motivation-Aware Dashboard Header
 *
 * Dynamic header that adapts based on user's motivation archetype.
 * Displays personalized theme, quotes, and coach messages with smooth transitions.
 */

import { useState, useEffect } from 'react';
import { getCurrentUserId } from '@/lib/supabase';
import {
  getUserMotivationProfile,
  type MotivationProfile,
  type ArchetypeType,
} from '@/lib/motivationDetection';
import {
  getArchetypeQuote,
  generateCoachMessage,
  getArchetypeDescription,
  getArchetypeStyles,
  ARCHETYPE_THEMES,
  type CoachMessageContext,
} from '@/lib/motivationCoach';

interface MotivationHeaderProps {
  trainingContext?: {
    kmThisWeek?: number;
    fatigueLevel?: number;
    recentActivityType?: 'rest' | 'easy' | 'hard' | 'long';
  };
  upcomingRace?: {
    weeksAway: number;
    distance: string;
  };
  className?: string;
}

export default function MotivationHeader({
  trainingContext,
  upcomingRace,
  className = '',
}: MotivationHeaderProps) {
  const [profile, setProfile] = useState<MotivationProfile | null>(null);
  const [quote, setQuote] = useState<string>('');
  const [coachMessage, setCoachMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setQuote(getArchetypeQuote(profile.dominant));
      updateCoachMessage();
    }
  }, [profile, trainingContext]);

  async function loadProfile() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      const motivationProfile = await getUserMotivationProfile(userId);
      if (motivationProfile) {
        setProfile(motivationProfile);
      } else {
        setProfile({
          scores: {
            performer: 0.16,
            adventurer: 0.16,
            mindful: 0.17,
            health: 0.17,
            transformer: 0.17,
            connector: 0.17,
          },
          dominant: 'health',
          confidence: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error loading motivation profile:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateCoachMessage() {
    if (!profile) return;

    const context: CoachMessageContext = {
      archetype: profile.dominant,
      confidence: profile.confidence,
      recentActivity: trainingContext
        ? {
            type: trainingContext.recentActivityType || 'easy',
            kmThisWeek: trainingContext.kmThisWeek || 0,
            fatigueLevel: trainingContext.fatigueLevel,
          }
        : undefined,
      upcomingRace,
    };

    setCoachMessage(generateCoachMessage(context));
  }

  if (loading) {
    return (
      <div className={`motivation-header loading ${className}`}>
        <div className="shimmer" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const styles = getArchetypeStyles(profile.dominant);
  const theme = ARCHETYPE_THEMES[profile.dominant];
  const description = getArchetypeDescription(profile.dominant);

  const isHybrid = Object.values(profile.scores)
    .sort((a, b) => b - a)
    .slice(0, 2)
    .every((score) => score > 0.3);

  const secondaryArchetype = isHybrid
    ? (Object.entries(profile.scores)
        .sort(([, a], [, b]) => b - a)
        .find(([archetype]) => archetype !== profile.dominant)?.[0] as ArchetypeType)
    : null;

  return (
    <div
      className={`motivation-header ${className}`}
      style={{
        background: styles.gradient,
        borderRadius: 16,
        padding: '24px',
        marginBottom: 24,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 32 }}>{theme.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              {profile.dominant.charAt(0).toUpperCase() + profile.dominant.slice(1)}
              {isHybrid && secondaryArchetype && (
                <span style={{ opacity: 0.8, fontSize: 16, marginLeft: 8 }}>
                  × {secondaryArchetype.charAt(0).toUpperCase() + secondaryArchetype.slice(1)}
                </span>
              )}
            </h3>
            <p
              className="small"
              style={{
                margin: 0,
                opacity: 0.9,
                fontSize: 13,
              }}
            >
              {description}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '16px 0',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            marginBottom: 16,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontStyle: 'italic',
              lineHeight: 1.6,
              opacity: 0.95,
            }}
          >
            "{quote}"
          </p>
        </div>

        {coachMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>💬</span>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.5,
                opacity: 0.9,
              }}
            >
              {coachMessage}
            </p>
          </div>
        )}

        {profile.confidence < 0.4 && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
              opacity: 0.8,
            }}
          >
            💡 Your motivation profile is still developing. Keep training and I'll learn more about
            what drives you.
          </div>
        )}
      </div>

      <style>{`
        .motivation-header {
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .motivation-header.loading {
          height: 200px;
          background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shimmer {
          width: 80%;
          height: 60%;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.3) 50%,
            rgba(255,255,255,0) 100%
          );
          animation: shimmer 2s infinite;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
