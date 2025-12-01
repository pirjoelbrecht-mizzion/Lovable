/**
 * Auto-Calculation Status Component
 *
 * Shows real-time status of automatic calculations
 * Can be placed in Settings or as a floating indicator
 */

import { useState, useEffect } from 'react';
import { autoCalculationService, type CalculationJob } from '@/services/autoCalculationService';

export default function AutoCalculationStatus() {
  const [status, setStatus] = useState(autoCalculationService.getStatus());
  const [lastCompleted, setLastCompleted] = useState<CalculationJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<CalculationJob[]>([]);

  useEffect(() => {
    // Update status every second
    const interval = setInterval(() => {
      setStatus(autoCalculationService.getStatus());
    }, 1000);

    // Listen for completion events
    const unsubCompleted = autoCalculationService.on('completed', (job) => {
      setLastCompleted(job);
      setRecentJobs(prev => [job, ...prev].slice(0, 5));
    });

    const unsubFailed = autoCalculationService.on('failed', (job) => {
      setRecentJobs(prev => [job, ...prev].slice(0, 5));
    });

    return () => {
      clearInterval(interval);
      unsubCompleted();
      unsubFailed();
    };
  }, []);

  if (!status.processing && status.queueLength === 0 && !lastCompleted) {
    return null; // Nothing to show
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        maxWidth: 320,
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {status.processing ? (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3b82f6',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        ) : (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
            }}
          />
        )}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
          {status.processing ? 'Computing Metrics...' : 'Calculations Complete'}
        </div>
      </div>

      {/* Current Job */}
      {status.currentJob && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            Currently processing:
          </div>
          <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 500 }}>
            {getJobDisplayName(status.currentJob.type)}
          </div>
        </div>
      )}

      {/* Queue Info */}
      {status.queueLength > 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          {status.queueLength} task{status.queueLength === 1 ? '' : 's'} remaining in queue
        </div>
      )}

      {/* Last Completed */}
      {lastCompleted && !status.processing && (
        <div style={{ fontSize: 12, color: '#22c55e', marginBottom: 8 }}>
          ✅ Last completed: {getJobDisplayName(lastCompleted.type)}
        </div>
      )}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && !status.processing && (
        <details style={{ marginTop: 8, cursor: 'pointer' }}>
          <summary style={{ fontSize: 12, color: '#94a3b8', userSelect: 'none' }}>
            Recent calculations ({recentJobs.length})
          </summary>
          <div style={{ marginTop: 8 }}>
            {recentJobs.map((job, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: job.status === 'completed' ? '#22c55e' : '#ef4444',
                  padding: '4px 0',
                  borderTop: i > 0 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}
              >
                {job.status === 'completed' ? '✅' : '❌'} {getJobDisplayName(job.type)}
                {job.completedAt && job.startedAt && (
                  <span style={{ color: '#64748b', marginLeft: 4 }}>
                    ({job.completedAt - job.startedAt}ms)
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function getJobDisplayName(type: string): string {
  const names: Record<string, string> = {
    weekly_metrics: 'Weekly Metrics (ACWR, Efficiency)',
    pace_profile: 'Pace Profile & HR Zones',
    user_profile: 'User Profile',
    fitness_index: 'Fitness Index',
    full_recalc: 'Full Recalculation',
  };
  return names[type] || type;
}
