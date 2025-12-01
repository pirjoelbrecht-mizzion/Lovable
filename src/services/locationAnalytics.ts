import { supabase } from '@/lib/supabase';

export type LocationHotspot = {
  location: string;
  latitude: number;
  longitude: number;
  activity_count: number;
  last_activity: string;
};

export type ClimatePerformanceData = {
  location: string;
  avg_temp: number;
  avg_humidity: number;
  avg_pace: number;
  avg_heart_rate: number;
  sample_count: number;
  first_recorded: string;
  last_recorded: string;
  pace_delta_vs_baseline?: number;
};

export type ClimatePerformanceResult = {
  data: ClimatePerformanceData[];
  timeWindow: number;
  usedFallback: boolean;
};

export async function logTrainingLocation(
  lat: number,
  lon: number,
  city?: string,
  country?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const { error } = await supabase.from('location_history').insert({
      user_id: user.id,
      latitude: lat,
      longitude: lon,
      city: city || null,
      country: country || null,
      detected_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log training location:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging training location:', error);
    return false;
  }
}

export async function getTrainingHotspots(
  userId?: string,
  daysBack: number = 90
): Promise<LocationHotspot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;
  if (!targetUserId) return [];

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('location_history')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('detected_at', cutoffDate.toISOString())
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch location history:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const locationMap = new Map<string, LocationHotspot>();

    for (const record of data) {
      const locationKey = record.city || `${record.latitude.toFixed(2)},${record.longitude.toFixed(2)}`;

      if (locationMap.has(locationKey)) {
        const existing = locationMap.get(locationKey)!;
        existing.activity_count += 1;
        if (new Date(record.detected_at) > new Date(existing.last_activity)) {
          existing.last_activity = record.detected_at;
        }
      } else {
        locationMap.set(locationKey, {
          location: locationKey,
          latitude: record.latitude,
          longitude: record.longitude,
          activity_count: 1,
          last_activity: record.detected_at,
        });
      }
    }

    const hotspots = Array.from(locationMap.values());
    hotspots.sort((a, b) => b.activity_count - a.activity_count);

    return hotspots.slice(0, 10);
  } catch (error) {
    console.error('Error fetching training hotspots:', error);
    return [];
  }
}

export async function updateClimatePerformance(
  location: string,
  temp: number,
  humidity: number,
  pace: number,
  heartRate: number
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[updateClimatePerformance] No user logged in');
    return false;
  }

  console.log('[updateClimatePerformance] Updating for location:', location, { temp, humidity, pace, heartRate });

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('climate_performance')
      .select('*')
      .eq('user_id', user.id)
      .eq('location', location)
      .maybeSingle();

    console.log('[updateClimatePerformance] Existing record query:', { existing, fetchError });

    if (fetchError) {
      console.error('[updateClimatePerformance] Failed to fetch existing climate performance:', fetchError);
      return false;
    }

    if (existing) {
      console.log('[updateClimatePerformance] Updating existing record, current sample_count:', existing.sample_count);
      const newSampleCount = existing.sample_count + 1;
      const newAvgTemp = (existing.avg_temp * existing.sample_count + temp) / newSampleCount;
      const newAvgHumidity = (existing.avg_humidity * existing.sample_count + humidity) / newSampleCount;
      const newAvgPace = (existing.avg_pace * existing.sample_count + pace) / newSampleCount;
      const newAvgHR = (existing.avg_heart_rate * existing.sample_count + heartRate) / newSampleCount;

      const { error: updateError } = await supabase
        .from('climate_performance')
        .update({
          avg_temp: newAvgTemp,
          avg_humidity: newAvgHumidity,
          avg_pace: newAvgPace,
          avg_heart_rate: newAvgHR,
          sample_count: newSampleCount,
          last_recorded: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[updateClimatePerformance] Failed to update climate performance:', updateError);
        return false;
      }
      console.log('[updateClimatePerformance] Updated successfully, new sample_count:', newSampleCount);
    } else {
      console.log('[updateClimatePerformance] Inserting new record for location:', location);
      const { error: insertError } = await supabase
        .from('climate_performance')
        .insert({
          user_id: user.id,
          location,
          avg_temp: temp,
          avg_humidity: humidity,
          avg_pace: pace,
          avg_heart_rate: heartRate,
          sample_count: 1,
          first_recorded: new Date().toISOString(),
          last_recorded: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[updateClimatePerformance] Failed to insert climate performance:', insertError);
        return false;
      }
      console.log('[updateClimatePerformance] Inserted successfully');
    }

    return true;
  } catch (error) {
    console.error('Error updating climate performance:', error);
    return false;
  }
}

export async function getClimatePerformanceData(
  daysBack: number = 90
): Promise<ClimatePerformanceResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[getClimatePerformanceData] No user logged in');
    return { data: [], timeWindow: daysBack, usedFallback: false };
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    console.log('[getClimatePerformanceData] Querying for user:', user.id, 'daysBack:', daysBack, 'cutoffDate:', cutoffDate.toISOString());

    const { data, error } = await supabase
      .from('climate_performance')
      .select('*')
      .eq('user_id', user.id)
      .gte('last_recorded', cutoffDate.toISOString())
      .order('sample_count', { ascending: false });

    console.log('[getClimatePerformanceData] Query result:', { dataLength: data?.length || 0, error });

    if (error) {
      console.error('[getClimatePerformanceData] Failed to fetch climate performance:', error);
      return { data: [], timeWindow: daysBack, usedFallback: false };
    }

    const totalSessions = (data || []).reduce((sum, d) => sum + d.sample_count, 0);

    if (totalSessions < 10 && daysBack === 90) {
      console.log(`Only ${totalSessions} sessions in last 90 days, falling back to 365 days`);
      return getClimatePerformanceData(365);
    }

    if (!data || data.length === 0) {
      return { data: [], timeWindow: daysBack, usedFallback: daysBack === 365 };
    }

    const baseline = data.reduce((sum, d) => sum + d.avg_pace, 0) / data.length;

    const processedData = data.map((d) => ({
      location: d.location,
      avg_temp: d.avg_temp,
      avg_humidity: d.avg_humidity,
      avg_pace: d.avg_pace,
      avg_heart_rate: d.avg_heart_rate,
      sample_count: d.sample_count,
      first_recorded: d.first_recorded,
      last_recorded: d.last_recorded,
      pace_delta_vs_baseline: ((d.avg_pace - baseline) / baseline) * 100,
    }));

    return {
      data: processedData,
      timeWindow: daysBack,
      usedFallback: daysBack === 365,
    };
  } catch (error) {
    console.error('Error fetching climate performance:', error);
    return { data: [], timeWindow: daysBack, usedFallback: false };
  }
}

export async function createTestClimateData(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[createTestClimateData] No user logged in');
    return false;
  }

  try {
    const testLocations = [
      { location: 'Copenhagen', temp: 12, humidity: 72, pace: 5.2, hr: 145 },
      { location: 'Valencia', temp: 22, humidity: 65, pace: 5.0, hr: 150 },
      { location: 'Dubai', temp: 35, humidity: 85, pace: 6.2, hr: 165 },
      { location: 'London', temp: 15, humidity: 78, pace: 5.3, hr: 148 },
      { location: 'Boulder', temp: 18, humidity: 45, pace: 4.8, hr: 142 },
    ];

    console.log('[createTestClimateData] Creating test data for', testLocations.length, 'locations');

    for (const loc of testLocations) {
      for (let i = 0; i < 15; i++) {
        await updateClimatePerformance(
          loc.location,
          loc.temp + (Math.random() * 6 - 3),
          loc.humidity + (Math.random() * 10 - 5),
          loc.pace + (Math.random() * 0.4 - 0.2),
          loc.hr + (Math.random() * 10 - 5)
        );
      }
    }

    console.log('[createTestClimateData] Test data created successfully');
    return true;
  } catch (error) {
    console.error('[createTestClimateData] Error creating test data:', error);
    return false;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; country?: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: {
          'User-Agent': 'Mizzion Training App',
        },
      }
    );

    if (!response.ok) {
      console.warn('Reverse geocoding failed:', response.status);
      return {};
    }

    const data = await response.json();

    return {
      city: data.address?.city || data.address?.town || data.address?.village || undefined,
      country: data.address?.country || undefined,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return {};
  }
}
