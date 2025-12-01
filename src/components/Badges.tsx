// src/components/Badges.tsx
export default function Badges({ streak }: { streak: number }) {
  const badge =
    streak >= 30 ? { label: "🏆 Unbreakable", note: "30-day streak!" } :
    streak >= 14 ? { label: "🔥 On Fire", note: "14-day streak!" } :
    streak >= 7  ? { label: "✨ Starter", note: "7-day streak!" } :
                   null;

  return (
    <div className="card">
      <h2 className="h2">Badges</h2>
      {badge ? (
        <>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{badge.label}</div>
          <div className="small" style={{ marginTop: 4 }}>{badge.note}</div>
        </>
      ) : (
        <div className="small">Keep your streak to unlock badges.</div>
      )}
    </div>
  );
}
Update src/pages/Home.tsx to render badges (add import + one card).
Find your imports at the top and add:
import Badges from "@/components/Badges";
Then somewhere in your Home JSX (e.g., after the “Streak & Coins” card), insert this:
{/* Badges */}
<div className="card">
  <Badges streak={streak} />
</div>
