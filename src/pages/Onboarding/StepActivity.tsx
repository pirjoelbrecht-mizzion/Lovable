import { useState } from 'react';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types/onboarding';
import type { OnboardingStepProps } from '@/types/onboarding';

export default function StepActivity({ profile, update, next }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'activity');
  const [selected, setSelected] = useState<string>();

  const handleSelect = (option: typeof ACTIVITY_LEVEL_OPTIONS[0]) => {
    setSelected(option.key);
    update({
      experienceLevel: option.inferredExperience,
      avgMileage: option.inferredMileage,
    });
    setTimeout(() => next(), 300);
  };

  const prompt = stepPrompts?.[0] || {
    text: 'Every runner starts somewhere',
    subtext: 'Tell me about your current activity level',
    emoji: '🏃',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
      <OnboardingCoachBubble
        text={prompt.text}
        subtext={prompt.subtext}
        emoji={prompt.emoji}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {ACTIVITY_LEVEL_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelect(option)}
            className="card"
            style={{
              padding: 20,
              textAlign: 'left',
              border: selected === option.key ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selected === option.key ? 'rgba(255, 179, 0, 0.1)' : 'var(--card-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
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
