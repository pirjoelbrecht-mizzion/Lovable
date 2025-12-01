// src/hooks/useHotkeys.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Options = {
  onHelp: () => void;
};

export default function useHotkeys({ onHelp }: Options) {
  const nav = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // '?' → open shortcuts help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onHelp();
        return;
      }

      // g + hotkey to navigate (GitHub-style)
      if (e.key.toLowerCase() === "g") {
        const handler = (ev: KeyboardEvent) => {
          const k = ev.key.toLowerCase();
          if (k === "d") nav("/");
          if (k === "l") nav("/log");
          if (k === "i") nav("/insights");
          if (k === "p") nav("/planner");
          if (k === "s") nav("/settings");
          window.removeEventListener("keydown", handler, true);
        };
        window.addEventListener("keydown", handler, true);
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [nav, onHelp]);
}
