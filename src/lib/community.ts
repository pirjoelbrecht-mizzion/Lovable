import { supabase } from './supabase';
import type {
  CommunityProfile,
  CompanionMatch,
  CommunityConnection,
  RunInvite,
  CommunityStats,
  SearchFilters,
  CreateProfileData,
  CreateInviteData,
  UserLocation,
  ActiveLocation,
  AvailabilitySlot,
  CreateAvailabilitySlot,
  CreateUserLocation,
  UpcomingTravelBuddies,
} from '@/types/community';

export async function getCommunityProfile(userId: string): Promise<CommunityProfile | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return transformDbToCommunityProfile(data);
  } catch (error) {
    console.error('Error fetching community profile:', error);
    return null;
  }
}

export async function getCurrentUserCommunityProfile(): Promise<CommunityProfile | null> {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return await getCommunityProfile(user.id);
  } catch (error) {
    console.error('Error fetching current user community profile:', error);
    return null;
  }
}

export async function createOrUpdateCommunityProfile(
  profileData: CreateProfileData
): Promise<CommunityProfile | null> {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const dbData: any = {
      user_id: user.id,
      preferred_run_time: profileData.preferred_run_time || ['morning'],
      preferred_terrain: profileData.preferred_terrain || 'road',
      pace_min: profileData.pace_min,
      pace_max: profileData.pace_max,
      availability_days: profileData.availability_days || [],
      bio: profileData.bio,
      looking_for_partner: profileData.looking_for_partner ?? false,
      match_preference: profileData.match_preference || 'both',
      max_distance_km: profileData.max_distance_km || 25,
      visible: profileData.visible ?? false,
      share_location: profileData.share_location ?? false,
      location_label: profileData.location_label,
      calendar_integration_enabled: profileData.calendar_integration_enabled ?? false,
      auto_location_detection: profileData.auto_location_detection ?? false,
      home_city: profileData.home_city,
      home_country: profileData.home_country,
    };

    if (profileData.location && profileData.share_location) {
      dbData.location = `POINT(${profileData.location.lon} ${profileData.location.lat})`;
    }

    if (profileData.home_location) {
      dbData.home_location = `POINT(${profileData.home_location.lon} ${profileData.home_location.lat})`;
    }

    const { data, error } = await supabase
      .from('community_profiles')
      .upsert(dbData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('update_community_last_active', { p_user_id: user.id });

    return transformDbToCommunityProfile(data);
  } catch (error) {
    console.error('Error creating/updating community profile:', error);
    return null;
  }
}

export async function findCompanions(
  filters: SearchFilters = {}
): Promise<CompanionMatch[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('find_companions', {
      p_user_id: user.id,
      p_pace_min: filters.pace_min || null,
      p_pace_max: filters.pace_max || null,
      p_terrain: filters.terrain || null,
      p_days: filters.days || null,
      p_limit: filters.limit || 20,
    });

    if (error) throw error;

    await supabase.rpc('update_community_last_active', { p_user_id: user.id });

    return data || [];
  } catch (error) {
    console.error('Error finding companions:', error);
    return [];
  }
}

export async function sendConnectionRequest(
  partnerId: string,
  connectionType: 'local' | 'virtual' = 'local'
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('community_connections')
      .insert({
        user_id: user.id,
        partner_id: partnerId,
        status: 'pending',
        connection_type: connectionType,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending connection request:', error);
    return false;
  }
}

export async function acceptConnectionRequest(connectionId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('accept_connection_request', {
      p_connection_id: connectionId,
      p_user_id: user.id,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error accepting connection request:', error);
    return false;
  }
}

export async function declineConnectionRequest(connectionId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('community_connections')
      .update({ status: 'declined' })
      .eq('id', connectionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error declining connection request:', error);
    return false;
  }
}

export async function getMyConnections(): Promise<CommunityConnection[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('community_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
}

export async function getPendingConnectionRequests(): Promise<CommunityConnection[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('community_connections')
      .select('*')
      .eq('partner_id', user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
}

export async function getPendingConnectionCount(): Promise<number> {
  if (!supabase) return 0;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('get_pending_connection_count', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error fetching pending count:', error);
    return 0;
  }
}

export async function createRunInvite(inviteData: CreateInviteData): Promise<RunInvite | null> {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('run_invites')
      .insert({
        sender_id: user.id,
        recipient_id: inviteData.recipient_id,
        invite_type: inviteData.invite_type,
        proposed_date: inviteData.proposed_date,
        proposed_time: inviteData.proposed_time,
        meeting_location: inviteData.meeting_location,
        meeting_lat: inviteData.meeting_lat,
        meeting_lon: inviteData.meeting_lon,
        workout_type: inviteData.workout_type,
        distance_km: inviteData.distance_km,
        notes: inviteData.notes,
        sender_timezone: inviteData.sender_timezone,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating run invite:', error);
    return null;
  }
}

export async function respondToRunInvite(
  inviteId: string,
  status: 'accepted' | 'declined'
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('run_invites')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error responding to run invite:', error);
    return false;
  }
}

export async function getMyRunInvites(): Promise<RunInvite[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('run_invites')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching run invites:', error);
    return [];
  }
}

export async function getCommunityStats(): Promise<CommunityStats | null> {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('get_community_stats', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching community stats:', error);
    return null;
  }
}

function transformDbToCommunityProfile(dbRow: any): CommunityProfile {
  let location = null;
  if (dbRow.location) {
    const match = dbRow.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      location = {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }

  let homeLocation = null;
  if (dbRow.home_location) {
    const match = dbRow.home_location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      homeLocation = {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }

  return {
    id: dbRow.id,
    user_id: dbRow.user_id,
    preferred_run_time: dbRow.preferred_run_time || [],
    preferred_terrain: dbRow.preferred_terrain || 'road',
    pace_min: dbRow.pace_min,
    pace_max: dbRow.pace_max,
    availability_days: dbRow.availability_days || [],
    bio: dbRow.bio,
    looking_for_partner: dbRow.looking_for_partner || false,
    match_preference: dbRow.match_preference || 'both',
    location,
    location_label: dbRow.location_label,
    max_distance_km: dbRow.max_distance_km || 25,
    visible: dbRow.visible || false,
    share_location: dbRow.share_location || false,
    calendar_integration_enabled: dbRow.calendar_integration_enabled || false,
    auto_location_detection: dbRow.auto_location_detection || false,
    home_location: homeLocation,
    home_city: dbRow.home_city,
    home_country: dbRow.home_country,
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
    last_active_at: dbRow.last_active_at,
  };
}

export async function hasUnityEnabled(): Promise<boolean> {
  const profile = await getCurrentUserCommunityProfile();
  return profile?.visible === true;
}

export async function getUserActiveLocations(): Promise<ActiveLocation[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_user_active_locations', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active locations:', error);
    return [];
  }
}

export async function createUserLocation(locationData: CreateUserLocation): Promise<UserLocation | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return null;
    }
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    const dbData: any = {
      user_id: user.id,
      city: locationData.city,
      country: locationData.country,
      location_label: locationData.location_label,
      start_date: locationData.start_date,
      end_date: locationData.end_date,
      location_source: locationData.location_source || 'manual',
      is_active: true,
    };

    if (locationData.location) {
      dbData.location = `POINT(${locationData.location.lon} ${locationData.location.lat})`;
    }

    console.log('Inserting location data:', dbData);

    const { data, error } = await supabase
      .from('user_locations')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log('Location already exists (duplicate), skipping insert');
        return null;
      }
      console.error('Database insert error:', error);
      throw error;
    }

    console.log('Location inserted successfully:', data);
    return transformDbToUserLocation(data);
  } catch (error) {
    console.error('Error creating user location:', error);
    return null;
  }
}

export async function deleteUserLocation(locationId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('user_locations')
      .delete()
      .eq('id', locationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user location:', error);
    return false;
  }
}

export async function getUpcomingTravelBuddies(daysAhead = 14): Promise<UpcomingTravelBuddies[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_upcoming_travel_buddies', {
      p_user_id: user.id,
      p_days_ahead: daysAhead,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming travel buddies:', error);
    return [];
  }
}

export async function getUserAvailability(locationId?: string): Promise<AvailabilitySlot[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_user_availability', {
      p_user_id: user.id,
      p_location_id: locationId || null,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user availability:', error);
    return [];
  }
}

export async function createAvailabilitySlot(slotData: CreateAvailabilitySlot): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('upsert_availability_slot', {
      p_user_id: user.id,
      p_slot_id: null,
      p_day_of_week: slotData.day_of_week || null,
      p_time_start: slotData.time_start,
      p_time_end: slotData.time_end,
      p_start_date: slotData.start_date || null,
      p_end_date: slotData.end_date || null,
      p_location_id: slotData.location_id || null,
      p_is_recurring: slotData.is_recurring ?? true,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating availability slot:', error);
    return null;
  }
}

export async function updateAvailabilitySlot(
  slotId: string,
  slotData: Partial<CreateAvailabilitySlot>
): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('upsert_availability_slot', {
      p_user_id: user.id,
      p_slot_id: slotId,
      p_day_of_week: slotData.day_of_week || null,
      p_time_start: slotData.time_start || null,
      p_time_end: slotData.time_end || null,
      p_start_date: slotData.start_date || null,
      p_end_date: slotData.end_date || null,
      p_location_id: slotData.location_id || null,
      p_is_recurring: slotData.is_recurring ?? null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating availability slot:', error);
    return null;
  }
}

export async function deleteAvailabilitySlot(slotId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', slotId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting availability slot:', error);
    return false;
  }
}

export async function findCompanionsMultiLocation(
  filters: SearchFilters = {}
): Promise<CompanionMatch[]> {
  if (!supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('find_companions_multi_location', {
      p_user_id: user.id,
      p_location_ids: filters.location_ids || null,
      p_date_range_start: filters.date_range_start || null,
      p_date_range_end: filters.date_range_end || null,
      p_pace_min: filters.pace_min || null,
      p_pace_max: filters.pace_max || null,
      p_terrain: filters.terrain || null,
      p_days: filters.days || null,
      p_limit: filters.limit || 20,
    });

    if (error) throw error;

    await supabase.rpc('update_community_last_active', { p_user_id: user.id });

    return data || [];
  } catch (error) {
    console.error('Error finding companions (multi-location):', error);
    return [];
  }
}

function transformDbToUserLocation(dbRow: any): UserLocation {
  let location = null;
  if (dbRow.location) {
    const match = dbRow.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      location = {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }

  return {
    id: dbRow.id,
    user_id: dbRow.user_id,
    location,
    city: dbRow.city,
    country: dbRow.country,
    location_label: dbRow.location_label,
    start_date: dbRow.start_date,
    end_date: dbRow.end_date,
    is_active: dbRow.is_active,
    location_source: dbRow.location_source,
    linked_travel_id: dbRow.linked_travel_id,
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
  };
}
