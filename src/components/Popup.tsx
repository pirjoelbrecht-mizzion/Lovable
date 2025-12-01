import { useEffect } from "react";

export type PopupProps = {
  message: string;
  type?: "success" | "warning" | "info";
  onClose: () => void;
};

export default function Popup({ message, type = "info", onClose }: PopupProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === "success"
      ? "linear-gradient(90deg,#34d399,#059669)"
      : type === "warning"
      ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
      : "linear-gradient(90deg,#7dd3fc,#2563eb)";

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1000,
        background: bg,
        color: "#fff",
        padding: "12px 18px",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        fontWeight: 600,
        letterSpacing: 0.3,
        animation: "popfade 2.5s ease-out forwards",
      }}
    >
      {message}
    </div>
  );
}
