// src/utils/dataIO.ts
import { save } from "@/utils/storage";

const KEYS = [
  "streak",
  "health",
  "raceWeeks",
  "weights",
  "recentActivities",
  "planItems",
  "logEntries",
  "connections",
  "units",
  "goal",
];

export function exportAllData() {
  const obj: Record<string, any> = {};
  for (const k of KEYS) {
    try {
      const v = localStorage.getItem(k);
      obj[k] = v ? JSON.parse(v) : null;
    } catch {
      obj[k] = null;
    }
  }
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mizzion-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function importAllDataFromFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || !parsed) throw new Error("Invalid file");
  Object.keys(parsed).forEach((k) => {
    if (KEYS.includes(k)) save(k, parsed[k]);
  });
}
