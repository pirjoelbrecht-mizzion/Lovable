import { useLang } from "@/i18n";

const SUPPORTED = [
  { code: "en", label: "EN" },
  { code: "et", label: "ET" },
  { code: "es", label: "ES" },
  { code: "de", label: "DE" },
];

export default function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      style={{
        background: "#121316",
        color: "var(--text)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "6px 8px",
      }}
    >
      {SUPPORTED.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
