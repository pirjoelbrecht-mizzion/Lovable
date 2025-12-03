import { useState, useEffect, useMemo } from 'react';
import { getEnhancedWeatherData, refreshWeatherData, type EnhancedWeatherData } from '@/services/realtimeWeather';
import { getSavedRoutes, type DbSavedRoute, getLogEntries, getReadinessHistory } from '@/lib/database';
import { calculateHydrationNeeds, calculateFuelingNeeds } from '@/lib/environmental-learning/hydration';
import { useReadinessScore } from '@/hooks/useReadinessScore';
import { getSavedLocation, detectLocation } from '@/utils/location';
import { load } from '@/utils/storage';
import type { TabId } from '@/components/today/TodayTrainingTabs';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';

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
  fatigue: {
    acwr: number;
    weeklyLoad: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    readinessHistory: Array<{ date: string; score: number }>;
    recommendation: string;
  } | null;
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
    if (!todaySession || !todaySession.type) {
      setLoading(false);
      setError('No training session data available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userLocation = await getUserLocation();
      setLocation(userLocation);

      const today = new Date().toISOString().split('T')[0];

      const durationMin = parseDuration(todaySession.duration);
      const distanceKm = parseDistance(todaySession.distance);

      // Fetch all data in parallel: weather, routes, and activity history
      const [weather, routes, logEntries] = await Promise.all([
        userLocation
          ? getEnhancedWeatherData(userLocation.lat, userLocation.lon, today)
          : null,
        getSavedRoutes(10, userLocation ? {
          lat: userLocation.lat,
          lon: userLocation.lon,
          radiusKm: 20,
        } : undefined),
        getLogEntries(50),
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

      // Calculate base pace from recent run history (last 30 days, moderate effort)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentRuns = logEntries
        .filter(e => {
          const entryDate = new Date(e.dateISO);
          return e.km && e.durationMin && e.km > 0 && entryDate >= thirtyDaysAgo;
        });

      let basePace = 5.5; // fallback default
      if (recentRuns.length >= 3) {
        // Calculate average pace from recent runs
        const totalPace = recentRuns.reduce((sum, e) => sum + (e.durationMin! / e.km!), 0);
        basePace = totalPace / recentRuns.length;
      } else {
        // Try to load from stored profile
        const paceProfile = load('paceProfile', { base: 5.5 });
        basePace = paceProfile.base || 5.5;
      }

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

      // Get recent paces from actual log entries (last 14 days)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const runsWithPace = logEntries
        .filter(entry => {
          if (!entry.km || !entry.durationMin || entry.km <= 0) return false;
          const entryDate = new Date(entry.dateISO);
          return entryDate >= twoWeeksAgo && entryDate <= now;
        })
        .map(entry => {
          const paceMinPerKm = entry.durationMin! / entry.km!;
          const entryDate = new Date(entry.dateISO);
          entryDate.setHours(0, 0, 0, 0);
          const daysAgo = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            date: daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`,
            pace: `${paceMinPerKm.toFixed(1)} min/km`,
            daysAgo,
            dateISO: entry.dateISO
          };
        })
        .sort((a, b) => b.daysAgo - a.daysAgo) // Most recent first
        .slice(0, 3);

      const recentPaces = runsWithPace.length > 0 ? runsWithPace : [];

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

      // Calculate fatigue data
      const fatigueData = await calculateFatigueData(readiness);

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
        fatigue: fatigueData,
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

function parseDuration(duration: string | undefined): number {
  if (!duration) return 45;
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 45;
}

function parseDistance(distance: string | undefined): number {
  if (!distance) return 8;
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

async function calculateFatigueData(
  readiness: { value: number; category: string } | null
): Promise<{
  acwr: number;
  weeklyLoad: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  readinessHistory: Array<{ date: string; score: number }>;
  recommendation: string;
} | null> {
  try {
    // Get last 28 days of log entries for ACWR calculation
    const logEntries = await getLogEntries(28);

    if (logEntries.length === 0) {
      return null;
    }

    // Calculate weekly loads - always from today going back 7 days
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for consistent comparison

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const twentyEightDaysAgo = new Date(now);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    // Last 7 days (today minus 6 days through today)
    const last7Days = logEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= sevenDaysAgo && entryDate <= now;
    });

    // Last 28 days for chronic load
    const last28Days = logEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= twentyEightDaysAgo && entryDate <= now;
    });

    const acuteLoad = last7Days.reduce((sum, entry) => sum + (entry.km || 0), 0);
    const chronicLoad = last28Days.reduce((sum, entry) => sum + (entry.km || 0), 0) / 4;

    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;
    const weeklyLoad = Math.round(acuteLoad);

    // Determine trend by comparing last 7 days vs previous 7 days (days 8-14)
    const previous7Days = logEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= fourteenDaysAgo && entryDate < sevenDaysAgo;
    });

    const previousLoad = previous7Days.reduce((sum, entry) => sum + (entry.km || 0), 0);
    const trend: 'increasing' | 'stable' | 'decreasing' =
      acuteLoad > previousLoad * 1.1 ? 'increasing'
      : acuteLoad < previousLoad * 0.9 ? 'decreasing'
      : 'stable';

    // Get readiness history for last 7 days from database
    const dbReadinessHistory = await getReadinessHistory(7);

    // Create a map of date -> readiness score
    const readinessMap = new Map<string, number>();
    dbReadinessHistory.forEach(r => {
      readinessMap.set(r.date, r.value);
    });

    // Build the last 7 days array
    const readinessHistory: Array<{ date: string; score: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Use actual readiness score from DB if available
      const actualScore = readinessMap.get(dateStr);

      if (actualScore !== undefined) {
        readinessHistory.push({
          date: dateStr,
          score: actualScore
        });
      } else {
        // If no readiness data, estimate based on training load
        const dayEntries = logEntries.filter(e => e.date === dateStr);
        const dayLoad = dayEntries.reduce((sum, e) => sum + (e.km || 0), 0);
        const estimatedScore = Math.max(40, Math.min(95, 80 - (dayLoad * 2)));

        readinessHistory.push({
          date: dateStr,
          score: Math.round(estimatedScore)
        });
      }
    }

    // If we have current readiness and it's for today, update today's value
    if (readiness && readinessHistory.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const lastEntry = readinessHistory[readinessHistory.length - 1];
      if (lastEntry.date === today) {
        lastEntry.score = readiness.value;
      }
    }

    // Generate recommendation
    let recommendation = '';
    if (acwr >= 0.8 && acwr <= 1.3) {
      recommendation = 'Your training load is in the optimal range. Continue as planned.';
    } else if (acwr > 1.3) {
      recommendation = 'Training load is high. Consider adding an extra recovery day this week.';
    } else {
      recommendation = 'Training load is low. You can safely increase volume if feeling good.';
    }

    if (readiness && readiness.category === 'low' && acwr > 1.2) {
      recommendation = 'Low readiness + high load. Prioritize recovery today.';
    }

    return {
      acwr: Math.round(acwr * 100) / 100,
      weeklyLoad,
      trend,
      readinessHistory,
      recommendation
    };
  } catch (error) {
    console.error('Failed to calculate fatigue data:', error);
    return null;
  }
}
