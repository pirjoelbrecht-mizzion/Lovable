import { useState } from 'react';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import type { OnboardingStepProps, SurfaceType } from '@/types/onboarding';

const SURFACE_OPTIONS = [
  { key: 'road' as SurfaceType, label: 'Road Running', emoji: '🛣️', description: 'Pavement & sidewalks' },
  { key: 'trail' as SurfaceType, label: 'Trail Running', emoji: '🌲', description: 'Nature trails & dirt paths' },
  { key: 'treadmill' as SurfaceType, label: 'Treadmill', emoji: '🏃‍♂️', description: 'Indoor running' },
  { key: 'mixed' as SurfaceType, label: 'Mixed Terrain', emoji: '🌍', description: 'Variety of surfaces' },
];

export default function StepSurface({ profile, update, next }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'surface');
  const [selected, setSelected] = useState(profile.surface);

  const handleSelect = (surface: SurfaceType) => {
    setSelected(surface);
    update({ surface });
    setTimeout(() => next(), 300);
  };

  const prompt = stepPrompts?.[0] || {
    text: 'Where do your feet feel happiest?',
    subtext: 'Choose your preferred running surface',
    emoji: '🏃',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
      <OnboardingCoachBubble
        text={prompt.text}
        subtext={prompt.subtext}
        emoji={prompt.emoji}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {SURFACE_OPTIONS.map((option) => (
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
