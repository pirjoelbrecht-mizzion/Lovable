// src/hooks/usePlannerRefresh.ts
import { useEffect } from "react";

export function usePlannerRefresh(cb: () => void) {
  useEffect(() => {
    const h = () => cb();
    window.addEventListener("planner:updated", h as EventListener);
    return () => window.removeEventListener("planner:updated", h as EventListener);
  }, [cb]);
}
