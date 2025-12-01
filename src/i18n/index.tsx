// src/i18n/index.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DICTS } from "./dict";
export { DICTS } from "./dict";

const LANG_KEY = "lang";

function readLang(): string {
  try { return localStorage.getItem(LANG_KEY) || "en"; } catch { return "en"; }
}
function writeLang(next: string) {
  try { localStorage.setItem(LANG_KEY, next); } catch {}
}

type LangCtx = { lang: string; setLang: (next: string) => void };
const Ctx = createContext<LangCtx | null>(null);

export function TProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState(readLang());

  // keep storage in sync and force re-render
  const setLang = (next: string) => {
    setLangState(next);
    writeLang(next);
  };

  // if another tab changes it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_KEY && e.newValue) setLangState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) return { lang: readLang(), setLang: (l: string) => writeLang(l) };
  return ctx;
}

function getFromDict(lang: string, key: string) {
  const dict = (DICTS as any)[lang] || DICTS.en;
  return key.split(".").reduce((acc: any, k) => (acc && k in acc ? acc[k] : undefined), dict);
}

export function t(key: string, fallback?: string) {
  const lang = readLang();
  const v = getFromDict(lang, key);
  return (v as string | undefined) ?? fallback ?? key;
}

export function useT() {
  const { lang } = useLang(); // subscribes to changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = lang;
  return (key: string, fallback?: string) => t(key, fallback);
}

// optional helpers if you need them
export function getLang() { return readLang(); }
export function setLang(next: string) { writeLang(next); }
