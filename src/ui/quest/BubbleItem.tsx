// src/ui/quest/BubbleItem.tsx
import { motion } from "framer-motion";
import { WorkoutIcon, kindFromTitle } from "@/ui/icons/WorkoutIcon";
import { colorFor } from "@/ui/quest/colors";
import type { PlanWeek } from "@/pages/Planner";
import { useMemo } from "react";
import { getDailyWeatherIcon } from "@/utils/weather-icons"; // small helper you already added
import { cn } from "@/utils/cn"; // className joiner if you have one

type Props = {
  dayIndex: number;
  dateISO: string;
  sessions: { title: string; km?: number; notes?: string }[];
  totalKm: number;
  isToday: boolean;
  onDragStart: (idx: number) => void;
  onDrop: (idx?: number) => void;
};

export function BubbleItem({
  dayIndex, dateISO, sessions, totalKm, isToday, onDragStart, onDrop,
}: Props) {
  const main = sessions[0];
  const kind = kindFromTitle(main?.title || "Easy");
  const bg = colorFor(kind);

  const weather = useMemo(() => getDailyWeatherIcon(dateISO), [dateISO]); // {icon: JSX, t: "8°C", pop: 20}

  const label = main?.title || "Easy";
  const km = totalKm || main?.km;

  return (
    <motion.button
      aria-label={`${label} ${km ? ` ${km} km` : ""}`}
      draggable
      onDragStart={() => onDragStart(dayIndex)}
      onDragOver={(e)=>e.preventDefault()}
      onDrop={(e)=>{ e.stopPropagation(); onDrop(dayIndex); }}
      className="bubble"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      style={{
        background: `radial-gradient(120% 120% at 20% 10%, ${bg} 0%, rgba(0,0,0,0.25) 70%)`,
      }}
    >
      <div className="bubble-top">
        <WorkoutIcon kind={kind} />
        {isToday && <span className="badge-now">NOW</span>}
        {weather && (
          <span className="chip-weather" title={weather.tooltip}>
            {weather.icon}<span className="t">{weather.t}</span>
          </span>
        )}
      </div>
      <div className="bubble-mid">
        <div className="title">{label}</div>
        <div className="sub">{km ? `${km} km` : main?.notes || ""}</div>
      </div>
      {/* completion ring (approx from logs) */}
      <svg className="ring" viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="18" className="track"/>
        {/* strokeDashoffset will be set via CSS var */}
        <circle cx="20" cy="20" r="18" className="prog" />
      </svg>
    </motion.button>
  );
}