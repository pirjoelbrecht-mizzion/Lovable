import type { DbSavedRoute } from '@/lib/database';
import { supabase } from '@/lib/supabase';

export type StravaSegment = {
  id: number;
  name: string;
  activity_type: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
  climb_category: number;
  city: string;
  state: string;
  country: string;
  private: boolean;
  starred: boolean;
  total_elevation_gain?: number;
  star_count?: number;
  map?: {
    polyline?: string;
  };
};

export type StravaExploreResponse = {
  segments: StravaSegment[];
};

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

async function getUserStravaToken(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: connection } = await supabase
    .from('wearable_connections')
    .select('access_token, token_expires_at, id')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .eq('connection_status', 'connected')
    .maybeSingle();

  if (!connection?.access_token) return null;

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt && expiresAt < fiveMinutesFromNow) {
    console.log('Strava token expiring soon, refreshing...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-token-refresh`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId: connection.id }),
      }
    );

    if (!response.ok) {
      console.error('Token refresh failed:', response.status, response.statusText);
      await supabase
        .from('wearable_connections')
        .update({ connection_status: 'token_expired' })
        .eq('id', connection.id);
      return null;
    }

    const { data: refreshedConnection } = await supabase
      .from('wearable_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    return refreshedConnection?.access_token || null;
  }

  return connection.access_token;
}

export async function fetchSegmentDetails(
  segmentId: number
): Promise<StravaSegment | null> {
  const token = await getUserStravaToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/segments/${segmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch segment details:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching segment details:', error);
    return null;
  }
}

export async function fetchNearbySegments(
  lat: number,
  lon: number,
  radiusKm: number = 10,
  activityType: 'running' | 'riding' = 'running',
  useOSMFallback: boolean = true
): Promise<StravaSegment[] | { error: string; needsReconnect: boolean }> {
  let token = await getUserStravaToken();

  if (!token) {
    token = import.meta.env.VITE_STRAVA_API_TOKEN;
    if (!token || token === 'your_strava_token') {
      console.warn('Strava not connected. Please connect your Strava account in Settings or add VITE_STRAVA_API_TOKEN to .env');

      if (useOSMFallback) {
        console.log('Falling back to OpenStreetMap routes...');
        return await fallbackToOSM(lat, lon, radiusKm);
      }

      return { error: 'Strava connection required', needsReconnect: true };
    }
  }

  const radiusMeters = radiusKm * 1000;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const bounds = [
    lat - latDelta,
    lon - lonDelta,
    lat + latDelta,
    lon + lonDelta,
  ].join(',');

  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/segments/explore?bounds=${bounds}&activity_type=${activityType}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Strava API token invalid or expired');
        return { error: 'Strava authentication expired. Please reconnect your Strava account in Settings.', needsReconnect: true };
      }
      throw new Error(`Strava API error: ${response.status}`);
    }

    const data: StravaExploreResponse = await response.json();
    const segments = data.segments || [];

    if (segments.length === 0 && useOSMFallback) {
      console.log('No Strava segments found. Falling back to OpenStreetMap routes...');
      return await fallbackToOSM(lat, lon, radiusKm);
    }

    return segments;
  } catch (error) {
    console.error('Failed to fetch Strava segments:', error);

    if (useOSMFallback) {
      console.log('Strava error. Falling back to OpenStreetMap routes...');
      return await fallbackToOSM(lat, lon, radiusKm);
    }

    return { error: 'Failed to fetch routes from Strava', needsReconnect: false };
  }
}

async function fallbackToOSM(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<StravaSegment[]> {
  const { fetchOSMTrails } = await import('./osmRoutes');

  try {
    const osmRoutes = await fetchOSMTrails(lat, lon, radiusKm * 1000);

    return osmRoutes.map((route) => {
      const startPoint = route.polyline[0];
      const endPoint = route.polyline[route.polyline.length - 1];

      return {
        id: parseInt(route.id.replace('osm-', '')),
        name: route.name,
        activity_type: 'running',
        distance: route.distance * 1000,
        average_grade: 0,
        maximum_grade: 0,
        elevation_high: 0,
        elevation_low: 0,
        start_latlng: [startPoint[0], startPoint[1]],
        end_latlng: [endPoint[0], endPoint[1]],
        climb_category: 0,
        city: '',
        state: '',
        country: '',
        private: false,
        starred: false,
        total_elevation_gain: 0,
        star_count: 0,
      } as StravaSegment;
    });
  } catch (error) {
    console.error('OSM fallback also failed:', error);
    return [];
  }
}

export function stravaSegmentToRoute(segment: StravaSegment): Omit<DbSavedRoute, 'user_id'> {
  const elevationGain = Math.max(0, segment.elevation_high - segment.elevation_low);

  return {
    name: segment.name,
    distance_km: segment.distance / 1000,
    elevation_gain_m: elevationGain,
    surface_type: 'mixed',
    start_lat: segment.start_latlng[0],
    start_lon: segment.start_latlng[1],
    end_lat: segment.end_latlng[0],
    end_lon: segment.end_latlng[1],
    strava_segment_id: segment.id.toString(),
    popularity_score: 0,
    scenic_score: calculateScenicScore(segment),
    source: 'strava',
    tags: generateTags(segment),
  };
}

function calculateScenicScore(segment: StravaSegment): number {
  let score = 5;

  if (segment.climb_category > 0) {
    score += Math.min(segment.climb_category, 3);
  }

  if (segment.elevation_high > 1000) {
    score += 1;
  }

  if (segment.distance > 5000) {
    score += 1;
  }

  return Math.min(Math.max(score, 1), 10);
}

function generateTags(segment: StravaSegment): string[] {
  const tags: string[] = [];

  if (segment.climb_category > 0) {
    tags.push('hills');
  }

  if (segment.average_grade > 5) {
    tags.push('climbing');
  }

  if (segment.distance > 10000) {
    tags.push('long');
  }

  if (segment.distance < 3000) {
    tags.push('short');
  }

  return tags;
}

export function calculatePopularityScore(effortCount: number): number {
  if (effortCount < 10) return 1;
  if (effortCount < 50) return 3;
  if (effortCount < 100) return 5;
  if (effortCount < 500) return 7;
  return 10;
}
