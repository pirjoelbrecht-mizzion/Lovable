// src/components/ShareWeekImage.tsx
import { useState } from "react";
import { loadWeekPlan } from "@/utils/weekPlan";
import { renderWeekPNG } from "@/utils/shareImage";

export default function ShareWeekImage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function share() {
    setMsg("");
    setBusy(true);
    try {
      const plan = loadWeekPlan();
      const blob = await renderWeekPNG(plan);

      // Try to copy to clipboard as image (Chrome/Edge)
      const canClipboard =
        "clipboard" in navigator &&
        typeof (window as any).ClipboardItem !== "undefined";
      if (canClipboard) {
        try {
          const item = new (window as any).ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          setMsg("✅ Copied image to clipboard! You can paste it anywhere.");
        } catch {
          // fallback to download below
          triggerDownload(blob);
          setMsg("Saved PNG. (Clipboard copy not allowed by browser.)");
        }
      } else {
        // fallback: download
        triggerDownload(blob);
        setMsg("Saved PNG to your device.");
      }
    } catch (e: any) {
      setMsg(e?.message || "Could not create image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="btn" onClick={share} disabled={busy}>
        {busy ? "Rendering…" : "Share week as image"}
      </button>
      {msg && <div className="small" style={{ opacity: 0.8 }}>{msg}</div>}
    </div>
  );
}

function triggerDownload(blob: Blob) {
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = URL.createObjectURL(blob);
  a.download = `mizzion-week-${date}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
