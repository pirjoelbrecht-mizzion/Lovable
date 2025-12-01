/**
 * User Profile Database Helpers
 * CRUD operations for user profiles with onboarding data
 * Handles both Supabase storage and local state management
 */

import { supabase } from './supabase';
import type { UserProfile, DeviceData, TargetRace } from '@/types/onboarding';

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return transformDbToProfile(data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return await getUserProfile(user.id);
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return null;
  }
}

/**
 * Create or update user profile
 * Handles both new profiles and updates to existing ones
 */
export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const dbProfile = transformProfileToDb(profile, user.id);

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(dbProfile, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) throw error;

    return transformDbToProfile(data);
  } catch (error) {
    console.error('Error saving user profile:', error);
    return null;
  }
}

/**
 * Update specific fields in user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const dbUpdates = transformProfileToDb(updates, userId);

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return transformDbToProfile(data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return false;
  }
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.onboarding_completed ?? false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Update device connection status and data
 */
export async function updateDeviceData(
  userId: string,
  deviceType: string,
  deviceData: DeviceData
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        device_connected: true,
        device_type: deviceType,
        device_data: deviceData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating device data:', error);
    return false;
  }
}

/**
 * Update target race information
 */
export async function updateTargetRace(
  userId: string,
  targetRace: TargetRace
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        target_race: targetRace,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating target race:', error);
    return false;
  }
}

/**
 * Delete user profile
 */
export async function deleteUserProfile(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user profile:', error);
    return false;
  }
}

/**
 * Transform database row to UserProfile type
 */
function transformDbToProfile(dbRow: any): UserProfile {
  return {
    id: dbRow.id,
    user_id: dbRow.user_id,

    // Goal & Experience
    goalType: dbRow.goal_type,
    experienceLevel: dbRow.experience_level || 'beginner',
    motivation: dbRow.motivation,

    // Training Schedule
    daysPerWeek: dbRow.days_per_week || 3,
    restDays: dbRow.rest_days || [],
    preferredRunDays: dbRow.preferred_run_days || [],

    // Preferences
    surface: dbRow.surface,
    crossTraining: dbRow.cross_training || [],
    strengthPreference: dbRow.strength_preference || 'none',

    // Current Fitness
    avgMileage: dbRow.avg_mileage ? parseFloat(dbRow.avg_mileage) : undefined,
    longRunDistance: dbRow.long_run_distance ? parseFloat(dbRow.long_run_distance) : undefined,
    currentPace: dbRow.current_pace ? parseFloat(dbRow.current_pace) : undefined,

    // Device Integration
    deviceConnected: dbRow.device_connected || false,
    deviceType: dbRow.device_type,
    deviceData: dbRow.device_data,

    // Target Race
    targetRace: dbRow.target_race,

    // Plan Configuration
    planTemplate: dbRow.plan_template || '',
    planStartDate: dbRow.plan_start_date || new Date().toISOString(),
    aiAdaptationLevel: dbRow.ai_adaptation_level || 0,

    // Onboarding Status
    onboardingCompleted: dbRow.onboarding_completed || false,
    onboardingCompletedAt: dbRow.onboarding_completed_at,

    // Metadata
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
  };
}

/**
 * Transform UserProfile to database format
 */
function transformProfileToDb(profile: Partial<UserProfile>, userId: string): any {
  return {
    user_id: userId,

    // Goal & Experience
    goal_type: profile.goalType,
    experience_level: profile.experienceLevel,
    motivation: profile.motivation,

    // Training Schedule
    days_per_week: profile.daysPerWeek,
    rest_days: profile.restDays,
    preferred_run_days: profile.preferredRunDays,

    // Preferences
    surface: profile.surface,
    cross_training: profile.crossTraining,
    strength_preference: profile.strengthPreference,

    // Current Fitness
    avg_mileage: profile.avgMileage,
    long_run_distance: profile.longRunDistance,
    current_pace: profile.currentPace,

    // Device Integration
    device_connected: profile.deviceConnected,
    device_type: profile.deviceType,
    device_data: profile.deviceData,

    // Target Race
    target_race: profile.targetRace,

    // Plan Configuration
    plan_template: profile.planTemplate,
    plan_start_date: profile.planStartDate,
    ai_adaptation_level: profile.aiAdaptationLevel,

    // Onboarding Status
    onboarding_completed: profile.onboardingCompleted,
    onboarding_completed_at: profile.onboardingCompletedAt,
  };
}

/**
 * Get profile completion percentage
 */
export function getProfileCompleteness(profile: Partial<UserProfile>): number {
  const fields = [
    profile.goalType,
    profile.experienceLevel,
    profile.daysPerWeek,
    profile.surface,
    profile.strengthPreference,
    profile.planTemplate,
  ];

  const completed = fields.filter(f => f !== undefined && f !== null && f !== '').length;
  return Math.round((completed / fields.length) * 100);
}

/**
 * Validate profile has minimum required fields
 */
export function isProfileValid(profile: Partial<UserProfile>): boolean {
  return !!(
    profile.goalType &&
    profile.experienceLevel &&
    profile.daysPerWeek &&
    profile.daysPerWeek >= 1 &&
    profile.daysPerWeek <= 7
  );
}
