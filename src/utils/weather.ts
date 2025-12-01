// src/utils/weather.ts
import { load, save } from "@/utils/storage";

export type DailyWeather = {
  dateISO: string;           // YYYY-MM-DD
  tMinC: number;
  tMaxC: number;
  precipMm: number;          // total precipitation
  code: number;              // WMO weather code
  desc: string;              // short human label
  icon: WeatherIconKey;      // internal icon id mapped from code
};

export type HourlyWeather = {
  dtISO: string;             // YYYY-MM-DDTHH:00
  tC: number;                // air temperature
  rhPct: number;             // relative humidity %
  windKph: number;           // 10m wind speed
  appTC?: number;            // apparent temperature (if provided by API)
  dateISO: string;           // cached convenience (YYYY-MM-DD)
};

export type WeatherIconKey =
  | "sun"
  | "cloud"
  | "cloud-sun"
  | "rain"
  | "rain-heavy"
  | "storm"
  | "snow"
  | "fog";

/** Map WMO code to icon+label (very compact buckets) */
export function mapCodeToIcon(code: number): { icon: WeatherIconKey; desc: string } {
  if ([0].includes(code)) return { icon: "sun", desc: "Clear" };
  if ([1, 2].includes(code)) return { icon: "cloud-sun", desc: "Partly cloudy" };
  if ([3].includes(code)) return { icon: "cloud", desc: "Overcast" };
  if ([45, 48].includes(code)) return { icon: "fog", desc: "Fog" };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    const heavy = [65, 82].includes(code);
    return { icon: heavy ? "rain-heavy" : "rain", desc: heavy ? "Heavy rain" : "Rain" };
  }
  if ([95, 96, 99].includes(code)) return { icon: "storm", desc: "Thunderstorm" };
  if ([56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return { icon: "snow", desc: "Snow / Sleet" };
  return { icon: "cloud", desc: "Cloudy" };
}

/** Convenience helpers expected by UI */
export function wmoIcon(code: number): WeatherIconKey {
  return mapCodeToIcon(code).icon;
}

export function wmoDesc(code: number): string {
  return mapCodeToIcon(code).desc;
}

type DailyApi = {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
};

type HourlyApi = {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  apparent_temperature?: number[];
};

type CacheEntry<T> = { exp: number; payload: T };

const CACHE_PREFIX_D = "planner:wx:d:";
const CACHE_PREFIX_H = "planner:wx:h:";

/** -------------------------- DAILY -------------------------- */
export async function fetchDailyWeather(
  lat: number,
  lon: number,
  startISO: string,
  days = 7
): Promise<DailyWeather[]> {
  const key = `${CACHE_PREFIX_D}${lat.toFixed(2)},${lon.toFixed(2)}:${startISO}:${days}`;
  const now = Date.now();

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as CacheEntry<DailyWeather[]>;
      if (cached && cached.exp > now) return cached.payload;
    }
  } catch {}

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startISO,
    end_date: isoAddDays(startISO, days - 1),
    timezone: "auto",
    daily: [
      "weathercode",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
    ].join(","),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`; // FIXED: backticks
  const res = await fetch(url);

  if (!res.ok) throw new Error(`weather_http_${res.status}`); // FIXED: backticks + quotes

  const json = (await res.json()) as { daily: DailyApi };
  const out: DailyWeather[] = [];
  const d = json.daily;

  for (let i = 0; i < d.time.length; i++) {
    const code = d.weathercode[i] ?? 3;
    const { icon, desc } = mapCodeToIcon(code);
    out.push({
      dateISO: d.time[i],
      tMinC: round1(d.temperature_2m_min[i]),
      tMaxC: round1(d.temperature_2m_max[i]),
      precipMm: round1(d.precipitation_sum[i] ?? 0),
      code,
      desc,
      icon,
    });
  }

  try {
    const entry: CacheEntry<DailyWeather[]> = { exp: now + 3 * 3600 * 1000, payload: out }; // 3h TTL
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}

  return out;
}

/** -------------------------- HOURLY -------------------------- */
export async function fetchHourlyWeather(
  lat: number,
  lon: number,
  dateISO: string
): Promise<HourlyWeather[]> {
  const key = `${CACHE_PREFIX_H}${lat.toFixed(2)},${lon.toFixed(2)}:${dateISO}`;
  const now = Date.now();

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as CacheEntry<HourlyWeather[]>;
      if (cached && cached.exp > now) return cached.payload;
    }
  } catch {}

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: dateISO,
    end_date: dateISO,
    timezone: "auto",
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "wind_speed_10m",
      "apparent_temperature",
    ].join(","),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`; // FIXED: backticks
  const res = await fetch(url);

  if (!res.ok) throw new Error(`weather_http_${res.status}`); // FIXED: backticks + quotes

  const json = (await res.json()) as { hourly: HourlyApi };
  const h = json.hourly;
  const out: HourlyWeather[] = h.time.map((t, i) => ({
    dtISO: t,
    dateISO,
    tC: round1(h.temperature_2m[i]),
    rhPct: Math.round(h.relative_humidity_2m[i]),
    windKph: round1(h.wind_speed_10m[i]),
    appTC: h.apparent_temperature?.[i],
  }));

  try {
    const entry: CacheEntry<HourlyWeather[]> = { exp: now + 2 * 3600 * 1000, payload: out }; // 2h TTL
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}

  return out;
}

/** -------------------------- HEAT INDEX & PACE -------------------------- */
/** Heat Index from T (°C) and RH (%) — converts to °F for Rothfusz regression. */
export function heatIndexC(tC: number, rhPct: number): number {
  const tF = c2f(tC);
  // Rothfusz (valid for T>=80F & RH>=40%)
  if (tF >= 80 && rhPct >= 40) {
    const R = rhPct;
    const HI =
      -42.379 +
      2.04901523 * tF +
      10.14333127 * R +
      -0.22475541 * tF * R +
      -6.83783e-3 * tF * tF +
      -5.481717e-2 * R * R +
      1.22874e-3 * tF * tF * R +
      8.5282e-4 * tF * R * R +
      -1.99e-6 * tF * tF * R * R;
    return f2c(HI);
  }
  // Simple approximation
  return tC + (rhPct / 100) * (tC >= 20 ? 2 : 0.5);
}

export type HeatRisk = "low" | "caution" | "warning" | "danger";

export function categorizeHeatRisk(hiC: number): HeatRisk {
  if (hiC < 27) return "low";       // < 80°F
  if (hiC < 32) return "caution";   // 80–89°F
  if (hiC < 41) return "warning";   // 90–105°F
  return "danger";                  // >= 106°F
}

/** Pace adjustment in % for hot conditions (based on HI). */
export function heatPaceNudgePct(hiC: number): number {
  const r = categorizeHeatRisk(hiC);
  switch (r) {
    case "low": return 0;
    case "caution": return 0.03;   // +3% slower
    case "warning": return 0.06;   // +6%
    case "danger": return 0.10;    // +10%
  }
}

/** Suggest cooler hour for a quality session: compare 07:00 vs 19:00 local. */
export function pickCoolerHour(hourlies: HourlyWeather[]): { bestISO: string; hiC: number; windKph: number; tC: number; rhPct: number } | null {
  const pick = (H: number) =>
    hourlies.find(h => new Date(h.dtISO).getHours() === H);
  const am = pick(7), pm = pick(19);
  if (!am && !pm) return null;
  const score = (h: HourlyWeather) => heatIndexC(h.appTC ?? h.tC, h.rhPct);
  const cand = [am, pm].filter(Boolean) as HourlyWeather[];
  cand.sort((a, b) => score(a) - score(b));
  const best = cand[0];
  return { bestISO: best.dtISO, hiC: round1(score(best)), windKph: best.windKph, tC: best.tC, rhPct: best.rhPct };
}

/** -------------------------- LOCATION-BASED CURRENT WEATHER -------------------------- */
export type CurrentWeather = {
  temp: number;
  humidity: number;
  wind: number;
  heatIndex: number;
  conditions: string;
  icon: WeatherIconKey;
};

const CACHE_PREFIX_CURRENT = "planner:wx:current:";

/**
 * Get current weather conditions for a specific location.
 * Used by AI route recommendation system to adjust suggestions based on real-time weather.
 */
export async function getWeatherForLocation(
  lat: number,
  lon: number
): Promise<CurrentWeather> {
  const key = `${CACHE_PREFIX_CURRENT}${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as CacheEntry<CurrentWeather>;
      if (cached && cached.exp > now) return cached.payload;
    }
  } catch {}

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "weather_code"].join(","),
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`weather_http_${res.status}`);

  const json = await res.json() as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      weather_code: number;
    };
  };

  const { temperature_2m: temp, relative_humidity_2m: humidity, wind_speed_10m: wind, weather_code: code } = json.current;
  const hiC = heatIndexC(temp, humidity);
  const { icon, desc } = mapCodeToIcon(code);

  const result: CurrentWeather = {
    temp: round1(temp),
    humidity: Math.round(humidity),
    wind: round1(wind),
    heatIndex: round1(hiC),
    conditions: desc,
    icon,
  };

  try {
    const entry: CacheEntry<CurrentWeather> = { exp: now + 15 * 60 * 1000, payload: result };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}

  return result;
}

/** Utility helpers */
function round1(n: number) { return Math.round((n + Number.EPSILON) * 10) / 10; }
function isoAddDays(iso: string, add: number) { const d = new Date(iso); d.setDate(d.getDate() + add); return d.toISOString().slice(0, 10); }
function c2f(c: number) { return c * 9/5 + 32; }
function f2c(f: number) { return (f - 32) * 5/9; }
