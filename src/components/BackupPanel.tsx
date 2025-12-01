// src/components/BackupPanel.tsx
import { useRef, useState } from "react";
import { dumpAll, restoreAll } from "@/utils/backup";

export default function BackupPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState<string>("");

  function downloadJson() {
    const snapshot = dumpAll();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `mizzion-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg("");
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const res = restoreAll(json);
      setMsg(res.message);
      if (res.ok) {
        // Give the UI a moment; user can reload
        setTimeout(() => window.location.reload(), 600);
      }
    } catch (err: any) {
      setMsg(err?.message || "Failed to read backup file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      <h2 className="h2">Backup & Restore</h2>
      <p className="small" style={{ marginTop: 6 }}>
        Download a JSON snapshot of your app data (streak, logs, week plan, etc.), or restore from a
        previous backup. This affects only this browser/device.
      </p>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={downloadJson}>Download backup (.json)</button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          onChange={onPickFile}
          style={{ display: "none" }}
        />
        <button className="btn" onClick={() => inputRef.current?.click()}>
          Restore from file…
        </button>
      </div>
      {msg && <div className="small" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
