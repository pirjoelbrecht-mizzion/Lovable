// src/components/CoachChat.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { askCoach, type CoachContext } from "@/ai/coach";
import { load, save } from "@/utils/storage";

export type ChatMessage = { role: "user" | "coach"; text: string; ts: number };

function useChatHistory(key = "coach.history") {
  const [history, setHistory] = useState<ChatMessage[]>(() =>
    load<ChatMessage[]>(key, [])
  );
  useEffect(() => save(key, history), [key, history]);
  function add(m: ChatMessage) {
    setHistory((h) => [...h, m]);
  }
  function clear() {
    setHistory([]);
  }
  return { history, add, clear };
}

export function CoachFloatingButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      className="btn"
      onClick={onOpen}
      aria-label="Open Coach"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        borderRadius: 999,
        padding: "12px 14px",
        fontWeight: 600,
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      }}
    >
      🧠 Ask Coach
    </button>
  );
}

export default function CoachChat({
  open,
  onClose,
  ctx,
}: {
  open: boolean;
  onClose: () => void;
  ctx?: CoachContext;
}) {
  const { history, add, clear } = useChatHistory();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typingDots, setTypingDots] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Tiny typing animation
  useEffect(() => {
    if (!busy) {
      setTypingDots("");
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % 4;
      setTypingDots(".".repeat(i));
    }, 350);
    return () => clearInterval(t);
  }, [busy]);

  // Scroll to bottom when history changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [history.length, busy]);

  // Keyboard UX
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowUp" && document.activeElement === inputRef.current) {
        // Edit last message
        const lastUser = [...history].reverse().find((m) => m.role === "user");
        if (lastUser) setInput(lastUser.text);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, history]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    add({ role: "user", text: q, ts: Date.now() });
    setBusy(true);
    try {
      const a = await askCoach(q, ctx || {});
      add({ role: "coach", text: a, ts: Date.now() });
    } catch (e: any) {
      add({
        role: "coach",
        text:
          "I couldn’t think for a moment. Try again, or ask me something simpler (e.g., “fatigue this week?”).",
        ts: Date.now(),
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send();
  }

  function copyLastAdvice() {
    const lastCoach = [...history].reverse().find((m) => m.role === "coach");
    if (!lastCoach) return;
    navigator.clipboard.writeText(lastCoach.text).catch(() => {});
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 680, maxWidth: "90vw", maxHeight: "80vh", display: "grid", gridTemplateRows: "auto 1fr auto", gap: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="row" style={{ justifyContent: "space-between" }}>
          <div className="h2">Coach</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={copyLastAdvice} title="Copy last advice">Copy</button>
            <button className="btn" onClick={clear} title="Clear conversation">Clear</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </header>

        <div
          ref={listRef}
          style={{
            overflow: "auto",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 10,
            background: "#121316",
          }}
        >
          {history.length === 0 && (
            <div className="small" style={{ opacity: 0.8 }}>
              Ask me anything. Try: “How should I taper for a 10K?” or “Today felt heavy—what now?”
            </div>
          )}
          {history.map((m, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <div className="small" style={{ color: "var(--muted)" }}>
                {m.role === "user" ? "You" : "Coach"} · {new Date(m.ts).toLocaleTimeString()}
              </div>
              <div>{m.text}</div>
            </div>
          ))}
          {busy && (
            <div>
              <div className="small" style={{ color: "var(--muted)" }}>
                Coach is typing{typingDots}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="row" style={{ gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question… (Enter to send, Esc to close, ↑ to edit last)"
          />
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
