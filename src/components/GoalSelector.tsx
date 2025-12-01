// src/components/GoalSelector.tsx
import { useMemo, useState } from "react";
import { toast } from "@/components/ToastHost";

type GoalId =
  | "weight_loss"
  | "5k_pr"
  | "half_marathon"
  | "trail_50k"
  | "ultra_100m"
  | "run_for_calm"
  | "run_for_earth";

type Goal = {
  id: GoalId;
  label: string;
  blurb: string;
  weeklyFocus: string[];
};

const GOALS: Goal[] = [
  {
    id: "weight_loss",
    label: "Weight loss (Z2 bias)",
    blurb: "Consistency + easy Z2 volume, small caloric deficit.",
    weeklyFocus: ["3–5× Z2 runs", "1× hills/strides", "Daily steps target"],
  },
  {
    id: "5k_pr",
    label: "5K Personal Record",
    blurb: "Speed + economy. Mix intervals, hills, and fast finishes.",
    weeklyFocus: ["1× intervals (VO₂)", "1× hills", "2–3× easy Z2", "1× long easy"],
  },
  {
    id: "half_marathon",
    label: "Half Marathon",
    blurb: "Endurance + tempo. Progression long run.",
    weeklyFocus: ["1× tempo/threshold", "3× Z2", "1× long run (progressive)"],
  },
  {
    id: "trail_50k",
    label: "Trail 50K",
    blurb: "Time-on-feet + vert + fueling.",
    weeklyFocus: ["1× vert session", "2–3× Z2 trail", "Back-to-back long (periodic)"],
  },
  {
    id: "ultra_100m",
    label: "100 Mile",
    blurb: "Steady resilience, downhill conditioning, fueling practice.",
    weeklyFocus: ["1× downhill strides", "1× easy mid-long", "Big weekend block"],
  },
  {
    id: "run_for_calm",
    label: "Run for Calm (Mind-Run)",
    blurb: "Mental balance + active recovery.",
    weeklyFocus: ["4× easy Z1–Z2", "Breath cadence", "Mindful cool-downs"],
  },
  {
    id: "run_for_earth",
    label: "Run for Earth",
    blurb: "Eco missions + community runs.",
    weeklyFocus: ["Local trails", "Plogging mission", "Community cleanup run"],
  },
];

export default function GoalSelector() {
  const [goalId, setGoalId] = useState<GoalId>("weight_loss");
  const goal = useMemo(() => GOALS.find((g) => g.id === goalId)!, [goalId]);

  function onApply() {
    toast(`🎯 Goal set: ${goal.label}`, "success");
  }

  return (
    <div className="card">
      <h2 className="h2">Goal Selector</h2>
      <label className="small">Choose goal</label>
      <select value={goalId} onChange={(e) => setGoalId(e.target.value as GoalId)}>
        {GOALS.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>

      <p className="small" style={{ marginTop: 8 }}>{goal.blurb}</p>
      <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
        {goal.weeklyFocus.map((t) => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={onApply}>Apply goal</button>
        <button className="btn" onClick={() => toast("📅 Coming soon: goal-based plan", "info")}>
          Build plan
        </button>
      </div>
    </div>
  );
}
