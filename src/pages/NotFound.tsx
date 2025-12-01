// src/pages/NotFound.tsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card" style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2 className="h2">404 — Not Found</h2>
      <p className="small">
        That page doesn’t exist. Try going back to the dashboard or planner.
      </p>
      <div className="row" style={{ marginTop: 10 }}>
        <Link to="/" className="btn">Go to Dashboard</Link>
        <Link to="/planner" className="btn">Open Planner</Link>
      </div>
    </div>
  );
}
