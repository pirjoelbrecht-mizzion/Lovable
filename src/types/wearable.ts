export type WearableProviderName = 'garmin' | 'oura' | 'coros' | 'suunto' | 'polar' | 'apple' | 'strava';

export type ConnectionStatus = 'connected' | 'disconnected' | 'token_expired' | 'error';

export type SyncStatus = 'idle' | 'syncing' | 'processing' | 'success' | 'error';

export interface WearableMetric {
  timestamp: number;
  source: WearableProviderName;
  restingHR?: number;
  hrv?: number;
  sleepHours?: number;
  sleepQuality?: number;
  bodyBattery?: number;
  trainingLoad?: number;
  recoveryTime?: number;
  stressLevel?: number;
  temperature?: number;
}

export interface WearableConnection {
  id: string;
  user_id: string;
  provider: WearableProviderName;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  last_sync_at?: string;
  connection_status: ConnectionStatus;
  profile_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncHistoryEntry {
  id: string;
  user_id: string;
  provider: WearableProviderName;
  sync_started_at: string;
  sync_completed_at?: string;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  metrics_synced?: Record<string, any>;
  created_at: string;
}

export interface ProviderPrioritySettings {
  user_id: string;
  priority_order: WearableProviderName[];
  auto_sync_enabled: boolean;
  sync_time_window_start: string;
  sync_time_window_end: string;
  updated_at: string;
}

export interface ProviderInterface {
  name: WearableProviderName;
  isConnected(): Promise<boolean>;
  fetchMetrics(dateISO: string): Promise<WearableMetric | null>;
  refreshToken?(): Promise<boolean>;
}

export interface SyncResult {
  success: boolean;
  provider: WearableProviderName;
  metrics?: WearableMetric;
  error?: string;
}

export const PROVIDER_DISPLAY_NAMES: Record<WearableProviderName, string> = {
  garmin: 'Garmin',
  oura: 'Oura',
  coros: 'COROS',
  suunto: 'Suunto',
  polar: 'Polar',
  apple: 'Apple Health',
  strava: 'Strava'
};

export const PROVIDER_ICONS: Record<WearableProviderName, string> = {
  garmin: '⌚',
  oura: '💍',
  coros: '🏃',
  suunto: '🧭',
  polar: '❄️',
  apple: '🍎',
  strava: '🚴'
};
