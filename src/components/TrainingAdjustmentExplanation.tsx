/**
 * Training Adjustment Explanation Component
 *
 * Displays transparent reasoning for why training was modified by the
 * Adaptive Decision Engine. Shows which systems influenced changes and
 * provides safety context.
 */

import { useState } from 'react';
import type { AdaptiveDecision, AdjustmentLayer } from '@/engine/adaptiveDecisionEngine';

interface TrainingAdjustmentExplanationProps {
  decision: AdaptiveDecision;
  expanded?: boolean;
  onClose?: () => void;
}

export default function TrainingAdjustmentExplanation({
  decision,
  expanded = false,
  onClose
}: TrainingAdjustmentExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const hasSafetyFlags = decision.safetyFlags.length > 0;
  const hasWarnings = decision.warnings.length > 0;
  const appliedLayers = decision.layers.filter(l => l.applied);

  // Determine overall impact level
  const impactLevel = hasSafetyFlags ? 'critical' : hasWarnings ? 'moderate' : 'minor';

  const getLayerIcon = (layerName: string): string => {
    switch (layerName) {
      case 'Race Priority': return '🏁';
      case 'ACWR Guardrail': return '📊';
      case 'Climate Adjustment': return '🌡️';
      case 'Motivation Integration': return '💪';
      default: return '⚙️';
    }
  };

  const getImpactColor = (): string => {
    switch (impactLevel) {
      case 'critical': return '#EF4444';
      case 'moderate': return '#F59E0B';
      case 'minor': return '#3B82F6';
    }
  };

  const getTotalChanges = (): number => {
    return appliedLayers.reduce((sum, layer) => sum + layer.changes.length, 0);
  };

  if (!isExpanded) {
    // Compact summary view
    return (
      <div
        className="adjustment-summary"
        style={{ borderLeftColor: getImpactColor() }}
        onClick={() => setIsExpanded(true)}
      >
        <div className="summary-header">
          <span className="summary-icon">
            {hasSafetyFlags ? '⚠️' : hasWarnings ? '📝' : '✓'}
          </span>
          <span className="summary-text">
            {getTotalChanges()} adjustment{getTotalChanges() !== 1 ? 's' : ''} made by AI coach
          </span>
          <button className="expand-btn">View Details →</button>
        </div>
      </div>
    );
  }

  // Expanded detailed view
  return (
    <div className="adjustment-explanation" style={{ borderColor: getImpactColor() }}>
      <div className="explanation-header">
        <div className="header-title">
          <h3>Training Adjustments Applied</h3>
          <span className="confidence-badge">
            {Math.round(decision.confidence * 100)}% confidence
          </span>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      {/* Safety Flags */}
      {hasSafetyFlags && (
        <div className="safety-section">
          <div className="section-header critical">
            <span className="section-icon">⚠️</span>
            <h4>Safety Overrides Active</h4>
          </div>
          <div className="safety-flags">
            {decision.safetyFlags.map((flag, idx) => (
              <div key={idx} className="safety-flag">
                <span className="flag-icon">🛡️</span>
                {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applied Adjustments */}
      <div className="adjustments-section">
        <div className="section-header">
          <span className="section-icon">🔧</span>
          <h4>Applied Adjustments</h4>
        </div>

        <div className="adjustment-layers">
          {appliedLayers.map((layer, idx) => (
            <div
              key={idx}
              className={`adjustment-layer ${layer.safetyOverride ? 'safety-override' : ''}`}
            >
              <div className="layer-header">
                <span className="layer-icon">{getLayerIcon(layer.name)}</span>
                <span className="layer-name">{layer.name}</span>
                {layer.safetyOverride && (
                  <span className="safety-badge">Safety Override</span>
                )}
              </div>

              <div className="layer-reasoning">{layer.reasoning}</div>

              {layer.changes.length > 0 && (
                <div className="layer-changes">
                  <div className="changes-count">
                    {layer.changes.length} modification{layer.changes.length !== 1 ? 's' : ''}
                  </div>
                  <div className="changes-list">
                    {layer.changes.map((change, cidx) => (
                      <div key={cidx} className="change-item">
                        <span className="change-field">{change.field}</span>
                        <span className="change-arrow">→</span>
                        <span className="change-reason">{change.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final Reasoning */}
      {decision.finalReasoning.length > 0 && (
        <div className="reasoning-section">
          <div className="section-header">
            <span className="section-icon">💡</span>
            <h4>Coach's Reasoning</h4>
          </div>
          <ul className="reasoning-list">
            {decision.finalReasoning.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="warnings-section">
          <div className="section-header warning">
            <span className="section-icon">⚡</span>
            <h4>Important Notes</h4>
          </div>
          <ul className="warnings-list">
            {decision.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <div className="explanation-footer">
        <span className="timestamp">
          Applied {new Date(decision.appliedAt).toLocaleString()}
        </span>
      </div>

      <style>{`
        .adjustment-summary {
          background: white;
          border-left: 4px solid;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 12px 0;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .adjustment-summary:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          transform: translateX(2px);
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-icon {
          font-size: 20px;
        }

        .summary-text {
          flex: 1;
          font-weight: 500;
          color: #374151;
        }

        .expand-btn {
          background: none;
          border: none;
          color: #3B82F6;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }

        .adjustment-explanation {
          background: white;
          border: 2px solid;
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .explanation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .confidence-badge {
          background: #E0F2FE;
          color: #0369A1;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #9CA3AF;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: #4B5563;
        }

        .safety-section,
        .adjustments-section,
        .reasoning-section,
        .warnings-section {
          margin-bottom: 24px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #E5E7EB;
        }

        .section-header.critical {
          color: #DC2626;
          border-bottom-color: #FCA5A5;
        }

        .section-header.warning {
          color: #D97706;
          border-bottom-color: #FCD34D;
        }

        .section-icon {
          font-size: 18px;
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .safety-flags {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .safety-flag {
          background: #FEF2F2;
          border-left: 3px solid #DC2626;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #991B1B;
        }

        .flag-icon {
          font-size: 16px;
        }

        .adjustment-layers {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .adjustment-layer {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 16px;
          border-left: 3px solid #3B82F6;
        }

        .adjustment-layer.safety-override {
          background: #FEF2F2;
          border-left-color: #DC2626;
        }

        .layer-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .layer-icon {
          font-size: 18px;
        }

        .layer-name {
          font-weight: 600;
          color: #111827;
          flex: 1;
        }

        .safety-badge {
          background: #DC2626;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .layer-reasoning {
          color: #4B5563;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .layer-changes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
        }

        .changes-count {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .changes-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .change-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #374151;
        }

        .change-field {
          background: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 600;
          color: #3B82F6;
          font-size: 12px;
        }

        .change-arrow {
          color: #9CA3AF;
        }

        .change-reason {
          flex: 1;
        }

        .reasoning-list,
        .warnings-list {
          margin: 0;
          padding-left: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reasoning-list li,
        .warnings-list li {
          color: #374151;
          line-height: 1.6;
        }

        .explanation-footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
          text-align: right;
        }

        .timestamp {
          font-size: 12px;
          color: #9CA3AF;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
