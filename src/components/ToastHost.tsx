// src/components/ToastHost.tsx
import { useEffect, useRef, useState } from "react";

type ToastKind = "info" | "success" | "warn" | "error";
type ToastItem = { id: number; msg: string; kind: ToastKind };

declare global {
  interface Window {
    __toastBus?: EventTarget;
    __lastToast?: { msg: string; t: number };
  }
}

// A tiny event bus shared across the app (singleton on window)
const bus = (window.__toastBus ??= new EventTarget());

let _id = 1;
export function toast(msg: string, kind: ToastKind = "info") {
  // De-dupe identical messages within 900ms
  const now = Date.now();
  const last = window.__lastToast;
  if (last && last.msg === msg && now - last.t < 900) return;
  window.__lastToast = { msg, t: now };

  bus.dispatchEvent(
    new CustomEvent("toast", { detail: { id: _id++, msg, kind } })
  );
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent).detail as ToastItem;
      setItems((prev) => [...prev, detail]);

      // auto-remove after 2400ms
      const to = window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== detail.id));
        timers.current.delete(detail.id);
      }, 2400);
      timers.current.set(detail.id, to);
    }
    bus.addEventListener("toast", onToast);
    return () => {
      bus.removeEventListener("toast", onToast);
      // cleanup any pending timers
      timers.current.forEach((to) => clearTimeout(to));
      timers.current.clear();
    };
  }, []);

  if (!items.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        display: "grid",
        gap: 8,
        zIndex: 9999,
      }}
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            background:
              t.kind === "success"
                ? "#0f5132"
                : t.kind === "warn"
                ? "#664d03"
                : t.kind === "error"
                ? "#5c2b29"
                : "#1f2024",
            color: "white",
            border:
              t.kind === "success"
                ? "1px solid #198754"
                : t.kind === "warn"
                ? "1px solid #d3a400"
                : t.kind === "error"
                ? "1px solid #dc3545"
                : "1px solid #2a2b30",
            borderRadius: 10,
            padding: "10px 12px",
            boxShadow: "0 6px 20px rgba(0,0,0,.3)",
            minWidth: 220,
            maxWidth: 320,
            fontSize: 13,
          }}
          role="status"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
