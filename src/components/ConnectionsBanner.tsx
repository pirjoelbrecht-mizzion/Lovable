export default function ConnectionsBanner() {
  function emit(provider: string, connected: boolean) {
    window.dispatchEvent(
      new CustomEvent("mizzion:providerChange", {
        detail: { provider, connected },
      })
    );
  }
  return (
    <div className="card" role="region" aria-label="Connections">
      <div className="h2" style={{margin:0}}>Connect your data</div>
      <p className="small" style={{marginTop:6}}>
        Mock toggles for Apple Health / Strava / Garmin. (Real OAuth later.)
      </p>
      <div className="row" style={{marginTop:6}}>
        <button className="btn" onClick={() => emit("apple", true)}>Apple Health ✓</button>
        <button className="btn" onClick={() => emit("strava", true)}>Strava ✓</button>
        <button className="btn" onClick={() => emit("garmin", true)}>Garmin ✓</button>
      </div>
    </div>
  );
}
