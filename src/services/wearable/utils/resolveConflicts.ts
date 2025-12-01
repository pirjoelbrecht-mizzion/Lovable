import { WearableMetric, WearableProviderName } from '../../../types/wearable';

export function resolveConflicts(
  metrics: WearableMetric[],
  priorityOrder: WearableProviderName[]
): WearableMetric {
  if (metrics.length === 0) {
    throw new Error('No metrics to resolve');
  }

  if (metrics.length === 1) {
    return metrics[0];
  }

  const sorted = metrics.sort(
    (a, b) => priorityOrder.indexOf(a.source) - priorityOrder.indexOf(b.source)
  );

  const merged: WearableMetric = {
    timestamp: sorted[0].timestamp,
    source: sorted[0].source
  };

  for (const metric of sorted) {
    merged.restingHR = merged.restingHR ?? metric.restingHR;
    merged.hrv = merged.hrv ?? metric.hrv;
    merged.sleepHours = merged.sleepHours ?? metric.sleepHours;
    merged.sleepQuality = merged.sleepQuality ?? metric.sleepQuality;
    merged.bodyBattery = merged.bodyBattery ?? metric.bodyBattery;
    merged.trainingLoad = merged.trainingLoad ?? metric.trainingLoad;
    merged.recoveryTime = merged.recoveryTime ?? metric.recoveryTime;
    merged.stressLevel = merged.stressLevel ?? metric.stressLevel;
    merged.temperature = merged.temperature ?? metric.temperature;
  }

  const recentMetrics = metrics.filter(m =>
    Math.abs(m.timestamp - merged.timestamp) < 3600000
  );

  if (recentMetrics.length > 1) {
    const mostRecent = recentMetrics.reduce((prev, curr) =>
      curr.timestamp > prev.timestamp ? curr : prev
    );

    merged.restingHR = mostRecent.restingHR ?? merged.restingHR;
    merged.hrv = mostRecent.hrv ?? merged.hrv;
  }

  const hrvValues = metrics.filter(m => m.hrv).map(m => m.hrv!);
  if (hrvValues.length > 1) {
    const timeDiff = Math.max(...metrics.map(m => m.timestamp)) - Math.min(...metrics.map(m => m.timestamp));
    if (timeDiff > 3600000) {
      merged.hrv = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
    }
  }

  return merged;
}

export function validateMetric(metric: WearableMetric): boolean {
  if (metric.hrv && (metric.hrv < 20 || metric.hrv > 120)) {
    console.warn(`Invalid HRV value: ${metric.hrv}`);
    return false;
  }

  if (metric.sleepHours && (metric.sleepHours < 3 || metric.sleepHours > 12)) {
    console.warn(`Invalid sleep hours: ${metric.sleepHours}`);
    return false;
  }

  if (metric.restingHR && (metric.restingHR < 30 || metric.restingHR > 100)) {
    console.warn(`Invalid resting HR: ${metric.restingHR}`);
    return false;
  }

  if (metric.sleepQuality && (metric.sleepQuality < 0 || metric.sleepQuality > 100)) {
    console.warn(`Invalid sleep quality: ${metric.sleepQuality}`);
    return false;
  }

  return true;
}
