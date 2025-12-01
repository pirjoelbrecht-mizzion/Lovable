import type { GIRiskAssessment } from '@/types/physiology';

type GIDistressRiskCardProps = {
  giRisk: GIRiskAssessment;
};

function getRiskColor(level: GIRiskAssessment['level']): string {
  switch (level) {
    case 'low': return '#22c55e';
    case 'moderate': return '#f59e0b';
    case 'high': return '#fb923c';
    case 'very-high': return '#ef4444';
  }
}

function getRiskEmoji(level: GIRiskAssessment['level']): string {
  switch (level) {
    case 'low': return '✅';
    case 'moderate': return '⚠️';
    case 'high': return '🔴';
    case 'very-high': return '🚨';
  }
}

export default function GIDistressRiskCard({ giRisk }: GIDistressRiskCardProps) {
  const riskColor = getRiskColor(giRisk.level);
  const riskEmoji = getRiskEmoji(giRisk.level);

  return (
    <div className="card" style={{
      background: 'var(--bg)',
      border: '1px solid var(--line)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>🩺</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          GI Distress Risk
        </h3>
      </div>

      <div style={{
        width: '100%',
        height: 20,
        background: 'var(--bg-secondary)',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
      }}>
        <div style={{
          width: `${giRisk.riskPct}%`,
          height: '100%',
          background: riskColor,
          borderRadius: 10,
          transition: 'width 0.3s ease, background 0.3s ease',
          animation: giRisk.level === 'very-high' ? 'pulse 2s infinite' : 'none',
        }} />

        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: giRisk.riskPct > 50 ? '#fff' : 'var(--text)',
          textShadow: giRisk.riskPct > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
        }}>
          {giRisk.riskPct}%
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          padding: '6px 12px',
          borderRadius: 6,
          background: riskColor,
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}>
          {riskEmoji} {giRisk.level.toUpperCase().replace('-', ' ')}
        </span>
      </div>

      <div style={{
        padding: 12,
        background: 'var(--bg-secondary)',
        borderRadius: 6,
        borderLeft: `4px solid ${riskColor}`,
      }}>
        <p className="small" style={{ margin: 0, lineHeight: 1.6 }}>
          {giRisk.message}
        </p>
      </div>

      {(giRisk.level === 'high' || giRisk.level === 'very-high') && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: 'var(--warning-bg)',
          borderRadius: 6,
          border: '1px solid var(--warning)',
        }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
            Recommendations:
          </div>
          <ul className="small" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
            <li>Practice nutrition strategy during long training runs</li>
            <li>Consider liquid calories over solid food in heat</li>
            <li>Space out fueling throughout the race</li>
            <li>Have anti-nausea medication ready</li>
          </ul>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
