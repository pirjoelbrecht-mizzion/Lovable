/**
 * Archetype Reveal Component
 *
 * Beautiful reveal animation shown after motivation detection.
 * Displays user's running archetype with personalized message.
 */

import { useState, useEffect } from 'react';
import type { MotivationProfile, ArchetypeType } from '@/lib/motivationDetection';
import {
  generateWelcomeMessage,
  getArchetypeDescription,
  getArchetypeStyles,
  ARCHETYPE_THEMES,
} from '@/lib/motivationCoach';

interface ArchetypeRevealProps {
  profile: MotivationProfile;
  onComplete: () => void;
  showContinueButton?: boolean;
}

export default function ArchetypeReveal({
  profile,
  onComplete,
  showContinueButton = true,
}: ArchetypeRevealProps) {
  const [stage, setStage] = useState<'analyzing' | 'revealing' | 'complete'>('analyzing');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);

    setTimeout(() => {
      setStage('revealing');
    }, 2000);

    setTimeout(() => {
      setStage('complete');
    }, 3500);
  }, []);

  const styles = getArchetypeStyles(profile.dominant);
  const theme = ARCHETYPE_THEMES[profile.dominant];
  const description = getArchetypeDescription(profile.dominant);
  const welcomeMessage = generateWelcomeMessage(profile.dominant, profile.confidence);

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
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--bg)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}
    >
      <div style={{ maxWidth: 600, width: '100%' }}>
        {stage === 'analyzing' && (
          <div
            style={{
              textAlign: 'center',
              animation: 'fadeIn 0.6s ease',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                borderRadius: '50%',
                border: '4px solid var(--primary)',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }}
            />
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Analyzing your profile...</h2>
            <p className="muted">Understanding what moves you</p>
          </div>
        )}

        {stage === 'revealing' && (
          <div
            style={{
              animation: 'scaleIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                background: styles.gradient,
                borderRadius: 20,
                padding: 40,
                textAlign: 'center',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    fontSize: 80,
                    marginBottom: 24,
                    animation: 'bounceIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {theme.icon}
                </div>

                <h1
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    marginBottom: 8,
                    animation: 'fadeInUp 0.8s ease 0.2s both',
                  }}
                >
                  You run like {isHybrid ? 'a ' : 'a '}
                  {profile.dominant.charAt(0).toUpperCase() + profile.dominant.slice(1)}
                </h1>

                {isHybrid && secondaryArchetype && (
                  <p
                    style={{
                      fontSize: 18,
                      opacity: 0.9,
                      marginBottom: 0,
                      animation: 'fadeInUp 0.8s ease 0.4s both',
                    }}
                  >
                    with {secondaryArchetype} energy
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {stage === 'complete' && (
          <div
            style={{
              animation: 'fadeInUp 0.8s ease',
            }}
          >
            <div
              style={{
                background: styles.gradient,
                borderRadius: 20,
                padding: 40,
                textAlign: 'center',
                color: '#fff',
                marginBottom: 32,
              }}
            >
              <div style={{ fontSize: 60, marginBottom: 16 }}>{theme.icon}</div>
              <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                {profile.dominant.charAt(0).toUpperCase() + profile.dominant.slice(1)}
                {isHybrid && secondaryArchetype && (
                  <span style={{ opacity: 0.8, fontSize: 24, marginLeft: 8 }}>
                    × {secondaryArchetype.charAt(0).toUpperCase() + secondaryArchetype.slice(1)}
                  </span>
                )}
              </h1>
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 16,
                padding: 32,
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.7,
                  marginBottom: 24,
                  color: 'var(--text)',
                }}
              >
                {welcomeMessage}
              </p>

              <div
                style={{
                  padding: 20,
                  background: 'var(--bg)',
                  borderRadius: 12,
                  borderLeft: `4px solid ${styles.primary}`,
                }}
              >
                <p
                  className="small muted"
                  style={{
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {description}
                </p>
              </div>

              {profile.confidence < 0.4 && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    background: 'var(--bg)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--muted)',
                  }}
                >
                  💡 Your profile will evolve as I learn more about your training patterns. The more you
                  run, the better I'll understand what drives you.
                </div>
              )}
            </div>

            {showContinueButton && (
              <button
                onClick={onComplete}
                className="btn"
                style={{
                  width: '100%',
                  padding: 16,
                  fontSize: 18,
                  fontWeight: 600,
                  background: styles.primary,
                  color: '#fff',
                  border: 'none',
                }}
              >
                Let's build your plan →
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
