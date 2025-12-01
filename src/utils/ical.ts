// src/utils/ical.ts
import type { WeekItem } from "@/utils/weekPlan";

/** Map short day names to weekday index (Mon=1 ... Sun=0 for our calc) */
const DAY_INDEX: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(date: Date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function ymdhms(date: Date) {
  return `${ymd(date)}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** Find next Monday from a date (or today if already Monday) */
export function nextMonday(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun,1=Mon,...6=Sat
  const delta = (8 - (day || 7)) % 7; // days to next Mon (0 if Monday)
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Offset a copy of a date by N days */
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Convert a WeekItem[] into an .ics text.
 * - startDate: the Monday for this plan (default = next Monday)
 * - defaultHour: "start" time for events in local time (e.g., 7 → 07:00)
 * - durationMin: duration minutes for all events
 * - titlePrefix: shown in SUMMARY
 */
export function weekToICS(
  week: WeekItem[],
  opts?: {
    startDate?: Date;
    defaultHour?: number;
    durationMin?: number;
    titlePrefix?: string;
  }
) {
  const start = (opts?.startDate ? new Date(opts.startDate) : nextMonday());
  const hour = opts?.defaultHour ?? 7;
  const duration = opts?.durationMin ?? 60;
  const prefix = opts?.titlePrefix ?? "Run";

  const dtstamp = ymdhms(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mizzion//Weekly Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  week.forEach((item, idx) => {
    // Skip pure rest days to reduce clutter; export if has km or title
    const shouldExport =
      (item.km && item.km > 0) ||
      (item.title && item.title.trim().length > 0 && item.type !== "rest");

    if (!shouldExport) return;

    // Compute event date based on "Mon..Sun" mapping to days from start Monday
    const weekdayIndex = DAY_INDEX[item.day] ?? 0;
    const offset = weekdayIndex === 0 ? 6 : weekdayIndex - 1; // Sun→6, Mon→0, Tue→1 ...
    const eventDate = addDays(start, offset);

    const startDate = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      hour,
      0,
      0
    );
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const summary = `${prefix}: ${item.title || "Session"}${item.km ? ` (${item.km} km)` : ""}`;
    const desc = (item.notes || "").replace(/\r?\n/g, "\\n");

    // Using "floating time" (no TZID) so calendar apps interpret in local TZ
    lines.push(
      "BEGIN:VEVENT",
      `UID:mizzion-${Date.now()}-${idx}@mizzion.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${ymdhms(startDate)}`,
      `DTEND:${ymdhms(endDate)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Trigger a download of the provided .ics text */
export function downloadICS(filename: string, icsText: string) {
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
