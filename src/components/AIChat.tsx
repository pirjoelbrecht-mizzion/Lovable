import { useEffect, useRef, useState } from "react";
import type { Activity, HealthState, Weights } from "@/ai/brain";
import { getRecommendation } from "@/ai/recommend";

type Msg = { role: "user" | "assistant"; text: string };

export default function AIChat(props: {
  recent: Activity[];
  health: HealthState;
  raceWeeks: number;
  weights: Weights;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Hey! I can review your week and suggest tweaks. Ask me anything 🚀" },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  function send() {
    const q = input.trim();
    if (!q) return;
    setMsgs(m => [...m, { role: "user", text: q }]);
    setInput("");

    // “AI” reply from local reasoning
    const answer = getRecommendation({
      recent: props.recent,
      health: props.health,
      raceWeeks: props.raceWeeks,
      weights: props.weights,
    });

    // simulate a tiny delay
    setTimeout(() => {
      setMsgs(m => [...m, { role: "assistant", text: answer }]);
    }, 350);
  }

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <h2 className="h2">AI Recommendation Chat</h2>

      <div
        ref={listRef}
        style={{
          maxHeight: 260,
          overflow: "auto",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 10,
          background: "#121316",
        }}
      >
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div className="small" style={{ color: "var(--muted)" }}>
              {m.role === "user" ? "You" : "Coach AI"}
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Should I adjust long run this week?"
        />
        <button className="btn primary" onClick={send}>Send</button>
      </div>

      <div className="small" style={{ opacity: 0.7 }}>
        Tip: try “Should I adjust this week?”, “What’s my fatigue?”, or “How to taper near race?”
      </div>
    </div>
  );
}
