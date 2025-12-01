import type { PhysiologicalSimulation } from '@/types/physiology';
import HydrationElectrolytesCard from './HydrationElectrolytesCard';
import GIDistressRiskCard from './GIDistressRiskCard';
import PerformanceImpactCard from './PerformanceImpactCard';
import CoachInsightsFeed from './CoachInsightsFeed';

type ResultsModalProps = {
  physiologicalSim: PhysiologicalSimulation;
  onClose: () => void;
};

export default function ResultsModal({ physiologicalSim, onClose }: ResultsModalProps) {
  return (
    <div
      className="results-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="results-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '85vh',
          background: 'var(--bg)',
          borderRadius: '16px 16px 0 0',
          padding: '20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          overflowY: 'auto',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'var(--line)',
            borderRadius: 2,
            margin: '0 auto 20px',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Detailed Results</h3>
          <button
            onClick={onClose}
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.9rem',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PerformanceImpactCard performanceImpact={physiologicalSim.performanceImpact} />
          <HydrationElectrolytesCard hydration={physiologicalSim.hydration} />
          <GIDistressRiskCard giRisk={physiologicalSim.giRisk} />
          <CoachInsightsFeed insights={physiologicalSim.insights} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .results-modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .results-modal-content::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 3px;
        }

        .results-modal-content::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 3px;
        }

        .results-modal-content::-webkit-scrollbar-thumb:hover {
          background: var(--muted);
        }
      `}</style>
    </div>
  );
}
