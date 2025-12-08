/**
 * Strava Rich Data Service
 * Fetches and stores detailed activity data including photos, segments, achievements, and gear
 */

import { supabase } from '../lib/supabase';
import type { ActivityPhoto, ActivitySegment, ActivityBestEffort, AthleteGear } from '../types';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

interface StravaPhoto {
  unique_id: string;
  urls: {
    '100': string;
    '600': string;
  };
  caption?: string;
  location?: [number, number];
}

interface StravaSegmentEffort {
  id: number;
  segment: {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_index: number;
  end_index: number;
  pr_rank?: number;
  kom_rank?: number;
  achievements?: Array<{ type: string; type_id: number }>;
}

interface StravaBestEffort {
  id: number;
  name: string;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  start_index: number;
  end_index: number;
  pr_rank?: number;
}

interface StravaGear {
  id: string;
  name: string;
  brand_name?: string;
  model_name?: string;
  primary: boolean;
  distance: number;
  resource_state: number;
}

export class StravaRichDataService {
  /**
   * Fetch and store all rich data for an activity
   */
  async fetchAndStoreActivityDetails(
    activityId: string,
    logEntryId: string,
    accessToken: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log(`Fetching rich data for activity ${activityId}`);

      // Fetch detailed activity data with all efforts
      const activityResponse = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}?include_all_efforts=true`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!activityResponse.ok) {
        if (activityResponse.status === 404) {
          console.log(`Activity ${activityId} not found (404), skipping rich data fetch`);
        } else if (activityResponse.status === 401) {
          console.error('Unauthorized: Strava token may have expired');
        } else {
          console.error('Failed to fetch activity details:', activityResponse.status);
        }
        return;
      }

      const activity = await activityResponse.json();

      // Fetch photos separately (higher resolution)
      await this.fetchAndStorePhotos(activityId, logEntryId, user.id, accessToken);

      // Store segments
      if (activity.segment_efforts && activity.segment_efforts.length > 0) {
        await this.storeSegments(activity.segment_efforts, logEntryId, user.id);

        // Update log entry to mark it has segments
        await supabase
          .from('log_entries')
          .update({ has_segments: true })
          .eq('id', logEntryId);
      }

      // Store best efforts
      if (activity.best_efforts && activity.best_efforts.length > 0) {
        await this.storeBestEfforts(activity.best_efforts, logEntryId, user.id);
      }

      // Store/update gear if present
      if (activity.gear_id && activity.gear) {
        await this.storeGear(activity.gear, user.id);
      }

      console.log(`Successfully stored rich data for activity ${activityId}`);
    } catch (error) {
      console.error('Error fetching rich activity data:', error);
    }
  }

  /**
   * Fetch and store activity photos
   */
  private async fetchAndStorePhotos(
    activityId: string,
    logEntryId: string,
    userId: string,
    accessToken: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}/photos?size=2048`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No photos found for activity ${activityId}`);
        } else {
          console.log(`Error fetching photos for activity ${activityId}: ${response.status}`);
        }
        return;
      }

      const photos: StravaPhoto[] = await response.json();

      if (photos.length === 0) {
        return;
      }

      // Delete existing photos for this activity
      await supabase
        .from('activity_photos')
        .delete()
        .eq('log_entry_id', logEntryId);

      // Insert new photos
      const photosToInsert = photos.map((photo, index) => ({
        user_id: userId,
        log_entry_id: logEntryId,
        url_full: photo.urls['600'] || photo.urls['100'],
        url_thumbnail: photo.urls['100'],
        caption: photo.caption || null,
        latitude: photo.location?.[0] || null,
        longitude: photo.location?.[1] || null,
        display_order: index
      }));

      const { error } = await supabase
        .from('activity_photos')
        .insert(photosToInsert);

      if (error) {
        console.error('Error storing photos:', error);
      } else {
        // Update log entry to mark it has photos
        await supabase
          .from('log_entries')
          .update({ has_photos: true })
          .eq('id', logEntryId);

        console.log(`Stored ${photos.length} photos for activity ${activityId}`);
      }
    } catch (error) {
      console.error('Error in fetchAndStorePhotos:', error);
    }
  }

  /**
   * Store segment efforts
   */
  private async storeSegments(
    efforts: StravaSegmentEffort[],
    logEntryId: string,
    userId: string
  ): Promise<void> {
    try {
      // Delete existing segments for this activity
      await supabase
        .from('activity_segments')
        .delete()
        .eq('log_entry_id', logEntryId);

      const segmentsToInsert = efforts.map((effort) => {
        // Determine achievement type
        let achievementType: string | null = null;
        if (effort.pr_rank === 1) {
          achievementType = 'pr';
        } else if (effort.pr_rank === 2) {
          achievementType = '2nd';
        } else if (effort.pr_rank === 3) {
          achievementType = '3rd';
        } else if (effort.pr_rank && effort.pr_rank <= 10) {
          achievementType = 'top10';
        }

        return {
          user_id: userId,
          log_entry_id: logEntryId,
          segment_id: effort.segment.id.toString(),
          segment_name: effort.segment.name,
          distance: effort.segment.distance / 1000, // Convert to km
          avg_grade: effort.segment.average_grade || null,
          elapsed_time: effort.elapsed_time,
          moving_time: effort.moving_time,
          start_index: effort.start_index || null,
          end_index: effort.end_index || null,
          is_pr: effort.pr_rank === 1,
          pr_rank: effort.pr_rank || null,
          kom_rank: effort.kom_rank || null,
          achievement_type: achievementType
        };
      });

      const { error } = await supabase
        .from('activity_segments')
        .insert(segmentsToInsert);

      if (error) {
        console.error('Error storing segments:', error);
      } else {
        console.log(`Stored ${efforts.length} segments`);
      }
    } catch (error) {
      console.error('Error in storeSegments:', error);
    }
  }

  /**
   * Store best efforts
   */
  private async storeBestEfforts(
    efforts: StravaBestEffort[],
    logEntryId: string,
    userId: string
  ): Promise<void> {
    try {
      // Delete existing best efforts for this activity
      await supabase
        .from('activity_best_efforts')
        .delete()
        .eq('log_entry_id', logEntryId);

      const effortsToInsert = efforts.map((effort) => ({
        user_id: userId,
        log_entry_id: logEntryId,
        effort_name: effort.name,
        distance: effort.distance / 1000, // Convert to km
        elapsed_time: effort.elapsed_time,
        moving_time: effort.moving_time,
        start_index: effort.start_index || null,
        end_index: effort.end_index || null,
        is_pr: effort.pr_rank === 1,
        pr_rank: effort.pr_rank || null
      }));

      const { error } = await supabase
        .from('activity_best_efforts')
        .insert(effortsToInsert);

      if (error) {
        console.error('Error storing best efforts:', error);
      } else {
        console.log(`Stored ${efforts.length} best efforts`);
      }
    } catch (error) {
      console.error('Error in storeBestEfforts:', error);
    }
  }

  /**
   * Store or update gear information
   */
  private async storeGear(gear: StravaGear, userId: string): Promise<void> {
    try {
      const gearData = {
        user_id: userId,
        gear_id: gear.id,
        name: gear.name,
        brand: gear.brand_name || null,
        model: gear.model_name || null,
        gear_type: 'shoes', // Strava running activities use shoes
        distance_km: gear.distance / 1000, // Convert to km
        is_primary: gear.primary,
        retired: false
      };

      const { error } = await supabase
        .from('athlete_gear')
        .upsert(gearData, {
          onConflict: 'user_id,gear_id'
        });

      if (error) {
        console.error('Error storing gear:', error);
      } else {
        console.log(`Stored gear: ${gear.name}`);
      }
    } catch (error) {
      console.error('Error in storeGear:', error);
    }
  }

  /**
   * Get photos for an activity
   */
  async getActivityPhotos(logEntryId: string): Promise<ActivityPhoto[]> {
    const { data, error } = await supabase
      .from('activity_photos')
      .select('*')
      .eq('log_entry_id', logEntryId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching photos:', error);
      return [];
    }

    return (data || []).map(photo => ({
      id: photo.id,
      logEntryId: photo.log_entry_id,
      urlFull: photo.url_full,
      urlThumbnail: photo.url_thumbnail,
      caption: photo.caption,
      latitude: photo.latitude,
      longitude: photo.longitude,
      displayOrder: photo.display_order
    }));
  }

  /**
   * Get segments for an activity
   */
  async getActivitySegments(logEntryId: string): Promise<ActivitySegment[]> {
    const { data, error } = await supabase
      .from('activity_segments')
      .select('*')
      .eq('log_entry_id', logEntryId)
      .order('start_index', { ascending: true });

    if (error) {
      console.error('Error fetching segments:', error);
      return [];
    }

    return (data || []).map(segment => ({
      id: segment.id,
      logEntryId: segment.log_entry_id,
      segmentId: segment.segment_id,
      segmentName: segment.segment_name,
      distance: segment.distance,
      avgGrade: segment.avg_grade,
      elapsedTime: segment.elapsed_time,
      movingTime: segment.moving_time,
      startIndex: segment.start_index,
      endIndex: segment.end_index,
      isPR: segment.is_pr,
      prRank: segment.pr_rank,
      komRank: segment.kom_rank,
      achievementType: segment.achievement_type
    }));
  }

  /**
   * Get best efforts for an activity
   */
  async getActivityBestEfforts(logEntryId: string): Promise<ActivityBestEffort[]> {
    const { data, error } = await supabase
      .from('activity_best_efforts')
      .select('*')
      .eq('log_entry_id', logEntryId)
      .order('distance', { ascending: true });

    if (error) {
      console.error('Error fetching best efforts:', error);
      return [];
    }

    return (data || []).map(effort => ({
      id: effort.id,
      logEntryId: effort.log_entry_id,
      effortName: effort.effort_name,
      distance: effort.distance,
      elapsedTime: effort.elapsed_time,
      movingTime: effort.moving_time,
      startIndex: effort.start_index,
      endIndex: effort.end_index,
      isPR: effort.is_pr,
      prRank: effort.pr_rank
    }));
  }

  /**
   * Get gear by ID
   */
  async getGear(gearId: string): Promise<AthleteGear | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('athlete_gear')
      .select('*')
      .eq('user_id', user.id)
      .eq('gear_id', gearId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      gearId: data.gear_id,
      name: data.name,
      brand: data.brand,
      model: data.model,
      gearType: data.gear_type,
      distanceKm: data.distance_km,
      photoUrl: data.photo_url,
      isPrimary: data.is_primary,
      retired: data.retired
    };
  }
}

// Export singleton instance
export const stravaRichDataService = new StravaRichDataService();
