import { supabase } from '@/lib/supabase';
import { fetchHourlyWeather, getWeatherForLocation, type HourlyWeather } from '@/utils/weather';

export interface EnhancedWeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    wind: number;
    conditions: string;
    icon: string;
  };
  hours: Array<{
    time: string;
    temp: number;
    feelsLike: number;
    icon: string;
    precipitation: number;
    windSpeed: number;
    humidity: number;
  }>;
  sun: {
    sunrise: string;
    sunset: string;
  };
  uvIndex: number;
  bestRunWindow: {
    start: string;
    end: string;
    temp: number;
    reason: string;
  } | null;
  lastUpdated: string;
}

const CACHE_TABLE = 'weather_cache_training';
const CACHE_TTL_MINUTES = 15;

export async function getEnhancedWeatherData(
  lat: number,
  lon: number,
  dateISO: string
): Promise<EnhancedWeatherData | null> {
  try {
    const cached = await getCachedWeather(lat, lon, dateISO);
    if (cached) return cached;

    const [current, hourly] = await Promise.all([
      getWeatherForLocation(lat, lon),
      fetchHourlyWeather(lat, lon, dateISO),
    ]);

    const sunTimes = calculateSunTimes(lat, lon, dateISO);
    const bestWindow = findBestRunWindow(hourly, sunTimes);

    const enhanced: EnhancedWeatherData = {
      current: {
        temp: current.temp,
        feelsLike: current.heatIndex,
        humidity: current.humidity,
        wind: current.wind,
        conditions: current.conditions,
        icon: current.icon,
      },
      hours: hourly.map(h => ({
        time: new Date(h.dtISO).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        temp: Math.round(h.tC),
        feelsLike: Math.round(h.appTC || h.tC),
        icon: mapTempToIcon(h.tC),
        precipitation: 0,
        windSpeed: h.windKph,
        humidity: h.rhPct,
      })),
      sun: sunTimes,
      uvIndex: estimateUVIndex(new Date(dateISO)),
      bestRunWindow: bestWindow,
      lastUpdated: new Date().toISOString(),
    };

    await cacheWeather(lat, lon, dateISO, enhanced);

    return enhanced;
  } catch (error) {
    console.error('Failed to fetch enhanced weather:', error);
    return null;
  }
}

async function getCachedWeather(
  lat: number,
  lon: number,
  dateISO: string
): Promise<EnhancedWeatherData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${dateISO}`;
    const cutoffTime = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(CACHE_TABLE)
      .select('weather_data, created_at')
      .eq('user_id', user.id)
      .eq('cache_key', cacheKey)
      .gte('created_at', cutoffTime)
      .maybeSingle();

    if (error || !data) return null;

    return data.weather_data as EnhancedWeatherData;
  } catch (error) {
    console.warn('Cache read failed:', error);
    return null;
  }
}

async function cacheWeather(
  lat: number,
  lon: number,
  dateISO: string,
  weatherData: EnhancedWeatherData
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${dateISO}`;

    await supabase
      .from(CACHE_TABLE)
      .upsert({
        user_id: user.id,
        cache_key: cacheKey,
        location_lat: lat,
        location_lon: lon,
        date: dateISO,
        weather_data: weatherData,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,cache_key',
      });
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

function calculateSunTimes(lat: number, lon: number, dateISO: string): { sunrise: string; sunset: string } {
  const date = new Date(dateISO);
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const latRad = (lat * Math.PI) / 180;

  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  const declinationRad = (declination * Math.PI) / 180;

  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declinationRad));
  const hourAngleDeg = (hourAngle * 180) / Math.PI;

  const sunriseTime = 12 - hourAngleDeg / 15 - lon / 15;
  const sunsetTime = 12 + hourAngleDeg / 15 - lon / 15;

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    sunrise: formatTime(sunriseTime),
    sunset: formatTime(sunsetTime),
  };
}

function findBestRunWindow(
  hourly: HourlyWeather[],
  sunTimes: { sunrise: string; sunset: string }
): { start: string; end: string; temp: number; reason: string } | null {
  if (hourly.length === 0) return null;

  const windows = [
    { start: 6, end: 8, label: 'Early Morning' },
    { start: 17, end: 19, label: 'Evening' },
  ];

  let bestWindow: { start: string; end: string; temp: number; reason: string } | null = null;
  let bestScore = Infinity;

  for (const window of windows) {
    const windowHours = hourly.filter(h => {
      const hour = new Date(h.dtISO).getHours();
      return hour >= window.start && hour < window.end;
    });

    if (windowHours.length === 0) continue;

    const avgTemp = windowHours.reduce((sum, h) => sum + h.tC, 0) / windowHours.length;
    const avgHumidity = windowHours.reduce((sum, h) => sum + h.rhPct, 0) / windowHours.length;

    const tempScore = Math.abs(avgTemp - 18);
    const humidityScore = avgHumidity / 100;
    const score = tempScore + humidityScore * 10;

    if (score < bestScore) {
      bestScore = score;
      const startHour = window.start.toString().padStart(2, '0');
      const endHour = window.end.toString().padStart(2, '0');

      let reason = 'Ideal temperature';
      if (avgTemp < 10) reason = 'Cool conditions';
      else if (avgTemp > 25) reason = 'Warm - plan hydration';
      else if (avgHumidity > 70) reason = 'Humid - pace conservatively';

      bestWindow = {
        start: `${startHour}:00`,
        end: `${endHour}:00`,
        temp: Math.round(avgTemp),
        reason,
      };
    }
  }

  return bestWindow;
}

function estimateUVIndex(date: Date): number {
  const month = date.getMonth();
  const summer = month >= 4 && month <= 8;
  return summer ? 7 : 4;
}

function mapTempToIcon(temp: number): string {
  if (temp < 0) return '❄️';
  if (temp < 10) return '🥶';
  if (temp < 20) return '☁️';
  if (temp < 25) return '⛅';
  if (temp < 30) return '☀️';
  return '🔥';
}

export async function refreshWeatherData(
  lat: number,
  lon: number,
  dateISO: string
): Promise<EnhancedWeatherData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${dateISO}`;

    await supabase
      .from(CACHE_TABLE)
      .delete()
      .eq('user_id', user.id)
      .eq('cache_key', cacheKey);

    return getEnhancedWeatherData(lat, lon, dateISO);
  } catch (error) {
    console.error('Failed to refresh weather:', error);
    return null;
  }
}
