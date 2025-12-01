import { useState } from 'react';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import ArchetypeReveal from '@/components/ArchetypeReveal';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import { useMotivation } from '@/hooks/useMotivation';
import { pickTemplate, determineAdaptation, calculateInitialVolume } from '@/lib/aiRules';
import { saveUserProfile, completeOnboarding } from '@/lib/userProfile';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ToastHost';
import type { OnboardingStepProps } from '@/types/onboarding';
import type { MotivationProfile } from '@/lib/motivationDetection';

export default function StepSummary({ profile }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'summary');
  const { detectArchetype } = useMotivation({ autoLoad: false });
  const [loading, setLoading] = useState(false);
  const [detectedProfile, setDetectedProfile] = useState<MotivationProfile | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      // STEP 1: Check if Supabase is configured
      if (!supabase) {
        console.error('[Onboarding] Supabase client not initialized');
        toast('Configuration error. Please contact support.', 'error');
        setLoading(false);
        return;
      }

      // STEP 2: Get session first (more reliable than getUser)
      console.log('[Onboarding] Checking session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[Onboarding] Session error:', sessionError);
        toast('Authentication error. Please try signing in again.', 'error');
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
        setLoading(false);
        return;
      }

      if (!session) {
        console.error('[Onboarding] No active session found');
        toast('Session expired. Please sign in again.', 'error');
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
        setLoading(false);
        return;
      }

      // STEP 3: Get user from session
      const user = session.user;
      console.log('[Onboarding] User authenticated:', user.email);

      if (!user) {
        console.error('[Onboarding] No user in session');
        toast('Please sign in to continue', 'error');
        setLoading(false);
        return;
      }

      const template = pickTemplate(
        profile.goalType || '5k',
        undefined,
        profile.experienceLevel
      );
      const aiLevel = determineAdaptation(
        profile.experienceLevel || 'beginner',
        profile.deviceConnected || false
      );
      const initialVolume = calculateInitialVolume(
        profile.avgMileage || 0,
        profile.experienceLevel || 'beginner'
      );

      const completeProfile = {
        ...profile,
        user_id: user.id,
        planTemplate: template,
        aiAdaptationLevel: aiLevel,
        planStartDate: new Date().toISOString().split('T')[0],
      };

      // STEP 4: Detect motivation archetype
      console.log('[Onboarding] Detecting motivation archetype...');
      const motivationProfile = await detectArchetype(profile.onboarding_responses);

      // STEP 5: Save user profile
      console.log('[Onboarding] Saving user profile...');
      const savedProfile = await saveUserProfile(completeProfile as any);
      if (!savedProfile) {
        throw new Error('Failed to save user profile');
      }
      console.log('[Onboarding] Profile saved successfully');

      // STEP 6: Mark onboarding complete
      console.log('[Onboarding] Completing onboarding...');
      const completed = await completeOnboarding(user.id);
      if (!completed) {
        throw new Error('Failed to mark onboarding as complete');
      }
      console.log('[Onboarding] Onboarding completed successfully');

      if (motivationProfile) {
        setDetectedProfile(motivationProfile);
        setShowReveal(true);
      } else {
        toast('Welcome to your training journey!', 'success');
        setTimeout(() => {
          window.location.href = '/quest';
        }, 1000);
      }
    } catch (error: any) {
      console.error('[Onboarding] Fatal error:', error);

      // Detailed error reporting
      let errorMessage = 'Failed to complete setup';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error.code) {
        errorMessage += ` (${error.code})`;
      }

      toast(errorMessage, 'error');

      // Log to console for debugging
      console.error('[Onboarding] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const prompt = stepPrompts?.[0] || {
    text: 'Amazing! Your plan is ready',
    subtext: "Let's review what we've created together",
    emoji: '✨',
  };

  if (showReveal && detectedProfile) {
    return (
      <ArchetypeReveal
        profile={detectedProfile}
        onComplete={() => {
          window.location.href = '/quest';
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
      <OnboardingCoachBubble
        text={prompt.text}
        subtext={prompt.subtext}
        emoji={prompt.emoji}
      />

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Your Training Profile</h3>
        
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Goal:</span>
            <span style={{ fontWeight: 600 }}>{profile.goalType?.toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Experience:</span>
            <span style={{ fontWeight: 600 }}>
              {profile.experienceLevel || 'Beginner'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Training Days:</span>
            <span style={{ fontWeight: 600 }}>{profile.daysPerWeek || 3} days/week</span>
          </div>

          {profile.surface && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Surface:</span>
              <span style={{ fontWeight: 600 }}>
                {profile.surface.charAt(0).toUpperCase() + profile.surface.slice(1)}
              </span>
            </div>
          )}

          {profile.strengthPreference && profile.strengthPreference !== 'none' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Strength Training:</span>
              <span style={{ fontWeight: 600 }}>
                {profile.strengthPreference.charAt(0).toUpperCase() + profile.strengthPreference.slice(1)}
              </span>
            </div>
          )}

          {profile.deviceConnected && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Device:</span>
              <span style={{ fontWeight: 600 }}>Connected</span>
            </div>
          )}
        </div>
      </div>

      <button
        className="btn primary"
        onClick={handleFinish}
        disabled={loading}
        style={{ padding: '16px 24px', fontSize: 16, fontWeight: 600 }}
      >
        {loading ? 'Creating Your Plan...' : 'Create My Training Plan'}
      </button>
    </div>
  );
}
