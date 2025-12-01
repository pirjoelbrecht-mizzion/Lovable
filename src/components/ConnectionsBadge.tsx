import { load } from "@/utils/storage";

type ConnState = { strava?: boolean; garmin?: boolean; apple?: boolean };

export default function ConnectionsBadge() {
  const c = load<ConnState>("connections", {});
  const list = [
    c.strava && "Strava",
    c.garmin && "Garmin",
    c.apple && "Apple",
  ].filter(Boolean) as string[];

  const label = list.length ? list.join(" · ") : "No connections";

  return (
    <span
      className="small"
      style={{
        opacity: 0.8,
        border: "1px solid var(--line)",
        padding: "4px 8px",
        borderRadius: 999,
        background: "#1a1b1f",
      }}
    >
      {label}
    </span>
  );
}
