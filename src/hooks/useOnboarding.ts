/**
 * Onboarding Hook - Enhanced Version
 *
 * Manages state and navigation for the 7-step onboarding flow
 * Features:
 * - Auto-save drafts to localStorage
 * - Step validation and error handling
 * - Analytics tracking for drop-off rates
 * - AI-powered plan generation
 * - Graceful error recovery
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, DEFAULT_PROFILE } from '@/types/onboarding';
import {
  saveUserProfile,
  completeOnboarding,
  getCurrentUserProfile,
} from '@/lib/userProfile';
import { pickTemplate, determineAdaptation, calculateInitialVolume } from '@/lib/aiRules';
import { createTrainingPlan } from '@/lib/planTemplates';
import { toast } from '@/components/ToastHost';

export interface UseOnboardingReturn {
  step: number;
  totalSteps: number;
  profile: Partial<UserProfile>;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;

  update: (data: Partial<UserProfile>) => void;
  next: () => void;
  back: () => void;
  goToStep: (stepNumber: number) => void;
  finishOnboarding: () => Promise<void>;
  retryAfterError: () => void;

  progress: number;
  canProceed: boolean;

  stepTimestamps: Record<number, number>;
}

const TOTAL_STEPS = 7;
const STORAGE_KEY = 'onboarding_draft';
const TIMESTAMPS_KEY = 'onboarding_timestamps';

export function useOnboarding(): UseOnboardingReturn {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Partial<UserProfile>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { ...DEFAULT_PROFILE };
      }
    }
    return { ...DEFAULT_PROFILE };
  });

  const [stepTimestamps, setStepTimestamps] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem(TIMESTAMPS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const existing = await getCurrentUserProfile();
        if (existing?.onboardingCompleted) {
          setIsComplete(true);
          navigate('/quest');
        } else if (existing) {
          setProfile(prev => ({ ...prev, ...existing }));
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      }
    };
    checkExistingProfile();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(stepTimestamps));
  }, [stepTimestamps]);

  useEffect(() => {
    if (!stepTimestamps[step]) {
      setStepTimestamps(prev => ({
        ...prev,
        [step]: Date.now(),
      }));
    }
  }, [step, stepTimestamps]);

  const update = useCallback((data: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...data }));
    setError(null);
  }, []);

  const validateStep = useCallback((): { valid: boolean; message?: string } => {
    switch (step) {
      case 0:
        if (!profile.goalType) {
          return { valid: false, message: 'Please select a goal' };
        }
        return { valid: true };

      case 1:
        if (!profile.experienceLevel) {
          return { valid: false, message: 'Please select your activity level' };
        }
        return { valid: true };

      case 2:
        if (!profile.daysPerWeek || profile.daysPerWeek < 1 || profile.daysPerWeek > 7) {
          return { valid: false, message: 'Please select training days (1-7)' };
        }
        return { valid: true };

      case 3:
        return { valid: true };

      case 4:
        if (!profile.surface) {
          return { valid: false, message: 'Please select your preferred surface' };
        }
        return { valid: true };

      case 5:
        if (!profile.strengthPreference) {
          return { valid: false, message: 'Please select strength training preference' };
        }
        return { valid: true };

      case 6:
        return { valid: true };

      default:
        return { valid: false };
    }
  }, [step, profile]);

  const canProceed = validateStep().valid;

  const next = useCallback(() => {
    const validation = validateStep();

    if (!validation.valid) {
      if (validation.message) {
        toast(validation.message, 'error');
      }
      return;
    }

    setStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
    setError(null);
  }, [validateStep]);

  const back = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 0));
    setError(null);
  }, []);

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 0 && stepNumber < TOTAL_STEPS) {
      setStep(stepNumber);
      setError(null);
    }
  }, []);

  const retryAfterError = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const finishOnboarding = useCallback(async () => {
    if (!profile.goalType || !profile.experienceLevel || !profile.daysPerWeek) {
      toast('Please complete all required steps', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const template = pickTemplate(profile.goalType, profile.experienceLevel);
      const aiLevel = determineAdaptation(
        profile.experienceLevel,
        profile.deviceConnected || false
      );
      const initialVolume = calculateInitialVolume(
        profile.avgMileage,
        profile.experienceLevel
      );

      const enrichedProfile: Partial<UserProfile> = {
        ...profile,
        planTemplate: template,
        aiAdaptationLevel: aiLevel,
        avgMileage: initialVolume,
        planStartDate: new Date().toISOString(),
        onboardingCompleted: false,
      };

      const savedProfile = await saveUserProfile(enrichedProfile);

      if (!savedProfile) {
        throw new Error('Failed to save profile');
      }

      await createTrainingPlan({
        userId: savedProfile.user_id!,
        goalType: profile.goalType,
        experienceLevel: profile.experienceLevel,
        weeklyKm: initialVolume,
        daysPerWeek: profile.daysPerWeek,
        planTemplate: template,
        startDate: new Date().toISOString(),
      });

      const completed = await completeOnboarding(savedProfile.user_id!);
      console.log('Onboarding completion result:', completed);

      if (!completed) {
        throw new Error('Failed to mark onboarding as complete');
      }

      const completionTime = Date.now() - (stepTimestamps[0] || Date.now());
      console.log(`Onboarding completed in ${Math.round(completionTime / 1000)}s`);

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMPS_KEY);

      toast('Your training plan is ready!', 'success');
      setIsComplete(true);

      setTimeout(() => {
        navigate('/quest');
      }, 1000);

    } catch (error) {
      console.error('Error completing onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create your plan';
      setError(errorMessage);
      toast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [profile, navigate, stepTimestamps]);

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return {
    step,
    totalSteps: TOTAL_STEPS,
    profile,
    isLoading,
    isComplete,
    error,
    update,
    next,
    back,
    goToStep,
    finishOnboarding,
    retryAfterError,
    progress,
    canProceed,
    stepTimestamps,
  };
}
