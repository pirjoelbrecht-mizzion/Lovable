import type { DbSavedRoute } from '@/lib/database';

export type OSMWay = {
  id: number;
  type: string;
  tags: {
    name?: string;
    highway?: string;
    surface?: string;
    route?: string;
  };
  geometry: Array<{ lat: number; lon: number }>;
};

export type OSMResponse = {
  elements: OSMWay[];
};

export type OSMRoute = {
  id: string;
  name: string;
  polyline: Array<[number, number]>;
  distance: number;
  source: 'osm';
  surface_type?: 'road' | 'trail' | 'mixed';
};

export async function fetchOSMTrails(
  lat: number,
  lon: number,
  radiusMeters: number = 3000
): Promise<OSMRoute[]> {
  const query = `
    [out:json][timeout:25];
    (
      way(around:${radiusMeters},${lat},${lon})["highway"="path"];
      way(around:${radiusMeters},${lat},${lon})["highway"="track"];
      way(around:${radiusMeters},${lat},${lon})["highway"="footway"];
      way(around:${radiusMeters},${lat},${lon})["highway"="cycleway"];
      way(around:${radiusMeters},${lat},${lon})["route"="hiking"];
      way(around:${radiusMeters},${lat},${lon})["route"="foot"];
    );
    out geom;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error('OSM Overpass API error:', response.status);
      return [];
    }

    const data: OSMResponse = await response.json();

    const routes: OSMRoute[] = data.elements
      .filter((way) => way.geometry && way.geometry.length >= 2)
      .map((way) => {
        const polyline: Array<[number, number]> = way.geometry.map((point) => [
          point.lat,
          point.lon,
        ]);

        const distance = estimateDistanceFromPolyline(polyline);

        const name = way.tags.name || generateRouteName(way.tags.highway, way.tags.route);

        const surfaceType = determineSurfaceType(way.tags.highway, way.tags.surface);

        return {
          id: `osm-${way.id}`,
          name,
          polyline,
          distance,
          source: 'osm',
          surface_type: surfaceType,
        };
      })
      .filter((route) => route.distance > 0.5 && route.distance < 50);

    return routes.sort((a, b) => b.distance - a.distance).slice(0, 20);
  } catch (error) {
    console.error('Failed to fetch OSM trails:', error);
    return [];
  }
}

function estimateDistanceFromPolyline(polyline: Array<[number, number]>): number {
  let totalDistance = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const [lat1, lon1] = polyline[i];
    const [lat2, lon2] = polyline[i + 1];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return totalDistance;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function generateRouteName(highway?: string, route?: string): string {
  if (route === 'hiking') return 'Hiking Trail';
  if (route === 'foot') return 'Footpath';

  switch (highway) {
    case 'path':
      return 'Nature Path';
    case 'track':
      return 'Trail Track';
    case 'footway':
      return 'Footway';
    case 'cycleway':
      return 'Multi-Use Path';
    default:
      return 'OSM Trail';
  }
}

function determineSurfaceType(
  highway?: string,
  surface?: string
): 'road' | 'trail' | 'mixed' {
  if (surface === 'paved' || surface === 'asphalt') return 'road';
  if (surface === 'unpaved' || surface === 'dirt' || surface === 'gravel') return 'trail';

  if (highway === 'path' || highway === 'track' || highway === 'footway') return 'trail';
  if (highway === 'cycleway') return 'mixed';

  return 'trail';
}

export function osmRouteToDbRoute(osmRoute: OSMRoute): Omit<DbSavedRoute, 'user_id'> {
  const startPoint = osmRoute.polyline[0];
  const endPoint = osmRoute.polyline[osmRoute.polyline.length - 1];

  return {
    name: osmRoute.name,
    distance_km: osmRoute.distance,
    elevation_gain_m: 0,
    surface_type: osmRoute.surface_type || 'trail',
    start_lat: startPoint[0],
    start_lon: startPoint[1],
    end_lat: endPoint[0],
    end_lon: endPoint[1],
    popularity_score: 0,
    scenic_score: 5,
    source: 'osm',
    tags: ['osm', osmRoute.surface_type || 'trail'],
  };
}

export function encodePolyline(coordinates: Array<[number, number]>): string {
  const factor = 1e5;
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    const latE5 = Math.round(lat * factor);
    const lngE5 = Math.round(lng * factor);

    const dLat = latE5 - prevLat;
    const dLng = lngE5 - prevLng;

    output += encodeSignedNumber(dLat);
    output += encodeSignedNumber(dLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return output;
}

function encodeSignedNumber(num: number): string {
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }

  let encoded = '';
  while (sgn_num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encoded += String.fromCharCode(sgn_num + 63);

  return encoded;
}
