import { supabase } from '@/lib/supabase';
import { updateClimatePerformance } from '@/services/locationAnalytics';

function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
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

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; country?: string }> {
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

    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state;
    const country = data.address?.country;

    return {
      city,
      country,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return {};
  }
}

async function fetchHistoricalWeather(lat: number, lon: number, dateISO: string): Promise<{ temperature?: number; humidity?: number }> {
  try {
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateISO}&end_date=${dateISO}&daily=temperature_2m_mean,relative_humidity_2m_mean&timezone=auto`
    );

    if (!response.ok) {
      console.warn('Historical weather fetch failed:', response.status);
      return {};
    }

    const data = await response.json();

    const temp = data.daily?.temperature_2m_mean?.[0];
    const humidity = data.daily?.relative_humidity_2m_mean?.[0];

    return {
      temperature: temp !== undefined && temp !== null ? temp : undefined,
      humidity: humidity !== undefined && humidity !== null ? humidity : undefined,
    };
  } catch (error) {
    console.error('Error fetching historical weather:', error);
    return {};
  }
}

export async function backfillLocationsFromPolyline(): Promise<{ updated: number; climateUpdated: number; skipped: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: activities } = await supabase
    .from('log_entries')
    .select('id, map_summary_polyline, map_polyline, location_name, date, km, duration_min, hr_avg, temperature, humidity')
    .eq('user_id', user.id)
    .is('location_name', null);

  if (!activities || activities.length === 0) {
    console.log('No activities without location found');
    return { updated: 0, climateUpdated: 0, skipped: 0 };
  }

  const activitiesWithPolyline = activities.filter(a => a.map_summary_polyline || a.map_polyline);

  console.log(`Found ${activitiesWithPolyline.length} activities with polyline data to process (${activities.length - activitiesWithPolyline.length} skipped)`);

  let updated = 0;
  let climateUpdated = 0;
  let skipped = 0;

  for (const activity of activitiesWithPolyline) {
    try {
      const polyline = activity.map_summary_polyline || activity.map_polyline;
      if (!polyline) {
        skipped++;
        continue;
      }

      const points = decodePolyline(polyline);
      if (points.length === 0) {
        skipped++;
        continue;
      }

      const midPoint = points[Math.floor(points.length / 2)];
      const [lat, lon] = midPoint;

      console.log(`Activity ${activity.id} - geocoding ${lat}, ${lon}...`);

      const location = await reverseGeocode(lat, lon);

      if (!location.city && !location.country) {
        skipped++;
        console.log(`No location found for activity ${activity.id}`);
        continue;
      }

      const locationName = location.city || location.country || 'Unknown';

      console.log(`Activity ${activity.id} - fetching historical weather for ${activity.date}...`);
      const weather = await fetchHistoricalWeather(lat, lon, activity.date);

      const updates: any = { location_name: locationName };
      if (weather.temperature !== undefined && !activity.temperature) {
        updates.temperature = weather.temperature;
      }
      if (weather.humidity !== undefined && !activity.humidity) {
        updates.humidity = weather.humidity;
      }

      const { error } = await supabase
        .from('log_entries')
        .update(updates)
        .eq('id', activity.id);

      if (!error) {
        updated++;
        console.log(`Updated activity ${activity.id} with location: ${locationName}, temp: ${weather.temperature || activity.temperature}°C, humidity: ${weather.humidity || activity.humidity}%`);

        const finalTemp = weather.temperature || activity.temperature;
        const finalHumidity = weather.humidity || activity.humidity || 50;

        if (finalTemp && activity.km && activity.duration_min && activity.hr_avg) {
          const pace = activity.duration_min / activity.km;

          await updateClimatePerformance(
            locationName,
            finalTemp,
            finalHumidity,
            pace,
            activity.hr_avg
          );
          climateUpdated++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error processing activity ${activity.id}:`, error);
      skipped++;
    }
  }

  console.log(`Backfill complete: ${updated} activities updated, ${climateUpdated} climate records updated, ${skipped} skipped`);
  return { updated, climateUpdated, skipped };
}
