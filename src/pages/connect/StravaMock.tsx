import { useState } from "react";
import { save } from "@/utils/storage";
import { useNavigate } from "react-router-dom";

export default function ConnectStravaMock() {
  const nav = useNavigate();
  const [scopes, setScopes] = useState({
    read: true,
    activity: true,
    heartrate: true,
  });

  function authorize() {
    save("stravaConnected", true);
    save("stravaToken", { access: "mock_access_token", scopes });
    nav("/settings");
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="h2">Connect Strava (Demo)</div>
        <p className="small">This is a fake consent screen for demo purposes only.</p>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          <label className="small"><input type="checkbox" checked={scopes.read} onChange={e=>setScopes(s=>({...s, read: e.target.checked}))}/> Read profile</label>
          <label className="small"><input type="checkbox" checked={scopes.activity} onChange={e=>setScopes(s=>({...s, activity: e.target.checked}))}/> Read activities</label>
          <label className="small"><input type="checkbox" checked={scopes.heartrate} onChange={e=>setScopes(s=>({...s, heartrate: e.target.checked}))}/> Read heart rate</label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={authorize}>Authorize</button>
          <button className="btn" onClick={() => nav("/settings")}>Cancel</button>
        </div>
      </section>
    </div>
  );
}
