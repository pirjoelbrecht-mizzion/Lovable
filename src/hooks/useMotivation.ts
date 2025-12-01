/**
 * useMotivation Hook
 *
 * Custom React hook for managing user motivation archetype throughout the app.
 * Handles detection, persistence, and real-time updates of motivation profile.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUserId } from '@/lib/supabase';
import {
  getUserMotivationProfile,
  detectMotivationArchetype,
  saveMotivationProfile,
  type MotivationProfile,
  type OnboardingResponses,
  type ArchetypeType,
} from '@/lib/motivationDetection';

interface UseMotivationOptions {
  autoLoad?: boolean;
  onProfileChange?: (profile: MotivationProfile) => void;
}

interface UseMotivationReturn {
  profile: MotivationProfile | null;
  loading: boolean;
  error: string | null;

  detectArchetype: (onboardingResponses?: OnboardingResponses) => Promise<MotivationProfile | null>;

  refreshProfile: () => Promise<void>;

  hasProfile: boolean;

  isConfident: boolean;
}

export function useMotivation(options: UseMotivationOptions = {}): UseMotivationReturn {
  const { autoLoad = true, onProfileChange } = options;

  const [profile, setProfile] = useState<MotivationProfile | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoLoad) {
      loadProfile();
    }
  }, [autoLoad]);

  useEffect(() => {
    if (profile && onProfileChange) {
      onProfileChange(profile);
    }
  }, [profile, onProfileChange]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setProfile(null);
        return;
      }

      const motivationProfile = await getUserMotivationProfile(userId);
      setProfile(motivationProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load motivation profile';
      setError(errorMessage);
      console.error('Error loading motivation profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const detectArchetype = useCallback(
    async (onboardingResponses?: OnboardingResponses): Promise<MotivationProfile | null> => {
      setLoading(true);
      setError(null);

      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          throw new Error('No authenticated user');
        }

        const detectedProfile = await detectMotivationArchetype(userId, onboardingResponses);

        if (!detectedProfile) {
          throw new Error('Failed to detect motivation archetype');
        }

        const saved = await saveMotivationProfile(
          userId,
          detectedProfile,
          onboardingResponses ? 'onboarding' : 'manual_recalculation',
          { onboardingResponses }
        );

        if (!saved) {
          throw new Error('Failed to save motivation profile');
        }

        setProfile(detectedProfile);
        return detectedProfile;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to detect archetype';
        setError(errorMessage);
        console.error('Error detecting archetype:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const hasProfile = profile !== null && profile.confidence > 0;
  const isConfident = profile !== null && profile.confidence >= 0.6;

  return {
    profile,
    loading,
    error,
    detectArchetype,
    refreshProfile,
    hasProfile,
    isConfident,
  };
}

export function getArchetypeName(archetype: ArchetypeType): string {
  const names: Record<ArchetypeType, string> = {
    performer: 'Performer',
    adventurer: 'Adventurer',
    mindful: 'Mindful Mover',
    health: 'Health Builder',
    transformer: 'Transformer',
    connector: 'Connector',
  };
  return names[archetype];
}

export function getArchetypeEmoji(archetype: ArchetypeType): string {
  const emojis: Record<ArchetypeType, string> = {
    performer: '⚡',
    adventurer: '🏔️',
    mindful: '🧘',
    health: '💚',
    transformer: '💪',
    connector: '🤝',
  };
  return emojis[archetype];
}

export function getArchetypeColor(archetype: ArchetypeType): string {
  const colors: Record<ArchetypeType, string> = {
    performer: '#DC2626',
    adventurer: '#059669',
    mindful: '#A855F7',
    health: '#10B981',
    transformer: '#F59E0B',
    connector: '#3B82F6',
  };
  return colors[archetype];
}
