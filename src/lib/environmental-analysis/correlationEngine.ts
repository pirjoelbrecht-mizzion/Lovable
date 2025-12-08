/**
 * Environmental Correlation Engine
 *
 * Maps weather conditions to performance changes and identifies
 * causal relationships between environmental factors and physiological stress
 */

import type { PhysiologicalStress } from './stressDetection';
import type { WeatherPoint } from './heatMetrics';

export interface CorrelationEvent {
  km: number;
  timestamp: Date;
  event_type: 'HR_DRIFT_START' | 'PACE_FADE_START' | 'VAM_DECLINE' | 'CADENCE_DROP' | 'HEAT_SPIKE' | 'HUMIDITY_SPIKE';
  description: string;
  environmental_context: {
    temperature_c: number;
    humidity_percent: number;
    heat_index_c: number;
  };
  physiological_context?: {
    hr_bpm?: number;
    pace_min_km?: number;
    cadence?: number;
  };
}

export interface EnvironmentalCorrelation {
  correlation_strength: number; // 0-1
  primary_factor: 'HEAT' | 'HUMIDITY' | 'COMBINED' | 'NONE';
  events: CorrelationEvent[];
  confidence_score: number; // 0-1
  summary: string;
}

/**
 * Correlates environmental conditions with physiological stress
 */
export function correlateEnvironmentWithStress(
  weatherStream: WeatherPoint[],
  distanceStream: number[],
  physiologicalStress: PhysiologicalStress,
  heartRateStream?: number[],
  velocityStream?: number[],
  cadenceStream?: number[]
): EnvironmentalCorrelation {
  const events: CorrelationEvent[] = [];

  // Map physiological events to environmental conditions
  if (physiologicalStress.hr_drift.detected) {
    const index = physiologicalStress.hr_drift.start_index;
    if (index < weatherStream.length && index < distanceStream.length) {
      const weather = weatherStream[index];

      events.push({
        km: distanceStream[index] / 1000,
        timestamp: weather.timestamp,
        event_type: 'HR_DRIFT_START',
        description: `HR drift of ${physiologicalStress.hr_drift.magnitude_bpm.toFixed(1)} bpm detected`,
        environmental_context: {
          temperature_c: weather.temperature_c,
          humidity_percent: weather.humidity_percent,
          heat_index_c: weather.heat_index_c
        },
        physiological_context: {
          hr_bpm: heartRateStream?.[index]
        }
      });
    }
  }

  if (physiologicalStress.pace_degradation.detected) {
    const index = physiologicalStress.pace_degradation.start_index;
    if (index < weatherStream.length && index < distanceStream.length) {
      const weather = weatherStream[index];

      events.push({
        km: distanceStream[index] / 1000,
        timestamp: weather.timestamp,
        event_type: 'PACE_FADE_START',
        description: `Pace degradation of ${physiologicalStress.pace_degradation.degradation_percent.toFixed(1)}% detected`,
        environmental_context: {
          temperature_c: weather.temperature_c,
          humidity_percent: weather.humidity_percent,
          heat_index_c: weather.heat_index_c
        },
        physiological_context: {
          pace_min_km: physiologicalStress.pace_degradation.degraded_pace_min_km
        }
      });
    }
  }

  if (physiologicalStress.cadence_drop.detected) {
    const index = distanceStream.findIndex(d => d / 1000 >= physiologicalStress.cadence_drop.start_km);
    if (index >= 0 && index < weatherStream.length) {
      const weather = weatherStream[index];

      events.push({
        km: physiologicalStress.cadence_drop.start_km,
        timestamp: weather.timestamp,
        event_type: 'CADENCE_DROP',
        description: `Cadence drop of ${physiologicalStress.cadence_drop.drop_percent.toFixed(1)}% detected`,
        environmental_context: {
          temperature_c: weather.temperature_c,
          humidity_percent: weather.humidity_percent,
          heat_index_c: weather.heat_index_c
        },
        physiological_context: {
          cadence: physiologicalStress.cadence_drop.dropped_cadence
        }
      });
    }
  }

  // Identify heat spikes
  const heatSpikes = identifyHeatSpikes(weatherStream, distanceStream);
  events.push(...heatSpikes);

  // Identify humidity spikes
  const humiditySpikes = identifyHumiditySpikes(weatherStream, distanceStream);
  events.push(...humiditySpikes);

  // Calculate correlation strength
  const correlationStrength = calculateCorrelationStrength(events, weatherStream, physiologicalStress);

  // Determine primary environmental factor
  const primaryFactor = determinePrimaryFactor(events, weatherStream);

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(events, weatherStream, physiologicalStress);

  // Generate summary
  const summary = generateCorrelationSummary(events, correlationStrength, primaryFactor);

  return {
    correlation_strength: correlationStrength,
    primary_factor: primaryFactor,
    events: events.sort((a, b) => a.km - b.km),
    confidence_score: confidenceScore,
    summary
  };
}

/**
 * Identifies heat index spikes in the weather stream
 */
function identifyHeatSpikes(
  weatherStream: WeatherPoint[],
  distanceStream: number[]
): CorrelationEvent[] {
  const spikes: CorrelationEvent[] = [];

  // Calculate baseline heat index from first 30%
  const baselineEndIndex = Math.floor(weatherStream.length * 0.3);
  const baselineHeatIndex =
    weatherStream.slice(0, baselineEndIndex).reduce((sum, w) => sum + w.heat_index_c, 0) / baselineEndIndex;

  for (let i = baselineEndIndex; i < weatherStream.length; i++) {
    const weather = weatherStream[i];
    const heatIncrease = weather.heat_index_c - baselineHeatIndex;

    // Detect significant heat spike (>5°C increase)
    if (heatIncrease > 5) {
      spikes.push({
        km: distanceStream[i] / 1000,
        timestamp: weather.timestamp,
        event_type: 'HEAT_SPIKE',
        description: `Heat index increased by ${heatIncrease.toFixed(1)}°C`,
        environmental_context: {
          temperature_c: weather.temperature_c,
          humidity_percent: weather.humidity_percent,
          heat_index_c: weather.heat_index_c
        }
      });

      // Skip ahead to avoid duplicate events
      i += 10;
    }
  }

  return spikes;
}

/**
 * Identifies humidity spikes
 */
function identifyHumiditySpikes(
  weatherStream: WeatherPoint[],
  distanceStream: number[]
): CorrelationEvent[] {
  const spikes: CorrelationEvent[] = [];

  for (let i = 1; i < weatherStream.length; i++) {
    const prev = weatherStream[i - 1];
    const current = weatherStream[i];

    // Detect transition to high humidity (>80%)
    if (prev.humidity_percent < 80 && current.humidity_percent >= 80) {
      spikes.push({
        km: distanceStream[i] / 1000,
        timestamp: current.timestamp,
        event_type: 'HUMIDITY_SPIKE',
        description: `Humidity reached ${current.humidity_percent.toFixed(0)}%`,
        environmental_context: {
          temperature_c: current.temperature_c,
          humidity_percent: current.humidity_percent,
          heat_index_c: current.heat_index_c
        }
      });

      // Skip ahead to avoid duplicates
      i += 10;
    }
  }

  return spikes;
}

/**
 * Calculates correlation strength between environment and physiological stress
 */
function calculateCorrelationStrength(
  events: CorrelationEvent[],
  weatherStream: WeatherPoint[],
  physiologicalStress: PhysiologicalStress
): number {
  if (!physiologicalStress.overall_stress_detected) return 0;

  let correlationScore = 0;
  let maxScore = 0;

  // Check timing alignment between environmental and physiological events
  const physioEvents = events.filter(e =>
    e.event_type === 'HR_DRIFT_START' ||
    e.event_type === 'PACE_FADE_START' ||
    e.event_type === 'CADENCE_DROP'
  );

  const envEvents = events.filter(e =>
    e.event_type === 'HEAT_SPIKE' ||
    e.event_type === 'HUMIDITY_SPIKE'
  );

  for (const physioEvent of physioEvents) {
    maxScore += 1;

    // Check if environmental stress precedes physiological stress
    const precedingEnvEvents = envEvents.filter(
      e => e.km <= physioEvent.km && e.km >= physioEvent.km - 5 // Within 5km before
    );

    if (precedingEnvEvents.length > 0) {
      correlationScore += 1;
    }
  }

  // Check overall environmental severity
  const avgHeatIndex = weatherStream.reduce((sum, w) => sum + w.heat_index_c, 0) / weatherStream.length;
  if (avgHeatIndex > 27) correlationScore += 0.5; // Caution level
  if (avgHeatIndex > 32) correlationScore += 0.5; // Extreme caution level

  maxScore += 1;

  return maxScore > 0 ? Math.min(1, correlationScore / maxScore) : 0;
}

/**
 * Determines the primary environmental factor
 */
function determinePrimaryFactor(
  events: CorrelationEvent[],
  weatherStream: WeatherPoint[]
): 'HEAT' | 'HUMIDITY' | 'COMBINED' | 'NONE' {
  const avgHeatIndex = weatherStream.reduce((sum, w) => sum + w.heat_index_c, 0) / weatherStream.length;
  const avgHumidity = weatherStream.reduce((sum, w) => sum + w.humidity_percent, 0) / weatherStream.length;
  const avgTemp = weatherStream.reduce((sum, w) => sum + w.temperature_c, 0) / weatherStream.length;

  const highHeat = avgHeatIndex > 32;
  const highHumidity = avgHumidity > 70;
  const highTemp = avgTemp > 25;

  if (highHeat && highHumidity) return 'COMBINED';
  if (highHeat || highTemp) return 'HEAT';
  if (highHumidity) return 'HUMIDITY';
  return 'NONE';
}

/**
 * Calculates confidence score for the correlation analysis
 */
function calculateConfidenceScore(
  events: CorrelationEvent[],
  weatherStream: WeatherPoint[],
  physiologicalStress: PhysiologicalStress
): number {
  let confidence = 0.5; // Start at 50%

  // Increase confidence with data completeness
  if (weatherStream.length > 100) confidence += 0.1;

  // Increase confidence with multiple physiological indicators
  let indicators = 0;
  if (physiologicalStress.hr_drift.detected) indicators++;
  if (physiologicalStress.pace_degradation.detected) indicators++;
  if (physiologicalStress.vam_decline.detected) indicators++;
  if (physiologicalStress.cadence_drop.detected) indicators++;

  confidence += indicators * 0.1;

  // Increase confidence with sustained stress
  if (physiologicalStress.hr_drift.sustained) confidence += 0.1;

  // Decrease confidence if no environmental events
  if (events.filter(e => e.event_type === 'HEAT_SPIKE' || e.event_type === 'HUMIDITY_SPIKE').length === 0) {
    confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Generates a human-readable summary of the correlation
 */
function generateCorrelationSummary(
  events: CorrelationEvent[],
  correlationStrength: number,
  primaryFactor: string
): string {
  if (correlationStrength < 0.3) {
    return 'Limited evidence of environmental impact on performance';
  }

  const physioCount = events.filter(e =>
    e.event_type === 'HR_DRIFT_START' ||
    e.event_type === 'PACE_FADE_START' ||
    e.event_type === 'CADENCE_DROP'
  ).length;

  const envCount = events.filter(e =>
    e.event_type === 'HEAT_SPIKE' ||
    e.event_type === 'HUMIDITY_SPIKE'
  ).length;

  let summary = `Strong correlation detected between ${primaryFactor.toLowerCase()} stress and performance degradation. `;

  if (physioCount > 0) {
    summary += `${physioCount} physiological stress indicator${physioCount > 1 ? 's' : ''} identified. `;
  }

  if (envCount > 0) {
    summary += `${envCount} environmental stress event${envCount > 1 ? 's' : ''} detected.`;
  }

  return summary;
}
