let ctx: AudioContext | null = null;

// Ensure we have an AudioContext after a user gesture (required on iOS/Safari)
export function ensureAudio() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
}

type Sfx = "success" | "coin" | "alert";

export function playSfx(kind: Sfx = "success") {
  ensureAudio();
  if (!ctx) return;

  // Simple 120ms pluck-chime with quick envelope
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const presets: Record<Sfx, number[]> = {
    success: [880, 1320, 1760], // up arpeggio
    coin:    [660, 990],        // quick two-tone
    alert:   [440, 370],        // down beep
  };
  const freqs = presets[kind];

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  osc.type = "sine";
  osc.frequency.setValueAtTime(freqs[0], now);

  // quick glide through tones
  let t = now;
  const step = 0.06;
  for (let i = 1; i < freqs.length; i++) {
    t += step;
    osc.frequency.exponentialRampToValueAtTime(freqs[i], t);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.28);
}
