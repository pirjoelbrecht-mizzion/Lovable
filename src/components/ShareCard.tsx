// src/components/ShareCard.tsx
import { useEffect, useRef, useState } from "react";

export default function ShareCard({
  streak,
  totalKm,
  fatigue,
  lastRunKm,
  onDone,
}: {
  streak: number;
  totalKm: number;
  fatigue: number;
  lastRunKm: number;
  onDone?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = 1080;
    const h = 1350; // story-ish aspect
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Colors (match CSS variables roughly)
    const bg = "#0b0b0c";
    const card = "#16171a";
    const line = "#26272b";
    const brand = "#7dd3fc";
    const text = "#e7e7ea";
    const muted = "#a4a6ad";

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Big top card
    const pad = 56;
    const radius = 28;
    roundRect(ctx, pad, pad, w - pad * 2, 520, radius, card);
    // Title
    ctx.fillStyle = text;
    ctx.font = "bold 64px Inter, system-ui, sans-serif";
    ctx.fillText("Mizzion — Quest · Balance · Unity", pad + 36, pad + 96);

    // Stats row
    ctx.font = "28px Inter, system-ui, sans-serif";
    ctx.fillStyle = muted;
    ctx.fillText("Weekly snapshot", pad + 36, pad + 152);

    const colW = (w - pad * 2 - 72) / 3;
    const yBase = pad + 240;
    const stats = [
      { label: "🔥 Streak", value: `${streak} days` },
      { label: "🏁 Total KM", value: `${totalKm} km` },
      { label: "💤 Fatigue", value: fatigue.toFixed(2) },
    ];
    stats.forEach((s, i) => {
      const x = pad + 36 + i * (colW + 36);
      ctx.fillStyle = muted;
      ctx.font = "26px Inter, system-ui, sans-serif";
      ctx.fillText(s.label, x, yBase);
      ctx.fillStyle = text;
      ctx.font = "bold 44px Inter, system-ui, sans-serif";
      ctx.fillText(s.value, x, yBase + 56);
    });

    // Divider
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    lineH(ctx, pad + 36, pad + 320, w - pad * 2 - 72);

    // Last run
    ctx.fillStyle = muted;
    ctx.font = "26px Inter, system-ui, sans-serif";
    ctx.fillText("Last Run", pad + 36, pad + 380);
    ctx.fillStyle = text;
    ctx.font = "bold 54px Inter, system-ui, sans-serif";
    ctx.fillText(`${lastRunKm} km · Easy`, pad + 36, pad + 440);

    // Bottom card
    const bx = pad;
    const by = pad + 520 + 36;
    roundRect(ctx, bx, by, w - pad * 2, h - by - pad, radius, card);

    // Mission prompt
    ctx.fillStyle = text;
    ctx.font = "bold 54px Inter, system-ui, sans-serif";
    ctx.fillText("Today’s Mission: Base Builder", bx + 36, by + 96);
    ctx.fillStyle = muted;
    ctx.font = "30px Inter, system-ui, sans-serif";
    wrapText(
      ctx,
      "Consistency over intensity. Keep it in Z2, add 4×20s strides at the end.",
      bx + 36,
      by + 150,
      w - pad * 2 - 72,
      46
    );

    // Footer
    ctx.fillStyle = brand;
    ctx.font = "28px Inter, system-ui, sans-serif";
    ctx.fillText("mizzion.app", bx + 36, h - pad - 36);

    setReady(true);
  }, [streak, totalKm, fatigue, lastRunKm]);

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = "mizzion-share.png";
    link.href = c.toDataURL("image/png");
    link.click();
    onDone?.();
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }}
        aria-label="Share card preview"
      />
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn" onClick={download} disabled={!ready}>
          Download PNG
        </button>
      </div>
    </div>
  );
}

// helpers
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
  fill: string
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function lineH(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
