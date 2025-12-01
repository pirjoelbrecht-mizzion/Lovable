import { useEffect, useState } from "react";

// super-light event bus
type ToastMsg = { id: number; text: string };
let listeners: ((t: ToastMsg) => void)[] = [];
let idSeq = 1;

export function toast(text: string) {
  const msg = { id: idSeq++, text };
  listeners.forEach(fn => fn(msg));
}

// Optional confetti dots (CSS-only)
function ConfettiDots() {
  return (
    <div className="confetti">
      {Array.from({ length: 18 }).map((_, i) => (
        <i key={i} style={{ "--i": String(i) } as any} />
      ))}
    </div>
  );
}

// Host that you mount once (e.g., inside App layout)
export default function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const fn = (t: ToastMsg) => {
      setItems(prev => [...prev, t]);
      setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== t.id));
      }, 2600);
    };
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(x => x !== fn);
    };
  }, []);

  return (
    <div className="toast-wrap">
      {items.map(t => (
        <div key={t.id} className="toast">
          <ConfettiDots />
          {t.text}
        </div>
      ))}
    </div>
  );
}
