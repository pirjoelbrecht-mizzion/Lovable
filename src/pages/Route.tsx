import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getRouteById, type RunCard } from "@/routes/runRadar";
import { toast } from "@/components/ToastHost";
import Modal from "@/components/Modal";
import { load, save } from "@/utils/storage";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type PlanItem = {
  id: string;
  day: number;
  title: string;
  details?: string;
  km?: number;
  intensity?: "EZ" | "Z2" | "TH" | "VO2" | "HILLS";
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function RouteDetails() {
  const { id } = useParams();
  const [route, setRoute] = useState<RunCard | null>(null);
  const [loading, setLoading] = useState(true);

  const [chooseDayOpen, setChooseDayOpen] = useState(false);
  const [dayIdx, setDayIdx] = useState(5); // default Sat

  useEffect(() => {
    if (!id) return;
    getRouteById(id).then((r) => {
      setRoute(r ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="card"><div className="small">Loading route…</div></div>;
  }
  if (!route) {
    return (
      <div className="card">
        <div className="h2">Route not found</div>
        <Link className="btn" to="/">Back to Dashboard</Link>
      </div>
    );
  }

  function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast("Link copied!", "success");
  }

  function addToPlanner() {
    const items = load<PlanItem[]>("planItems", []);
    const newItem: PlanItem = {
      id: uid(),
      day: dayIdx,
      title: `Route: ${route.title}`,
      km: route.km,
      intensity: route.surface === "trail" ? "HILLS" : "Z2",
      details: route.desc ?? "",
    };
    save("planItems", [...items, newItem]);
    toast(`Added to Planner (${DAYS[dayIdx]})`, "success");
    setChooseDayOpen(false);
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row">
        <Link className="btn" to="..">← Back</Link>
        <button className="btn" onClick={copyLink}>Copy Link</button>
      </div>

      <section className="card">
        <div className="h1" style={{ marginBottom: 6 }}>{route.title}</div>
        <div className="small">{route.region}</div>

        <div className="row" style={{ marginTop: 10 }}>
          <span className="tag">{route.km} km</span>
          <span className="tag">{route.surface}</span>
          <span className="tag">Scenic {route.scenicScore}/10</span>
          {typeof route.climb === "number" && <span className="tag">↑ {route.climb} m</span>}
        </div>

        <p className="small" style={{ marginTop: 12 }}>
          {route.desc ?? "Scenic local route with pleasant terrain."}
        </p>

        {/* simple map placeholder */}
        <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
          <svg viewBox="0 0 600 240" width="100%" height="240" style={{ display: "block", background: "#101114" }}>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#1f2937"/>
                <stop offset="1" stopColor="#0b0c0f"/>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="600" height="240" fill="url(#lg)" />
            <rect x="380" y="120" width="200" height="80" fill="#0a3a4a" opacity="0.5" />
            <polyline fill="none" stroke="#7dd3fc" strokeWidth="4"
              points="30,200 80,160 130,150 170,120 220,110 270,125 320,105 360,100 420,90 470,80 520,70" />
            <circle cx="30" cy="200" r="5" fill="#34d399" />
            <circle cx="520" cy="70" r="5" fill="#fbbf24" />
          </svg>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => setChooseDayOpen(true)}>Add to Planner…</button>
          <button className="btn" onClick={() => toast("Saved to Log", "success")}>Save to Log</button>
        </div>
      </section>

      {chooseDayOpen && (
        <Modal onClose={() => setChooseDayOpen(false)}>
          <div className="h2" style={{ marginBottom: 6 }}>Choose a day</div>
          <select value={dayIdx} onChange={e => setDayIdx(Number(e.target.value))}>
            {DAYS.map((d, i) => <option value={i} key={d}>{d}</option>)}
          </select>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={addToPlanner}>Add</button>
            <button className="btn" onClick={() => setChooseDayOpen(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
