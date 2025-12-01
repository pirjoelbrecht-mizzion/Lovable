import { useState } from 'react';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import { GOAL_OPTIONS } from '@/types/onboarding';
import type { OnboardingStepProps } from '@/types/onboarding';

export default function StepGoal({ profile, update, next }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'goal');
  const [selectedGoal, setSelectedGoal] = useState(profile.goalType);

  const handleSelect = (goalKey: string) => {
    setSelectedGoal(goalKey as any);
    update({ goalType: goalKey as any });
    setTimeout(() => next(), 300);
  };

  const prompt = stepPrompts?.[0] || {
    text: "Let's start your running journey!",
    subtext: 'Pick the goal that excites you most',
    emoji: '🎯',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
      <OnboardingCoachBubble
        text={prompt.text}
        subtext={prompt.subtext}
        emoji={prompt.emoji}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {GOAL_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelect(option.key)}
            className="card"
            style={{
              padding: 20,
              textAlign: 'left',
              border: selectedGoal === option.key ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selectedGoal === option.key ? 'rgba(255, 179, 0, 0.1)' : 'var(--card-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 32 }}>{option.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{option.label}</div>
                <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
                  {option.description}
                </div>
              </div>
            </div>
            <div className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>
              ~{option.recommendedWeeks} weeks • {option.minExperience} level
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
