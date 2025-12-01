import { increment, load, save } from "@/utils/storage";

export function rewardCoinsForStreak(days: number) {
  if (days <= 0) return 0;
  const base = Math.min(days, 30);
  return Math.round(base * 3 + (days > 7 ? 10 : 0) + (days > 14 ? 15 : 0));
}

// global coin bank
export function getCoins() {
  return load<number>("coins", 0);
}
export function awardCoins(amount: number, reason?: string) {
  const total = increment("coins", amount);
  // You can add a lightweight log if you wish:
  const logs = load<{ at: string; amount: number; reason?: string }[]>("coins:log", []);
  logs.push({ at: new Date().toISOString(), amount, reason });
  save("coins:log", logs);
  return total;
}
