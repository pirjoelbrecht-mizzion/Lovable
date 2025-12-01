// src/lib/aiHistory.ts
import { load, save } from "@/utils/storage";
export function recordAIEvent(summary: string) {
  const prev = load("ai:history", []);
  const next = [...prev, { date: new Date().toISOString(), summary }];
  save("ai:history", next.slice(-100));
}
