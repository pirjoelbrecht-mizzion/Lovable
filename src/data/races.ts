// src/utils/seedRaces.ts
export type RaceSurface = "road" | "trail" | "track";
export type RacePriority = "A" | "B" | "C";

export type SeedRace = {
  id: string;
  name: string;
  location?: string;
  month?: number; // 1–12
  distanceKm?: number;
  elevM?: number;
  surface: RaceSurface;
};

export const SEED_RACES: SeedRace[] = [
  { id: "valencia-marathon", name: "Valencia Marathon", location: "ESP", month: 12, distanceKm: 42.195, surface: "road" },
  { id: "berlin-marathon", name: "BMW Berlin Marathon", location: "GER", month: 9, distanceKm: 42.195, surface: "road" },
  { id: "cph-half", name: "Copenhagen Half Marathon", location: "DEN", month: 9, distanceKm: 21.097, surface: "road" },
  { id: "utmb", name: "UTMB Mont-Blanc (170k)", location: "FRA/ITA/SUI", month: 8, distanceKm: 170, elevM: 10000, surface: "trail" },
  { id: "ccc", name: "CCC (UTMB) 100k", location: "FRA/ITA/SUI", month: 8, distanceKm: 100, elevM: 6100, surface: "trail" },
  { id: "western-states", name: "Western States 100", location: "USA", month: 6, distanceKm: 160.9, elevM: 5500, surface: "trail" },
  { id: "hardrock", name: "Hardrock 100", location: "USA", month: 7, distanceKm: 160.9, elevM: 10000, surface: "trail" },
  { id: "kullamannen-50k", name: "Kullamannen 50K", location: "SWE", month: 11, distanceKm: 50, elevM: 1300, surface: "trail" },
  { id: "10k-track", name: "10,000 m Track", location: "Local", month: 6, distanceKm: 10, surface: "track" },
];

export function searchSeedRaces(q: string): SeedRace[] {
  const n = q.trim().toLowerCase();
  if (!n) return SEED_RACES.slice(0, 10);
  return SEED_RACES
    .filter(r =>
      r.name.toLowerCase().includes(n) ||
      (r.location || "").toLowerCase().includes(n)
    )
    .slice(0, 20);
}