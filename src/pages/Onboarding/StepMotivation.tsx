/**
 * Onboarding Step: Motivation Detection
 *
 * Conversational step that collects motivation signals through
 * natural language prompts instead of rigid forms.
 */

import { useState } from 'react';
import type { OnboardingStepProps } from '@/types/onboarding';

const MOTIVATION_OPTIONS = [
  {
    key: 'health',
    label: 'To feel better and healthier',
    emoji: '💚',
    description: 'Build energy, feel strong, improve wellness',
  },
  {
    key: 'explore',
    label: 'To explore and experience',
    emoji: '🏔️',
    description: 'Chase trails, discover new routes, embrace adventure',
  },
  {
    key: 'race',
    label: 'To train for a goal or race',
    emoji: '⚡',
    description: 'Hit targets, improve performance, achieve results',
  },
  {
    key: 'calm',
    label: 'To clear my mind',
    emoji: '🧘',
    description: 'Find peace, reduce stress, create balance',
  },
  {
    key: 'transform',
    label: 'To change or rebuild myself',
    emoji: '💪',
    description: 'Grow stronger, reinvent, overcome challenges',
  },
  {
    key: 'together',
    label: 'To share the journey with others',
    emoji: '🤝',
    description: 'Connect with runners, build community, inspire each other',
  },
];

const SECONDARY_PROMPTS = {
  health: [
    { q: 'How do you want to feel after a great run?', a: ['Energized', 'Calm', 'Accomplished', 'Balanced'] },
  ],
  explore: [
    { q: 'What kind of landscapes call to you?', a: ['Mountains', 'Forests', 'Coastal routes', 'Anywhere new'] },
  ],
  race: [
    { q: 'What drives you most?', a: ['Getting faster', 'Hitting milestones', 'Proving what I can do', 'Structure and progress'] },
  ],
  calm: [
    { q: 'What brings you peace on a run?', a: ['Steady rhythm', 'Being alone with thoughts', 'Nature sounds', 'Flow state'] },
  ],
  transform: [
    { q: 'What change are you chasing?', a: ['Rebuild strength', 'Start fresh', 'Prove resilience', 'Reinvent myself'] },
  ],
  together: [
    { q: 'How do you like to connect?', a: ['Group runs', 'Training buddies', 'Virtual challenges', 'Running community'] },
  ],
};

export default function StepMotivation({ profile, update, next, back }: OnboardingStepProps) {
  const [selectedMotivation, setSelectedMotivation] = useState<string | null>(
    profile.motivation || null
  );
  const [secondaryAnswer, setSecondaryAnswer] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  function handleSelectMotivation(key: string) {
    setSelectedMotivation(key);
    setSecondaryAnswer(null);
  }

  function handleContinue() {
    if (!selectedMotivation) return;

    const selectedWords = [
      selectedMotivation,
      secondaryAnswer,
      ...freeText.toLowerCase().split(' ').filter((w) => w.length > 3),
    ].filter(Boolean);

    update({
      motivation: selectedMotivation,
      onboarding_responses: {
        ...(profile.onboarding_responses || {}),
        primaryMotivation: selectedMotivation,
        whyRunning: freeText,
        selectedWords,
      },
    });

    next();
  }

  const secondaryPrompt = selectedMotivation ? SECONDARY_PROMPTS[selectedMotivation]?.[0] : null;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 28, marginBottom: 12 }}>What brings you to running?</h2>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.6 }}>
          There's no wrong answer — I just want to understand what moves you.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {MOTIVATION_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelectMotivation(option.key)}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 20,
              textAlign: 'left',
              border: selectedMotivation === option.key ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selectedMotivation === option.key ? 'var(--primary-light)' : 'var(--bg)',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 32, flexShrink: 0 }}>{option.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 16 }}>
                {option.label}
              </div>
              <div className="small muted" style={{ fontSize: 13 }}>
                {option.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedMotivation && secondaryPrompt && (
        <div
          style={{
            padding: 24,
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            marginBottom: 32,
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 16 }}>{secondaryPrompt.q}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {secondaryPrompt.a.map((answer) => (
              <button
                key={answer}
                onClick={() => setSecondaryAnswer(answer)}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  border: secondaryAnswer === answer ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: secondaryAnswer === answer ? 'var(--primary-light)' : 'transparent',
                }}
              >
                {answer}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMotivation && (
        <div style={{ marginBottom: 32, animation: 'fadeInUp 0.5s ease' }}>
          <label htmlFor="freeText" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
            Anything else you'd like to share? (optional)
          </label>
          <textarea
            id="freeText"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="E.g., I love running trails in the mountains..."
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
        {back && (
          <button onClick={back} className="btn" style={{ minWidth: 100 }}>
            ← Back
          </button>
        )}
        <button
          onClick={handleContinue}
          className="btn"
          disabled={!selectedMotivation}
          style={{
            marginLeft: 'auto',
            minWidth: 100,
            opacity: selectedMotivation ? 1 : 0.5,
          }}
        >
          Continue →
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
