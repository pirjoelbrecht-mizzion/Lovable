import { updateUserProfile } from "@/state/userData";
import { filterByImportDateLimit, logImportFilterStats, getImportLimitMessage } from "@/utils/importDateLimits";

/* ✅ Töötab Strava CSV-ga – käsitsi parser jutumärkide ja komadega */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((s) => s.replace(/^"|"$/g, "").trim());
}

export async function parseStravaCSV(file: File) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = splitCSVLine(lines[0]);
  const header = headerLine.map((h) => h.toLowerCase().trim());

  const findExactIndex = (keywords: string[]) => {
    for (let i = 0; i < header.length; i++) {
      if (keywords.some((k) => header[i] === k)) return i;
    }
    return -1;
  };

  console.log("First 10 headers:", header.slice(0, 10));
  console.log("Headers around index 3:", header.slice(0, 8));

  const typeIdx = findExactIndex(["activity type"]);
  let distIdx = findExactIndex(["distance"]);
  let timeIdx = findExactIndex(["elapsed time"]);
  const hrIdx = findExactIndex(["average heart rate"]);

  if (timeIdx === -1) timeIdx = findExactIndex(["moving time"]);
  if (distIdx === -1) distIdx = findExactIndex(["distance (km)"]);

  console.log("Header length:", header.length);
  console.log("Found indices:", { typeIdx, distIdx, timeIdx, hrIdx });
  if (typeIdx !== -1) console.log("Type column header:", header[typeIdx]);
  if (distIdx !== -1) console.log("Distance column header:", header[distIdx]);
  if (timeIdx !== -1) console.log("Time column header:", header[timeIdx]);
  if (hrIdx !== -1) console.log("HR column header:", header[hrIdx]);

  if (distIdx === -1 || timeIdx === -1 || hrIdx === -1) {
    console.error("Required columns missing!");
    return [];
  }

  const toNumber = (val: string): number => {
    if (!val || val === "--" || val === "—" || val.trim() === "") return 0;
    // Remove all non-numeric except dots and commas
    const cleaned = val.replace(/[^\d,.]/g, "");
    if (!cleaned || cleaned === "") return 0;
    // If there's both comma and dot, treat comma as thousands separator
    if (cleaned.includes(",") && cleaned.includes(".")) {
      return parseFloat(cleaned.replace(/,/g, "")) || 0;
    }
    // If only comma and it appears as thousands separator (e.g., 1,922)
    if (cleaned.includes(",")) {
      const parts = cleaned.split(",");
      if (parts.length === 2 && parts[1].length === 3) {
        // Thousands separator: 1,922 -> 1922
        return parseFloat(cleaned.replace(",", "")) || 0;
      }
      // Decimal separator: 5,5 -> 5.5
      return parseFloat(cleaned.replace(",", ".")) || 0;
    }
    return parseFloat(cleaned) || 0;
  };

  const timeToSeconds = (val: string): number => {
    if (!val) return 0;
    if (val.includes(":")) {
      const parts = val.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    return toNumber(val);
  };

  const nameIdx = findExactIndex(["activity name"]);
  const dateIdx = findExactIndex(["activity date"]);

  // CRITICAL FIX: Extract Activity ID (Column A), Elevation Loss (Column V), Elevation Low (Column W)
  const activityIdIdx = findExactIndex(["activity id"]);
  const elevGainIdx = findExactIndex(["elevation gain"]);
  const elevLossIdx = findExactIndex(["elevation loss"]);
  const elevLowIdx = findExactIndex(["elevation low"]);

  const tempIdx = findExactIndex(["average temperature", "avg temp", "temperature"]);
  const weatherIdx = findExactIndex(["weather observation", "weather"]);
  const locationIdx = findExactIndex(["location", "city"]);

  console.log("Activity tracking indices:", { activityIdIdx, elevGainIdx, elevLossIdx, elevLowIdx });
  console.log("Weather-related indices:", { tempIdx, weatherIdx, locationIdx });

  const runs: {
    pace: number;
    avgHr: number;
    distanceKm: number;
    durationMin: number;
    date: string;
    name: string;
    activityId?: string;       // NEW: Strava Activity ID from Column A
    elevationGain?: number;    // Column U - Elevation Gain
    elevationLoss?: number;    // NEW: Column V - Elevation Loss
    elevationLow?: number;     // NEW: Column W - Elevation Low
    temperature?: number;
    weather?: string;
    location?: string;
  }[] = [];

  let runCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;

    const type = typeIdx !== -1 ? (cols[typeIdx] || "").toLowerCase() : "run";

    if (i <= 5) {
      console.log(`Row ${i} type check:`, { type, isRun: type.includes("run"), raw: cols[typeIdx] });
    }

    if (!type.includes("run")) continue;
    runCount++;

    const distKm = toNumber(cols[distIdx]);
    const timeSec = timeToSeconds(cols[timeIdx]);
    const hr = toNumber(cols[hrIdx]);
    const name = nameIdx !== -1 ? cols[nameIdx] : "Run";
    const dateRaw = dateIdx !== -1 ? cols[dateIdx] : "";

    // Extract Activity ID (Column A) - CRITICAL FIX
    const activityId = activityIdIdx !== -1 ? cols[activityIdIdx] : undefined;

    // Extract elevation data (Columns U, V, W) - CRITICAL FIX
    const elevGainRaw = elevGainIdx !== -1 ? cols[elevGainIdx] : "";
    const elevLossRaw = elevLossIdx !== -1 ? cols[elevLossIdx] : "";
    const elevLowRaw = elevLowIdx !== -1 ? cols[elevLowIdx] : "";

    const elevationGain = elevGainRaw && elevGainRaw.trim() !== "" ? toNumber(elevGainRaw) : undefined;
    const elevationLoss = elevLossRaw && elevLossRaw.trim() !== "" ? toNumber(elevLossRaw) : undefined;
    const elevationLow = elevLowRaw && elevLowRaw.trim() !== "" ? toNumber(elevLowRaw) : undefined;

    // Extract environmental data
    const temperature = tempIdx !== -1 ? toNumber(cols[tempIdx]) : undefined;
    const weather = weatherIdx !== -1 ? cols[weatherIdx] : undefined;
    const location = locationIdx !== -1 ? cols[locationIdx] : undefined;

    if (runCount <= 3) {
      console.log(`Run ${runCount} (row ${i}) debug:`, {
        type,
        distKm,
        timeSec,
        hr,
        pace: timeSec > 0 && distKm > 0 ? (timeSec / 60) / distKm : 0,
        activityId,
        elevationGain,
        elevationLoss,
        elevationLow,
        elevGainRaw: JSON.stringify(elevGainRaw),     // SHOW RAW VALUE
        elevLossRaw: JSON.stringify(elevLossRaw),     // SHOW RAW VALUE
        elevLowRaw: JSON.stringify(elevLowRaw),       // SHOW RAW VALUE
        temperature,
        weather,
        location,
        rawDist: JSON.stringify(cols[distIdx]),
        rawTime: JSON.stringify(cols[timeIdx]),
        rawHr: JSON.stringify(cols[hrIdx])
      });
    }

    if (distKm < 1 || timeSec < 180) continue;

    const pace = (timeSec / 60) / distKm;
    if (pace < 2.5 || pace > 15) continue;

    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) continue;
    const dateISO = d.toISOString().slice(0, 10);

    if (hr >= 80 && hr <= 200) {
      const run: any = {
        pace,
        avgHr: hr,
        distanceKm: Math.round(distKm * 10) / 10,
        durationMin: Math.round(timeSec / 60),
        date: dateISO,
        name
      };

      // CRITICAL FIX: Include Activity ID (Column A) if available
      if (activityId) {
        run.activityId = activityId.trim();
      }

      // CRITICAL FIX: Include ALL elevation data (Columns U, V, W)
      if (elevationGain !== undefined) {
        run.elevationGain = elevationGain;
      }
      if (elevationLoss !== undefined) {
        run.elevationLoss = elevationLoss;
      }
      if (elevationLow !== undefined) {
        run.elevationLow = elevationLow;
      }

      // Include environmental data
      if (temperature !== undefined && temperature !== 0) {
        run.temperature = temperature;
      }
      if (weather) {
        run.weather = weather;
      }
      if (location) {
        run.location = location;
      }

      runs.push(run);
    }
  }

  console.log(`Parsed ${runs.length} valid runs from ${runCount} run activities (${lines.length - 1} total activities)`);

  // CRITICAL: Apply 2-year import limitation
  const filterResult = filterByImportDateLimit(runs, (run) => run.date);

  logImportFilterStats('Strava CSV Import', filterResult.stats);

  if (filterResult.rejected.length > 0) {
    const message = getImportLimitMessage(filterResult.rejected.length, filterResult.stats.oldestRejected);
    console.warn(message);
  }

  return filterResult.accepted;
}

export function autoEstimateProfile(runs: { pace: number; avgHr: number }[]) {
  if (!runs.length) return null;

  const clean = runs.filter(
    (r) => r.avgHr > 70 && r.avgHr < 195 && r.pace > 3 && r.pace < 15
  );

  if (!clean.length) return null;

  const avgPace = clean.reduce((sum, r) => sum + r.pace, 0) / clean.length;
  const avgHr = clean.reduce((sum, r) => sum + r.avgHr, 0) / clean.length;

  const maxHr = Math.max(...clean.map(r => r.avgHr));
  const estimatedHrMax = Math.min(Math.round(maxHr * 1.08), 220);

  const sortedHr = clean.map(r => r.avgHr).sort((a, b) => a - b);
  const hrResting = sortedHr[0] > 40 ? Math.round(sortedHr[0] * 0.9) : 54;

  const topPaces = clean
    .sort((a, b) => a.pace - b.pace)
    .slice(0, Math.max(1, Math.floor(clean.length * 0.1)));
  const hrThreshold = topPaces.length > 0
    ? Math.round(topPaces.reduce((sum, r) => sum + r.avgHr, 0) / topPaces.length)
    : Math.round(avgHr * 1.15);

  updateUserProfile({
    paceBase: avgPace,
    heartRateBase: avgHr,
    hrMax: estimatedHrMax,
    hrResting,
    hrThreshold
  });

  console.log("✅ Auto-estimated profile:", {
    usedRuns: clean.length,
    paceBase: avgPace.toFixed(2),
    heartRateBase: avgHr.toFixed(1),
    hrMax: estimatedHrMax,
    hrResting,
    hrThreshold
  });

  return {
    paceBase: avgPace,
    heartRateBase: avgHr,
    hrMax: estimatedHrMax,
    hrResting,
    hrThreshold
  };
}

/** Estimate HRmax from age, using 208 − 0.7 × age (Tanaka et al.) */
export function estimateHrMax(age: number): number {
  return 208 - 0.7 * age;
}

/** Return standard 5 heart-rate zones from HRmax */
export function calcHrZones(hrMax: number) {
  return {
    Z1: [Math.round(hrMax * 0.50), Math.round(hrMax * 0.60)],
    Z2: [Math.round(hrMax * 0.60), Math.round(hrMax * 0.70)],
    Z3: [Math.round(hrMax * 0.70), Math.round(hrMax * 0.80)],
    Z4: [Math.round(hrMax * 0.80), Math.round(hrMax * 0.90)],
    Z5: [Math.round(hrMax * 0.90), Math.round(hrMax * 1.00)],
  };
}

/** Calculate pace zones from easy aerobic pace baseline (min/km) */
export function calcPaceZones(paceBase: number) {
  const fmt = (val: number) => parseFloat(val.toFixed(2));
  return {
    Z1: [fmt(paceBase * 1.10), fmt(paceBase * 1.20)],
    Z2: [fmt(paceBase * 1.00), fmt(paceBase * 1.10)],
    Z3: [fmt(paceBase * 0.90), fmt(paceBase * 1.00)],
    Z4: [fmt(paceBase * 0.80), fmt(paceBase * 0.90)],
    Z5: [fmt(paceBase * 0.65), fmt(paceBase * 0.80)],
  };
}