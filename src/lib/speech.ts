// src/lib/speech.ts
// Minimal wrappers for Web Speech APIs (TTS + STT) with language support.

export function canTTS(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopTTS() {
  if (!canTTS()) return;
  window.speechSynthesis.cancel();
}

function pickVoiceForLang(lang: string): SpeechSynthesisVoice | null {
  if (!canTTS()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1) exact match (e.g., "de-DE")
  const exact = voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase());
  if (exact) return exact;

  // 2) language-only match (e.g., "de")
  const base = lang.split("-")[0];
  const baseMatch = voices.find((v) => v.lang?.toLowerCase().startsWith(base.toLowerCase()));
  if (baseMatch) return baseMatch;

  // 3) fallback to first default or first voice
  return voices.find((v) => v.default) || voices[0] || null;
}

/** Speak text in a given language (BCP-47, e.g., 'en-US', 'de-DE'). */
export function speak(
  text: string,
  opts?: { rate?: number; pitch?: number; lang?: string }
) {
  if (!canTTS()) return;
  stopTTS();
  const u = new SpeechSynthesisUtterance(text);
  if (opts?.lang) {
    u.lang = opts.lang;
    const chosen = pickVoiceForLang(opts.lang);
    if (chosen) u.voice = chosen;
  }
  u.rate = opts?.rate ?? 1.0;
  u.pitch = opts?.pitch ?? 1.0;
  window.speechSynthesis.speak(u);
}

// ---------- Speech To Text ----------
type Rec = typeof window extends any ? any : never;

export function canSTT(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createRecognizer(lang = "en-US") {
  const w = window as any;
  const Ctor: Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

export type STTHandlers = {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
};

export function startSTT(handlers: STTHandlers, lang = "en-US") {
  const rec = createRecognizer(lang);
  if (!rec) {
    handlers.onError?.("Speech recognition not available in this browser.");
    return { stop: () => {} };
  }

  let interim = "";
  rec.onresult = (e: any) => {
    interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i][0]?.transcript ?? "";
      if (e.results[i].isFinal) {
        handlers.onFinal?.(res.trim());
      } else {
        interim += res;
      }
    }
    if (interim) handlers.onInterim?.(interim.trim());
  };
  rec.onerror = (e: any) => handlers.onError?.(e?.error || "stt_error");
  rec.onend = () => handlers.onEnd?.();

  rec.start();
  return { stop: () => rec.stop() };
}
