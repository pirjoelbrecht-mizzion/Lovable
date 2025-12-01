// src/ui/quest/colors.ts
import type { SessionKind } from "@/ui/icons/WorkoutIcon";
export function colorFor(kind: SessionKind) {
  return {
    easy: "var(--bubble-easy)",
    long: "var(--bubble-long)",
    intervals: "var(--bubble-intervals)",
    hills: "var(--bubble-hills)",
    strength: "var(--bubble-strength)",
    cross: "var(--bubble-cross)",
    recovery: "var(--bubble-recovery)",
    rest: "var(--bubble-rest)",
  }[kind];
}