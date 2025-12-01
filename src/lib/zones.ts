// Polarized-ish z1–z5 with Karvonen (HRR) and a simple substrate split model.
// You can tweak the split table per zone to match your coaching philosophy.

export type Zone = 1 | 2 | 3 | 4 | 5;

export function karvonenHR(targetPct: number, hrRest: number, hrMax: number) {
  // targetPct is 0..1 of HRR
  const hrr = hrMax - hrRest;
  return Math.round(hrRest + hrr * targetPct);
}

export function estimateZone(hr: number, hrRest: number, hrMax: number): Zone {
  const hrr = hrMax - hrRest;
  const rel = (hr - hrRest) / Math.max(1, hrr); // 0..1
  if (rel < 0.6) return 1;           // <60% HRR
  if (rel < 0.75) return 2;          // 60–74% HRR
  if (rel < 0.85) return 3;          // 75–84% HRR
  if (rel < 0.93) return 4;          // 85–92% HRR
  return 5;                          // ≥93% HRR
}

export function zoneBands(hrRest: number, hrMax: number) {
  // return array of {z, lo, hi} in bpm
  const cuts = [
    { z: 1 as Zone, lo: 0.50, hi: 0.59 },
    { z: 2 as Zone, lo: 0.60, hi: 0.74 },
    { z: 3 as Zone, lo: 0.75, hi: 0.84 },
    { z: 4 as Zone, lo: 0.85, hi: 0.92 },
    { z: 5 as Zone, lo: 0.93, hi: 1.00 },
  ];
  return cuts.map(c => ({
    z: c.z,
    lo: karvonenHR(c.lo, hrRest, hrMax),
    hi: karvonenHR(c.hi, hrRest, hrMax),
  }));
}

export function substrateSplitForZone(z: Zone) {
  // Rough educational model: Z1/Z2 = fat-dominant; Z3 mixed; Z4/Z5 carb-dominant.
  switch (z) {
    case 1: return { fat: 80, carb: 20 };
    case 2: return { fat: 65, carb: 35 };
    case 3: return { fat: 50, carb: 50 };
    case 4: return { fat: 30, carb: 70 };
    case 5: return { fat: 15, carb: 85 };
  }
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
