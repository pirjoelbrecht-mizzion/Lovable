// src/components/DailyBanner.tsx
import { useDailyPlan } from "@/hooks/useDailyPlan";

export default function DailyBanner() {
  const plan = useDailyPlan();
  if (!plan) return null;

  return (
    <div className="card" style={{ background: "#141517", borderLeft: "4px solid var(--brand)" }}>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 24 }}>{plan.emoji}</div>
        <div>
          <b>{plan.message}</b>
          {plan.note && <div className="small" style={{ color: "var(--muted)" }}>{plan.note}</div>}
        </div>
      </div>
    </div>
  );
}
