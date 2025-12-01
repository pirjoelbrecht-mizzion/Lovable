// src/components/CoachBubble.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n";
import { askCoach } from "@/ai/coach";
import { load, save } from "@/utils/storage";
import { toast } from "@/components/ToastHost";

type Msg = { role: "you" | "coach"; text: string };

export default function CoachBubble() {
  const t = useT();
  const [open, setOpen] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  // Esc closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function send(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setMsgs((m) => [...m, { role: "you", text: q }]);
    setInput("");
    setLoading(true);
    askCoach(q)
      .then((answer) => {
        setMsgs((m) => [...m, { role: "coach", text: answer }]);
      })
      .catch(() => {
        setMsgs((m) => [
          ...m,
          { role: "coach", text: t("coach.error_generic", "Sorry, I ran into a problem.") },
        ]);
      })
      .finally(() => setLoading(false));
  }

  function useAdvice() {
    const last = [...msgs].reverse().find((m) => m.role === "coach");
    if (!last) {
      toast(t("coach.error_generic", "Sorry, I ran into a problem."), "error");
      return;
    }
    const inbox = { text: last.text, createdAt: Date.now() };
    save("planner:inbox", inbox);
    toast(t("coach.sent_to_planner", "Sent to Planner inbox."), "success");
  }

  return (
    <>
      {/* Floating head */}
      <button
        aria-label={t("coach.open", "Open Coach")}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--primary)",
          color: "var(--bg)",
          border: "none",
          fontWeight: 700,
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
          zIndex: 70,
          cursor: "pointer",
        }}
      >
        🤖
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={boxRef}
          style={{
            position: "fixed",
            right: 18,
            bottom: 84,
            width: 340,
            maxHeight: "60vh",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
            zIndex: 70,
          }}
        >
          <div className="row" style={{ padding: 10, alignItems: "center" }}>
            <div className="h2" style={{ margin: 0 }}>
              {t("coach.window_title", "Coach")}
            </div>
            <div className="small" style={{ marginLeft: "auto", color: "var(--muted)" }}>
              {loading ? t("coach.typing", "Coach is typing…") : t("coach.ready", "Coach ready")}
            </div>
            <button className="btn" style={{ marginLeft: 6 }} onClick={() => setOpen(false)}>
              {t("coach.close", "Close")}
            </button>
          </div>

          <div
            style={{
              padding: 10,
              overflowY: "auto",
              display: "grid",
              gap: 8,
              background: "var(--bg)",
            }}
          >
            {msgs.length === 0 && (
              <div className="small" style={{ color: "var(--muted)" }}>
                {t("coach.welcome", "Hi! I’m your running coach. Ask me anything.")}
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className="card"
                style={{
                  background: m.role === "you" ? "var(--card)" : "var(--card)",
                  borderLeft: m.role === "you" ? "4px solid var(--primary)" : "4px solid #8884",
                  paddingLeft: 8,
                }}
              >
                <div className="small" style={{ color: "var(--muted)" }}>
                  {m.role === "you" ? t("coach.you", "You") : t("coach.coach", "Coach")}
                </div>
                <div className="small">{m.text}</div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="row" style={{ padding: 10, gap: 6 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("coach.placeholder", "Type your question…")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn" disabled={loading}>
              {t("coach.send", "Send")}
            </button>
            <button type="button" className="btn" onClick={useAdvice} disabled={loading}>
              {t("coach.use_advice", "Use this advice")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}