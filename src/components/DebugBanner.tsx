// src/components/DebugBanner.tsx
export default function DebugBanner() {
  return (
    <div
      className="small"
      style={{
        padding: "6px 10px",
        borderBottom: "1px solid var(--line)",
        background: "#111214",
        color: "var(--muted)",
      }}
    >
      Dev mode · Press <b>h</b> in terminal for Vite help
    </div>
  );
}
