/**
 * Heat Index and Environmental Metrics Calculator
 *
 * Analyzes environmental conditions and identifies risk zones
 */

export enum HeatRiskLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  EXTREME_CAUTION = 'EXTREME_CAUTION',
  DANGER = 'DANGER',
  EXTREME_DANGER = 'EXTREME_DANGER'
}

export interface HeatIndexThresholds {
  caution: number; // 27°C (80°F)
  extremeCaution: number; // 32°C (90°F)
  danger: number; // 39°C (103°F)
  extremeDanger: number; // 51°C (124°F)
}

export const DEFAULT_HEAT_THRESHOLDS: HeatIndexThresholds = {
  caution: 27,
  extremeCaution: 32,
  danger: 39,
  extremeDanger: 51
};

export interface WeatherPoint {
  temperature_c: number;
  humidity_percent: number;
  heat_index_c: number;
  elevation_m: number;
  timestamp: Date;
}

export interface EnvironmentalRiskZone {
  startIndex: number;
  endIndex: number;
  startKm: number;
  endKm: number;
  riskLevel: HeatRiskLevel;
  avgHeatIndex: number;
  maxHeatIndex: number;
  duration_minutes: number;
}

export interface TimeInZone {
  safe_minutes: number;
  caution_minutes: number;
  extreme_caution_minutes: number;
  danger_minutes: number;
  extreme_danger_minutes: number;
}

export interface HumidityStrain {
  time_above_80_minutes: number;
  avg_humidity_in_high_zones: number;
  peak_humidity_percent: number;
  peak_humidity_km: number;
}

export interface CoolingBenefit {
  detected: boolean;
  elevation_gains: Array<{
    start_km: number;
    end_km: number;
    elevation_gain_m: number;
    temperature_drop_c: number;
    performance_benefit_estimated: boolean;
  }>;
  total_cooling_time_minutes: number;
}

/**
 * Classifies heat index into risk level
 */
export function classifyHeatRisk(heatIndexC: number): HeatRiskLevel {
  if (heatIndexC >= DEFAULT_HEAT_THRESHOLDS.extremeDanger) {
    return HeatRiskLevel.EXTREME_DANGER;
  }
  if (heatIndexC >= DEFAULT_HEAT_THRESHOLDS.danger) {
    return HeatRiskLevel.DANGER;
  }
  if (heatIndexC >= DEFAULT_HEAT_THRESHOLDS.extremeCaution) {
    return HeatRiskLevel.EXTREME_CAUTION;
  }
  if (heatIndexC >= DEFAULT_HEAT_THRESHOLDS.caution) {
    return HeatRiskLevel.CAUTION;
  }
  return HeatRiskLevel.SAFE;
}

/**
 * Identifies continuous risk zones in the activity
 */
export function identifyRiskZones(
  weatherStream: WeatherPoint[],
  distanceStream: number[]
): EnvironmentalRiskZone[] {
  if (weatherStream.length !== distanceStream.length) {
    throw new Error('Weather and distance streams must match');
  }

  const zones: EnvironmentalRiskZone[] = [];
  let currentZone: EnvironmentalRiskZone | null = null;

  for (let i = 0; i < weatherStream.length; i++) {
    const point = weatherStream[i];
    const riskLevel = classifyHeatRisk(point.heat_index_c);

    // Skip safe zones
    if (riskLevel === HeatRiskLevel.SAFE) {
      if (currentZone) {
        zones.push(currentZone);
        currentZone = null;
      }
      continue;
    }

    // Start new zone or continue existing
    if (!currentZone || currentZone.riskLevel !== riskLevel) {
      if (currentZone) {
        zones.push(currentZone);
      }

      currentZone = {
        startIndex: i,
        endIndex: i,
        startKm: distanceStream[i] / 1000,
        endKm: distanceStream[i] / 1000,
        riskLevel,
        avgHeatIndex: point.heat_index_c,
        maxHeatIndex: point.heat_index_c,
        duration_minutes: 0
      };
    } else {
      currentZone.endIndex = i;
      currentZone.endKm = distanceStream[i] / 1000;
      currentZone.maxHeatIndex = Math.max(currentZone.maxHeatIndex, point.heat_index_c);

      // Calculate duration
      const timeDiff = point.timestamp.getTime() - weatherStream[currentZone.startIndex].timestamp.getTime();
      currentZone.duration_minutes = timeDiff / (1000 * 60);
    }
  }

  // Add final zone
  if (currentZone) {
    zones.push(currentZone);
  }

  // Calculate average heat index for each zone
  zones.forEach(zone => {
    const segment = weatherStream.slice(zone.startIndex, zone.endIndex + 1);
    zone.avgHeatIndex = segment.reduce((sum, p) => sum + p.heat_index_c, 0) / segment.length;
  });

  return zones;
}

/**
 * Calculates time spent in each heat risk zone
 */
export function calculateTimeInZones(
  weatherStream: WeatherPoint[]
): TimeInZone {
  const timeInZone: TimeInZone = {
    safe_minutes: 0,
    caution_minutes: 0,
    extreme_caution_minutes: 0,
    danger_minutes: 0,
    extreme_danger_minutes: 0
  };

  for (let i = 1; i < weatherStream.length; i++) {
    const prevPoint = weatherStream[i - 1];
    const currentPoint = weatherStream[i];

    const timeDiff = (currentPoint.timestamp.getTime() - prevPoint.timestamp.getTime()) / (1000 * 60);
    const riskLevel = classifyHeatRisk(currentPoint.heat_index_c);

    switch (riskLevel) {
      case HeatRiskLevel.SAFE:
        timeInZone.safe_minutes += timeDiff;
        break;
      case HeatRiskLevel.CAUTION:
        timeInZone.caution_minutes += timeDiff;
        break;
      case HeatRiskLevel.EXTREME_CAUTION:
        timeInZone.extreme_caution_minutes += timeDiff;
        break;
      case HeatRiskLevel.DANGER:
        timeInZone.danger_minutes += timeDiff;
        break;
      case HeatRiskLevel.EXTREME_DANGER:
        timeInZone.extreme_danger_minutes += timeDiff;
        break;
    }
  }

  return timeInZone;
}

/**
 * Analyzes humidity strain throughout activity
 */
export function analyzeHumidityStrain(
  weatherStream: WeatherPoint[],
  distanceStream: number[]
): HumidityStrain {
  let timeAbove80 = 0;
  let sumHumidityInHighZones = 0;
  let countHighZones = 0;
  let peakHumidity = 0;
  let peakHumidityIndex = 0;

  for (let i = 1; i < weatherStream.length; i++) {
    const prevPoint = weatherStream[i - 1];
    const currentPoint = weatherStream[i];

    if (currentPoint.humidity_percent > peakHumidity) {
      peakHumidity = currentPoint.humidity_percent;
      peakHumidityIndex = i;
    }

    if (currentPoint.humidity_percent >= 80) {
      const timeDiff = (currentPoint.timestamp.getTime() - prevPoint.timestamp.getTime()) / (1000 * 60);
      timeAbove80 += timeDiff;
      sumHumidityInHighZones += currentPoint.humidity_percent;
      countHighZones++;
    }
  }

  return {
    time_above_80_minutes: timeAbove80,
    avg_humidity_in_high_zones: countHighZones > 0 ? sumHumidityInHighZones / countHighZones : 0,
    peak_humidity_percent: peakHumidity,
    peak_humidity_km: peakHumidityIndex > 0 ? distanceStream[peakHumidityIndex] / 1000 : 0
  };
}

/**
 * Detects cooling benefits from elevation gains
 */
export function detectCoolingBenefits(
  weatherStream: WeatherPoint[],
  distanceStream: number[]
): CoolingBenefit {
  const elevationGains: CoolingBenefit['elevation_gains'] = [];

  let climbStart: number | null = null;
  let climbStartTemp = 0;

  for (let i = 1; i < weatherStream.length; i++) {
    const prevPoint = weatherStream[i - 1];
    const currentPoint = weatherStream[i];
    const elevationGain = currentPoint.elevation_m - prevPoint.elevation_m;

    // Detect start of significant climb
    if (elevationGain > 10 && !climbStart) {
      climbStart = i;
      climbStartTemp = prevPoint.temperature_c;
    }

    // Detect end of climb
    if (climbStart && (elevationGain < 5 || i === weatherStream.length - 1)) {
      const totalGain = currentPoint.elevation_m - weatherStream[climbStart].elevation_m;
      const temperatureDrop = climbStartTemp - currentPoint.temperature_c;

      // Only record significant cooling (at least 2°C drop)
      if (totalGain > 100 && temperatureDrop > 2) {
        elevationGains.push({
          start_km: distanceStream[climbStart] / 1000,
          end_km: distanceStream[i] / 1000,
          elevation_gain_m: totalGain,
          temperature_drop_c: temperatureDrop,
          performance_benefit_estimated: temperatureDrop > 5 // Significant cooling
        });
      }

      climbStart = null;
    }
  }

  // Calculate total cooling time
  const totalCoolingTime = elevationGains.reduce((sum, gain) => {
    const segment = weatherStream.slice(
      distanceStream.findIndex(d => d / 1000 >= gain.start_km),
      distanceStream.findIndex(d => d / 1000 >= gain.end_km) + 1
    );

    if (segment.length < 2) return sum;

    const duration = (segment[segment.length - 1].timestamp.getTime() - segment[0].timestamp.getTime()) / (1000 * 60);
    return sum + duration;
  }, 0);

  return {
    detected: elevationGains.length > 0,
    elevation_gains: elevationGains,
    total_cooling_time_minutes: totalCoolingTime
  };
}

/**
 * Identifies peak heat period in the activity
 */
export function identifyPeakHeatPeriod(
  weatherStream: WeatherPoint[],
  distanceStream: number[],
  windowMinutes: number = 60
): { start_km: number; end_km: number; avg_heat_index: number } | null {
  if (weatherStream.length < 2) return null;

  let maxAvgHeatIndex = 0;
  let maxWindowStart = 0;
  let maxWindowEnd = 0;

  for (let i = 0; i < weatherStream.length; i++) {
    const windowStart = weatherStream[i];
    let windowEnd = i;

    // Find end of time window
    for (let j = i + 1; j < weatherStream.length; j++) {
      const timeDiff = (weatherStream[j].timestamp.getTime() - windowStart.timestamp.getTime()) / (1000 * 60);
      if (timeDiff > windowMinutes) break;
      windowEnd = j;
    }

    // Calculate average heat index in window
    const segment = weatherStream.slice(i, windowEnd + 1);
    const avgHeatIndex = segment.reduce((sum, p) => sum + p.heat_index_c, 0) / segment.length;

    if (avgHeatIndex > maxAvgHeatIndex) {
      maxAvgHeatIndex = avgHeatIndex;
      maxWindowStart = i;
      maxWindowEnd = windowEnd;
    }
  }

  if (maxAvgHeatIndex === 0) return null;

  return {
    start_km: distanceStream[maxWindowStart] / 1000,
    end_km: distanceStream[maxWindowEnd] / 1000,
    avg_heat_index: maxAvgHeatIndex
  };
}

/**
 * Calculates overall environmental statistics
 */
export function calculateEnvironmentalStats(
  weatherStream: WeatherPoint[]
): {
  avg_temperature_c: number;
  max_temperature_c: number;
  min_temperature_c: number;
  avg_humidity_percent: number;
  max_humidity_percent: number;
  avg_heat_index_c: number;
  max_heat_index_c: number;
} {
  if (weatherStream.length === 0) {
    return {
      avg_temperature_c: 0,
      max_temperature_c: 0,
      min_temperature_c: 0,
      avg_humidity_percent: 0,
      max_humidity_percent: 0,
      avg_heat_index_c: 0,
      max_heat_index_c: 0
    };
  }

  const temps = weatherStream.map(p => p.temperature_c);
  const humidities = weatherStream.map(p => p.humidity_percent);
  const heatIndexes = weatherStream.map(p => p.heat_index_c);

  return {
    avg_temperature_c: temps.reduce((a, b) => a + b, 0) / temps.length,
    max_temperature_c: Math.max(...temps),
    min_temperature_c: Math.min(...temps),
    avg_humidity_percent: humidities.reduce((a, b) => a + b, 0) / humidities.length,
    max_humidity_percent: Math.max(...humidities),
    avg_heat_index_c: heatIndexes.reduce((a, b) => a + b, 0) / heatIndexes.length,
    max_heat_index_c: Math.max(...heatIndexes)
  };
}
