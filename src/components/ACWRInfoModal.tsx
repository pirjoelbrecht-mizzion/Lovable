import { X, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ACWRInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentACWR?: number | null;
  personalMin?: number;
  personalMax?: number;
  hasPersonalZone?: boolean;
}

export default function ACWRInfoModal({
  isOpen,
  onClose,
  currentACWR,
  personalMin = 0.8,
  personalMax = 1.3,
  hasPersonalZone = false,
}: ACWRInfoModalProps) {
  if (!isOpen) return null;

  const universalMin = 0.8;
  const universalMax = 1.3;

  const getCurrentZone = (acwr: number) => {
    if (acwr >= personalMin && acwr <= personalMax) return 'optimal';
    if (acwr > personalMax && acwr <= 1.5) return 'caution';
    if (acwr > 1.5) return 'high-risk';
    return 'underload';
  };

  const zone = currentACWR !== null && currentACWR !== undefined ? getCurrentZone(currentACWR) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(11, 18, 33, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 0 50px rgba(6, 182, 212, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            What is ACWR?
          </h2>
          <p className="text-slate-300 text-sm">
            Understanding your Acute:Chronic Workload Ratio
          </p>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              <Activity size={18} />
              The Formula
            </h3>
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(6, 182, 212, 0.05)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
              }}
            >
              <p className="text-white font-mono text-center text-lg mb-2">
                ACWR = Acute Load / Chronic Load
              </p>
              <p className="text-slate-400 text-sm text-center">
                Acute Load = Last 7 days training volume
              </p>
              <p className="text-slate-400 text-sm text-center">
                Chronic Load = Average of last 28 days (4 weeks)
              </p>
            </div>
          </section>

          {currentACWR !== null && currentACWR !== undefined && (
            <section>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">
                Your Current Status
              </h3>
              <div
                className="p-4 rounded-lg"
                style={{
                  background: zone === 'optimal' ? 'rgba(42, 198, 113, 0.1)' :
                             zone === 'caution' ? 'rgba(255, 209, 102, 0.1)' :
                             zone === 'high-risk' ? 'rgba(255, 107, 107, 0.1)' :
                             'rgba(148, 163, 184, 0.1)',
                  border: zone === 'optimal' ? '1px solid rgba(42, 198, 113, 0.3)' :
                         zone === 'caution' ? '1px solid rgba(255, 209, 102, 0.3)' :
                         zone === 'high-risk' ? '1px solid rgba(255, 107, 107, 0.3)' :
                         '1px solid rgba(148, 163, 184, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">Current ACWR:</span>
                  <span className="text-2xl font-bold text-white">{currentACWR.toFixed(2)}</span>
                </div>
                {hasPersonalZone && (
                  <p className="text-slate-300 text-sm">
                    Your personalized optimal zone: <span className="font-semibold text-cyan-400">{personalMin.toFixed(1)} - {personalMax.toFixed(1)}</span>
                  </p>
                )}
                <p className="text-slate-400 text-xs mt-2">
                  Standard universal ACWR range: {universalMin.toFixed(1)} - {universalMax.toFixed(1)}
                </p>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">
              Risk Zones Explained
            </h3>
            <div className="space-y-3">
              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(42, 198, 113, 0.08)',
                  border: '1px solid rgba(42, 198, 113, 0.3)',
                }}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      Optimal Zone ({hasPersonalZone ? `${personalMin.toFixed(1)}-${personalMax.toFixed(1)}` : '0.8-1.3'})
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Sweet spot for adaptation with minimal injury risk. Continue progressive training while monitoring recovery signals.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(255, 209, 102, 0.08)',
                  border: '1px solid rgba(255, 209, 102, 0.3)',
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      Caution Zone (1.3-1.5)
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Elevated load. Monitor recovery closely, consider extra rest days. Occasional spikes are okay, but avoid sustaining this level.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(255, 107, 107, 0.08)',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      High Risk (&gt;1.5)
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Rapid load increase significantly elevates injury risk. Reduce volume by 15-20% or add recovery days. Focus on easy-pace runs.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                }}
              >
                <div className="flex items-start gap-2">
                  <Activity size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      Underload (&lt;0.8)
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Recovery or deload week. Good for regeneration, but extended periods may lead to detraining. Consider gradual increases if unplanned.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {hasPersonalZone && (
            <section>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">
                Personalized Zones
              </h3>
              <div
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                <p className="text-slate-300 text-sm leading-relaxed mb-2">
                  Your optimal ACWR zone has been personalized based on your training history, load patterns, and individual variability.
                </p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  This adaptation is especially important for trail and ultra runners, whose load patterns vary dramatically by terrain and vertical gain.
                </p>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">
              Research Foundation
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              ACWR is based on research by Tim Gabbett (2016) and Malone et al. (2018), showing that athletes with ACWR between 0.8-1.3 have the lowest injury risk while maintaining optimal fitness gains. Load spikes above 1.5 significantly increase injury probability.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-700">
            <Link
              to="/insights"
              className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-colors"
              onClick={onClose}
            >
              View Detailed Load Analysis →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
