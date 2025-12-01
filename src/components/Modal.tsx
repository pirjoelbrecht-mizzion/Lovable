// src/components/Modal.tsx
import { useEffect } from "react";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // close on Esc
  useEffect(() => {
    console.log('[Modal] Component mounted, title:', title);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      console.log('[Modal] Component unmounting');
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, title]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        aria-label={title}
      >
        <div className="modal-head">
          <h3 className="h2" style={{ margin: 0 }}>{title}</h3>
          <button className="btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
