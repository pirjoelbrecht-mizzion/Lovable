import type { Race } from '@/utils/races';
import type { WeatherConditions } from '@/types/performance';
import { fetchHourlyWeather, heatIndexC, type HourlyWeather } from '@/utils/weather';

export async function getRaceWeatherForecast(
  race: Race,
  startHour: number = 7
): Promise<WeatherConditions | null> {
  if (!race.location) {
    return estimateWeatherFromRaceInfo(race);
  }

  const coords = await geocodeLocation(race.location);
  if (!coords) {
    return estimateWeatherFromRaceInfo(race);
  }

  try {
    const hourlyData = await fetchHourlyWeather(coords.lat, coords.lon, race.dateISO);

    const raceHour = hourlyData.find(h => new Date(h.dtISO).getHours() === startHour);
    if (!raceHour) {
      return aggregateWeatherData(hourlyData);
    }

    return convertHourlyToConditions(raceHour);
  } catch (error) {
    console.warn('Failed to fetch weather forecast:', error);
    return estimateWeatherFromRaceInfo(race);
  }
}

function convertHourlyToConditions(hourly: HourlyWeather): WeatherConditions {
  const heatIdx = heatIndexC(hourly.appTC || hourly.tC, hourly.rhPct);

  let conditions = 'Clear';
  if (hourly.tC < 10) {
    conditions = 'Cold';
  } else if (hourly.tC > 25) {
    conditions = 'Warm';
  }
  if (hourly.rhPct > 75) {
    conditions += ' & Humid';
  }

  return {
    temperature: Math.round(hourly.tC * 10) / 10,
    humidity: hourly.rhPct,
    windSpeed: hourly.windKph,
    precipitation: 0,
    heatIndex: Math.round(heatIdx * 10) / 10,
    conditions,
    source: 'forecast',
  };
}

function aggregateWeatherData(hourlyData: HourlyWeather[]): WeatherConditions {
  const morningHours = hourlyData.filter(h => {
    const hour = new Date(h.dtISO).getHours();
    return hour >= 6 && hour <= 10;
  });

  if (morningHours.length === 0) {
    return estimateWeatherFromRaceInfo({ dateISO: hourlyData[0].dateISO } as Race);
  }

  const avgTemp = morningHours.reduce((sum, h) => sum + h.tC, 0) / morningHours.length;
  const avgHumidity = morningHours.reduce((sum, h) => sum + h.rhPct, 0) / morningHours.length;
  const avgWind = morningHours.reduce((sum, h) => sum + h.windKph, 0) / morningHours.length;
  const heatIdx = heatIndexC(avgTemp, avgHumidity);

  return {
    temperature: Math.round(avgTemp * 10) / 10,
    humidity: Math.round(avgHumidity),
    windSpeed: Math.round(avgWind * 10) / 10,
    precipitation: 0,
    heatIndex: Math.round(heatIdx * 10) / 10,
    conditions: avgTemp > 25 ? 'Warm' : avgTemp < 10 ? 'Cold' : 'Moderate',
    source: 'forecast',
  };
}

function estimateWeatherFromRaceInfo(race: Race): WeatherConditions {
  const name = (race.name || '').toLowerCase();
  const location = (race.notes || '').toLowerCase();
  const text = name + ' ' + location;

  const raceDate = new Date(race.dateISO);
  const month = raceDate.getMonth();

  let temperature = 20;
  let humidity = 50;
  let conditions = 'Moderate';

  if (text.includes('thailand') || text.includes('singapore') || text.includes('malaysia')) {
    temperature = 30;
    humidity = 75;
    conditions = 'Hot & Humid';
  } else if (text.includes('summer')) {
    temperature = 28;
    humidity = 60;
    conditions = 'Warm';
  } else if (text.includes('winter')) {
    temperature = 8;
    humidity = 70;
    conditions = 'Cold';
  } else {
    if (month >= 5 && month <= 8) {
      temperature = 25;
      humidity = 55;
      conditions = 'Warm';
    } else if (month >= 11 || month <= 2) {
      temperature = 10;
      humidity = 65;
      conditions = 'Cold';
    }
  }

  const heatIdx = heatIndexC(temperature, humidity);

  return {
    temperature,
    humidity,
    windSpeed: 10,
    precipitation: 0,
    heatIndex: Math.round(heatIdx * 10) / 10,
    conditions,
    source: 'historical',
  };
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  const knownLocations: Record<string, { lat: number; lon: number }> = {
    'bangkok': { lat: 13.7563, lon: 100.5018 },
    'chiang mai': { lat: 18.7883, lon: 98.9853 },
    'singapore': { lat: 1.3521, lon: 103.8198 },
    'kuala lumpur': { lat: 3.1390, lon: 101.6869 },
    'london': { lat: 51.5074, lon: -0.1278 },
    'paris': { lat: 48.8566, lon: 2.3522 },
    'berlin': { lat: 52.5200, lon: 13.4050 },
    'new york': { lat: 40.7128, lon: -74.0060 },
    'tokyo': { lat: 35.6762, lon: 139.6503 },
    'hong kong': { lat: 22.3193, lon: 114.1694 },
  };

  const normalized = location.toLowerCase().trim();
  for (const [city, coords] of Object.entries(knownLocations)) {
    if (normalized.includes(city)) {
      return coords;
    }
  }

  return null;
}

export function getWeatherImpactDescription(weather: WeatherConditions): string {
  const messages: string[] = [];

  if (weather.temperature > 30) {
    messages.push('Very hot conditions - expect significant slowdown');
  } else if (weather.temperature > 25) {
    messages.push('Warm conditions - plan extra hydration');
  } else if (weather.temperature < 5) {
    messages.push('Very cold - warm-up crucial');
  } else if (weather.temperature < 10) {
    messages.push('Cold conditions - layer appropriately');
  } else if (weather.temperature >= 15 && weather.temperature <= 20) {
    messages.push('Ideal temperature range');
  }

  if (weather.humidity > 80) {
    messages.push('High humidity - sweat evaporation reduced');
  } else if (weather.humidity > 70) {
    messages.push('Humid conditions - affects cooling');
  }

  if (weather.windSpeed > 20) {
    messages.push('Strong winds - significant impact on pace');
  } else if (weather.windSpeed > 15) {
    messages.push('Moderate winds expected');
  }

  if (weather.precipitation > 10) {
    messages.push('Rain expected - footing and visibility affected');
  }

  if (messages.length === 0) {
    messages.push('Good conditions expected');
  }

  return messages.join('. ');
}

export function getOptimalRaceStartTime(race: Race): { hour: number; reason: string } {
  const name = (race.name || '').toLowerCase();
  const location = (race.notes || '').toLowerCase();
  const text = name + ' ' + location;

  const raceDate = new Date(race.dateISO);
  const month = raceDate.getMonth();

  if (text.includes('thailand') || text.includes('singapore') || text.includes('malaysia')) {
    return {
      hour: 5,
      reason: 'Early start recommended for tropical heat',
    };
  }

  if (month >= 5 && month <= 8) {
    return {
      hour: 6,
      reason: 'Early start to avoid peak heat',
    };
  }

  if (month >= 11 || month <= 2) {
    return {
      hour: 9,
      reason: 'Later start to avoid coldest temperatures',
    };
  }

  return {
    hour: 7,
    reason: 'Standard race start time',
  };
}
