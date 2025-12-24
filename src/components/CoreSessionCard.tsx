import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, Clock, Zap, AlertTriangle } from 'lucide-react';
import type { CoreExercise, CoreEmphasis, CoreFrequencyConfig } from '@/types/strengthTraining';

interface CoreSessionCardProps {
  exercises: CoreExercise[];
  emphasis: CoreEmphasis | null;
  frequency: CoreFrequencyConfig;
  sessionsThisWeek: number;
  sorenessAdjustment?: { adjustmentPercent: number; reason: string };
  onComplete?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  anti_extension: 'Anti-Extension',
  anti_rotation: 'Anti-Rotation',
  lateral_stability: 'Lateral Stability',
  hip_core_linkage: 'Hip-Core Linkage',
};

const CATEGORY_PURPOSES: Record<string, string> = {
  anti_extension: 'Prevents torso collapse under fatigue',
  anti_rotation: 'Stabilizes force transfer on technical terrain',
  lateral_stability: 'Controls pelvis/knee alignment on descents',
  hip_core_linkage: 'Transfers force from legs to torso',
};

export function CoreSessionCard({
  exercises,
  emphasis,
  frequency,
  sessionsThisWeek,
  sorenessAdjustment,
  onComplete,
}: CoreSessionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!emphasis) return null;

  const remainingSessions = Math.max(0, frequency.frequency - sessionsThisWeek);
  const hasAdjustment = sorenessAdjustment && sorenessAdjustment.adjustmentPercent !== 0;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={20} color="#22c55e" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                Core Training
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {CATEGORY_LABELS[emphasis.primary]} focus
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {frequency.durationMinutes} min
              </div>
              <div style={{ fontSize: 11, color: remainingSessions > 0 ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
                {remainingSessions} left this week
              </div>
            </div>
            {expanded ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
          </div>
        </div>

        {hasAdjustment && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={14} color="#fbbf24" />
            <span style={{ fontSize: 12, color: '#fbbf24' }}>
              Volume reduced by {Math.abs(sorenessAdjustment!.adjustmentPercent)}%
            </span>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <div
            style={{
              padding: '4px 10px',
              background: 'rgba(34, 197, 94, 0.2)',
              borderRadius: 6,
              fontSize: 11,
              color: '#22c55e',
              fontWeight: 500,
            }}
          >
            {CATEGORY_LABELS[emphasis.primary]}
          </div>
          <div
            style={{
              padding: '4px 10px',
              background: 'rgba(20, 184, 166, 0.2)',
              borderRadius: 6,
              fontSize: 11,
              color: '#14b8a6',
              fontWeight: 500,
            }}
          >
            {CATEGORY_LABELS[emphasis.secondary]}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              PURPOSE
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {CATEGORY_PURPOSES[emphasis.primary]}
            </div>
          </div>

          {emphasis.adjustments && emphasis.adjustments.length > 0 && (
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 500, marginBottom: 4 }}>
                ADAPTIVE ADJUSTMENTS
              </div>
              {emphasis.adjustments.map((adj, i) => (
                <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  {adj}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            EXERCISES ({exercises.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
                      {exercise.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                      {exercise.coreCategories.map((c) => CATEGORY_LABELS[c]).join(' + ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {exercise.durationSeconds ? (
                      <span style={{ fontSize: 12, color: '#22c55e' }}>
                        {exercise.durationSeconds}s hold
                      </span>
                    ) : exercise.repsDefault ? (
                      <span style={{ fontSize: 12, color: '#22c55e' }}>
                        {exercise.repsDefault} reps
                      </span>
                    ) : null}
                  </div>
                </div>
                {exercise.techniqueCues && exercise.techniqueCues.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {exercise.techniqueCues[0]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '12px',
                background: '#22c55e',
                border: 'none',
                borderRadius: 8,
                color: '#000',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Complete Core Session
            </button>
          )}
        </div>
      )}
    </div>
  );
}
