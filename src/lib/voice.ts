// src/lib/voice.ts
// Simple wrappers around Web Speech API for STT (speech → text) and TTS (text → speech)

export type Recognizer = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  isSupported: boolean;
};

export function createRecognizer(
  onResult: (finalText: string) => void,
  lang: string
): Recognizer {
  const SR: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SR) {
    return {
      start() {},
      stop() {},
      abort() {},
      isSupported: false,
    };
  }

  const rec = new SR();
  rec.lang = lang || "en-US";
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let buffer = "";

  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) buffer += r + " ";
      else interim += r;
    }
    // Only fire when we have a final chunk
    const cleaned = (buffer || "").trim();
    if (cleaned) onResult(cleaned);
  };

  return {
    start: () => rec.start(),
    stop: () => rec.stop(),
    abort: () => rec.abort(),
    isSupported: true,
  };
}

export function speak(text: string, lang: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || "en-US";
    window.speechSynthesis.cancel(); // stop previous
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
