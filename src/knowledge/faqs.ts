// src/knowledge/faqs.ts
export type QA = { q: string; a: string; tags?: string[] };

export const faqs: QA[] = [
  {
    q: "What is Zone 2 and why do runners use it?",
    a: "Zone 2 is easy aerobic running—conversational pace—where the body burns a higher % of fat. It’s foundational for endurance and recovery.",
    tags: ["z2", "fat burn", "endurance"],
  },
  {
    q: "How should I fuel long runs?",
    a: "Practice 30–60g carbs per hour (up to ~90g with gut training), sip electrolytes, and don’t try new products on race day.",
    tags: ["fuel", "long run", "carbs"],
  },
  {
    q: "How much should I run each week?",
    a: "Consistent volume beats spikes. Add 5–10% per week, insert a down week every 3–5 weeks, and keep most miles easy.",
    tags: ["volume", "progression"],
  },
  {
    q: "How do I taper for a race?",
    a: "Cut volume ~20–40% in the final 1–2 weeks, keep a small touch of intensity, increase sleep, and rehearse race fuel.",
    tags: ["taper", "race"],
  },
  {
    q: "What if I feel a niggle or mild injury?",
    a: "Reduce intensity or rest. If pain changes your form, stop. Add gentle mobility and consider a professional if it persists.",
    tags: ["injury", "recovery"],
  },
];

// Back-compat alias for any files importing { FAQS }:
export const FAQS = faqs;
