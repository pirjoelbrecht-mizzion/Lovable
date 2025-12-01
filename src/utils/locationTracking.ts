import { useState, useEffect, useCallback } from 'react';
import { saveLocationHistory, getRecentLocation, type DbLocationHistory } from '@/lib/database';

export interface LocationData {
  lat: number;
  lon: number;
  country?: string;
  city?: string;
}

export interface ClimateConditions {
  temp: number;
  humidity: number;
  elevation: number;
}

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const LOCATION_CHANGE_THRESHOLD_M = 200000; // 200km
const TIMEZONE_SHIFT_THRESHOLD_H = 2;

export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function detectLocationChange(
  oldLoc: LocationData,
  newLoc: LocationData
): boolean {
  const distance = getHaversineDistance(oldLoc.lat, oldLoc.lon, newLoc.lat, newLoc.lon);
  return distance > LOCATION_CHANGE_THRESHOLD_M;
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ country?: string; city?: string }> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await response.json();
    return {
      country: data.countryName,
      city: data.city || data.locality,
    };
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    return {};
  }
}

export async function getElevation(lat: number, lon: number): Promise<number> {
  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    );
    const data = await response.json();
    return data.results?.[0]?.elevation || 0;
  } catch (error) {
    console.error('Elevation fetch failed:', error);
    return 0;
  }
}

export async function getLocalConditions(
  lat: number,
  lon: number
): Promise<ClimateConditions | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured');
    return null;
  }

  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const weatherData = await weatherRes.json();

    const elevation = await getElevation(lat, lon);

    return {
      temp: weatherData.main?.temp || 20,
      humidity: weatherData.main?.humidity || 50,
      elevation,
    };
  } catch (error) {
    console.error('Failed to fetch local conditions:', error);
    return null;
  }
}

export function calcClimateStress(conditions: ClimateConditions): number {
  let stress = 1.0;

  if (conditions.humidity > 70) {
    stress += 0.05;
  }

  if (conditions.temp > 25) {
    stress += (conditions.temp - 25) * 0.01;
  }

  if (conditions.elevation > 1500) {
    stress += 0.05;
  }

  return stress;
}

export function useUserLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }

    let mounted = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mounted) return;

        const { latitude, longitude } = pos.coords;
        const geocoded = await reverseGeocode(latitude, longitude);

        setLocation({
          lat: latitude,
          lon: longitude,
          country: geocoded.country,
          city: geocoded.city,
        });
      },
      (err) => {
        if (!mounted) return;
        setError(err.message);
      }
    );

    return () => {
      mounted = false;
    };
  }, []);

  return { location, error };
}

export async function checkAndHandleLocationChange(
  newLocation: LocationData
): Promise<{
  changed: boolean;
  conditions?: ClimateConditions;
  stressFactor?: number;
}> {
  const recentLocation = await getRecentLocation();

  if (!recentLocation) {
    const conditions = await getLocalConditions(newLocation.lat, newLocation.lon);
    if (conditions) {
      await saveLocationHistory({
        latitude: newLocation.lat,
        longitude: newLocation.lon,
        country: newLocation.country,
        city: newLocation.city,
        climate_data: conditions,
      });
    }
    return { changed: false };
  }

  const hasChanged = detectLocationChange(
    { lat: recentLocation.latitude, lon: recentLocation.longitude },
    newLocation
  );

  if (!hasChanged) {
    return { changed: false };
  }

  const conditions = await getLocalConditions(newLocation.lat, newLocation.lon);
  if (conditions) {
    await saveLocationHistory({
      latitude: newLocation.lat,
      longitude: newLocation.lon,
      country: newLocation.country,
      city: newLocation.city,
      climate_data: conditions,
    });

    const stressFactor = calcClimateStress(conditions);
    return { changed: true, conditions, stressFactor };
  }

  return { changed: true };
}
