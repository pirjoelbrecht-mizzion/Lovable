// src/ui/icons/WorkoutIcon.tsx
import { Dumbbell, Mountain, Wind, Moon, Sunrise, Activity, HeartPulse, Timer } from "lucide-react";

export type SessionKind =
  | "easy"
  | "long"
  | "intervals"
  | "hills"
  | "strength"
  | "cross"
  | "recovery"
  | "rest";

export function kindFromTitle(title: string): SessionKind {
  const t = title.toLowerCase();
  if (t.includes("rest")) return "rest";
  if (t.includes("recovery")) return "recovery";
  if (t.includes("interval") || t.includes("tempo")) return "intervals";
  if (t.includes("hill")) return "hills";
  if (t.includes("long")) return "long";
  if (t.includes("strength") || t.includes("gym")) return "strength";
  if (t.includes("cross")) return "cross";
  return "easy";
}

export function WorkoutIcon({ kind, size = 18 }: { kind: SessionKind; size?: number }) {
  switch (kind) {
    case "easy":       return <Sunrise width={size} height={size} />;
    case "long":       return <Timer width={size} height={size} />;
    case "intervals":  return <Activity width={size} height={size} />;
    case "hills":      return <Mountain width={size} height={size} />;
    case "strength":   return <Dumbbell width={size} height={size} />;
    case "cross":      return <Wind width={size} height={size} />;
    case "recovery":   return <Moon width={size} height={size} />;
    case "rest":       return <HeartPulse width={size} height={size} />;
  }
}
