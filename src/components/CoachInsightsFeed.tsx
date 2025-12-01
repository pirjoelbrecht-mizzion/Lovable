type CoachInsightsFeedProps = {
  insights: string[];
};

export default function CoachInsightsFeed({ insights }: CoachInsightsFeedProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{
      background: 'var(--bg)',
      border: '2px solid var(--brand)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>💬</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          COACH INSIGHTS
        </h3>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {insights.map((insight, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              background: 'var(--bg-secondary)',
              borderRadius: 6,
              borderLeft: '3px solid var(--brand)',
              animation: `slideIn 0.3s ease ${index * 0.1}s both`,
            }}
          >
            <span style={{ color: 'var(--brand)', fontWeight: 700, flexShrink: 0 }}>•</span>
            <p className="small" style={{
              margin: 0,
              lineHeight: 1.6,
              flex: 1,
            }}>
              {insight}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
