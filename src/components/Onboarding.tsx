// src/components/Onboarding.tsx
import Modal from "@/components/Modal";
import { save, load } from "@/utils/storage";
import { MISSIONS } from "@/missions/catalog";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const units = load("units", "Metric (km)");
  const goal = load("goal", MISSIONS[0]?.id ?? "base");

  function apply() {
    save("onboarded", true);
    onDone();
  }

  return (
    <Modal onClose={apply}>
      <div className="h2" style={{ marginBottom: 8 }}>Welcome to Mizzion</div>
      <p className="small" style={{ marginBottom: 10 }}>
        Quick setup so we tailor the experience:
      </p>

      <label className="small">Preferred Units</label>
      <select
        defaultValue={units}
        onChange={(e) => save("units", e.target.value)}
      >
        <option>Metric (km)</option>
        <option>Imperial (miles)</option>
      </select>

      <label className="small" style={{ marginTop: 10 }}>Your current goal</label>
      <select
        defaultValue={goal}
        onChange={(e) => save("goal", e.target.value)}
      >
        {MISSIONS.map((m) => (
          <option key={m.id} value={m.id}>{m.title}</option>
        ))}
      </select>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={apply}>Start</button>
      </div>
    </Modal>
  );
}
