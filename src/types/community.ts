export type MatchPreference = 'local' | 'virtual' | 'both';
export type TerrainType = 'road' | 'trail' | 'track' | 'mixed';
export type RunTimePreference = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
export type InviteType = 'local' | 'virtual';
export type MatchType = 'local' | 'virtual';

export interface CommunityProfile {
  id: string;
  user_id: string;

  preferred_run_time: RunTimePreference[];
  preferred_terrain: TerrainType;
  pace_min: number | null;
  pace_max: number | null;
  availability_days: string[];

  bio: string | null;
  looking_for_partner: boolean;
  match_preference: MatchPreference;

  location: {
    lat: number;
    lon: number;
  } | null;
  location_label: string | null;
  max_distance_km: number;

  visible: boolean;
  share_location: boolean;

  calendar_integration_enabled?: boolean;
  auto_location_detection?: boolean;
  home_location?: {
    lat: number;
    lon: number;
  } | null;
  home_city?: string | null;
  home_country?: string | null;

  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface CompanionMatch {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  pace_min: number | null;
  pace_max: number | null;
  preferred_terrain: TerrainType;
  availability_days: string[];
  match_type: MatchType;
  distance_km: number | null;
  match_score: number;
  last_active_at: string;
  preferred_run_time: RunTimePreference[];
  location_context?: 'current' | 'upcoming' | 'past';
  location_label?: string | null;
  available_dates?: string | null;
}

export interface CommunityConnection {
  id: string;
  user_id: string;
  partner_id: string;
  status: ConnectionStatus;
  connection_type: MatchType;

  runs_together: number;
  total_km_together: number;
  last_run_date: string | null;

  requested_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunInvite {
  id: string;
  sender_id: string;
  recipient_id: string;

  invite_type: InviteType;
  proposed_date: string;
  proposed_time: string | null;
  meeting_location: string | null;
  meeting_lat: number | null;
  meeting_lon: number | null;

  workout_type: string | null;
  distance_km: number | null;
  notes: string | null;

  status: InviteStatus;

  sender_timezone: string | null;
  recipient_timezone: string | null;

  created_at: string;
  expires_at: string;
  responded_at: string | null;
}

export interface CommunityStats {
  total_connections: number;
  total_runs: number;
  total_km: number;
  active_invites: number;
}

export interface SearchFilters {
  pace_min?: number;
  pace_max?: number;
  terrain?: TerrainType;
  days?: string[];
  match_type?: MatchType;
  limit?: number;
  location_ids?: string[];
  date_range_start?: string;
  date_range_end?: string;
}

export interface CreateProfileData {
  preferred_run_time?: RunTimePreference[];
  preferred_terrain?: TerrainType;
  pace_min?: number;
  pace_max?: number;
  availability_days?: string[];
  bio?: string;
  looking_for_partner?: boolean;
  match_preference?: MatchPreference;
  location?: { lat: number; lon: number };
  location_label?: string;
  max_distance_km?: number;
  visible?: boolean;
  share_location?: boolean;
  calendar_integration_enabled?: boolean;
  auto_location_detection?: boolean;
  home_location?: { lat: number; lon: number };
  home_city?: string;
  home_country?: string;
}

export interface CreateInviteData {
  recipient_id: string;
  invite_type: InviteType;
  proposed_date: string;
  proposed_time?: string;
  meeting_location?: string;
  meeting_lat?: number;
  meeting_lon?: number;
  workout_type?: string;
  distance_km?: number;
  notes?: string;
  sender_timezone?: string;
}

export const DAY_OPTIONS = [
  { key: 'monday', label: 'Mon', emoji: '📅' },
  { key: 'tuesday', label: 'Tue', emoji: '📅' },
  { key: 'wednesday', label: 'Wed', emoji: '📅' },
  { key: 'thursday', label: 'Thu', emoji: '📅' },
  { key: 'friday', label: 'Fri', emoji: '📅' },
  { key: 'saturday', label: 'Sat', emoji: '🏃' },
  { key: 'sunday', label: 'Sun', emoji: '🏃' },
];

export const RUN_TIME_OPTIONS = [
  { key: 'early_morning', label: 'Early Morning', time: '5-7 AM', emoji: '🌅' },
  { key: 'morning', label: 'Morning', time: '7-10 AM', emoji: '☀️' },
  { key: 'midday', label: 'Midday', time: '10 AM-2 PM', emoji: '🌞' },
  { key: 'afternoon', label: 'Afternoon', time: '2-6 PM', emoji: '🌤️' },
  { key: 'evening', label: 'Evening', time: '6-9 PM', emoji: '🌆' },
];

export const TERRAIN_OPTIONS = [
  { key: 'road', label: 'Road', emoji: '🏙️', description: 'Pavement and sidewalks' },
  { key: 'trail', label: 'Trail', emoji: '🌲', description: 'Forest and mountain trails' },
  { key: 'track', label: 'Track', emoji: '🏟️', description: 'Running track' },
  { key: 'mixed', label: 'Mixed', emoji: '🌍', description: 'Flexible terrain' },
];

export const MATCH_PREFERENCE_OPTIONS = [
  { key: 'local', label: 'Local Only', emoji: '📍', description: 'Find runners nearby' },
  { key: 'virtual', label: 'Virtual Only', emoji: '🌍', description: 'Connect remotely worldwide' },
  { key: 'both', label: 'Both', emoji: '🤝', description: 'Open to local and virtual' },
];

export type LocationSource = 'manual' | 'travel_calendar' | 'race_calendar' | 'google_calendar' | 'auto_detected';
export type LocationContext = 'current' | 'upcoming' | 'past';

export interface UserLocation {
  id: string;
  user_id: string;
  location?: {
    lat: number;
    lon: number;
  } | null;
  city: string | null;
  country: string | null;
  location_label: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  location_source: LocationSource;
  linked_travel_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveLocation {
  id: string;
  location_label: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location_source: LocationSource;
  distance_from_home_km: number | null;
}

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  day_of_week: string | null;
  time_start: string;
  time_end: string;
  start_date: string | null;
  end_date: string | null;
  location_id: string | null;
  location_label?: string | null;
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAvailabilitySlot {
  day_of_week?: string;
  time_start: string;
  time_end: string;
  start_date?: string;
  end_date?: string;
  location_id?: string;
  is_recurring?: boolean;
}

export interface UpcomingTravelBuddies {
  travel_location_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  potential_buddies_count: number;
  top_matches: Array<{
    user_id: string;
    display_name: string;
    pace_range: string;
    terrain: string;
  }>;
}

export interface CreateUserLocation {
  city?: string;
  country?: string;
  location_label: string;
  location?: { lat: number; lon: number };
  start_date?: string;
  end_date?: string;
  location_source?: LocationSource;
}
