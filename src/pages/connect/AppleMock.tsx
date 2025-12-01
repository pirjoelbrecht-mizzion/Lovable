import { useNavigate } from "react-router-dom";
import { save } from "@/utils/storage";

export default function ConnectAppleMock() {
  const nav = useNavigate();

  function authorize() {
    save("appleConnected", true);
    save("appleToken", { access: "mock_apple_token" });
    nav("/settings");
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="h2">Connect Apple Health (Demo)</div>
        <p className="small">Mock permission prompt for demo only.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={authorize}>Allow</button>
          <button className="btn" onClick={() => nav("/settings")}>Don’t Allow</button>
        </div>
      </section>
    </div>
  );
}
