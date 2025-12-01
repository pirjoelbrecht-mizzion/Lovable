import { useState } from 'react';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import type { OnboardingStepProps, StrengthPreference } from '@/types/onboarding';

const STRENGTH_OPTIONS = [
  { key: 'none' as StrengthPreference, label: 'None', emoji: '❌', description: 'Just running for now' },
  { key: 'base' as StrengthPreference, label: 'Basic', emoji: '💪', description: 'Light strength work' },
  { key: 'mountain' as StrengthPreference, label: 'Mountain Legs', emoji: '⛰️', description: 'Hill-focused training' },
  { key: 'ultra' as StrengthPreference, label: 'Ultra Legs', emoji: '🏔️', description: 'Advanced strength & power' },
];

export default function StepStrength({ profile, update, next }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'strength');
  const [selected, setSelected] = useState(profile.strengthPreference);

  const handleSelect = (strength: StrengthPreference) => {
    setSelected(strength);
    update({ strengthPreference: strength });
    setTimeout(() => next(), 300);
  };

  const prompt = stepPrompts?.[0] || {
    text: 'A little strength goes a long way',
    subtext: 'Want to include strength training?',
    emoji: '💪',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
      <OnboardingCoachBubble
        text={prompt.text}
        subtext={prompt.subtext}
        emoji={prompt.emoji}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {STRENGTH_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelect(option.key)}
            className="card"
            style={{
              padding: 20,
              textAlign: 'center',
              border: selected === option.key ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selected === option.key ? 'rgba(255, 179, 0, 0.1)' : 'var(--card-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>{option.emoji}</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
              {option.label}
            </div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
