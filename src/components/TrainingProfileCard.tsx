import type { UserProfile } from '@/types/onboarding';

interface TrainingProfileCardProps {
  profile: UserProfile | null;
}

export default function TrainingProfileCard({ profile }: TrainingProfileCardProps) {
  if (!profile) {
    return (
      <div style={{
        padding: 20,
        background: 'var(--card)',
        borderRadius: 12,
        border: '1px solid var(--line)'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Training Profile Summary</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading profile...</p>
      </div>
    );
  }

  const restDaysCount = profile.daysPerWeek ? 7 - profile.daysPerWeek : 7;
  const avgMileageDisplay = profile.avgMileage
    ? `${Math.round(profile.avgMileage)} km/week`
    : '—';
  const paceDisplay = profile.currentPace
    ? `${profile.currentPace.toFixed(1)} min/km`
    : '—';

  return (
    <div style={{
      padding: 20,
      background: 'var(--card)',
      borderRadius: 12,
      border: '1px solid var(--line)'
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Training Profile Summary</h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 16
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Training Days/Week</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{profile.daysPerWeek ?? '—'}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Rest Days</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{restDaysCount}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Experience Level</div>
          <div style={{ fontSize: 18, fontWeight: 600, textTransform: 'capitalize' }}>
            {profile.experienceLevel ?? '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Goal</div>
          <div style={{ fontSize: 18, fontWeight: 600, textTransform: 'capitalize' }}>
            {profile.goalType?.replace(/_/g, ' ') ?? '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Weekly Volume</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{avgMileageDisplay}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Typical Pace</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{paceDisplay}</div>
        </div>
      </div>

      <div style={{
        paddingTop: 12,
        borderTop: '1px solid var(--line)',
        fontSize: 12,
        color: 'var(--muted)',
        lineHeight: 1.5
      }}>
        These values were set during onboarding and are used by the adaptive coach to build your training plan.
      </div>
    </div>
  );
}
