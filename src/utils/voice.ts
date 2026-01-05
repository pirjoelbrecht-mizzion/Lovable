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

