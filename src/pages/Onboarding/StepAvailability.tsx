import { useState } from 'react';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import type { OnboardingStepProps } from '@/types/onboarding';

export default function StepAvailability({ profile, update, next }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'availability');
  const [days, setDays] = useState(profile.daysPerWeek || 3);

  const handleSelect = (numDays: number) => {
    setDays(numDays);
    update({ daysPerWeek: numDays });
  };

  const handleNext = () => {
    if (days >= 1 && days <= 7) {
      next();
    }
  };

  const prompt = stepPrompts?.[0] || {
    text: 'Consistency beats intensity',
    subtext: 'How many days per week can you commit to training?',
    emoji: '📅',
  };

  const dayOptions = [2, 3, 4, 5, 6];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
      <OnboardingCoachBubble
        text={prompt.text}
        subtext={prompt.subtext}
        emoji={prompt.emoji}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 12 }}>
        {dayOptions.map((numDays) => (
          <button
            key={numDays}
            onClick={() => handleSelect(numDays)}
            className="card"
            style={{
              padding: 20,
              textAlign: 'center',
              border: days === numDays ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: days === numDays ? 'rgba(255, 179, 0, 0.1)' : 'var(--card-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700 }}>{numDays}</div>
            <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              days/week
            </div>
          </button>
        ))}
      </div>

      <button
        className="btn primary"
        onClick={handleNext}
        disabled={!days || days < 1}
        style={{ marginTop: 16 }}
      >
        Continue
      </button>
    </div>
  );
}
