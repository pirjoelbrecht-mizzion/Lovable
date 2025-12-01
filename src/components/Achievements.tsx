// src/components/Achievements.tsx
import { useEffect, useRef } from "react";

export type Badge = { id: string; ok: boolean; label: string };

export function computeBadges(streak: number, totalKm: number): Badge[] {
  return [
    { id: "streak-3",  ok: streak >= 3,   label: "🔥 3-day Streak" },
    { id: "streak-7",  ok: streak >= 7,   label: "🔥 7-day Streak" },
    { id: "streak-21", ok: streak >= 21,  label: "🔥 21-day Streak" },
    { id: "km-50",     ok: totalKm >= 50, label: "🏅 50km Total" },
    { id: "km-100",    ok: totalKm >= 100, label: "🏅 100km Total" },
    { id: "km-250",    ok: totalKm >= 250, label: "🏅 250km Total" },
  ];
}

export default function Achievements({
  streak,
  totalKm,
  onUnlock, // optional toast hook
}: {
  streak: number;
  totalKm: number;
  onUnlock?: (badge: Badge) => void;
}) {
  const badges = computeBadges(streak, totalKm);

  // Detect newly unlocked badges
  const prev = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const previously = prev.current;
    badges.forEach((b) => {
      if (b.ok && previously[b.id] === false && onUnlock) {
        onUnlock(b);
      }
    });
    // update snapshot
    prev.current = Object.fromEntries(badges.map((b) => [b.id, b.ok]));
  }, [badges.map((b) => b.ok).join("|")]); // track any ok change

  return (
    <div className="card">
      <h2 className="h2">Achievements</h2>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {badges.map((b) => (
          <span
            key={b.id}
            className={`badge ${b.ok ? "badge-on" : "badge-off"}`}
            title={b.ok ? "Unlocked" : "Keep going!"}
          >
            {b.label}
          </span>
        ))}
      </div>
      <div className="kv" style={{ marginTop: 8 }}>
        <span>Totals</span>
        <b>{totalKm} km</b>
      </div>
    </div>
  );
}
