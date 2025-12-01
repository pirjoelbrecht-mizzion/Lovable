import { Reorder } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import TrainingBubble from "./TrainingBubble";
import "./ThisWeekBoard.css";
import { loadUserProfile } from "@/state/userData";
import { calcHrZones, calcPaceZones } from "@/utils/stravaImport";

const dayData = [
  { label: "Mon", weather: "Sunny", temp: "10°C" },
  { label: "Tue", weather: "Sunny", temp: "14°C" },
  { label: "Wed", weather: "Cloudy", temp: "9°C" },
  { label: "Thu", weather: "Cloudy", temp: "12°C" },
  { label: "Fri", weather: "Rainy", temp: "7°C" },
  { label: "Sat", weather: "Sunny", temp: "11°C" },
  { label: "Sun", weather: "Sunny", temp: "15°C" },
];

// consistent mapping between workout type and emoji
const iconMap: Record<string, string> = {
  recovery: "😴",
  rest: "🛋️",
  easy: "🏃‍♂️",
  long: "🏆",
  strength: "🏋️‍♂️",
  intervals: "⏱️",
  cross: "🚴‍♂️",
  tempo: "⚡",
  race: "🏅",
};

interface SessionDetails {
  bestTime: string;
  pace: string;
  heartRate: string;
  instructions: string;
}

interface Session {
  id: string;
  title: string;
  sub: string;
  color: string;
  icon: string;
  details: SessionDetails;
}

// default weekly layout (AI or user data can replace these)
const defaultSessions: Session[] = [
  {
    id: "mon",
    title: "Recovery",
    sub: "30 min • Zone 1",
    color: "var(--bubble-recovery)",
    icon: iconMap.recovery,
    details: {
      bestTime: "Morning",
      pace: "8:45–9:00 /mi",
      heartRate: "120–135 bpm",
      instructions: "Keep it relaxed and smooth, full recovery focus.",
    },
  },
  {
    id: "tue",
    title: "Easy Run",
    sub: "45 min • Zone 2",
    color: "var(--bubble-easy)",
    icon: iconMap.easy,
    details: {
      bestTime: "Morning",
      pace: "8:30–8:50 /mi",
      heartRate: "135–145 bpm",
      instructions: "Steady aerobic effort, conversational pace.",
    },
  },
  {
    id: "wed",
    title: "Strength",
    sub: "40 min • Core",
    color: "var(--bubble-strength)",
    icon: iconMap.strength,
    details: {
      bestTime: "Afternoon",
      pace: "—",
      heartRate: "—",
      instructions: "Focus on form — Ultra Legs or Mountain Legs routine.",
    },
  },
  {
    id: "thu",
    title: "Intervals",
    sub: "5 × 3 min",
    color: "var(--bubble-intervals)",
    icon: iconMap.intervals,
    details: {
      bestTime: "Morning",
      pace: "7:30–7:45 /mi",
      heartRate: "155–170 bpm",
      instructions: "Controlled reps, aim for smooth power not all-out speed.",
    },
  },
  {
    id: "fri",
    title: "Cross Train",
    sub: "Bike 60 min",
    color: "var(--bubble-cross)",
    icon: iconMap.cross,
    details: {
      bestTime: "Evening",
      pace: "Cadence 85–95 rpm",
      heartRate: "130–145 bpm",
      instructions: "Low-impact aerobic session — spin, elliptical, or ski.",
    },
  },
  {
    id: "sat",
    title: "Long Run",
    sub: "90 min • Zone 3",
    color: "var(--bubble-long)",
    icon: iconMap.long,
    details: {
      bestTime: "Morning",
      pace: "8:00–8:20 /mi",
      heartRate: "145–160 bpm",
      instructions: "Progress effort slightly; fuel well and stay relaxed.",
    },
  },
  {
    id: "sun",
    title: "Rest",
    sub: "—",
    color: "var(--bubble-rest)",
    icon: iconMap.rest,
    details: {
      bestTime: "Anytime",
      pace: "—",
      heartRate: "—",
      instructions: "Active recovery optional — walk, stretch, hydrate well.",
    },
  },
];

function formatPace(pace: number): string {
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ThisWeekBoard() {
  const [order, setOrder] = useState(defaultSessions.map((s) => s.id));
  const [sessions, setSessions] = useState(defaultSessions);

  useEffect(() => {
    const user = loadUserProfile();
    const hrZones = calcHrZones(user.hrMax || 180);
    const paceZones = calcPaceZones(user.paceBase);

    const updated = [
      {
        id: "mon",
        title: "Recovery",
        sub: "30 min • Zone 1",
        color: "var(--bubble-recovery)",
        icon: iconMap.recovery,
        details: {
          bestTime: "Morning",
          pace: `${formatPace(paceZones.Z1[0])}–${formatPace(paceZones.Z1[1])}/km`,
          heartRate: `${hrZones.Z1[0]}–${hrZones.Z1[1]} bpm`,
          instructions: "Keep it relaxed and smooth, full recovery focus.",
        },
      },
      {
        id: "tue",
        title: "Easy Run",
        sub: "45 min • Zone 2",
        color: "var(--bubble-easy)",
        icon: iconMap.easy,
        details: {
          bestTime: "Morning",
          pace: `${formatPace(paceZones.Z2[0])}–${formatPace(paceZones.Z2[1])}/km`,
          heartRate: `${hrZones.Z2[0]}–${hrZones.Z2[1]} bpm`,
          instructions: "Steady aerobic effort, conversational pace.",
        },
      },
      {
        id: "wed",
        title: "Strength",
        sub: "40 min • Core",
        color: "var(--bubble-strength)",
        icon: iconMap.strength,
        details: {
          bestTime: "Afternoon",
          pace: "—",
          heartRate: "—",
          instructions: "Focus on form — Ultra Legs or Mountain Legs routine.",
        },
      },
      {
        id: "thu",
        title: "Intervals",
        sub: "5 × 3 min",
        color: "var(--bubble-intervals)",
        icon: iconMap.intervals,
        details: {
          bestTime: "Morning",
          pace: `${formatPace(paceZones.Z4[0])}–${formatPace(paceZones.Z4[1])}/km`,
          heartRate: `${hrZones.Z4[0]}–${hrZones.Z4[1]} bpm`,
          instructions: "Controlled reps, aim for smooth power not all-out speed.",
        },
      },
      {
        id: "fri",
        title: "Cross Train",
        sub: "Bike 60 min",
        color: "var(--bubble-cross)",
        icon: iconMap.cross,
        details: {
          bestTime: "Evening",
          pace: "Cadence 85–95 rpm",
          heartRate: `${hrZones.Z2[0]}–${hrZones.Z2[1]} bpm`,
          instructions: "Low-impact aerobic session — spin, elliptical, or ski.",
        },
      },
      {
        id: "sat",
        title: "Long Run",
        sub: "90 min • Zone 2-3",
        color: "var(--bubble-long)",
        icon: iconMap.long,
        details: {
          bestTime: "Morning",
          pace: `${formatPace(paceZones.Z2[0])}–${formatPace(paceZones.Z3[1])}/km`,
          heartRate: `${hrZones.Z2[0]}–${hrZones.Z3[1]} bpm`,
          instructions: "Progress effort slightly; fuel well and stay relaxed.",
        },
      },
      {
        id: "sun",
        title: "Rest",
        sub: "—",
        color: "var(--bubble-rest)",
        icon: iconMap.rest,
        details: {
          bestTime: "Anytime",
          pace: "—",
          heartRate: "—",
          instructions: "Active recovery optional — walk, stretch, hydrate well.",
        },
      },
    ];

    setSessions(updated);
  }, []);

  // lookup by id for easy re-mapping
  const sessionMap = useMemo(
    () => Object.fromEntries(sessions.map((s) => [s.id, s])),
    [sessions]
  );

  // rebuild bubbles with updated day + weather per current order
  const labeled = order.map((id, i) => {
    const s = sessionMap[id];
    const day = dayData[i % dayData.length];
    return {
      ...s,
      day: day.label,
      weather: `${day.weather} ${day.temp}`,
    };
  });

  return (
    <section className="card" style={{
      background: 'rgba(21, 27, 45, 0.6)',
      border: '1px solid rgba(94, 179, 255, 0.15)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 className="h2" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            This Week
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Tap sessions for details • Drag to reorder
          </p>
        </div>
        <button className="btn" style={{ fontSize: 13 }}>
          List View
        </button>
      </div>

      <Reorder.Group
        axis="x"
        values={order}
        onReorder={setOrder}
        className="bubble-cloud"
      >
        {labeled.map((s) => (
          <Reorder.Item
            key={s.id}
            value={s.id}
            whileDrag={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bubble-wrap"
          >
            <TrainingBubble
              title={s.title}
              sub={s.sub}
              color={s.color}
              badge={s.day}
              weather={s.weather}
              icon={s.icon}
              details={s.details}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
  );
}
