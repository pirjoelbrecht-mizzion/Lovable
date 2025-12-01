import React, { useEffect, useState } from "react";
import type { HourlyWeather } from "@/utils/weather";
import { fetchHourlyWeather, heatIndexC, heatPaceNudgePct, pickCoolerHour } from "@/utils/weather";
import { getSavedLocation } from "@/utils/location";
import HeatBadge from "@/components/HeatBadge";

/**
 * Displays a tiny weather/heat advisory for QUALITY sessions.
 * - Picks cooler of 07:00 vs 19:00 if possible
 * - Shows wind and pace nudge on hot days
 */
export default function SessionWxTip({ dateISO, quality }: { dateISO: string; quality: boolean }) {
  const [h, setH] = useState<HourlyWeather[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const loc = getSavedLocation();

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!loc) { setErr("no_loc"); return; }
      try {
        const data = await fetchHourlyWeather(loc.lat, loc.lon, dateISO);
        if (alive) setH(data);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || "wx_err"));
      }
    }
    run();
    return () => { alive = false; };
  }, [dateISO, loc?.lat, loc?.lon]);

  if (!quality) return null;
  if (!loc) {
    return (
      <div className="small" style={{ color: "var(--muted)" }}>
        • Weather: enable location to see heat advice
      </div>
    );
  }
  if (err || !h) return null;
  if (!h.length) return null;

  const best = pickCoolerHour(h);
  if (!best) return null;

  const hiC = best.hiC;
  const nudge = heatPaceNudgePct(hiC); // fraction e.g. 0.06

  return (
    <div className="small" style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
      <HeatBadge hiC={hiC} />
      <span>
        Best time: <b>{new Date(best.bestISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
        {" • "}Temp <b>{Math.round(best.tC)}°C</b>, RH <b>{Math.round(best.rhPct)}%</b>, Wind <b>{best.windKph} kph</b>
      </span>
      {nudge > 0 ? (
        <span>
          {" • "}Adjust pace about <b>+{Math.round(nudge * 100)}%</b>
        </span>
      ) : null}
    </div>
  );
}
