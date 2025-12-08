/**
 * Lapse Rate and Elevation Correction Engine
 *
 * Adjusts temperature and humidity based on elevation changes using
 * atmospheric physics principles.
 */

const STANDARD_LAPSE_RATE = 0.0065; // degrees C per meter (dry adiabatic)
const MOIST_LAPSE_RATE = 0.005; // degrees C per meter (with moisture)

/**
 * Adjusts temperature for elevation using lapse rate
 *
 * @param baseTemperatureC - Temperature at base elevation
 * @param baseElevationM - Base elevation in meters (e.g., weather station)
 * @param targetElevationM - Target elevation in meters (athlete position)
 * @param humidity - Relative humidity (0-100) to adjust lapse rate
 * @returns Adjusted temperature in Celsius
 */
export function adjustTemperatureForElevation(
  baseTemperatureC: number,
  baseElevationM: number,
  targetElevationM: number,
  humidity: number = 50
): number {
  const elevationDiff = targetElevationM - baseElevationM;

  // Use moist lapse rate when humidity is high
  const lapseRate = humidity > 70 ? MOIST_LAPSE_RATE : STANDARD_LAPSE_RATE;

  // Temperature decreases with altitude
  const temperatureChange = -elevationDiff * lapseRate;

  return baseTemperatureC + temperatureChange;
}

/**
 * Calculates dew point from temperature and relative humidity
 * Using Magnus formula
 *
 * @param temperatureC - Temperature in Celsius
 * @param relativeHumidity - Relative humidity (0-100)
 * @returns Dew point in Celsius
 */
export function calculateDewPoint(
  temperatureC: number,
  relativeHumidity: number
): number {
  const a = 17.27;
  const b = 237.7;

  const alpha = ((a * temperatureC) / (b + temperatureC)) + Math.log(relativeHumidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);

  return dewPoint;
}

/**
 * Calculates relative humidity from temperature and dew point
 * Inverse of Magnus formula
 *
 * @param temperatureC - Temperature in Celsius
 * @param dewPointC - Dew point in Celsius
 * @returns Relative humidity (0-100)
 */
export function calculateRelativeHumidity(
  temperatureC: number,
  dewPointC: number
): number {
  const a = 17.27;
  const b = 237.7;

  const numerator = Math.exp((a * dewPointC) / (b + dewPointC));
  const denominator = Math.exp((a * temperatureC) / (b + temperatureC));

  const relativeHumidity = 100 * (numerator / denominator);

  // Clamp to valid range
  return Math.max(0, Math.min(100, relativeHumidity));
}

/**
 * Adjusts humidity for elevation changes
 *
 * Dew point remains constant with altitude, but temperature changes,
 * so we recalculate relative humidity at the new temperature.
 *
 * @param baseTemperatureC - Temperature at base elevation
 * @param baseHumidity - Humidity at base elevation (0-100)
 * @param adjustedTemperatureC - Temperature at target elevation
 * @returns Adjusted relative humidity (0-100)
 */
export function adjustHumidityForElevation(
  baseTemperatureC: number,
  baseHumidity: number,
  adjustedTemperatureC: number
): number {
  // Calculate dew point at base elevation (remains constant)
  const dewPoint = calculateDewPoint(baseTemperatureC, baseHumidity);

  // Calculate new relative humidity at adjusted temperature
  const adjustedHumidity = calculateRelativeHumidity(adjustedTemperatureC, dewPoint);

  return adjustedHumidity;
}

interface WeatherPoint {
  temperature_c: number;
  humidity_percent: number;
  dew_point_c?: number;
}

interface ElevationPoint {
  elevation_m: number;
  timestamp: Date;
}

interface AdjustedWeatherPoint extends WeatherPoint {
  elevation_m: number;
  timestamp: Date;
  heat_index_c: number;
  feels_like_c: number;
}

/**
 * Interpolates hourly weather data to match activity stream resolution
 *
 * @param hourlyWeather - Array of hourly weather data points
 * @param timestamp - Target timestamp to interpolate
 * @returns Interpolated weather point
 */
function interpolateWeather(
  hourlyWeather: (WeatherPoint & { timestamp: Date })[],
  timestamp: Date
): WeatherPoint {
  const targetTime = timestamp.getTime();

  // Find surrounding hours
  let before: (WeatherPoint & { timestamp: Date }) | null = null;
  let after: (WeatherPoint & { timestamp: Date }) | null = null;

  for (let i = 0; i < hourlyWeather.length; i++) {
    const point = hourlyWeather[i];
    const pointTime = point.timestamp.getTime();

    if (pointTime <= targetTime) {
      before = point;
    }
    if (pointTime >= targetTime && !after) {
      after = point;
      break;
    }
  }

  // If exact match or outside range, return closest
  if (!before) return after || hourlyWeather[0];
  if (!after) return before;
  if (before === after) return before;

  // Linear interpolation
  const beforeTime = before.timestamp.getTime();
  const afterTime = after.timestamp.getTime();
  const fraction = (targetTime - beforeTime) / (afterTime - beforeTime);

  return {
    temperature_c: before.temperature_c + (after.temperature_c - before.temperature_c) * fraction,
    humidity_percent: before.humidity_percent + (after.humidity_percent - before.humidity_percent) * fraction,
    dew_point_c: before.dew_point_c && after.dew_point_c
      ? before.dew_point_c + (after.dew_point_c - before.dew_point_c) * fraction
      : undefined
  };
}

/**
 * Generates point-by-point weather with elevation correction
 *
 * @param hourlyWeather - Hourly weather data from Open-Meteo
 * @param elevationStream - Activity elevation stream
 * @param timeStream - Activity time stream
 * @param baseElevation - Base elevation of weather station
 * @returns Array of adjusted weather points matching activity stream
 */
export function generatePointByPointWeather(
  hourlyWeather: (WeatherPoint & { timestamp: Date })[],
  elevationStream: number[],
  timeStream: Date[],
  baseElevation: number = 0
): AdjustedWeatherPoint[] {
  if (elevationStream.length !== timeStream.length) {
    throw new Error('Elevation and time streams must have same length');
  }

  const adjustedWeather: AdjustedWeatherPoint[] = [];

  for (let i = 0; i < elevationStream.length; i++) {
    const elevation = elevationStream[i];
    const timestamp = timeStream[i];

    // Interpolate weather for this timestamp
    const baseWeather = interpolateWeather(hourlyWeather, timestamp);

    // Adjust for elevation
    const adjustedTemp = adjustTemperatureForElevation(
      baseWeather.temperature_c,
      baseElevation,
      elevation,
      baseWeather.humidity_percent
    );

    const adjustedHumidity = adjustHumidityForElevation(
      baseWeather.temperature_c,
      baseWeather.humidity_percent,
      adjustedTemp
    );

    // Calculate heat index and feels like
    const heatIndex = calculateHeatIndex(adjustedTemp, adjustedHumidity);
    const feelsLike = calculateFeelsLike(adjustedTemp, adjustedHumidity);

    adjustedWeather.push({
      elevation_m: elevation,
      timestamp,
      temperature_c: adjustedTemp,
      humidity_percent: adjustedHumidity,
      dew_point_c: calculateDewPoint(adjustedTemp, adjustedHumidity),
      heat_index_c: heatIndex,
      feels_like_c: feelsLike
    });
  }

  return adjustedWeather;
}

/**
 * Calculates heat index from temperature and humidity
 * Using Rothfusz equation (NOAA standard)
 *
 * @param temperatureC - Temperature in Celsius
 * @param relativeHumidity - Relative humidity (0-100)
 * @returns Heat index in Celsius
 */
export function calculateHeatIndex(
  temperatureC: number,
  relativeHumidity: number
): number {
  const tempF = (temperatureC * 9 / 5) + 32;
  const rh = relativeHumidity;

  // Simple formula for temperatures below 27°C
  if (tempF < 80) {
    return temperatureC;
  }

  // Rothfusz regression
  const hif =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * rh -
    0.22475541 * tempF * rh -
    0.00683783 * tempF * tempF -
    0.05481717 * rh * rh +
    0.00122874 * tempF * tempF * rh +
    0.00085282 * tempF * rh * rh -
    0.00000199 * tempF * tempF * rh * rh;

  // Convert back to Celsius
  const heatIndexC = (hif - 32) * 5 / 9;

  return Math.max(temperatureC, heatIndexC);
}

/**
 * Calculates feels like temperature accounting for humidity
 *
 * @param temperatureC - Temperature in Celsius
 * @param relativeHumidity - Relative humidity (0-100)
 * @returns Feels like temperature in Celsius
 */
export function calculateFeelsLike(
  temperatureC: number,
  relativeHumidity: number
): number {
  // For warm temperatures, use heat index
  if (temperatureC >= 27) {
    return calculateHeatIndex(temperatureC, relativeHumidity);
  }

  // For moderate temperatures, humidity makes it feel warmer
  const humidityFactor = (relativeHumidity - 50) / 100;
  const adjustment = humidityFactor * 2; // Max ±1°C adjustment

  return temperatureC + adjustment;
}

/**
 * Calculates average weather conditions over a segment
 *
 * @param adjustedWeather - Point-by-point adjusted weather
 * @param startIndex - Start index of segment
 * @param endIndex - End index of segment
 * @returns Average weather conditions
 */
export function calculateSegmentAverages(
  adjustedWeather: AdjustedWeatherPoint[],
  startIndex: number,
  endIndex: number
): {
  avgTemperature: number;
  avgHumidity: number;
  avgHeatIndex: number;
  maxHeatIndex: number;
  minTemperature: number;
  maxTemperature: number;
} {
  const segment = adjustedWeather.slice(startIndex, endIndex + 1);

  if (segment.length === 0) {
    return {
      avgTemperature: 0,
      avgHumidity: 0,
      avgHeatIndex: 0,
      maxHeatIndex: 0,
      minTemperature: 0,
      maxTemperature: 0
    };
  }

  const sum = segment.reduce(
    (acc, point) => ({
      temp: acc.temp + point.temperature_c,
      humidity: acc.humidity + point.humidity_percent,
      heatIndex: acc.heatIndex + point.heat_index_c
    }),
    { temp: 0, humidity: 0, heatIndex: 0 }
  );

  return {
    avgTemperature: sum.temp / segment.length,
    avgHumidity: sum.humidity / segment.length,
    avgHeatIndex: sum.heatIndex / segment.length,
    maxHeatIndex: Math.max(...segment.map(p => p.heat_index_c)),
    minTemperature: Math.min(...segment.map(p => p.temperature_c)),
    maxTemperature: Math.max(...segment.map(p => p.temperature_c))
  };
}
