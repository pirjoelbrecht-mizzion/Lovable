// src/lib/bus.ts
export type BusEventMap = {
  "coach:add-session": { dayIndex: number; session: { title: string; km?: number; notes?: string } };
  "log:added-run": { dateISO: string; km?: number };
  "log:import-complete": { count: number };
  "log:updated": void;
  "feedback:training-saved": { feedback: any; weight: number; sessionImportance: string };
  "feedback:race-saved": { feedback: any; weight: number; logEntryId?: string };
  "feedback:dnf-saved": { dnfEvent: any; weight: number; logEntryId?: string };
  "plan:micro-adjustment": { adjustment: any; reason: string };
  "plan:macro-adjustment": { adjustment: any; reason: string };
  "plan:recovery-protocol": { plan: any; reason: string };
  "coach:insight-generated": { insights: any[]; weight: number };
  "models:update": { models: string[]; weight: number; source: string };
};

export function emit<K extends keyof BusEventMap>(type: K, detail: BusEventMap[K]) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on<K extends keyof BusEventMap>(
  type: K,
  handler: (d: BusEventMap[K]) => void
) {
  const fn = (e: Event) => handler((e as CustomEvent<BusEventMap[K]>).detail);
  window.addEventListener(type, fn as EventListener);
  return () => window.removeEventListener(type, fn as EventListener);
}
