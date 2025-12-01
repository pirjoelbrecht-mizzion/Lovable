// src/utils/units.ts
export type Units = "metric" | "imperial";

export function getUnits(): Units {
  const u = (localStorage.getItem("units") as Units) || "metric";
  return u === "imperial" ? "imperial" : "metric";
}

export function toDisplayKm(km: number, units: Units): { value: number; label: "km" | "mi" } {
  if (units === "imperial") {
    const mi = km * 0.621371;
    return { value: Math.round(mi * 10) / 10, label: "mi" };
  }
  return { value: Math.round(km * 10) / 10, label: "km" };
}
