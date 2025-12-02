/**
 * Hook to generate Today's Training data for mobile view
 * Integrates with existing Quest page data
 */

import { useMemo } from 'react';
import type { TodayTrainingData } from '@/components/today/TodayTrainingMobile';
import { calculateHydrationNeeds, calculateFuelingNeeds } from '@/lib/environmental-learning/hydration';

interface SessionNode {
  type: string;
  duration: string;
  distance?: string;
  pace?: string;
  description?: string;
  weather?: { temp: number; condition: string; icon: string };
  isToday: boolean;
}

export function useTodayTrainingData(
  sessions: SessionNode[],
  profile: { paceBase: number }
): TodayTrainingData | null {
  return useMemo(() => {
    const todaySession = sessions.find(s => s.isToday);
    if (!todaySession) return null;

    // Parse duration (e.g., "45 min" -> 45)
    const durationMatch = todaySession.duration.match(/(\d+)/);
    const durationMin = durationMatch ? parseInt(durationMatch[1], 10) : 45;

    // Parse distance (e.g., "8K" -> 8)
    const distanceMatch = todaySession.distance?.match(/(\d+(?:\.\d+)?)/);
    const distanceKm = distanceMatch ? parseFloat(distanceMatch[1]) : 8;

    // Weather data
    const temp = todaySession.weather?.temp || 20;
    const condition = todaySession.weather?.condition || 'Partly Cloudy';

    // Generate hourly weather (mock for now - you'd integrate with real data)
    const currentHour = new Date().getHours();
    const hours = Array.from({ length: 12 }, (_, i) => {
      const hour = (currentHour + i) % 24;
      return {
        time: `${hour.toString().padStart(2, '0')}:00`,
        temp: temp + Math.sin(i / 3) * 3,
        icon: i < 6 ? 'sun' : i < 9 ? 'partly-cloudy-day' : 'cloudy',
        precipitation: i > 8 ? Math.random() * 0.5 : undefined,
        windSpeed: 10 + Math.random() * 5,
      };
    });

    // Calculate hydration needs
    const hydration = calculateHydrationNeeds({
      temp,
      humidity: 60,
      duration: durationMin,
      elevationGain: 100,
      shadeFactor: 0.5,
      intensity: 0.7
    });

    // Calculate fueling needs
    const fueling = calculateFuelingNeeds({
      duration: durationMin,
      intensity: 0.7,
      heatIndex: temp > 25 ? 0.7 : 0.3,
      athleteGutTraining: 0.5,
      bodyMass: 60
    });

    // Generate gear suggestions
    const gearItems: string[] = [];
    if (temp > 25) {
      gearItems.push('Light breathable top', 'Sunglasses + sunscreen', 'Hat or visor');
    } else if (temp > 18) {
      gearItems.push('Light long sleeve or short sleeve', 'Sun protection (optional)');
    } else if (temp > 10) {
      gearItems.push('Long sleeve base layer', 'Light jacket', 'Gloves (optional)');
    } else {
      gearItems.push('Thermal base layer', 'Windproof jacket', 'Gloves and hat');
    }

    if (durationMin > 60) {
      gearItems.push(`${Math.ceil(hydration.liters * 1000)}ml hydration`);
    }

    if (durationMin > 90) {
      gearItems.push(`${fueling.carbsPerHour}g carbs/hour`);
    }

    return {
      summary: {
        title: todaySession.type,
        duration: todaySession.duration,
        distance: todaySession.distance || `${distanceKm}K`,
        pace: todaySession.pace || `${(profile.paceBase - 0.5).toFixed(1)} - ${profile.paceBase.toFixed(1)} min/km`,
      },
      weather: {
        current: { temp, summary: condition },
        hours: hours.map(h => ({
          time: h.time,
          temp: Math.round(h.temp),
          icon: h.icon,
          precipitation: h.precipitation,
          windSpeed: h.windSpeed
        }))
      },
      route: {
        id: 'default',
        name: 'Your Usual Route',
        distance: distanceKm,
        elevation: '+42m / -39m',
        surface: 'Mixed (road + trail)'
      },
      pace: {
        suggested: todaySession.pace || `${profile.paceBase.toFixed(1)} min/km`,
        explanation: 'Based on your past runs + current fatigue levels',
        confidence: 0.85
      },
      gear: {
        items: gearItems,
        temperature: temp,
        conditions: condition
      },
      hydration,
      fueling: durationMin > 60 ? fueling : undefined,
      instructions: {
        text: todaySession.description || `${todaySession.type} session as planned.`,
        coachTip: temp > 25 ? 'Hot day - start hydrating 2 hours before' : 'Perfect conditions - enjoy the run!'
      }
    };
  }, [sessions, profile]);
}
