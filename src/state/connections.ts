export type Provider = "apple" | "strava" | "garmin";
export type Connections = Record<Provider, boolean>;

const KEY = "mizzion:connections";

const DEFAULTS: Connections = { apple: false, strava: false, garmin: false };

export function loadConnections(): Connections {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConnections(next: Connections) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function setConnection(p: Provider, on: boolean) {
  const cur = loadConnections();
  const next = { ...cur, [p]: on };
  saveConnections(next);
  return next;
}

export function anyConnected() {
  const c = loadConnections();
  return c.apple || c.strava || c.garmin;
}
