// src/components/MiniChart.tsx
import React from "react";

type Props = {
  series: number[];        // values to draw (e.g., weekly km)
  height?: number;         // px
  width?: number;          // px
  strokeWidth?: number;    // px
  label?: string;          // optional caption
};

export default function MiniChart({
  series,
  height = 80,
  width = 320,
  strokeWidth = 2,
  label,
}: Props) {
  const max = Math.max(1, ...series);
  const min = Math.min(0, ...series);
  const pad = 8;
  const W = width;
  const H = height;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const points = series.map((v, i) => {
    const x = pad + (i * innerW) / Math.max(1, series.length - 1);
    const norm = (v - min) / Math.max(1e-6, max - min);
    const y = pad + (1 - norm) * innerH;
    return [x, y] as const;
  });

  const path =
    points.length === 1
      ? `M ${points[0][0]} ${points[0][1]}`
      : `M ${points[0][0]} ${points[0][1]} ` +
        points.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ");

  // subtle fill under the line
  const area =
    points.length < 2
      ? ""
      : `M ${points[0][0]} ${H - pad} ` +
        `L ${points[0][0]} ${points[0][1]} ` +
        points.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ") +
        ` L ${points.at(-1)![0]} ${H - pad} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
        {/* grid line at ~75th & 50th & 25th percentile */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p}
            x1={pad} x2={W - pad}
            y1={pad + (1 - p) * innerH}
            y2={pad + (1 - p) * innerH}
            stroke="#2a2b31" strokeWidth={1} />
        ))}
        {area && <path d={area} fill="#7dd3fc22" />}
        <path d={path} stroke="#7dd3fc" strokeWidth={strokeWidth} fill="none" />
        {/* dots */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#7dd3fc" />
        ))}
      </svg>
      {label && <div className="small" style={{ marginTop: 6 }}>{label}</div>}
    </div>
  );
}
