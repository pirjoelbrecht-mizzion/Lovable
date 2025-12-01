// src/components/ShortcutsHelp.tsx
import Modal from "@/components/Modal";

export default function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="h2" style={{ marginBottom: 8 }}>Keyboard Shortcuts</div>
      <ul className="small" style={{ lineHeight: 1.8 }}>
        <li><b>?</b> — Show this help</li>
        <li><b>g</b> then <b>d</b> — Dashboard</li>
        <li><b>g</b> then <b>l</b> — Log</li>
        <li><b>g</b> then <b>i</b> — Insights</li>
        <li><b>g</b> then <b>p</b> — Planner</li>
        <li><b>g</b> then <b>s</b> — Settings</li>
        <li><b>Esc</b> — Close modals</li>
      </ul>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}
