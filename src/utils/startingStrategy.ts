import type { StartStrategy } from '@/types/whatif';

export function getStartPaceFactor(strategy: StartStrategy, progress: number): number {
  switch (strategy) {
    case 'conservative':
      return 0.97 + 0.06 * progress;
    case 'aggressive':
      return 1.05 - 0.10 * progress;
    case 'target':
    default:
      return 1.0;
  }
}

export function getStrategyFatigueFactor(strategy: StartStrategy, progress: number): number {
  switch (strategy) {
    case 'conservative':
      return 1.0 - 0.05 * (1 - progress);
    case 'aggressive':
      return 1.0 + 0.15 * progress;
    case 'target':
    default:
      return 1.0;
  }
}

export function getStrategyEnergyBurnRate(strategy: StartStrategy, progress: number): number {
  const baseRate = 1.0;

  switch (strategy) {
    case 'conservative':
      return baseRate * (0.92 + 0.16 * progress);
    case 'aggressive':
      return baseRate * (1.12 - 0.20 * progress);
    case 'target':
    default:
      return baseRate;
  }
}

export function getStrategyDescription(strategy: StartStrategy): string {
  switch (strategy) {
    case 'conservative':
      return 'Start 3-5% slower, gradually increase pace. Ideal for ultras and hot conditions. Preserves energy for strong finish.';
    case 'aggressive':
      return 'Start 5-7% faster, maintain as long as possible. Risky in heat or long races. Higher fatigue and GI stress.';
    case 'target':
    default:
      return 'Even pacing throughout. Balanced effort distribution. Best for most road marathons and well-trained runners.';
  }
}

export function getStrategyEmoji(strategy: StartStrategy): string {
  switch (strategy) {
    case 'conservative':
      return '🐢';
    case 'aggressive':
      return '🔥';
    case 'target':
    default:
      return '⚖️';
  }
}

export function getStrategyLabel(strategy: StartStrategy): string {
  switch (strategy) {
    case 'conservative':
      return 'Conservative Start';
    case 'aggressive':
      return 'Aggressive Start';
    case 'target':
    default:
      return 'Target / Even Pacing';
  }
}

export function estimateTimeToExhaustion(
  distanceKm: number,
  fatigueCurve: number[],
  threshold: number = 1.33
): number {
  for (let i = 0; i < fatigueCurve.length; i++) {
    if (fatigueCurve[i] >= threshold) {
      return (i / fatigueCurve.length) * distanceKm;
    }
  }
  return distanceKm;
}
