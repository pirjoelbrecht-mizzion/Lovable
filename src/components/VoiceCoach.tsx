// src/components/VoiceCoach.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canSTT, canTTS, speak, stopTTS, startSTT } from "@/lib/speech";
import { askCoach } from "@/ai/coach";
import { load } from "@/utils/storage";
import type { Activity, HealthState } from "@/ai/brain";

type Msg = { role: "you" | "coach"; text: string };

const LANG_LABELS: Record<string, string> = {
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "es-ES": "Español",
  "it-IT": "Italiano",
  "pt-PT": "Português",
  "sv-SE": "Svenska",
  "fi-FI": "Suomi",
  "et-EE": "Eesti",
  "lv-LV": "Latviešu",
  "lt-LT": "Lietuvių",
  "zh-CN": "中文 (简体)",
  "ja-JP": "日本語",
};

export default function VoiceCoach() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [input, setInput] = useState("");
  const [log, setLog] = useState<Msg[]>([]);

  // 🔄 language now stays in sync with Settings
  const [lang, setLang] = useState<string>(
    load("lang", navigator.language || "en-US")
  );

  // Refresh language whenever the panel opens (instant reflect)
  useEffect(() => {
    if (open) setLang(load("lang", navigator.language || "en-US"));
  }, [open]);

  // Also react to cross-tab/storage updates
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lang" && e.newValue) {
        try {
          // stored via JSON.stringify in save()
          setLang(JSON.parse(e.newValue));
        } catch {
          setLang(e.newValue);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const stopRef = useRef<null | (() => void)>(null);

  // Pull a bit of context for rule answers
  const ctx = useMemo(() => {
    const health = load<HealthState>("health", "ok");
    const raceWeeks = load<number>("raceWeeks", 8);
    const recent = load<Activity[]>("recentActivities", []);
    return {
      health,
      raceWeeks,
      recent,
      thisWeekPlannedKm: 50,
      last4WeeksKm: [40, 46, 52, 48],
    };
  }, []);

  // Ensure voices are loaded (Chrome loads async)
  useEffect(() => {
    if (!canTTS()) return;
    const noop = () => {};
    window.speechSynthesis.onvoiceschanged = noop;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === noop) {
        window.speechSynthesis.onvoiceschanged = null as any;
      }
    };
  }, []);

  // Keyboard: V toggle, Space hold-to-talk
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "v") setOpen((o) => !o);
      if (e.key === " ") {
        if (!open) setOpen(true);
        e.preventDefault();
        if (!listening) startMic();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " " && listening) stopMic();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [open, listening]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMic = useCallback(() => {
    if (!canSTT()) {
      appendCoach("Speech recognition is not available in this browser. You can type instead.");
      return;
    }
    if (speaking) stopTTS();
    setInterim("");
    setListening(true);
    const ctl = startSTT(
      {
        onInterim: setInterim,
        onFinal: (finalText) => {
          setListening(false);
          setInterim("");
          if (finalText) {
            setLog((l) => [...l, { role: "you", text: finalText }]);
            ask(finalText);
          }
        },
        onError: (err) => {
          setListening(false);
          setInterim("");
          appendCoach(`Mic error: ${err}. Try again or type your question.`);
        },
        onEnd: () => setListening(false),
      },
      lang // 👈 use current language for STT
    );
    stopRef.current = ctl.stop;
  }, [speaking, lang]);

  const stopMic = useCallback(() => {
    stopRef.current?.();
    setListening(false);
  }, []);

  function appendCoach(text: string) {
    setLog((l) => [...l, { role: "coach", text }]);
  }

  async function ask(q: string) {
    try {
      const res = await askCoach(q, ctx);
      appendCoach(res);
      if (canTTS()) {
        setSpeaking(true);
        speak(res, { rate: 1.0, lang }); // 👈 TTS in current language
        setTimeout(() => setSpeaking(false), Math.min(6000, Math.max(1500, res.length * 20)));
      }
    } catch {
      appendCoach("Sorry — I couldn’t think for a moment. Try again.");
    }
  }

  function onSend() {
    const q = input.trim();
    if (!q) return;
    setLog((l) => [...l, { role: "you", text: q }]);
    setInput("");
    ask(q);
  }

  const langLabel = LANG_LABELS[lang] || lang;

  return (
    <>
      <button
        className="btn primary"
        title="Voice Coach (press V to toggle, Space to hold-to-talk)"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          borderRadius: 999,
          padding: "12px 14px",
          zIndex: 50,
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✖" : "🎤"}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "fixed",
            right: 16,
            bottom: 76,
            width: 360,
            maxHeight: 480,
            overflow: "auto",
            zIndex: 40,
            border: "1px solid var(--line)",
          }}
        >
          <div className="h2">Coach</div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {log.map((m, i) => (
              <div
                key={i}
                className="small"
                style={{
                  background: m.role === "you" ? "#1f2024" : "#141519",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <b>{m.role === "you" ? "You" : "Coach"}:</b> {m.text}
              </div>
            ))}
            {interim && (
              <div className="small" style={{ opacity: 0.7 }}>
                <b>You:</b> {interim} …
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button
              className="btn"
              onMouseDown={startMic}
              onMouseUp={stopMic}
              onTouchStart={startMic}
              onTouchEnd={stopMic}
              disabled={listening}
              title="Hold to talk (Space bar also works)"
            >
              {listening ? "🎙️ Listening…" : "🎙️ Hold to talk"}
            </button>
            <button
              className="btn"
              onClick={() => {
                stopTTS();
                setSpeaking(false);
              }}
              disabled={!speaking}
              title="Stop voice"
            >
              ⏹ Stop voice
            </button>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <input
              placeholder="Ask the coach…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <button className="btn primary" onClick={onSend}>
              Send
            </button>
          </div>

          <p className="small" style={{ marginTop: 6, opacity: 0.7 }}>
            Language: <code>{langLabel}</code> • Press <b>V</b> to open/close. Hold <b>Space</b> to
            talk. Coach auto-reads replies.
          </p>
        </div>
      )}
    </>
  );
}
