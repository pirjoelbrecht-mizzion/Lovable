// src/utils/races.ts
import { getEvents, type DbEvent } from "@/lib/database";

export type RacePriority = "A" | "B" | "C";
export type RaceSurface = "road" | "trail" | "track";

export type Race = {
  id: string;
  name: string;
  dateISO: string;
  distanceKm?: number;
  elevationM?: number;
  surface?: RaceSurface;
  priority?: RacePriority;
  notes?: string;
  goal?: string;
  location?: string;
};

/**
 * Converts a DbEvent to a Race object
 */
function eventToRace(event: DbEvent): Race {
  const surfaceMap: Record<string, RaceSurface> = {
    street: 'road',
    trail: 'trail',
    other: 'track',
  };

  return {
    id: event.id || `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: event.name,
    dateISO: event.date,
    distanceKm: event.distance_km,
    elevationM: event.elevation_gain,
    surface: surfaceMap[event.type] || 'road',
    priority: event.priority || 'B',
    notes: event.notes,
    goal: event.goal,
    location: event.location,
  };
}

/**
 * Filters events to only return race-type events (street and trail)
 */
function isRaceEvent(event: DbEvent): boolean {
  return event.type === 'street' || event.type === 'trail';
}

/**
 * Lists all races from the events table
 */
export async function listRaces(): Promise<Race[]> {
  try {
    const events = await getEvents(100);
    console.log('[listRaces] Total events fetched:', events.length);
    console.log('[listRaces] All events:', events);

    const raceEvents = events.filter(isRaceEvent);
    console.log('[listRaces] Filtered race events:', raceEvents.length);
    console.log('[listRaces] Race events:', raceEvents);

    const races = raceEvents.map(eventToRace);
    const sortedRaces = races.sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
    console.log('[listRaces] Final races:', sortedRaces);

    return sortedRaces;
  } catch (error) {
    console.error('Error fetching races:', error);
    return [];
  }
}

/**
 * Get the next upcoming race by date (ties break by higher priority A>B>C)
 */
export async function getNextRace(from: Date = new Date()): Promise<Race | null> {
  const races = await listRaces();
  const today = new Date(from.toISOString().slice(0, 10));
  const upcoming = races.filter(r => new Date(r.dateISO) >= today);

  if (!upcoming.length) return null;

  const prRank = (p?: RacePriority) => p === "A" ? 3 : p === "B" ? 2 : 1;
  upcoming.sort((a, b) => {
    const da = new Date(a.dateISO).getTime();
    const db = new Date(b.dateISO).getTime();
    return da === db ? prRank(b.priority) - prRank(a.priority) : da - db;
  });

  return upcoming[0];
}

/**
 * Active priority race helper that the Planner expects
 */
export async function getActivePriorityRace(ref: Date = new Date()): Promise<{ race: Race | null; wTo: number | null; days: number | null }> {
  const race = await getNextRace(ref);
  if (!race) return { race: null, wTo: null, days: null };

  const d0 = new Date(ref.toISOString().slice(0, 10));
  const d1 = new Date(race.dateISO);
  const ms = d1.getTime() - d0.getTime();
  const days = Math.round(ms / 86400000);
  const wTo = +(days / 7).toFixed(1);

  return { race, wTo, days };
}

/**
 * Get races filtered by priority
 */
export async function getRacesByPriority(priority: RacePriority): Promise<Race[]> {
  const races = await listRaces();
  return races.filter(r => r.priority === priority);
}

/**
 * Get upcoming races within a specific time window (in days)
 */
export async function getUpcomingRaces(daysAhead: number = 365): Promise<Race[]> {
  const races = await listRaces();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  return races.filter(r => {
    const raceDate = new Date(r.dateISO);
    return raceDate >= today && raceDate <= endDate;
  });
}
