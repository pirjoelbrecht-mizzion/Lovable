import { useEffect, useMemo, useRef, useState } from "react";
import { useLang, useT } from "@/i18n";
import { askCoach } from "@/ai/coach";
import { load } from "@/utils/storage";

type Msg = { role: "user" | "assistant"; text: string };

export default function CoachFab() {
  const t = useT();
  const { lang } = useLang();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        t("coach.welcome", "Hey! I’m your Mizzion coach. Ask me about today's run, fatigue, Z2, taper…"),
    },
  ]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      // ↑ edit last message (optional)
      if (e.key === "ArrowUp" && !input) {
        const lastUser = [...msgs].reverse().find(m => m.role === "user");
        if (lastUser) setInput(lastUser.text);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, input, msgs]);

  // Simple context for better answers (from local state)
  const ctx = useMemo(() => {
    return {
      health: load<"ok" | "returning" | "sick">("health", "ok"),
      recent: load<any[]>("recentActivities", []),
      raceWeeks: load<number>("raceWeeks", 8),
      last4WeeksKm: [40, 46, 52, 48],
      thisWeekPlannedKm: 50,
      userName: load<string>("userName", "Runner"),
    };
  }, [open]); // refresh when opened

  async function send() {
    if (!input.trim() || busy) return;
    const q = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const answer = await askCoach(q, ctx);
      setMsgs((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: t("coach.error", "Hmm, I couldn’t think for a second—try again!") },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Auto-scroll chat
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, open]);

  return (
    <>
      {/* Floating button (“head”) */}
      <button
        className="coach-fab"
        aria-label={t("coach.open", "Open Coach")}
        onClick={() => setOpen(true)}
        title={t("coach.open", "Open Coach")}
      >
        🧠
      </button>

      {/* Panel */}
      {open && (
        <div className="coach-panel">
          <div className="coach-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <b>{t("coach.title", "Coach")}</b>
              <span className="small" style={{ opacity: 0.7 }}>
                • {t("coach.lang", "Language")}: {lang.toUpperCase()}
              </span>
            </div>
            <button className="btn" onClick={() => setOpen(false)} aria-label={t("coach.close", "Close")}>
              ✕
            </button>
          </div>

          <div className="coach-body">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`coach-msg ${m.role === "user" ? "me" : "bot"}`}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {m.text}
              </div>
            ))}
            {busy && <div className="coach-typing">{t("coach.typing", "Coach is typing")}…</div>}
            <div ref={endRef} />
          </div>

          <div className="coach-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("coach.placeholder", "Ask about Z2, fatigue, taper…")}
              rows={2}
            />
            <button className="btn primary" disabled={busy || !input.trim()} onClick={send}>
              {t("coach.send", "Send")}
            </button>
          </div>

          <div className="small" style={{ opacity: 0.7, marginTop: 6 }}>
            {t("coach.hints", "Hints: “How much Z2 this week?”, “I feel tired—reduce?”  Esc to close.")}
          </div>
        </div>
      )}
    </>
  );
}
