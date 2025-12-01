import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import StepGoal from './StepGoal';
import StepActivity from './StepActivity';
import StepAvailability from './StepAvailability';
import StepDevice from './StepDevice';
import StepSurface from './StepSurface';
import StepStrength from './StepStrength';
import StepMotivation from './StepMotivation';
import StepSummary from './StepSummary';
import { DEFAULT_PROFILE } from '@/types/onboarding';
import type { UserProfile } from '@/types/onboarding';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Partial<UserProfile>>(() => {
    const saved = localStorage.getItem('onboarding_draft');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session found, redirecting to auth');
      navigate('/auth', { replace: true });
      return;
    }
    console.log('Session found:', session.user.email);
    setChecking(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  useEffect(() => {
    if (!checking) {
      localStorage.setItem('onboarding_draft', JSON.stringify(profile));
    }
  }, [profile, checking]);

  const update = (data: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const back = () => {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const steps = [
    <StepGoal profile={profile} update={update} next={next} />,
    <StepActivity profile={profile} update={update} next={next} back={back} />,
    <StepAvailability profile={profile} update={update} next={next} back={back} />,
    <StepDevice profile={profile} update={update} next={next} back={back} />,
    <StepSurface profile={profile} update={update} next={next} back={back} />,
    <StepStrength profile={profile} update={update} next={next} back={back} />,
    <StepMotivation profile={profile} update={update} next={next} back={back} />,
    <StepSummary profile={profile} update={update} next={next} back={back} />,
  ];

  const progressPercentage = ((step + 1) / steps.length) * 100;

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏃</div>
          <p className="small">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 20px',
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Getting Started</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="small" style={{ color: 'var(--muted)' }}>
                Step {step + 1} of {steps.length}
              </span>
              <button
                onClick={handleSignOut}
                className="btn small"
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                Sign Out
              </button>
            </div>
          </div>

          <div style={{
            width: '100%',
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progressPercentage}%`,
              height: '100%',
              background: 'var(--primary)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '40px 20px' }}>
        {steps[step]}
      </div>

      {step > 0 && step < steps.length - 1 && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
        }}>
          <button className="btn" onClick={back}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
