import React from "react";
import { categorizeHeatRisk, HeatRisk } from "@/utils/weather";

export default function HeatBadge({ hiC }: { hiC: number }) {
  const risk: HeatRisk = categorizeHeatRisk(hiC);
  const label =
    risk === "low" ? "OK"
    : risk === "caution" ? "Caution"
    : risk === "warning" ? "Hot"
    : "Extreme";

  const bg =
    risk === "low" ? "var(--ok, #1f8a70)"
    : risk === "caution" ? "var(--warn, #c2a100)"
    : risk === "warning" ? "var(--bad, #c04d3a)"
    : "var(--bad, #9b1b0c)";

  return (
    <span
      title={`Heat Index ${Math.round(hiC)}°C • ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 6px",
        borderRadius: 6,
        background: bg,
        color: "white",
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      <strong>{label}</strong>
      <span>{Math.round(hiC)}°C HI</span>
    </span>
  );
}
