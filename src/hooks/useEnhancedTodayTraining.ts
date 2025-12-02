import { useState, useEffect, useMemo } from 'react';
import { getEnhancedWeatherData, refreshWeatherData, type EnhancedWeatherData } from '@/services/realtimeWeather';
import { getSavedRoutes, type DbSavedRoute } from '@/lib/database';
import { calculateHydrationNeeds, calculateFuelingNeeds } from '@/lib/environmental-learning/hydration';
import { useReadinessScore } from '@/hooks/useReadinessScore';
import { getSavedLocation, detectLocation } from '@/utils/location';
import { load } from '@/utils/storage';
import type { TabId } from '@/components/today/TodayTrainingTabs';

export interface EnhancedTodayTrainingData {
  workout: {
    title: string;
    duration: string;
    distance: string;
    pace: string;
    type: string;
    isAdapted: boolean;
    durationMin: number;
    distanceKm: number;
  };
  readiness: {
    score: number;
    category: 'high' | 'moderate' | 'low';
  } | null;
  weather: EnhancedWeatherData | null;
  paceData: {
    targetMin: string;
    targetMax: string;
    explanation: string;
    confidence: number;
    adjustedFor: string[];
    recentPaces: Array<{ date: string; pace: string }>;
  };
  hrZones: {
    zone1: { min: number; max: number; time: number };
    zone2: { min: number; max: number; time: number };
    zone3: { min: number; max: number; time: number };
    zone4: { min: number; max: number; time: number };
    zone5: { min: number; max: number; time: number };
  } | null;
  route: DbSavedRoute | null;
  alternativeRoutes: DbSavedRoute[];
  hydration: any;
  fueling: any;
  streak: number;
  xpToEarn: number;
  daysToRace: number | null;
  coachMessage: string;
  location: { lat: number; lon: number } | null;
}

interface SessionData {
  type: string;
  duration: string;
  distance?: string;
  pace?: string;
  isToday: boolean;
  isAdapted?: boolean;
}

export function useEnhancedTodayTraining(
  todaySession: SessionData | null
) {
  const [data, setData] = useState<EnhancedTodayTrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const { readiness } = useReadinessScore();

  useEffect(() => {
    initializeData();
  }, [todaySession]);

  const initializeData = async () => {
    if (!todaySession) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userLocation = await getUserLocation();
      setLocation(userLocation);

      const today = new Date().toISOString().split('T')[0];

      const durationMin = parseDuration(todaySession.duration);
      const distanceKm = parseDistance(todaySession.distance || '8K');

      const [weather, routes] = await Promise.all([
        userLocation
          ? getEnhancedWeatherData(userLocation.lat, userLocation.lon, today)
          : null,
        getSavedRoutes(10, userLocation ? {
          lat: userLocation.lat,
          lon: userLocation.lon,
          radiusKm: 20,
        } : undefined),
      ]);

      const matchingRoute = routes.find(r =>
        Math.abs(r.distance_km - distanceKm) < 2
      );

      const alternativeRoutes = routes.filter(r =>
        r.id !== matchingRoute?.id &&
        Math.abs(r.distance_km - distanceKm) < 3
      ).slice(0, 3);

      const temp = weather?.current.temp || 20;
      const humidity = weather?.current.humidity || 60;

      const hydration = calculateHydrationNeeds({
        temp,
        humidity,
        duration: durationMin,
        elevationGain: matchingRoute?.elevation_gain_m || 100,
        shadeFactor: 0.5,
        intensity: 0.7,
      });

      const fueling = durationMin > 60 ? calculateFuelingNeeds({
        duration: durationMin,
        intensity: 0.7,
        heatIndex: temp > 25 ? 0.7 : 0.3,
        athleteGutTraining: 0.5,
        bodyMass: 60,
      }) : null;

      const paceProfile = load('paceProfile', { base: 5.5 });
      const basePace = paceProfile.base || 5.5;

      let paceAdjustment = 0;
      const adjustedFor: string[] = [];

      if (readiness && readiness.category === 'low') {
        paceAdjustment += 0.3;
        adjustedFor.push('Low readiness');
      }

      if (temp > 25) {
        paceAdjustment += 0.2;
        adjustedFor.push('Heat');
      } else if (temp < 10) {
        paceAdjustment += 0.1;
        adjustedFor.push('Cold');
      }

      if (matchingRoute && matchingRoute.elevation_gain_m > 200) {
        paceAdjustment += 0.3;
        adjustedFor.push('Elevation');
      }

      const targetMin = (basePace + paceAdjustment).toFixed(1);
      const targetMax = (basePace + paceAdjustment + 0.5).toFixed(1);

      const recentPaces = [
        { date: '2 days ago', pace: `${basePace.toFixed(1)} min/km` },
        { date: '5 days ago', pace: `${(basePace - 0.2).toFixed(1)} min/km` },
        { date: '8 days ago', pace: `${(basePace + 0.1).toFixed(1)} min/km` },
      ];

      const hrZones = calculateHRZones(165);

      const streak = load('streak', 3);
      const xpToEarn = Math.round(durationMin * 1.5);

      const raceDate = load('nextRaceDate', null);
      const daysToRace = raceDate
        ? Math.ceil((new Date(raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const coachMessage = generateCoachMessage(
        todaySession.type,
        readiness?.category || 'moderate',
        weather?.current.temp || 20
      );

      setData({
        workout: {
          title: todaySession.type,
          duration: todaySession.duration,
          distance: todaySession.distance || `${distanceKm}K`,
          pace: todaySession.pace || `${targetMin} - ${targetMax} min/km`,
          type: todaySession.type,
          isAdapted: todaySession.isAdapted || false,
          durationMin,
          distanceKm,
        },
        readiness: readiness ? {
          score: readiness.value,
          category: readiness.category,
        } : null,
        weather,
        paceData: {
          targetMin,
          targetMax,
          explanation: `Adjusted for ${adjustedFor.join(', ').toLowerCase() || 'current conditions'}. This pace will help you maintain aerobic efficiency while building endurance.`,
          confidence: 0.85,
          adjustedFor,
          recentPaces,
        },
        hrZones,
        route: matchingRoute || null,
        alternativeRoutes,
        hydration,
        fueling,
        streak,
        xpToEarn,
        daysToRace,
        coachMessage,
        location: userLocation,
      });
    } catch (err) {
      console.error('Failed to initialize training data:', err);
      setError('Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const refreshWeather = async () => {
    if (!location || !data) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const newWeather = await refreshWeatherData(location.lat, location.lon, today);

      if (newWeather) {
        setData(prev => prev ? { ...prev, weather: newWeather } : null);
      }
    } catch (err) {
      console.error('Failed to refresh weather:', err);
    }
  };

  return {
    data,
    loading,
    error,
    activeTab,
    setActiveTab,
    refreshWeather,
    refetch: initializeData,
  };
}

async function getUserLocation(): Promise<{ lat: number; lon: number }> {
  const saved = getSavedLocation();
  if (saved) {
    return { lat: saved.lat, lon: saved.lon };
  }

  try {
    const detected = await detectLocation();
    return { lat: detected.lat, lon: detected.lon };
  } catch {
    return { lat: 40.7128, lon: -74.006 };
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 45;
}

function parseDistance(distance: string): number {
  const match = distance.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 8;
}

function calculateHRZones(maxHR: number) {
  return {
    zone1: { min: Math.round(maxHR * 0.5), max: Math.round(maxHR * 0.6), time: 60 },
    zone2: { min: Math.round(maxHR * 0.6), max: Math.round(maxHR * 0.7), time: 30 },
    zone3: { min: Math.round(maxHR * 0.7), max: Math.round(maxHR * 0.8), time: 8 },
    zone4: { min: Math.round(maxHR * 0.8), max: Math.round(maxHR * 0.9), time: 2 },
    zone5: { min: Math.round(maxHR * 0.9), max: maxHR, time: 0 },
  };
}

function generateCoachMessage(
  workoutType: string,
  readiness: string,
  temp: number
): string {
  const messages = {
    easy: {
      high: 'Perfect day for an easy run! Keep it comfortable and enjoy the process.',
      moderate: 'Take it easy today. Listen to your body and stay in the aerobic zone.',
      low: 'Recovery is key. Keep this run very easy and focus on movement quality.',
    },
    tempo: {
      high: 'Great readiness for tempo work! Push the pace but stay controlled.',
      moderate: 'Tempo day with moderate readiness - start conservative and build into it.',
      low: 'Consider making this a progression run instead of sustained tempo.',
    },
    long: {
      high: 'Perfect conditions for your long run. Start easy and stay patient.',
      moderate: 'Long run day - prioritize completion over pace. Fuel well.',
      low: 'Shorten the long run if needed. Better to finish strong than struggle.',
    },
  };

  const type = workoutType.toLowerCase().includes('easy') ? 'easy'
    : workoutType.toLowerCase().includes('tempo') ? 'tempo'
    : 'long';

  let message = messages[type][readiness as keyof typeof messages.easy];

  if (temp > 28) {
    message += ' Hot conditions - slow down and hydrate frequently.';
  } else if (temp < 5) {
    message += ' Cold start - take extra time warming up.';
  }

  return message;
}
