import { supabase } from '../lib/supabase';

interface OpenMeteoHourlyData {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  dew_point_2m: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  shortwave_radiation: number[];
  weather_code: number[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  hourly: OpenMeteoHourlyData;
}

interface WeatherDataPoint {
  hour_timestamp: string;
  temperature_c: number;
  humidity_percent: number;
  dew_point_c: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  solar_radiation_wm2: number;
  weather_code: number;
}

interface ActivityWeatherContext {
  lat: number;
  lon: number;
  date: string; // YYYY-MM-DD format
  startTime: string; // ISO timestamp
  duration_hours: number;
}

/**
 * Fetches historical weather data from Open-Meteo Archive API
 * https://open-meteo.com/en/docs/historical-weather-api
 */
export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<WeatherDataPoint[]> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    start_date: startDate,
    end_date: endDate,
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'dew_point_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'shortwave_radiation',
      'weather_code'
    ].join(','),
    timezone: 'auto'
  });

  const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;

  // Check if date is very recent (archive API may not have complete data yet)
  const daysSinceStart = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceStart < 7) {
    console.warn(`[Weather API] Activity is only ${daysSinceStart} days old - archive data may be incomplete or unavailable`);
  }

  console.log(`[Weather API] Fetching from Open-Meteo: lat=${latitude.toFixed(4)}, lon=${longitude.toFixed(4)}, dates=${startDate} to ${endDate}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.hourly || !data.hourly.time) {
      throw new Error('Invalid response from Open-Meteo API');
    }

    const weatherData: WeatherDataPoint[] = data.hourly.time.map((time, i) => ({
      hour_timestamp: time,
      temperature_c: data.hourly.temperature_2m[i] ?? 15,
      humidity_percent: data.hourly.relative_humidity_2m[i] ?? 50,
      dew_point_c: data.hourly.dew_point_2m[i] ?? 10,
      wind_speed_kmh: data.hourly.wind_speed_10m[i] ?? 0,
      wind_direction_deg: data.hourly.wind_direction_10m[i] ?? 0,
      solar_radiation_wm2: data.hourly.shortwave_radiation[i] ?? 0,
      weather_code: data.hourly.weather_code[i] ?? 0
    }));

    const tempRange = weatherData.length > 0
      ? `${Math.min(...weatherData.map(w => w.temperature_c)).toFixed(1)}°C to ${Math.max(...weatherData.map(w => w.temperature_c)).toFixed(1)}°C`
      : 'N/A';
    console.log(`[Weather API] Received ${weatherData.length} hourly points, temperature range: ${tempRange}`);

    // Validate temperature data against expected climate
    const avgTemp = weatherData.reduce((sum, w) => sum + w.temperature_c, 0) / weatherData.length;
    const absLat = Math.abs(latitude);

    // For tropical locations (like Chiangmai at 18.8°N), average should be 25-35°C
    // If data seems clearly wrong, use fallback instead
    if (absLat < 23 && avgTemp < 20) {
      console.warn(`[Weather API] Temperature data seems incorrect for tropical location (avg ${avgTemp.toFixed(1)}°C at ${absLat.toFixed(1)}°N). Using climate-aware fallback.`);
      throw new Error('Temperature data validation failed - unrealistic for location');
    }

    return weatherData;
  } catch (error) {
    console.error('Failed to fetch historical weather:', error);
    throw error;
  }
}

/**
 * Gets cached weather data from database or fetches from API
 */
export async function getWeatherForActivity(
  userId: string,
  logEntryId: string,
  context: ActivityWeatherContext
): Promise<WeatherDataPoint[]> {
  // Check if we already have cached data
  const { data: cachedData, error: fetchError } = await supabase
    .from('race_weather_raw')
    .select('*')
    .eq('log_entry_id', logEntryId)
    .order('hour_timestamp', { ascending: true });

  if (fetchError) {
    console.error('Error fetching cached weather:', fetchError);
  }

  if (cachedData && cachedData.length > 0) {
    return cachedData.map(row => ({
      hour_timestamp: row.hour_timestamp,
      temperature_c: row.temperature_c,
      humidity_percent: row.humidity_percent,
      dew_point_c: row.dew_point_c,
      wind_speed_kmh: row.wind_speed_kmh,
      wind_direction_deg: row.wind_direction_deg,
      solar_radiation_wm2: row.solar_radiation_wm2,
      weather_code: row.weather_code
    }));
  }

  // Fetch from Open-Meteo API
  const activityDate = new Date(context.startTime);
  const startDate = activityDate.toISOString().split('T')[0];

  // Fetch extra hours to cover full activity duration
  const endDate = new Date(activityDate.getTime() + (context.duration_hours + 24) * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  try {
    const weatherData = await fetchHistoricalWeather(
      context.lat,
      context.lon,
      startDate,
      endDate
    );

    // Cache in database
    const rowsToInsert = weatherData.map(point => ({
      user_id: userId,
      log_entry_id: logEntryId,
      hour_timestamp: point.hour_timestamp,
      temperature_c: point.temperature_c,
      humidity_percent: point.humidity_percent,
      dew_point_c: point.dew_point_c,
      wind_speed_kmh: point.wind_speed_kmh,
      wind_direction_deg: point.wind_direction_deg,
      solar_radiation_wm2: point.solar_radiation_wm2,
      weather_code: point.weather_code,
      data_quality_score: 1.0
    }));

    const { error: insertError } = await supabase
      .from('race_weather_raw')
      .insert(rowsToInsert);

    if (insertError) {
      console.error('Failed to cache weather data:', insertError);
    }

    return weatherData;
  } catch (error) {
    console.error('Failed to get weather for activity:', error);

    // Fallback to synthetic weather if API fails
    return generateSyntheticWeather(context);
  }
}

/**
 * Generates synthetic weather data as fallback
 * Uses location-aware estimates when possible
 */
function generateSyntheticWeather(context: ActivityWeatherContext): WeatherDataPoint[] {
  const startTime = new Date(context.startTime);
  const hoursNeeded = Math.ceil(context.duration_hours) + 2;

  // Estimate climate based on latitude
  // Tropical (0-23°): 25-35°C, high humidity
  // Subtropical (23-35°): 20-30°C, moderate humidity
  // Temperate (35-60°): 10-25°C, moderate humidity
  const absLat = Math.abs(context.lat);
  let baseTemp = 15;
  let baseHumidity = 50;

  if (absLat < 23) {
    // Tropical (e.g., Thailand, Southeast Asia)
    baseTemp = 28;
    baseHumidity = 70;
  } else if (absLat < 35) {
    // Subtropical
    baseTemp = 22;
    baseHumidity = 60;
  }

  const weatherData: WeatherDataPoint[] = [];

  for (let i = 0; i < hoursNeeded; i++) {
    const timestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000);
    const hour = timestamp.getHours();

    // Simulate daily temperature variation
    const hourlyVariation = Math.sin((hour - 6) * Math.PI / 12) * 5;
    const temperature = baseTemp + hourlyVariation;

    weatherData.push({
      hour_timestamp: timestamp.toISOString(),
      temperature_c: temperature,
      humidity_percent: baseHumidity + (hour < 12 ? 10 : -5), // Higher in morning
      dew_point_c: temperature - 5,
      wind_speed_kmh: 10,
      wind_direction_deg: 180,
      solar_radiation_wm2: hour >= 6 && hour <= 18 ? 400 : 0,
      weather_code: 0
    });
  }

  return weatherData;
}

/**
 * Calculates data quality score based on completeness
 */
export function calculateDataQuality(weatherData: WeatherDataPoint[]): number {
  if (weatherData.length === 0) return 0;

  let completePoints = 0;

  for (const point of weatherData) {
    let pointScore = 0;
    const fields = [
      point.temperature_c,
      point.humidity_percent,
      point.dew_point_c,
      point.wind_speed_kmh,
      point.solar_radiation_wm2
    ];

    for (const field of fields) {
      if (field !== null && field !== undefined && !isNaN(field)) {
        pointScore++;
      }
    }

    if (pointScore === fields.length) {
      completePoints++;
    }
  }

  return completePoints / weatherData.length;
}

/**
 * Extracts location from polyline start point
 */
export function extractLocationFromPolyline(polyline: string): { lat: number; lon: number } | null {
  if (!polyline) return null;

  try {
    // Simplified polyline decode for first point only
    const decoded = decodePolyline(polyline);
    if (decoded.length > 0) {
      return { lat: decoded[0][0], lon: decoded[0][1] };
    }
  } catch (error) {
    console.error('Failed to decode polyline:', error);
  }

  return null;
}

/**
 * Simple polyline decoder (Google Encoded Polyline Algorithm)
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

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

    const dlon = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lon += dlon;

    points.push([lat / 1e5, lon / 1e5]);
  }

  return points;
}
