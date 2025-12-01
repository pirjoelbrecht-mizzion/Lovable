// src/components/ImportWizard.tsx
import { useState } from "react";
import { load, save } from "@/utils/storage";
import type { LogEntry } from "@/types";
import { APPLE_HEALTH_SAMPLES, GARMIN_SAMPLES, STRAVA_SAMPLES } from "@/fixtures/importSamples";
import { toast } from "@/components/ToastHost";

export default function ImportWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"Strava" | "Garmin" | "Apple Health">(
    "Strava"
  );

  if (!open) return null;

  async function importNow(samples: LogEntry[]) {
    const { bulkInsertLogEntries } = await import("@/lib/database");
    const inserted = await bulkInsertLogEntries(samples);

    const { emit } = await import("@/lib/bus");
    emit("log:import-complete", { count: inserted });

    toast(`Imported ${inserted} runs from ${tab}.`, "success");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 640, maxWidth: "92vw" }}
      >
        <header className="row" style={{ justifyContent: "space-between" }}>
          <div className="h2">Import Runs</div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          {(["Strava", "Garmin", "Apple Health"] as const).map((k) => (
            <button
              key={k}
              className="btn"
              onClick={() => setTab(k)}
              aria-current={tab === k ? "page" : undefined}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="small" style={{ marginBottom: 10 }}>
          This is a demo import (no real OAuth). We’ll add official connections
          later—these samples just populate your Log so you can test Insights and Planner.
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn primary"
            onClick={() =>
              importNow(
                tab === "Strava"
                  ? STRAVA_SAMPLES
                  : tab === "Garmin"
                  ? GARMIN_SAMPLES
                  : APPLE_HEALTH_SAMPLES
              )
            }
          >
            Import sample runs from {tab}
          </button>
          <button
            className="btn"
            onClick={async () => {
              save("logEntries", []);
              const { emit } = await import("@/lib/bus");
              emit("log:import-complete", { count: 0 });
              toast("Cleared imported runs.", "success");
              onClose();
            }}
          >
            Clear all runs
          </button>
        </div>
      </div>
    </div>
  );
}

function dedupe(entries: LogEntry[]) {
  const key = (e: LogEntry) =>
    `${e.dateISO}|${e.title}|${e.km}|${e.source || ""}`;
  const seen = new Set<string>();
  const out: LogEntry[] = [];
  for (const e of entries) {
    const k = key(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}
