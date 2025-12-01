// Very simple ICS builder for weekly Planner items.
// All-day events with DTSTART;VALUE=DATE to avoid timezone fuss.

export type IcsItem = {
  title: string;
  notes?: string;
  dayIndex: number; // 0..6 (Mon..Sun) within the target week
};

function weekStartMonday(d = new Date()) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}${m}${dd}`;
}

export function buildWeekIcs(items: IcsItem[], fileName = "mizzion-week.ics") {
  const weekStart = weekStartMonday();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mizzion//Planner//EN",
  ];

  items.forEach((it, idx) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + it.dayIndex);
    const dt = yyyymmdd(date);
    const uid = `${dt}-${idx}@mizzion`;
    const desc = (it.notes ?? "").replace(/\n/g, "\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${yyyymmdd(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${it.title}`,
      `DESCRIPTION:${desc}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
