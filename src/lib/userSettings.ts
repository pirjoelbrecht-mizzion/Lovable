import { supabase } from './supabase';
import { load, save } from '@/utils/storage';

export type UserSettings = {
  id?: string;
  user_id?: string;
  units: 'metric' | 'imperial';
  language: string;
  health_status: 'ok' | 'returning' | 'sick';
  notifications_enabled: boolean;
  coach_notifications: boolean;
  training_reminders: boolean;
  race_alerts: boolean;
  profile_visibility: 'private' | 'community' | 'public';
  share_progress: boolean;
  theme: 'light' | 'dark' | 'system';
  compact_view: boolean;
  voice_output_enabled: boolean;
  voice_input_enabled: boolean;
  coach_proactive_tips: boolean;
  flat_pace_mode?: 'accurate' | 'conservative' | 'fast';
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  units: 'metric',
  language: 'en',
  health_status: 'ok',
  notifications_enabled: true,
  coach_notifications: true,
  training_reminders: true,
  race_alerts: true,
  profile_visibility: 'private',
  share_progress: false,
  theme: 'system',
  compact_view: false,
  voice_output_enabled: false,
  voice_input_enabled: false,
  coach_proactive_tips: true,
  flat_pace_mode: 'accurate',
};

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return getLocalSettings();
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      return getLocalSettings();
    }

    if (!data) {
      const newSettings = await createUserSettings();
      return newSettings || getLocalSettings();
    }

    syncToLocalStorage(data);
    return data;
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return getLocalSettings();
  }
}

export async function updateUserSettings(updates: Partial<UserSettings>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      updateLocalSettings(updates);
      return true;
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...updates,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error updating user settings:', error);
      updateLocalSettings(updates);
      return false;
    }

    updateLocalSettings(updates);
    return true;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    updateLocalSettings(updates);
    return false;
  }
}

async function createUserSettings(): Promise<UserSettings | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const localSettings = getLocalSettings();

    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        ...localSettings,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserSettings:', error);
    return null;
  }
}

function getLocalSettings(): UserSettings {
  const units = load<'metric' | 'imperial'>('units', DEFAULT_SETTINGS.units);
  const lang = load<string>('lang', DEFAULT_SETTINGS.language);
  const health = load<'ok' | 'returning' | 'sick'>('health', DEFAULT_SETTINGS.health_status);
  const voiceOut = load<boolean>('chat:voiceOut', DEFAULT_SETTINGS.voice_output_enabled);

  return {
    ...DEFAULT_SETTINGS,
    units,
    language: lang,
    health_status: health,
    voice_output_enabled: voiceOut,
  };
}

function updateLocalSettings(updates: Partial<UserSettings>): void {
  if (updates.units !== undefined) save('units', updates.units);
  if (updates.language !== undefined) save('lang', updates.language);
  if (updates.health_status !== undefined) save('health', updates.health_status);
  if (updates.voice_output_enabled !== undefined) save('chat:voiceOut', updates.voice_output_enabled);
}

function syncToLocalStorage(settings: UserSettings): void {
  save('units', settings.units);
  save('lang', settings.language);
  save('health', settings.health_status);
  save('chat:voiceOut', settings.voice_output_enabled);
}

export async function migrateLocalSettingsToSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSettings) {
      return;
    }

    const localSettings = getLocalSettings();
    await createUserSettings();

    console.log('Successfully migrated local settings to Supabase');
  } catch (error) {
    console.error('Error migrating settings:', error);
  }
}
