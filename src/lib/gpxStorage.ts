import { getSupabase, getCurrentUserId } from './supabase';

export async function uploadGPXFile(
  file: File,
  eventId: string
): Promise<string> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated to upload GPX files');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${eventId}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('gpx-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload GPX file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('gpx-files')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function deleteGPXFile(gpxUrl: string): Promise<boolean> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const path = gpxUrl.split('/gpx-files/')[1];
  if (!path) {
    throw new Error('Invalid GPX URL');
  }

  const { error } = await supabase.storage
    .from('gpx-files')
    .remove([path]);

  if (error) {
    console.error('Error deleting GPX file:', error);
    return false;
  }

  return true;
}

export async function downloadGPXFile(gpxUrl: string): Promise<Blob> {
  const response = await fetch(gpxUrl);
  if (!response.ok) {
    throw new Error('Failed to download GPX file');
  }
  return response.blob();
}

export async function saveGPXAnalysisToEvent(
  eventId: string,
  gpxParsedData: any,
  routeAnalysis: any
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('events')
    .update({
      gpx_parsed_data: gpxParsedData,
      route_analysis: routeAnalysis,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to save GPX analysis: ${error.message}`);
  }
}

export async function saveRouteSegments(
  eventId: string,
  segments: any[]
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  await supabase
    .from('route_segments_gpx')
    .delete()
    .eq('event_id', eventId);

  const segmentRecords = segments.map((seg, idx) => ({
    event_id: eventId,
    segment_index: idx,
    segment_type: seg.type,
    distance_km: seg.distanceKm,
    elevation_gain_m: seg.elevationGainM,
    elevation_loss_m: seg.elevationLossM,
    start_elevation_m: seg.startElevationM,
    end_elevation_m: seg.endElevationM,
    estimated_time_seconds: Math.round(seg.estimatedTime || 0),
    estimated_pace_min_km: seg.estimatedPace || null,
    grade_avg_pct: seg.gradeAvgPct,
    grade_max_pct: seg.gradeMaxPct,
  }));

  const { error } = await supabase
    .from('route_segments_gpx')
    .insert(segmentRecords);

  if (error) {
    throw new Error(`Failed to save route segments: ${error.message}`);
  }
}

export async function getEventRouteAnalysis(eventId: string): Promise<any> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('events')
    .select('route_analysis, gpx_parsed_data, gpx_file_url')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch route analysis: ${error.message}`);
  }

  return data;
}

export async function getRouteSegments(eventId: string): Promise<any[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('route_segments_gpx')
    .select('*')
    .eq('event_id', eventId)
    .order('segment_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch route segments: ${error.message}`);
  }

  return data || [];
}
