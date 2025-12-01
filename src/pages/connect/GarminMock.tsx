import { useNavigate } from "react-router-dom";
import { save } from "@/utils/storage";

export default function ConnectGarminMock() {
  const nav = useNavigate();

  function authorize() {
    save("garminConnected", true);
    save("garminToken", { access: "mock_garmin_token" });
    nav("/settings");
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="h2">Connect Garmin (Demo)</div>
        <p className="small">Mock OAuth screen for demo—no real data is accessed.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={authorize}>Authorize</button>
          <button className="btn" onClick={() => nav("/settings")}>Cancel</button>
        </div>
      </section>
    </div>
  );
}
