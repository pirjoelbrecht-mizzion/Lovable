import { useState, useMemo } from 'react';
import type { LogEntry } from '@/types';

interface PlannedWorkout {
  id: string;
  title: string;
  type: string;
  distanceKm?: number;
  durationMin?: number;
}

interface Props {
  date: string;
  plannedWorkout: PlannedWorkout;
  logEntries: LogEntry[];
  onMatch: (logEntryId: string, matchType: 'exact' | 'combined' | 'manual') => void;
  onSkip: () => void;
}

/**
 * Format date to local date string (YYYY-MM-DD)
 * CRITICAL: Ensures timezone safety - a run at 11 PM Tuesday is Tuesday, not Wednesday UTC
 */
function formatLocalDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00'); // Force local interpretation
  return date.toISOString().split('T')[0];
}

export function WorkoutMatcher({ date, plannedWorkout, logEntries, onMatch, onSkip }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [showCombined, setShowCombined] = useState(false);

  // Display date in user's local timezone
  const displayDate = useMemo(() => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [date]);

  if (logEntries.length === 0) {
    return null;
  }

  // Single activity - auto-suggest it
  if (logEntries.length === 1) {
    const entry = logEntries[0];
    return (
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          marginTop: 12
        }}
      >
        <div className="row" style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🔗</span>
          <div style={{ flex: 1 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
              Match Activity to Plan?
            </div>
            <div className="small" style={{ color: 'var(--muted)', fontSize: 12 }}>
              Link "{entry.title}" to planned {plannedWorkout.title}
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button
            onClick={() => onMatch(entry.id, 'exact')}
            className="btn primary"
            style={{ flex: 1 }}
          >
            ✓ Match
          </button>
          <button
            onClick={onSkip}
            className="btn"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // Multiple activities - show selector
  const totalDistance = logEntries.reduce((sum, e) => sum + (e.km || 0), 0);
  const totalDuration = logEntries.reduce((sum, e) => sum + (e.durationMin || 0), 0);

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
        border: '1px solid rgba(234, 179, 8, 0.2)',
        marginTop: 12
      }}
    >
      <div className="row" style={{ alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
            Multiple Activities Detected
          </div>
          <div className="small" style={{ color: 'var(--muted)', fontSize: 12 }}>
            You logged {logEntries.length} activities on {displayDate}. Which one matches "{plannedWorkout.title}"?
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {logEntries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setSelectedEntry(entry.id)}
            className="btn"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              textAlign: 'left',
              background: selectedEntry === entry.id ? 'var(--primary)' : 'var(--card)',
              border: selectedEntry === entry.id ? '2px solid var(--primary)' : '1px solid var(--line)',
              color: selectedEntry === entry.id ? '#fff' : 'var(--text)'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{entry.title || 'Run'}</div>
              <div className="small" style={{ fontSize: 12, opacity: 0.8 }}>
                {entry.km?.toFixed(1)} km • {entry.durationMin} min
                {entry.hrAvg && ` • ${entry.hrAvg} bpm avg`}
              </div>
            </div>
            {selectedEntry === entry.id && (
              <span style={{ fontSize: 18 }}>✓</span>
            )}
          </button>
        ))}

        <button
          onClick={() => {
            setSelectedEntry('combined');
            setShowCombined(true);
          }}
          className="btn"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            textAlign: 'left',
            background: selectedEntry === 'combined' ? 'var(--accent)' : 'var(--card)',
            border: selectedEntry === 'combined' ? '2px solid var(--accent)' : '1px solid var(--line)',
            borderStyle: 'dashed',
            color: selectedEntry === 'combined' ? '#fff' : 'var(--text)'
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>➕ Combined Total</div>
            <div className="small" style={{ fontSize: 12, opacity: 0.8 }}>
              {totalDistance.toFixed(1)} km • {totalDuration} min (all activities)
            </div>
          </div>
          {selectedEntry === 'combined' && (
            <span style={{ fontSize: 18 }}>✓</span>
          )}
        </button>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button
          onClick={() => {
            if (selectedEntry === 'combined') {
              onMatch(logEntries[0].id, 'combined');
            } else if (selectedEntry) {
              onMatch(selectedEntry, 'exact');
            }
          }}
          disabled={!selectedEntry}
          className="btn primary"
          style={{ flex: 1, opacity: selectedEntry ? 1 : 0.5 }}
        >
          ✓ Match Selected
        </button>
        <button
          onClick={onSkip}
          className="btn"
        >
          Skip
        </button>
      </div>

      {showCombined && (
        <div
          className="small"
          style={{
            marginTop: 12,
            padding: 12,
            background: 'rgba(234, 179, 8, 0.1)',
            borderRadius: 8,
            color: 'var(--accent)',
            fontSize: 12
          }}
        >
          💡 Combined mode will sum distance and time from all activities for load calculations.
        </div>
      )}
    </div>
  );
}
