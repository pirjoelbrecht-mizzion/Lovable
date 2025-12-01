import { useEffect, useState } from "react";
import {
  type Provider,
  type IntegrationsState,
  getIntegrations,
  connect,
  disconnect,
  syncNow,
} from "@/utils/integrations";
import { toast } from "@/components/ToastHost";
import { supabase } from "@/lib/supabase";
import { WearableProviderName, PROVIDER_DISPLAY_NAMES, PROVIDER_ICONS, WearableConnection } from "@/types/wearable";
import { WearableManager } from "@/services/wearable/WearableManager";

const WEARABLE_PROVIDERS: WearableProviderName[] = ['strava', 'garmin', 'oura', 'coros', 'suunto', 'polar', 'apple'];

const LEGACY_PROVIDERS: { id: Provider; label: string; hint?: string }[] = [];

export default function ConnectProviders() {
  const [state, setState] = useState<IntegrationsState>(getIntegrations());
  const [busy, setBusy] = useState<Provider | null>(null);
  const [wearableConnections, setWearableConnections] = useState<WearableConnection[]>([]);
  const [busyWearable, setBusyWearable] = useState<WearableProviderName | null>(null);

  useEffect(() => {
    const onChange = () => setState(getIntegrations());
    window.addEventListener("integrations:changed", onChange);
    return () => window.removeEventListener("integrations:changed", onChange);
  }, []);

  useEffect(() => {
    loadWearableConnections();
  }, []);

  async function loadWearableConnections() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setWearableConnections(data);
    }
  }

  async function doConnect(p: Provider) {
    try {
      setBusy(p);
      await connect(p);
      setState(getIntegrations());
      toast(`🔗 Connected ${labelOf(p)}`, "success");
    } catch {
      toast(`Could not connect ${labelOf(p)}`, "error");
    } finally {
      setBusy(null);
    }
  }

  async function doDisconnect(p: Provider) {
    try {
      setBusy(p);
      await disconnect(p);
      setState(getIntegrations());
      toast(`🔌 Disconnected ${labelOf(p)}`, "info");
    } catch {
      toast(`Could not disconnect ${labelOf(p)}`, "error");
    } finally {
      setBusy(null);
    }
  }

  async function doSync(p: Provider) {
    try {
      setBusy(p);
      await syncNow(p);
      setState(getIntegrations());
      toast(`🔄 Synced ${labelOf(p)}`, "success");
    } catch {
      toast(`Sync failed for ${labelOf(p)}`, "error");
    } finally {
      setBusy(null);
    }
  }

  function labelOf(p: Provider) {
    return LEGACY_PROVIDERS.find((x) => x.id === p)?.label ?? p;
  }

  async function connectWearable(provider: WearableProviderName) {
    try {
      setBusyWearable(provider);

      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check:', { hasSession: !!session, hasToken: !!session?.access_token });

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in.');
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${provider}-oauth-start`;
      console.log('Calling edge function:', url);
      console.log('Auth header:', `Bearer ${session.access_token.substring(0, 20)}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || 'Unknown error' };
        }
        console.error('OAuth start error:', errorData);
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const data = JSON.parse(responseText);
      if (!data.authUrl) {
        throw new Error('No authorization URL received');
      }

      console.log('Opening popup with URL:', data.authUrl);
      const popup = window.open(data.authUrl, `${provider}Auth`, 'width=600,height=800');

      const messageHandler = (event: MessageEvent) => {
        console.log('Received message event:', { origin: event.origin, data: event.data, type: event.data?.type });

        if (!event.data || !event.data.type) {
          console.log('Ignoring message without type');
          return;
        }

        if (event.data.type === `${provider}-success` || event.data.type === 'strava-success') {
          console.log('SUCCESS! Connected to', provider);
          toast(`Connected to ${PROVIDER_DISPLAY_NAMES[provider]}!`, "success");
          loadWearableConnections();
          window.removeEventListener('message', messageHandler);

          // Trigger automatic activity sync
          setTimeout(async () => {
            console.log('Starting automatic activity sync...');
            toast('Syncing activities from Strava...', 'info');
            try {
              await syncActivities(provider);
              toast('Activities synced successfully!', 'success');
            } catch (err) {
              console.error('Auto-sync error:', err);
              toast('Connected! You can manually sync from the Devices page.', 'info');
            } finally {
              setBusyWearable(null);
            }
          }, 1000);
        } else if (event.data.type === `${provider}-error` || event.data.type === 'strava-error') {
          console.log('ERROR:', event.data.error);
          toast(`Connection failed: ${event.data.error}`, "error");
          setBusyWearable(null);
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      if (popup) {
        let messageReceived = false;

        const originalHandler = messageHandler;
        const wrappedHandler = (event: MessageEvent) => {
          if (event.data?.type === `${provider}-success` || event.data?.type === 'strava-success' ||
              event.data?.type === `${provider}-error` || event.data?.type === 'strava-error') {
            messageReceived = true;
          }
          originalHandler(event);
        };

        window.removeEventListener('message', messageHandler);
        window.addEventListener('message', wrappedHandler);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Wait a bit to see if message arrives
            setTimeout(() => {
              window.removeEventListener('message', wrappedHandler);
              if (!messageReceived) {
                console.log('[ConnectProviders] Popup closed without success/error message');
                setBusyWearable(null);
              }
            }, 500);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast(`Failed to connect ${PROVIDER_DISPLAY_NAMES[provider]}: ${error.message}`, "error");
      setBusyWearable(null);
    }
  }

  async function syncActivities(provider: WearableProviderName) {
    const wearableManager = new WearableManager();
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 2 years

    await wearableManager.syncProvider(provider, startDate, endDate);
  }

  async function disconnectWearable(provider: WearableProviderName) {
    try {
      setBusyWearable(provider);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('wearable_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      await loadWearableConnections();
      toast(`Disconnected ${PROVIDER_DISPLAY_NAMES[provider]}`, "info");
    } catch (error) {
      toast(`Failed to disconnect ${PROVIDER_DISPLAY_NAMES[provider]}`, "error");
    } finally {
      setBusyWearable(null);
    }
  }

  async function syncWearable(provider: WearableProviderName, fullSync = false) {
    try {
      setBusyWearable(provider);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const connection = getWearableConnection(provider);
      if (!connection) {
        toast('No connection found', 'error');
        return;
      }

      // If fullSync requested, reset last_sync_at first
      if (fullSync) {
        await supabase
          .from('wearable_connections')
          .update({ last_sync_at: null })
          .eq('user_id', user.id)
          .eq('provider', provider);

        // Reload connections to reflect the change
        await loadWearableConnections();
      }

      const { WearableManager } = await import('../services/wearable/WearableManager');
      const manager = new WearableManager();

      const endDate = new Date();
      const startDate = new Date();

      const isFirstSync = fullSync || !connection.last_sync_at;
      const daysToSync = isFirstSync ? 730 : 30;
      startDate.setDate(startDate.getDate() - daysToSync);

      console.log(`[ConnectProviders] Syncing ${provider} for ${daysToSync} days (first sync: ${isFirstSync})`);

      await manager.syncProvider(provider, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

      await supabase
        .from('wearable_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('provider', provider);

      await loadWearableConnections();

      console.log('[ConnectProviders] Triggering weekly metrics computation...');
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const metricsResponse = await fetch(
            `${supabaseUrl}/functions/v1/derive-weekly-metrics`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': anonKey,
              },
            }
          );

          if (metricsResponse.ok) {
            console.log('[ConnectProviders] Weekly metrics computed successfully');
          } else {
            console.warn('[ConnectProviders] Weekly metrics computation failed:', await metricsResponse.text());
          }
        }
      } catch (metricsError) {
        console.warn('[ConnectProviders] Failed to compute weekly metrics (non-critical):', metricsError);
      }

      toast(`Synced ${PROVIDER_DISPLAY_NAMES[provider]}!`, "success");

      // Trigger log refresh - emit using bus for proper typing
      const { emit } = await import('@/lib/bus');
      emit('log:import-complete', { count: 1 });
    } catch (error) {
      console.error('Sync error:', error);
      toast(`Sync failed: ${error.message}`, "error");
    } finally {
      setBusyWearable(null);
    }
  }

  function getWearableConnection(provider: WearableProviderName): WearableConnection | undefined {
    return wearableConnections.find(c => c.provider === provider);
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      {WEARABLE_PROVIDERS.map((provider) => {
        const connection = getWearableConnection(provider);
        const isConnected = connection?.connection_status === 'connected';
        const displayName = PROVIDER_DISPLAY_NAMES[provider];
        const icon = PROVIDER_ICONS[provider];

        return (
          <div key={provider} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div className="h2" style={{ margin: 0 }}>
                {icon} {displayName}
              </div>
              {isConnected && connection && (
                <div className="small" style={{ marginTop: 4 }}>
                  Status: <b>Connected</b>
                  {connection.profile_name ? ` as ${connection.profile_name}` : ""} • Last sync:{" "}
                  {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "Never"}
                </div>
              )}
              {!isConnected && <div className="small" style={{ marginTop: 4 }}>Status: <b>Not connected</b></div>}
            </div>

            {!isConnected ? (
              <button
                className="btn primary"
                disabled={busyWearable === provider}
                onClick={() => connectWearable(provider)}
              >
                {busyWearable === provider ? "Connecting…" : "Connect"}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn primary"
                  disabled={busyWearable === provider}
                  onClick={() => syncWearable(provider)}
                  title={connection.last_sync_at ? "Sync activities from the last 30 days" : "First sync: Pull 730 days of historical data"}
                >
                  {busyWearable === provider ? "Syncing…" : "Sync Now"}
                </button>
                {connection.last_sync_at && (
                  <button
                    className="btn"
                    disabled={busyWearable === provider}
                    onClick={() => syncWearable(provider, true)}
                    title="Reset and sync all activities from the last 2 years"
                    style={{ background: '#ff9800' }}
                  >
                    Full Sync
                  </button>
                )}
                <button
                  className="btn"
                  disabled={busyWearable === provider}
                  onClick={() => disconnectWearable(provider)}
                >
                  {busyWearable === provider ? "…" : "Disconnect"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {LEGACY_PROVIDERS.length > 0 && (
        <>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
            <h3>Activity Trackers</h3>
          </div>

          {LEGACY_PROVIDERS.map(({ id, label, hint }) => {
        const rec = state[id];
        const isConn = rec?.connected;
        return (
          <div key={id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div className="h2" style={{ margin: 0 }}>{label}</div>
              {hint && <div className="small">{hint}</div>}
              {isConn && (
                <div className="small" style={{ marginTop: 4 }}>
                  Status: <b>Connected</b>
                  {rec.profileName ? ` as ${rec.profileName}` : ""} • Last sync:{" "}
                  {rec.lastSyncISO ? new Date(rec.lastSyncISO).toLocaleString() : "—"}
                </div>
              )}
              {!isConn && <div className="small" style={{ marginTop: 4 }}>Status: <b>Not connected</b></div>}
            </div>

            {!isConn ? (
              <button className="btn primary" disabled={busy === id} onClick={() => doConnect(id)}>
                {busy === id ? "Connecting…" : "Connect"}
              </button>
            ) : (
              <div className="row">
                <button className="btn" disabled={busy === id} onClick={() => doSync(id)}>
                  {busy === id ? "Syncing…" : "Sync now"}
                </button>
                <button className="btn" disabled={busy === id} onClick={() => doDisconnect(id)}>
                  {busy === id ? "…" : "Disconnect"}
                </button>
              </div>
            )}
          </div>
        );
      })}</>
      )}
    </div>
  );
}
