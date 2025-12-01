// src/utils/share.ts
import type { DayPlan, LogEntry } from "@/types";

function mkCanvas(w = 900, h = 540) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx, w, h };
}

function downloadCanvasPNG(canvas: HTMLCanvasElement, filename = "share.png") {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function bg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Dark gradient
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0b0b0c");
  g.addColorStop(1, "#16171a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function exportWeekPNG(week: DayPlan[], filename = "week-share.png") {
  const { canvas, ctx, w, h } = mkCanvas();
  bg(ctx, w, h);

  // header
  ctx.fillStyle = "#e7e7ea";
  ctx.font = "700 28px Inter, system-ui, sans-serif";
  ctx.fillText("Mizzion — Weekly Plan", 36, 54);

  ctx.font = "400 16px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#a4a6ad";
  const range =
    week.length > 0
      ? `${week[0].dateISO} → ${week[week.length - 1].dateISO}`
      : "";
  ctx.fillText(range, 36, 78);

  // cards
  const cardW = 260;
  const cardH = 110;
  const cols = 3;
  const x0 = 36;
  const y0 = 110;
  const gap = 18;

  week.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = x0 + col * (cardW + gap);
    const y = y0 + row * (cardH + gap);

    // card bg
    ctx.fillStyle = "#1f2024";
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();

    // text
    ctx.fillStyle = "#e7e7ea";
    ctx.font = "600 16px Inter, system-ui, sans-serif";
    ctx.fillText(d.title || "—", x + 14, y + 32);

    ctx.fillStyle = "#a4a6ad";
    ctx.font = "400 13px Inter, system-ui, sans-serif";
    ctx.fillText(d.dateISO, x + 14, y + 54);
    const meta =
      (d.km ? `${d.km} km` : "—") + (d.notes ? ` • ${d.notes}` : "");
    ctx.fillText(meta, x + 14, y + 74);
  });

  // footer
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  ctx.fillText("mizzion.run", 36, h - 22);

  downloadCanvasPNG(canvas, filename);
}

export function exportLastRunPNG(
  logs: LogEntry[],
  filename = "last-run.png"
) {
  const last = [...logs].sort((a, b) =>
    a.dateISO < b.dateISO ? 1 : -1
  )[0];
  const { canvas, ctx, w, h } = mkCanvas();
  bg(ctx, w, h);

  ctx.fillStyle = "#e7e7ea";
  ctx.font = "700 32px Inter, system-ui, sans-serif";
  ctx.fillText("Mizzion — Last Run", 36, 56);

  if (!last) {
    ctx.font = "400 18px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#a4a6ad";
    ctx.fillText("No runs yet. Import or log a run first.", 36, 92);
    return downloadCanvasPNG(canvas, filename);
  }

  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText(`${last.title}`, 36, 100);

  ctx.font = "400 16px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#a4a6ad";
  ctx.fillText(`${last.dateISO} • ${last.km} km`, 36, 128);

  // stat pill
  ctx.fillStyle = "#1f2024";
  roundRect(ctx, 36, 160, w - 72, 120, 16);
  ctx.fill();

  ctx.fillStyle = "#e7e7ea";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("Stats", 52, 188);
  ctx.font = "400 14px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#a4a6ad";
  const stats = [
    `Pace: ${
      last.durationMin ? fmtPace(last.km, last.durationMin) : "—"
    }`,
    `HR avg: ${last.hrAvg ?? "—"} bpm`,
    `Source: ${last.source ?? "Manual"}`,
  ].join("   |   ");
  ctx.fillText(stats, 52, 214);

  downloadCanvasPNG(canvas, filename);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtPace(km: number, min: number) {
  if (!km || !min) return "—";
  const pace = min / km;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}
