// src/utils/voice.ts
export function hasSpeechRecognition() {
  return typeof window !== "undefined" &&
    (window as any).webkitSpeechRecognition;
}

export function startDictation(onResult: (text: string) => void, onEnd?: () => void) {
  const W: any = window as any;
  const Rec = W.webkitSpeechRecognition;
  if (!Rec) return { stop() {} };

  const rec = new Rec();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = (localStorage.getItem("lang") || "en").startsWith("de")
    ? "de-DE"
    : (localStorage.getItem("lang") || "en").startsWith("es")
    ? "es-ES"
    : (localStorage.getItem("lang") || "en").startsWith("et")
    ? "et-EE"
    : "en-US";

  let finalText = "";
  rec.onresult = (e: SpeechRecognitionEvent) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    onResult((finalText + " " + interim).trim());
  };
  rec.onend = () => onEnd && onEnd();
  rec.start();

  return { stop: () => rec.stop() };
}

// ----- Speech Synthesis (TTS) -----
export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string) {
  try {
    if (!canSpeak()) return;
    const u = new SpeechSynthesisUtterance(text);
    const lang = localStorage.getItem("lang") || "en";
    u.lang = lang === "de" ? "de-DE" : lang === "es" ? "es-ES" : lang === "et" ? "et-EE" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

2) 
src/components/ChatBox.tsx
 (replace)
// src/components/ChatBox.tsx
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { askCoach } from "@/ai/coach";
import { load, save } from "@/utils/storage";
import { hasSpeechRecognition, startDictation, canSpeak, speak } from "@/utils/voice";
import { toast } from "@/components/ToastHost";

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatBox() {
  const t = useT();
  const [open, setOpen] = useState<boolean>(load("ui:chatOpen", false));
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(load<Msg[]>("coach:chat", [
    { role: "assistant", text: t("coach.welcome", "Hi! I’m your running coach. Ask me anything.") }
  ]));
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const stopRef = useRef<{ stop(): void } | null>(null);

  useEffect(() => { save("ui:chatOpen", open); }, [open]);
  useEffect(() => { save("coach:chat", msgs); }, [msgs]);

  // keyboard: Esc to close, Enter to send, ↑ to edit last
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const answer = await askCoach(q, {
        // light context (these are already persisted elsewhere)
        health: load("health", "ok"),
        raceWeeks: load("raceWeeks", 8),
        thisWeekPlannedKm: 50,
        last4WeeksKm: [40,46,52,48],
      });
      setMsgs(m => [...m, { role: "assistant", text: answer }]);

      // store a “last suggestion” so Planner can pick it up
      // super-simple: parse the first line into a session title
      const first = answer.split("\n").find(Boolean) || answer.slice(0, 120);
      save("planner:inboxSession", { title: first, notes: answer });

      if (canSpeak()) speak(answer);
    } catch (e:any) {
      toast(e?.message || t("coach.error", "Coach is unavailable."), "error");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key === "ArrowUp" && !input) {
      // edit last user message quickly
      const lastUser = [...msgs].reverse().find(m => m.role === "user");
      if (lastUser) setInput(lastUser.text);
    }
  }

  function toggleMic() {
    if (listening) {
      stopRef.current?.stop();
      setListening(false);
      return;
    }
    if (!hasSpeechRecognition()) {
      toast(t("coach.mic_unavailable", "Voice input not supported in this browser."), "warn");
      return;
    }
    const stopper = startDictation((txt) => setInput(txt), () => setListening(false));
    stopRef.current = stopper;
    setListening(true);
  }

  // floating button + panel
  return (
    <>
      {/* Floating opener */}
      {!open && (
        <button
          className="btn primary"
          style={{
            position: "fixed", right: 16, bottom: 16, zIndex: 60,
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)"
          }}
          onClick={() => setOpen(true)}
          aria-label={t("coach.open", "Open coach")}
        >
          🤖 {t("coach.ask", "Ask Coach")}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="card"
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            width: 380,
            maxWidth: "92vw",
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            zIndex: 70,
          }}
        >
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="h2">{t("coach.title", "AI Coach")}</div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn" onClick={toggleMic}>
                {listening ? t("coach.stop_mic", "Stop") : t("coach.mic", "Mic")}
              </button>
              <button className="btn" onClick={() => setOpen(false)} title="Esc">
                {t("coach.close", "Close")}
              </button>
            </div>
          </div>

          <div style={{ overflow: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} className="small" style={{ margin: "6px 0" }}>
                <b>{m.role === "user" ? t("coach.you","You") : "Coach"}:</b> {m.text}
              </div>
            ))}
            {busy && <div className="small">{t("coach.typing","Coach is typing")}…</div>}
          </div>

          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("coach.placeholder", "Ask about taper, fatigue, hills…")}
            style={{ marginTop: 8 }}
          />
          <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
            <div className="small">{t("coach.hint", "Enter to send • Esc to close • ↑ to edit last")}</div>
            <button className="btn primary" onClick={send} disabled={busy || !input.trim()}>
              {t("coach.send","Send")}
            </button>
          </div>

          <hr />

          {/* Use advice → Planner inbox */}
          <button
            className="btn"
            onClick={() => {
              const last = [...msgs].reverse().find(m => m.role === "assistant");
              if (!last) return;
              const first = last.text.split("\n").find(Boolean) || last.text.slice(0,120);
              save("planner:inboxSession", { title: first, notes: last.text });
              toast(t("coach.sent_to_planner","Sent to Planner inbox."), "success");
            }}
          >
            {t("coach.use_advice","Use this advice")}
          </button>
        </div>
      )}
    </>
  );
}
