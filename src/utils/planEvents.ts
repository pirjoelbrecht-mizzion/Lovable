// src/utils/planEvents.ts
export function onPlannerUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener("planner:updated", h as EventListener);
  return () => window.removeEventListener("planner:updated", h as EventListener);
}
export function pingPlannerUpdated() {
  try { window.dispatchEvent(new CustomEvent("planner:updated")); } catch {}
}
