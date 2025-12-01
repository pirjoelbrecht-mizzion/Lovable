// src/utils/weekImage.ts
import type { PlanWeek } from "@/types";

export async function downloadWeekPNG(week: PlanWeek, filename = "week.png") {
  const W = 1100;
  const ROW = 130;
  const H = 40 + ROW * 7;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // theme
  const BG = getCss("--bg", "#0b0b0c");
  const CARD = getCss("--card", "#16171a");
  const TEXT = getCss("--text", "#e7e7ea");
  const MUTED = getCss("--muted", "#a4a6ad");
  const LINE = getCss("--line", "#26272b");

  // bg
  ctx.fillStyle = BG; ctx.fillRect(0,0,W,H);

  // title
  ctx.fillStyle = TEXT;
  ctx.font = "bold 18px Inter, system-ui, sans-serif";
  ctx.fillText("Mizzion — This Week", 20, 28);

  // rows
  week.forEach((d, i) => {
    const y = 40 + i * ROW;
    // card
    roundRect(ctx, 20, y, W-40, ROW-10, 12, CARD, LINE);

    // date
    ctx.fillStyle = TEXT;
    ctx.font = "bold 14px Inter, system-ui, sans-serif";
    ctx.fillText(new Date(d.dateISO).toLocaleDateString(), 36, y+26);

    // sessions
    ctx.font = "12px Inter, system-ui, sans-serif";
    let lineY = y + 50;
    if (d.sessions.length === 0) {
      ctx.fillStyle = MUTED;
      ctx.fillText("—", 36, lineY);
    } else {
      d.sessions.forEach((s) => {
        ctx.fillStyle = TEXT;
        const txt = `${s.title}${s.km ? ` — ${s.km} km` : ""}${s.notes ? ` • ${s.notes}` : ""}`;
        wrapText(ctx, txt, 36, lineY, W-80, 16, TEXT, MUTED);
        lineY += 32;
      });
    }
  });

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
}

function getCss(varName: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill: string, stroke: string
) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxWidth: number, lineHeight: number,
  color: string, muted: string
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  ctx.fillStyle = color;
  words.forEach((w, idx) => {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxWidth && idx > 0) {
      ctx.fillText(line, x, yy);
      line = w + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, x, yy);
}
