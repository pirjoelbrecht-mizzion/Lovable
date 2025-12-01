// src/utils/format.ts
import { getLang } from "@/i18n";

/** Locale-aware number formatting */
export function formatNumber(n: number) {
  const lang = getLang();
  try {
    return new Intl.NumberFormat(lang).format(n);
  } catch {
    return String(n);
  }
}

/** Locale-aware date formatting (expects YYYY-MM-DD or Date-compatible input) */
export function formatDate(iso: string | Date) {
  const lang = getLang();
  const d = typeof iso === "string" ? new Date(iso) : iso;
  try {
    return d.toLocaleDateString(lang, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d.toDateString();
  }
}
