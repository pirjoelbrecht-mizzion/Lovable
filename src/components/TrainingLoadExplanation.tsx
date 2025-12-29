import type { UserProfile } from '@/types/onboarding';

interface TrainingLoadExplanationProps {
  profile: UserProfile | null;
}

export default function TrainingLoadExplanation({ profile }: TrainingLoadExplanationProps) {
  const weeklyVolume = profile?.avgMileage
    ? `${Math.round(profile.avgMileage)} km per week`
    : 'Derived from recent activity';

  return (
    <div style={{
      padding: 20,
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      borderRadius: 12
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Training Load</h3>

      <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Your weekly training volume is <strong>derived automatically</strong> from your experience level, recent activity, and training frequency.
      </p>

      <p style={{
        fontSize: 14,
        lineHeight: 1.6,
        marginTop: 12,
        marginBottom: 0,
        color: 'var(--muted)'
      }}>
        Current estimate: <strong style={{ color: 'var(--text)' }}>{weeklyVolume}</strong>
      </p>

      <p style={{
        fontSize: 13,
        color: 'var(--muted)',
        lineHeight: 1.6,
        marginTop: 12,
        marginBottom: 0
      }}>
        You don't need to set a number — the plan adapts as you progress.
      </p>
    </div>
  );
}
