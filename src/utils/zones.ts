// src/utils/zones.ts

export type ZonesInput = {
  restingHR: number; // bpm
  maxHR: number;     // bpm
};

export type ZoneInfo = {
  zone: "Z1" | "Z2" | "Z3" | "Z4" | "Z5";
  pctHRR: number; // 0..1
  estPctVO2: number; // 0..1 (proxy)
  fatPct: number; // 0..1
  carbPct: number; // 0..1
  mets: number; // metabolic equivalent estimate
};

// Heart Rate Reserve percentage
export function pctHRR(currentHR: number, { restingHR, maxHR }: ZonesInput) {
  const hrr = Math.max(1, maxHR - restingHR);
  return Math.max(0, Math.min(1, (currentHR - restingHR) / hrr));
}

// Map %HRR to training zone (rough guidance)
export function zoneFromPctHRR(p: number): ZoneInfo["zone"] {
  if (p < 0.6) return "Z1";
  if (p < 0.7) return "Z2";
  if (p < 0.8) return "Z3";
  if (p < 0.9) return "Z4";
  return "Z5";
}

// Use %HRR as proxy for %VO2 (not exact but serviceable)
export function pctVO2FromPctHRR(p: number) {
  // Mild curve: VO2% rises slightly faster than HRR%
  return Math.max(0, Math.min(1, 0.1 + 0.95 * p));
}

// Very simple substrate split model (illustrative):
// ~45% VO2 => fat ~70% ; 65% VO2 => fat ~50% ; 85% VO2 => fat ~15%
export function fatCarbSplitFromPctVO2(vo2: number) {
  // Piecewise linear between key anchors
  const anchors = [
    { x: 0.40, fat: 0.80 },
    { x: 0.55, fat: 0.65 },
    { x: 0.65, fat: 0.50 },
    { x: 0.75, fat: 0.35 },
    { x: 0.85, fat: 0.15 },
    { x: 0.95, fat: 0.05 },
  ];

  // below min or above max
  if (vo2 <= anchors[0].x) return { fat: anchors[0].fat, carb: 1 - anchors[0].fat };
  if (vo2 >= anchors[anchors.length - 1].x) {
    const f = anchors[anchors.length - 1].fat;
    return { fat: f, carb: 1 - f };
  }

  // linear interp
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (vo2 >= a.x && vo2 <= b.x) {
      const t = (vo2 - a.x) / (b.x - a.x);
      const fat = a.fat + t * (b.fat - a.fat);
      return { fat, carb: 1 - fat };
    }
  }
  return { fat: 0.5, carb: 0.5 };
}

// Rough METs estimate from %VO2 (1 MET ~ 3.5 ml/kg/min ~ resting)
// VO2% * 10 + 1 gives a reasonable ballpark for running ranges.
export function metsFromPctVO2(vo2: number) {
  return Math.max(1, 1 + vo2 * 10);
}

// Convenience: full zone info for a given HR
export function zoneInfoAtHR(currentHR: number, z: ZonesInput): ZoneInfo {
  const p = pctHRR(currentHR, z);
  const zone = zoneFromPctHRR(p);
  const estPctVO2 = pctVO2FromPctHRR(p);
  const { fat, carb } = fatCarbSplitFromPctVO2(estPctVO2);
  const mets = metsFromPctVO2(estPctVO2);
  return { zone, pctHRR: p, estPctVO2, fatPct: fat, carbPct: carb, mets };
}
