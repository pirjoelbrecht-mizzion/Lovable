// src/utils/integrations.ts
export type Provider = "strava" | "garmin" | "polar" | "suunto" | "apple_health";

export type IntegrationRecord = {
  connected: boolean;
  token?: string;
  lastSyncISO?: string;
  profileName?: string;
};

export type IntegrationsState = Record<Provider, IntegrationRecord>;

const KEY = "integrations";

const DEFAULTS: IntegrationsState = {
  strava:        { connected: false },
  garmin:        { connected: false },
  polar:         { connected: false },
  suunto:        { connected: false },
  apple_health:  { connected: false },
};

function read(): IntegrationsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(state: IntegrationsState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("integrations:changed"));
}

export function getIntegrations(): IntegrationsState {
  return read();
}

export async function connect(provider: Provider): Promise<IntegrationsState> {
  await new Promise((r) => setTimeout(r, 700));
  const state = read();
  state[provider] = {
    connected: true,
    token: `${provider}_mock_${Math.random().toString(36).slice(2, 8)}`,
    lastSyncISO: new Date().toISOString(),
    profileName:
      provider === "strava" ? "Strava Runner"
      : provider === "garmin" ? "Garmin Athlete"
      : provider === "apple_health" ? "Apple Health"
      : provider === "polar" ? "Polar User"
      : "Suunto User",
  };
  write(state);
  return state;
}

export async function disconnect(provider: Provider): Promise<IntegrationsState> {
  await new Promise((r) => setTimeout(r, 300));
  const state = read();
  state[provider] = { connected: false };
  write(state);
  return state;
}

import { generateStravaMock } from "@/utils/mockActivities";

// When real APIs are wired, replace this with actual fetch & transform
function makeActivitiesFor(provider: Provider) {
  if (provider === "strava") return generateStravaMock();
  // For other providers reuse the same shape for now
  return generateStravaMock();
}

export async function syncNow(provider: Provider): Promise<IntegrationsState> {
  await new Promise((r) => setTimeout(r, 800));

  const state = read();
  if (!state[provider]?.connected) return state;

  // Create mock import payload
  const activities = makeActivitiesFor(provider);

  // Stamp last sync + notify the app
  state[provider].lastSyncISO = new Date().toISOString();
  write(state);

  // Fire an event with imported activities so pages can merge them
  window.dispatchEvent(
    new CustomEvent("activities:imported", { detail: { provider, activities } })
  );

  return state;
}
