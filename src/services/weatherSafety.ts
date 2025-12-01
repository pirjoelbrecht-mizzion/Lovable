import type { CurrentWeather } from '@/utils/weather';
import { supabase } from '@/lib/supabase';
import { showNotification } from '@/lib/notify';

export type WeatherRiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

export type WeatherAlert = {
  level: WeatherRiskLevel;
  title: string;
  message: string;
  recommendations: string[];
};

export type WeatherSafetyThresholds = {
  temp_high: number;
  temp_low: number;
  humidity_high: number;
  wind_high: number;
  uv_high: number;
};

const DEFAULT_THRESHOLDS: WeatherSafetyThresholds = {
  temp_high: 28,
  temp_low: 0,
  humidity_high: 80,
  wind_high: 50,
  uv_high: 8,
};

export function assessWeatherSafety(weather: CurrentWeather): WeatherAlert | null {
  const alerts: WeatherAlert[] = [];

  if (weather.temp > DEFAULT_THRESHOLDS.temp_high) {
    const severity = weather.temp > 35 ? 'danger' : weather.temp > 30 ? 'warning' : 'caution';
    alerts.push({
      level: severity,
      title: 'High Temperature Alert',
      message: `Temperature is ${weather.temp}°C. Heat stress risk is elevated.`,
      recommendations: [
        'Reduce training intensity by 10-20%',
        'Increase hydration frequency',
        'Consider moving to early morning or evening',
        'Wear light, breathable clothing',
      ],
    });
  }

  if (weather.temp < DEFAULT_THRESHOLDS.temp_low) {
    alerts.push({
      level: weather.temp < -10 ? 'danger' : 'caution',
      title: 'Cold Weather Alert',
      message: `Temperature is ${weather.temp}°C. Frostbite risk possible.`,
      recommendations: [
        'Wear multiple layers',
        'Cover extremities (hands, ears, face)',
        'Shorten session duration',
        'Warm up indoors before starting',
      ],
    });
  }

  if (weather.humidity > DEFAULT_THRESHOLDS.humidity_high && weather.temp > 22) {
    const heatIndex = weather.heatIndex;
    const severity = heatIndex > 40 ? 'danger' : heatIndex > 32 ? 'warning' : 'caution';
    alerts.push({
      level: severity,
      title: 'High Humidity Alert',
      message: `Humidity is ${weather.humidity}% with heat index ${heatIndex}°C. Cooling efficiency reduced.`,
      recommendations: [
        'Reduce pace significantly',
        'Take walk breaks every 10 minutes',
        'Double fluid intake',
        'Watch for signs of heat exhaustion',
      ],
    });
  }

  if (weather.wind > DEFAULT_THRESHOLDS.wind_high) {
    alerts.push({
      level: weather.wind > 70 ? 'danger' : 'warning',
      title: 'High Wind Warning',
      message: `Wind speed is ${weather.wind} km/h. Running may be unsafe.`,
      recommendations: [
        'Avoid exposed areas and open fields',
        'Watch for falling debris',
        'Consider indoor training',
        'Reduce speed on downhill sections',
      ],
    });
  }

  if (weather.conditions.toLowerCase().includes('storm') || weather.conditions.toLowerCase().includes('thunder')) {
    alerts.push({
      level: 'danger',
      title: 'Thunderstorm Warning',
      message: 'Thunderstorms detected in the area. Lightning risk is severe.',
      recommendations: [
        'Do not train outdoors',
        'Seek shelter immediately if outdoors',
        'Wait 30 minutes after last thunder before resuming',
        'Consider treadmill or indoor alternatives',
      ],
    });
  }

  if (alerts.length === 0) return null;

  alerts.sort((a, b) => {
    const levels = { danger: 4, warning: 3, caution: 2, safe: 1 };
    return levels[b.level] - levels[a.level];
  });

  return alerts[0];
}

export function getWeatherRecommendation(weather: CurrentWeather): {
  shouldTrain: boolean;
  adjustIntensity?: number;
  bestTime?: string;
} {
  const alert = assessWeatherSafety(weather);

  if (!alert) {
    return { shouldTrain: true };
  }

  if (alert.level === 'danger') {
    return {
      shouldTrain: false,
      adjustIntensity: -100,
    };
  }

  if (alert.level === 'warning') {
    return {
      shouldTrain: true,
      adjustIntensity: -20,
      bestTime: weather.temp > 28 ? 'early morning (6-7 AM) or evening (7-8 PM)' : undefined,
    };
  }

  if (alert.level === 'caution') {
    return {
      shouldTrain: true,
      adjustIntensity: -10,
      bestTime: weather.temp > 25 ? 'early morning or evening' : undefined,
    };
  }

  return { shouldTrain: true };
}

export async function checkAndNotifyWeatherAlerts(
  lat: number,
  lon: number,
  sessionTimestamp?: Date
): Promise<WeatherAlert | null> {
  const { getWeatherForLocation } = await import('@/utils/weather');

  try {
    const weather = await getWeatherForLocation(lat, lon);
    const alert = assessWeatherSafety(weather);

    if (alert && (alert.level === 'warning' || alert.level === 'danger')) {
      await logNotification('weather_alert', `${alert.title}: ${alert.message}`);
    }

    return alert;
  } catch (error) {
    console.error('Error checking weather alerts:', error);
    return null;
  }
}

export async function sendWeatherPushNotification(
  title: string,
  message: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('weather_alerts_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings || !settings.weather_alerts_enabled) {
      return false;
    }

    showNotification(title, message);

    await logNotification('weather_push', message);

    return true;
  } catch (error) {
    console.error('Error sending weather push notification:', error);
    return false;
  }
}

export async function logNotification(
  type: string,
  message: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const { error } = await supabase.from('notification_log').insert({
      user_id: user.id,
      notification_type: type,
      message,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging notification:', error);
    return false;
  }
}

export async function getUserWeatherAlertSettings(): Promise<{
  enabled: boolean;
  leadTimeHours: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enabled: false, leadTimeHours: 12 };

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('weather_alerts_enabled, weather_alert_lead_time_hours')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return { enabled: false, leadTimeHours: 12 };
    }

    return {
      enabled: data.weather_alerts_enabled || false,
      leadTimeHours: data.weather_alert_lead_time_hours || 12,
    };
  } catch (error) {
    console.error('Error fetching weather alert settings:', error);
    return { enabled: false, leadTimeHours: 12 };
  }
}

export async function updateWeatherAlertSettings(
  enabled: boolean,
  leadTimeHours: number = 12
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_settings')
        .update({
          weather_alerts_enabled: enabled,
          weather_alert_lead_time_hours: leadTimeHours,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update weather alert settings:', error);
        return false;
      }
    } else {
      const { error } = await supabase.from('user_settings').insert({
        user_id: user.id,
        weather_alerts_enabled: enabled,
        weather_alert_lead_time_hours: leadTimeHours,
      });

      if (error) {
        console.error('Failed to create weather alert settings:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating weather alert settings:', error);
    return false;
  }
}
