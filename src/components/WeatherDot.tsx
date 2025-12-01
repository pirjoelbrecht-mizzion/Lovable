// src/components/WeatherDot.tsx
import { wmoIcon } from "@/utils/weather";

export default function WeatherDot({
  dateISO,
  dayWx,
}: {
  dateISO: string;
  dayWx?: { code: number; tMax?: number; tMin?: number };
}) {
  if (!dayWx?.code) return null;

  const { icon, label } = wmoIcon(dayWx.code);
  const t = [dayWx.tMin, dayWx.tMax].every(x => typeof x === "number")
    ? ` • ${Math.round(dayWx.tMin!)}–${Math.round(dayWx.tMax!)}°`
    : "";

  return (
    <span
      className="small"
      title={`${label}${t}`}
      aria-label={`${label}${t}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginLeft: 6,
        color: "var(--muted)",
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      {icon}
      {t && <span style={{ opacity: 0.8 }}>{t}</span>}
    </span>
  );
}