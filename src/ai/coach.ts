import { FAQS } from "@/knowledge/faqs";
import { hasLLM, askLLM } from "@/lib/llm";
import {
  reasonWeekly,
  DEFAULT_WEIGHTS,
  type Activity,
  type HealthState,
} from "@/ai/brain";
import { load, save } from "@/utils/storage";
import { DEFAULT_WEIGHTS } from "@/ai/brain";

export type CoachContext = {
  health?: HealthState;
  recent?: Activity[];
  raceWeeks?: number;
  last4WeeksKm?: number[];
  thisWeekPlannedKm?: number;
  userName?: string;
};

// naive retrieval
function retrieveTip(query: string): string | null {
  const q = query.toLowerCase();
  let best = { score: 0, a: "" };
  for (const item of FAQS) {
    const words = (item.tags || item.q.toLowerCase().split(/\W+/)).filter(Boolean);
    const score = words.reduce((acc, w) => acc + (q.includes(w) ? 1 : 0), 0);
    if (score > best.score) best = { score, a: item.a };
  }
  return best.score > 0 ? best.a : null;
}

// simple heuristic workout parser: returns {day,title,desc}
export function parseSuggestionToWorkout(text: string): { day: string; title: string; desc?: string } | null {
  const t = text.toLowerCase();
  const days = ["mon","tue","wed","thu","fri","sat","sun","monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const found = days.find((d)=> t.includes(d));
  const day = found ? (found.slice(0,3) as "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun") : "tue";
  // title guess
  let title = "Easy Z2 Run";
  if (t.includes("tempo")) title = "Tempo Run";
  else if (t.includes("hill")) title = "Hills";
  else if (t.includes("long")) title = "Long Run";
  else if (t.includes("interval")) title = "Intervals";
  return { day, title, desc: text };
}

function rules(query: string, ctx: CoachContext): string | null {
  const q = query.toLowerCase();

  // adaptive weights context
  const weights = load("weights", DEFAULT_WEIGHTS);
  const ai = reasonWeekly({
    recentActivities: ctx.recent || load("recentActivities", []),
    health: ctx.health ?? (load("health", "ok") as HealthState),
    weights,
    raceProximityWeeks: ctx.raceWeeks ?? load("raceWeeks", 8),
    last4WeeksKm: ctx.last4WeeksKm || [40, 46, 52, 48],
    thisWeekPlannedKm: ctx.thisWeekPlannedKm ?? 50,
  });
  save("weights", ai.updatedWeights);

  if (q.includes("fatigue") || q.includes("tired")) {
    if (ai.fatigueScore > 0.7) {
      return "You're showing elevated fatigue (sleep/HRV/RPE signals). Cut ~20% volume, keep Z2, add a rest day, reassess in 3–4 days.";
    }
    if (ai.fatigueScore < 0.3) {
      return "Readiness looks good. Add a light quality element: short hills or controlled tempo. Keep overall intensity ≤20% of volume.";
    }
    return "Balanced signals. Hold plan; bias slightly toward specificity if race ≤8–10 weeks.";
  }

  if (q.includes("taper")) {
    return "Taper guide: 20–40% volume reduction in the final 1–2 weeks, keep a small touch of intensity, prioritize sleep and race fueling rehearsal.";
  }

  if (q.includes("z2") || q.includes("zone 2")) {
    return "Zone 2 builds aerobic base and shifts substrate use toward fat. Keep most of your time here; sprinkle strides or short hills for neuromuscular pop.";
  }

  return null;
}

const SYSTEM_PROMPT =
  "You are Mizzion, an empathetic running coach. Give crisp, actionable advice, 1–2 short paragraphs max, with simple bullet points when helpful. Favor safety, progressive overload, and joy.";

export async function askCoach(query: string, ctx: CoachContext = {}): Promise<string> {
  // 1) rules
  const rule = rules(query, ctx);
  if (rule) return rule;

  // 2) retrieve
  const retrieved = retrieveTip(query);
  if (retrieved && !hasLLM()) return retrieved;

  // 3) LLM
  if (hasLLM()) {
    const contextBlob = JSON.stringify({
      health: ctx.health ?? load("health","ok"),
      raceWeeks: ctx.raceWeeks ?? load("raceWeeks",8),
      weights: load("weights", DEFAULT_WEIGHTS),
    });
    const userMsg = `User: ${query}\n\nContext:${contextBlob}\n\nSeed tip: ${retrieved || "none"}`;
    const res = await askLLM(SYSTEM_PROMPT, userMsg);
    if (res.ok && res.text) return res.text.trim();
  }

  // 4) fallback
  return "Default safe plan: keep most time in Z2, one quality session/week, one longer run, and prioritize sleep/fueling. Ask me anything specific!";
}
