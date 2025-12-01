/**
 * ======================================================================
 *  ADAPTIVE DECISION EXPLANATION COMPONENT
 *  Displays why Module 4 made specific workout adjustments
 * ======================================================================
 *
 * This component provides transparency into Module 4's decision-making
 * by showing which layers triggered modifications, what changes were made,
 * and the reasoning behind each adjustment.
 */

import { useState } from 'react';
import type { AdaptiveDecision } from '@/engine';

interface AdaptiveDecisionExplanationProps {
  decision: AdaptiveDecision;
  compact?: boolean;
}

export default function AdaptiveDecisionExplanation({
  decision,
  compact = false,
}: AdaptiveDecisionExplanationProps) {
  const [expanded, setExpanded] = useState(!compact);

  const appliedLayers = decision.adjustmentLayers.filter(layer => layer.applied);
  const hasAdjustments = appliedLayers.length > 0;

  if (!hasAdjustments && compact) {
    return null;
  }

  const safetyOverrides = appliedLayers.filter(layer => layer.safetyOverride);
  const hasSafetyFlags = decision.safetyFlags.length > 0;
  const hasWarnings = decision.warnings.length > 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}>
            🧠
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
              Module 4 Adaptive Intelligence
            </div>
            <div style={{ fontSize: 12, color: '#93c5fd' }}>
              {appliedLayers.length} adjustment{appliedLayers.length !== 1 ? 's' : ''} applied
              {hasSafetyFlags && ' • Safety overrides active'}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 20,
          color: '#93c5fd',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          {hasSafetyFlags && (
            <div style={{
              padding: 12,
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5', marginBottom: 8 }}>
                🚨 Safety Overrides
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#fca5a5', fontSize: 12, lineHeight: 1.6 }}>
                {decision.safetyFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div style={{
              padding: 12,
              background: 'rgba(251, 146, 60, 0.15)',
              borderRadius: 8,
              border: '1px solid rgba(251, 146, 60, 0.4)',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fdba74', marginBottom: 8 }}>
                ⚠️ Warnings
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#fdba74', fontSize: 12, lineHeight: 1.6 }}>
                {decision.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', marginBottom: 8 }}>
              💡 Decision Reasoning
            </div>
            <div style={{
              padding: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 8,
              fontSize: 12,
              color: '#cbd5e1',
              lineHeight: 1.6,
            }}>
              {decision.finalReasoning.map((reason, i) => (
                <div key={i} style={{ marginBottom: i < decision.finalReasoning.length - 1 ? 8 : 0 }}>
                  {reason}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', marginBottom: 8 }}>
              🔧 Adjustment Layers
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {appliedLayers.map((layer, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: layer.safetyOverride
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: layer.safetyOverride
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                    }}>
                      {layer.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: layer.safetyOverride
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(59, 130, 246, 0.2)',
                      color: layer.safetyOverride ? '#fca5a5' : '#93c5fd',
                    }}>
                      {layer.changes.length} change{layer.changes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {layer.reasoning && (
                    <div style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}>
                      {layer.reasoning}
                    </div>
                  )}
                  {layer.changes.length > 0 && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {layer.changes.map((change, j) => (
                          <li key={j} style={{ marginBottom: 4 }}>
                            {change.field}: {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Confidence: {Math.round(decision.confidence * 100)}%
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Applied: {new Date(decision.appliedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display in workout cards
 */
export function AdaptiveDecisionBadge({ decision }: { decision: AdaptiveDecision }) {
  const appliedLayers = decision.adjustmentLayers.filter(layer => layer.applied);

  if (appliedLayers.length === 0) return null;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 6,
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.4)',
      fontSize: 10,
      fontWeight: 600,
      color: '#93c5fd',
    }}>
      🧠 {appliedLayers.length} AI {appliedLayers.length === 1 ? 'adjustment' : 'adjustments'}
    </div>
  );
}
