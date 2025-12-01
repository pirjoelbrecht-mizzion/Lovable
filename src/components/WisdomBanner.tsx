// src/components/WisdomBanner.tsx
type Props = {
  fatigue: number;   // 0..1
  streak: number;    // days
  raceWeeks: number; // weeks to race
};

export default function WisdomBanner({ fatigue, streak, raceWeeks }: Props) {
  const tips: string[] = [];

  if (fatigue > 0.7) {
    tips.push("Your fatigue is high — trade intensity for time-on-feet or add a rest day.");
  } else if (fatigue < 0.3) {
    tips.push("Readiness looks great — add light strides or a short hill set for specificity.");
  } else {
    tips.push("Balanced load — stick to plan and protect your sleep for the next 48 hours.");
  }

  if (streak >= 5) tips.push("🔥 Streak momentum compounds — keep easy days truly easy.");
  if (raceWeeks <= 3) tips.push("Race is close — bias quality over quantity and sharpen with strides.");
  if (raceWeeks >= 10) tips.push("Plenty of time — build base and mobility now; speed will come.");

  return (
    <div className="card" style={{ borderStyle: "dashed" }}>
      <div className="h2">AI Wisdom</div>
      <div className="small">
        {tips.join(" ")}
      </div>
    </div>
  );
}
