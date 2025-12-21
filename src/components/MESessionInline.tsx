import { useState } from 'react';
import { Dumbbell, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MESessionTemplate, LoadRegulationDecision } from '@/types/strengthTraining';

interface MESessionInlineProps {
  template: MESessionTemplate;
  targetedWeakness?: string;
  loadRegulation: LoadRegulationDecision | null;
}

export function MESessionInline({ template, targetedWeakness, loadRegulation }: MESessionInlineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      background: 'var(--card)',
      border: '2px solid var(--primary)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--primary-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            flexShrink: 0,
          }}>
            <Dumbbell size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {template.name}
              </h3>
              <span style={{
                padding: '2px 8px',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}>
                ME
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {template.meType.replace('_', ' ').toUpperCase()} • Workout {template.workoutNumber} • {template.durationMinutes} min
            </div>
          </div>
        </div>
      </div>

      {targetedWeakness && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--primary-bg)',
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginBottom: 2 }}>
            FOCUS TODAY
          </div>
          <div style={{ fontSize: 13, color: 'var(--foreground)' }}>
            {targetedWeakness}
          </div>
        </div>
      )}

      {loadRegulation && loadRegulation.shouldAdjust && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--foreground)' }}>
            {loadRegulation.reason}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--muted)',
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        <span>{isExpanded ? 'Hide' : 'Show'} exercise list ({template.exercises.length})</span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div style={{
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {template.exercises.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--primary-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {ex.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {ex.sets} × {ex.reps} {ex.load && ex.load !== 'bodyweight' ? `@ ${ex.load}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 12,
            padding: 12,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Rest: Sets</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{template.restProtocol.between_sets_seconds}s</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Rest: Exercises</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{template.restProtocol.between_exercises_seconds}s</div>
            </div>
          </div>
        </div>
      )}

      <Link
        to="/strength-training"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '10px 16px',
          background: 'var(--primary)',
          borderRadius: 8,
          color: 'white',
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        View full strength details
        <ExternalLink size={14} />
      </Link>
    </div>
  );
}
