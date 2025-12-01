import { toast } from '@/components/ToastHost';
import type { CurrentWeather } from '@/utils/weather';
import { assessWeatherSafety, type WeatherAlert } from '@/services/weatherSafety';

export type NotificationPriority = 'info' | 'warning' | 'danger';

export type WeatherNotificationPreferences = {
  enableToast: boolean;
  enablePush: boolean;
  notifyBeforeActivity: boolean;
  hoursBeforeActivity: number;
};

const DEFAULT_PREFERENCES: WeatherNotificationPreferences = {
  enableToast: true,
  enablePush: true,
  notifyBeforeActivity: true,
  hoursBeforeActivity: 6,
};

export function getNotificationPreferences(): WeatherNotificationPreferences {
  const stored = localStorage.getItem('mizzion:weather-notification-prefs');
  if (stored) {
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }
  return DEFAULT_PREFERENCES;
}

export function setNotificationPreferences(prefs: Partial<WeatherNotificationPreferences>): void {
  const current = getNotificationPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem('mizzion:weather-notification-prefs', JSON.stringify(updated));
}

export function showWeatherToast(alert: WeatherAlert): void {
  const prefs = getNotificationPreferences();
  if (!prefs.enableToast) return;

  const iconMap = {
    danger: '🚨',
    warning: '⚠️',
    caution: '⚡',
    info: 'ℹ️',
  };

  const icon = iconMap[alert.level] || 'ℹ️';
  const message = `${icon} ${alert.title}: ${alert.message}`;

  toast(message, alert.level === 'danger' ? 'error' : alert.level === 'warning' ? 'warn' : 'info');
}

export function showImmediateWeatherAlert(weather: CurrentWeather): void {
  const alert = assessWeatherSafety(weather);
  if (!alert) return;

  if (alert.level === 'danger' || alert.level === 'warning') {
    showWeatherToast(alert);
  }
}

export async function requestPushNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Push notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export function isPushNotificationEnabled(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

export async function sendPushNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }
): Promise<void> {
  const prefs = getNotificationPreferences();
  if (!prefs.enablePush) return;

  if (!isPushNotificationEnabled()) {
    console.warn('Push notifications not enabled');
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/vite.svg',
      badge: options?.badge,
      tag: options?.tag,
      data: options?.data,
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

export async function sendWeatherPushNotification(
  alert: WeatherAlert,
  context?: string
): Promise<void> {
  const prefs = getNotificationPreferences();
  if (!prefs.enablePush) return;

  const iconMap = {
    danger: '🚨',
    warning: '⚠️',
    caution: '⚡',
    info: 'ℹ️',
  };

  const icon = iconMap[alert.level];
  const title = `${icon} ${alert.title}`;
  const body = context ? `${context}: ${alert.message}` : alert.message;

  await sendPushNotification(title, body, {
    tag: 'weather-alert',
    data: { type: 'weather', level: alert.level, alert },
  });
}

export async function scheduleForecastNotification(
  activityDate: Date,
  activityType: string,
  weather: CurrentWeather
): Promise<void> {
  const prefs = getNotificationPreferences();
  if (!prefs.notifyBeforeActivity || !prefs.enablePush) return;

  const alert = assessWeatherSafety(weather);
  if (!alert) return;

  if (alert.level === 'danger' || alert.level === 'warning') {
    const hoursUntil = (activityDate.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil >= prefs.hoursBeforeActivity && hoursUntil <= prefs.hoursBeforeActivity + 1) {
      const context = `${activityType} in ${Math.round(hoursUntil)} hours`;
      await sendWeatherPushNotification(alert, context);
    }
  }
}

export function monitorWeatherDuringActivity(
  weather: CurrentWeather,
  onAlert: (alert: WeatherAlert) => void
): () => void {
  let intervalId: number | null = null;

  const checkWeather = () => {
    const alert = assessWeatherSafety(weather);
    if (alert && (alert.level === 'danger' || alert.level === 'warning')) {
      showWeatherToast(alert);
      onAlert(alert);
    }
  };

  checkWeather();
  intervalId = window.setInterval(checkWeather, 5 * 60 * 1000);

  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };
}
