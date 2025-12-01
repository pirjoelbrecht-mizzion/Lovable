import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { askCoach } from "@/ai/coach";
import { load, save } from "@/utils/storage";

type Msg = { role: "user" | "coach" | "system"; text: string; ts: number; imageDataUrl?: string };

const HIST_KEY = "coach:history";

export default function FloatingCoach() {
  const t = useT();

  // UI state
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Msg[]>(load<Msg[]>(HIST_KEY, []));
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);

  // speech
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // focus & scroll to bottom on open / new message
  useEffect(() => {
    if (open) {
      const tmr = setTimeout(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
      }, 20);
      return () => clearTimeout(tmr);
    }
  }, [open, history.length]);

  // persist history
  useEffect(() => {
    save(HIST_KEY, history);
  }, [history]);

  function push(msg: Msg) {
    setHistory((h) => [...h, msg]);
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;

    // append user message
    const userMsg: Msg = { role: "user", text: q, ts: Date.now(), imageDataUrl };
    push(userMsg);

    setBusy(true);
    setInput("");
    setImageDataUrl(undefined);

    try {
      // Attach tiny hint for image if any (just contextual text)
      const decorated = imageDataUrl
        ? `${q}\n\n[Note: user attached an image; describe what you can infer at a high level. If irrelevant, ignore.]`
        : q;

      const answer = await askCoach(decorated, {});
      push({ role: "coach", text: answer, ts: Date.now() });
    } catch {
      push({ role: "system", text: t("coach.error_generic"), ts: Date.now() });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send();
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
    if (e.key === "ArrowUp" && !input) {
      // quick edit last user message
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      if (lastUser) setInput(lastUser.text);
    }
  }

  // Image attach
  function triggerAttach() {
    fileRef.current?.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(f);
    e.target.value = "";
  }
  function clearImage() {
    setImageDataUrl(undefined);
  }

  // Speech input (Web Speech API)
  function canSpeech() {
    return typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }
  function startStopListen() {
    if (!canSpeech()) {
      push({ role: "system", text: t("coach.mic_not_supported"), ts: Date.now() });
      return;
    }
    if (!listening) {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec: SpeechRecognition = new SR();
      rec.lang = "en-US"; // simple default; can map from current UI lang later
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (evt: SpeechRecognitionEvent) => {
        let txt = "";
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          txt += evt.results[i][0].transcript;
        }
        setInput(txt);
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };
      rec.onerror = () => {
        setListening(false);
        recRef.current = null;
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } else {
      recRef.current?.stop();
      setListening(false);
      recRef.current = null;
    }
  }

  // Minimal bubble
  function Bubble({ m }: { m: Msg }) {
    const isUser = m.role === "user";
    return (
      <div
        className="card"
        style={{
          padding: "10px 12px",
          margin: "8px 0",
          background: isUser ? "#1e1f25" : "var(--card)",
          borderColor: "var(--line)",
        }}
      >
        <div className="small" style={{ opacity: 0.8, marginBottom: 4 }}>
          {isUser ? t("coach.you") : m.role === "coach" ? t("coach.name") : t("coach.system")}
        </div>
        {m.imageDataUrl && (
          <img
            src={m.imageDataUrl}
            alt="attached"
            style={{ width: "100%", borderRadius: 8, marginBottom: 8 }}
          />
        )}
        <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
      </div>
    );
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        aria-label={t("coach.open")}
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--brand)",
          color: "#000",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(0,0,0,.35)",
          fontWeight: 700,
        }}
      >
        🤖
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("coach.title")}
          style={{
            position: "fixed",
            right: 20,
            bottom: 92,
            zIndex: 60,
            width: 380,
            maxWidth: "calc(100% - 40px)",
          }}
        >
          <div className="card" style={{ padding: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <b>{t("coach.title")}</b>
              <div className="small">{t("coach.close_hint")}</div>
            </div>

            <div
              ref={scrollRef}
              style={{
                maxHeight: 280,
                overflow: "auto",
                marginTop: 8,
                paddingRight: 4,
              }}
            >
              {history.map((m, i) => (
                <Bubble key={m.ts + ":" + i} m={m} />
              ))}
              {busy && (
                <div className="small" style={{ opacity: 0.7, marginTop: 6 }}>
                  {t("coach.typing")}
                </div>
              )}
            </div>

            {imageDataUrl && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <img
                  src={imageDataUrl}
                  alt="preview"
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                />
                <button className="btn" onClick={clearImage}>{t("coach.remove_image")}</button>
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "stretch" }}>
              <input
                ref={inputRef}
                type="text"
                placeholder={t("coach.placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={triggerAttach} title={t("coach.attach_image")}>📎</button>
              <button className="btn" onClick={startStopListen} title={t("coach.mic_title")}>
                {listening ? t("coach.mic_stop") : t("coach.mic_start")}
              </button>
              <button className="btn primary" onClick={() => send()} disabled={busy}>
                {busy ? t("coach.sending") : t("btn.send")}
              </button>
              <button className="btn" onClick={() => setOpen(false)}>{t("btn.close")}</button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onFile}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
