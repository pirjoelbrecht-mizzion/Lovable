// src/utils/location.ts
import { load, save } from "@/utils/storage";

export type UserLocation = { lat: number; lon: number; label?: string };

const KEY = "user:location";

export function getSavedLocation(): UserLocation | null {
  const loc = load<UserLocation | null>(KEY, null as any);
  if (!loc || typeof loc.lat !== "number" || typeof loc.lon !== "number") return null;
  return loc;
}

export function saveLocation(loc: UserLocation) {
  save(KEY, loc);
}

/**
 * Update saved location with city name if it doesn't have one
 */
export async function ensureLocationLabel(): Promise<UserLocation | null> {
  const loc = getSavedLocation();
  if (!loc) return null;

  // If already has label, return it
  if (loc.label) return loc;

  // Otherwise, fetch the label
  const label = await reverseGeocode(loc.lat, loc.lon);
  const updated = { ...loc, label };
  saveLocation(updated);
  return updated;
}

/**
 * Reverse geocode coordinates to city name using OpenStreetMap Nominatim API
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      {
        headers: {
          'User-Agent': 'RunningTrainingApp/1.0'
        }
      }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();

    // Try to get city name from various fields
    const city = data.address?.city
      || data.address?.town
      || data.address?.village
      || data.address?.municipality
      || data.address?.county
      || data.address?.state;

    const country = data.address?.country;

    if (city && country) {
      return `${city}, ${country}`;
    } else if (city) {
      return city;
    } else if (country) {
      return country;
    }

    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

/** Ask browser for current position. Gracefully rejects if denied/unavailable. */
export async function detectLocation(timeoutMs = 10000): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const label = await reverseGeocode(lat, lon);
        resolve({ lat, lon, label });
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}
