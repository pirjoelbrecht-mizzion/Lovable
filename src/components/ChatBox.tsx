// src/components/ChatBox.tsx
import { useEffect, useRef, useState } from "react";
import { askCoach } from "@/ai/coach";
import { useLang, useT } from "@/i18n";
import { createRecognizer, speak, canSpeak } from "@/lib/voice";
import { load, save } from "@/utils/storage";

// Minimal floating chat window with voice in/out
type Msg = { role: "user" | "assistant"; text: string };

export default function ChatBox() {
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState<boolean>(load("ui:chat:open", false));
  const [value, setValue] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(load<Msg[]>("chat:msgs", []));
  const [busy, setBusy] = useState(false);

  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState<boolean>(load("chat:voiceOut", false));
  const [voiceInSupported, setVoiceInSupported] = useState(false);
  const [voiceOutSupported, setVoiceOutSupported] = useState(false);

  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist UI state
  useEffect(() => save("ui:chat:open", open), [open]);
  useEffect(() => save("chat:msgs", msgs), [msgs]);
  useEffect(() => save("chat:voiceOut", voiceOut), [voiceOut]);

  // Feature detection
  useEffect(() => {
    const r = createRecognizer(
      () => {
        /* we only use final text in onend */
      },
      langToBcp47(lang)
    );
    setVoiceInSupported(r.isSupported);
    setVoiceOutSupported(canSpeak());
    recRef.current = r;

    return () => {
      try {
        r.abort();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Key handlers (Esc to close; Enter to send)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === "Enter" && (e.target as HTMLElement)?.tagName === "INPUT") {
        e.preventDefault();
        send();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, value, busy]); // eslint-disable-line

  function append(role: Msg["role"], text: string) {
    setMsgs((m) => [...m, { role, text }]);
  }

  async function send(fromMic?: boolean) {
    if (busy) return;
    const q = value.trim();
    if (!q) return;

    setBusy(true);
    append("user", q);
    setValue("");

    try {
      const reply = await askCoach(q, {
        // you can pass more context here
      });
      append("assistant", reply);

      if (voiceOut && canSpeak()) {
        speak(reply, langToBcp47(lang));
      }
    } catch (e: any) {
      append("assistant", t("coach.error_generic", "Sorry, I ran into a problem."));
    } finally {
      setBusy(false);
      if (!fromMic) inputRef.current?.focus();
    }
  }

  // Voice in/out handlers
  async function toggleMic() {
    if (!voiceInSupported) return;
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {}
      setListening(false);
    } else {
      const chunks: string[] = [];
      const r = createRecognizer((finalText) => {
        if (finalText) chunks.push(finalText);
      }, langToBcp47(lang));
      recRef.current = r;
      setListening(true);

      // When recognition ends, put text into box and auto-send
      const handleEnd = () => {
        setListening(false);
        const text = chunks.join(" ").trim();
        if (text) {
          setValue(text);
          // Auto-send on mic end:
          setTimeout(() => send(true), 50);
        }
        (r as any).onend = null;
      };

      (r as any).onend = handleEnd;
      try {
        r.start();
      } catch {
        setListening(false);
      }
    }
  }

  function langToBcp47(code: string) {
    // very light mapping; extend as needed
    switch (code) {
      case "et":
        return "et-EE";
      case "de":
        return "de-DE";
      case "es":
        return "es-ES";
      case "fr":
        return "fr-FR";
      case "it":
        return "it-IT";
      default:
        return "en-US";
    }
  }

  // Floating FAB that opens the chat
  if (!open) {
    return (
      <button
        className="btn primary"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          borderRadius: 999,
          padding: "12px 16px",
        }}
        aria-label={t("coach.open", "Open Coach")}
      >
        🗣️ {t("coach.talk_to_coach", "Talk to Coach")}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("coach.window_title", "Coach")}
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 360,
        maxWidth: "calc(100% - 32px)",
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,.35)",
        zIndex: 50,
      }}
    >
      {/* header */}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="small" aria-live="polite">
          {busy ? t("coach.typing", "Coach is typing…") : t("coach.ready", "Coach ready")}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {/* Voice out (TTS) toggle */}
          <label className="small" title={t("coach.tts_tip", "Speak replies aloud")}>
            <input
              type="checkbox"
              checked={voiceOut && voiceOutSupported}
              onChange={(e) => setVoiceOut(e.target.checked)}
              disabled={!voiceOutSupported}
              style={{ marginRight: 6 }}
            />
            {t("coach.voice_out", "Voice out")}
          </label>

          {/* Mic toggle */}
          <button
            className="btn"
            onClick={toggleMic}
            disabled={!voiceInSupported}
            title={
              voiceInSupported
                ? listening
                  ? t("coach.stop_listening", "Stop")
                  : t("coach.start_listening", "Speak")
                : t("coach.mic_not_supported", "Mic not supported")
            }
          >
            {listening ? "⏹️" : "🎤"}
          </button>

          {/* close */}
          <button
            className="btn"
            onClick={() => setOpen(false)}
            title={t("coach.close_esc", "Close (Esc)")}
            aria-label={t("coach.close", "Close")}
          >
            ✖
          </button>
        </div>
      </div>

      {/* transcript */}
      <div
        style={{
          marginTop: 8,
          height: 220,
          overflow: "auto",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 8,
          background: "#121316",
        }}
      >
        {msgs.length === 0 ? (
          <p className="small" style={{ opacity: 0.7 }}>
            {t("coach.hint", "Ask about training, fatigue, taper, Z2…")}
          </p>
        ) : (
          msgs.map((m, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div className="small" style={{ opacity: 0.7 }}>
                {m.role === "user" ? t("coach.you", "You") : t("coach.coach", "Coach")}
              </div>
              <div>{m.text}</div>
            </div>
          ))
        )}
      </div>

      {/* input row */}
      <div className="row" style={{ marginTop: 8 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("coach.placeholder", "Type your question…")}
          style={{ flex: 1 }}
        />
        <button className="btn primary" onClick={() => send()}>
          {t("coach.send", "Send")}
        </button>
      </div>

      {/* language hint */}
      <div className="small" style={{ marginTop: 6, opacity: 0.7 }}>
        {t("coach.language", "Language")}: {lang.toUpperCase()}
      </div>
    </div>
  );
}
