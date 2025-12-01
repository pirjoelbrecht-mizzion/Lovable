import { useEffect, useState } from 'react';
import { getPaceProfile, recalculatePaceProfile, type PaceProfile } from '@/engine/historicalAnalysis/calculateUserPaceProfile';
import { GRADE_BUCKETS, type GradeBucketKey } from '@/engine/historicalAnalysis/analyzeActivityTerrain';
import * as bus from '@/lib/bus';

export function PaceProfileCard() {
  const [profile, setProfile] = useState<PaceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();

    // Listen for log updates and refresh pace profile
    const handleLogUpdate = async () => {
      console.log('[PaceProfileCard] Log updated, recalculating pace profile...');
      try {
        const data = await recalculatePaceProfile();
        setProfile(data);
        console.log('[PaceProfileCard] Pace profile updated automatically');
      } catch (err) {
        console.error('[PaceProfileCard] Failed to auto-update pace profile:', err);
      }
    };

    const unsubscribe = bus.on('log:updated', handleLogUpdate);
    return unsubscribe;
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await getPaceProfile();
      console.log('[PaceProfileCard] Loaded profile:', data);
      if (data) {
        console.log('[PaceProfileCard] Sample size:', data.sampleSize);
        console.log('[PaceProfileCard] Grade buckets:', Object.keys(data.gradeBucketPaces));
        console.log('[PaceProfileCard] Base flat pace:', data.baseFlatPaceMinKm);
      } else {
        console.log('[PaceProfileCard] No profile data found - analyzing activities...');
        // Auto-analyze on first load if no profile exists
        setLoading(false);
        await handleInitialAnalysis();
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error('Failed to load pace profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitialAnalysis() {
    setRefreshing(true);
    try {
      console.log('[PaceProfileCard] Starting initial terrain analysis...');
      const { analyzeUserActivities } = await import('@/engine/historicalAnalysis/analyzeActivityTerrain');
      const analyzedCount = await analyzeUserActivities();
      console.log(`[PaceProfileCard] Analyzed ${analyzedCount} activities`);

      console.log('[PaceProfileCard] Calculating pace profile...');
      const data = await recalculatePaceProfile();
      setProfile(data);
      console.log('[PaceProfileCard] Pace profile ready');
    } catch (err) {
      console.error('Failed to analyze and calculate pace profile:', err);
    } finally {
      setRefreshing(false);
    }
  }

  function formatPace(paceMinKm: number): string {
    const mins = Math.floor(paceMinKm);
    const secs = Math.round((paceMinKm - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')} /km`;
  }

  function getDataQualityColor(quality: string): string {
    switch (quality) {
      case 'excellent':
        return '#22c55e';
      case 'good':
        return '#3b82f6';
      case 'fair':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  }

  function getDataQualityLabel(quality: string): string {
    switch (quality) {
      case 'excellent':
        return 'Excellent Data';
      case 'good':
        return 'Good Data';
      case 'fair':
        return 'Fair Data';
      default:
        return 'Insufficient Data';
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          Loading pace profile...
        </div>
      </div>
    );
  }

  if (!profile || !profile.hasMinimumData) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          📊
        </div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
          No Pace Data Yet
        </h3>
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <p style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '15px', fontWeight: 600 }}>
            To see your ACTUAL pace data by grade:
          </p>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#92400e', fontSize: '14px', lineHeight: '1.6' }}>
            <li>Import activities with <strong>elevation data</strong></li>
            <li>Need at least <strong>3 activities</strong> with varied terrain</li>
            <li>System analyzes your real performance on uphills and downhills</li>
            <li>More activities = more accurate pace estimates</li>
          </ol>
        </div>
        <div style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
        }}>
          <strong>Current data:</strong> {profile?.sampleSize || 0} activities analyzed
        </div>
        <button
          onClick={() => window.location.href = '/settings?tab=training'}
          style={{
            padding: '14px 32px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          Import Activities
        </button>
      </div>
    );
  }

  const daysSinceCalculation = Math.floor(
    (Date.now() - new Date(profile.lastCalculatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        backgroundColor: '#ecfdf5',
        border: '2px solid #10b981',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
          Using YOUR ACTUAL Running Data
        </div>
        <div style={{ fontSize: '12px', color: '#047857' }}>
          Calculated from {profile.sampleSize} activities with real elevation and pace data
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>
            Grade-Specific Paces
          </h3>
          <div style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: getDataQualityColor(profile.dataQuality) + '20',
            color: getDataQualityColor(profile.dataQuality),
            fontWeight: 500,
          }}>
            {getDataQualityLabel(profile.dataQuality)}
          </div>
        </div>
        {refreshing && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            Analyzing...
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Flat Pace
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
            {formatPace(profile.baseFlatPaceMinKm)}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            {profile.segmentCounts.flat} segments
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>
            Uphill Pace
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
            {formatPace(profile.baseFlatPaceMinKm * profile.uphillAdjustmentFactor)}
          </div>
          <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
            {profile.segmentCounts.uphill} segments
          </div>
        </div>

        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>
            Downhill Pace
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
            {formatPace(profile.baseFlatPaceMinKm * profile.downhillAdjustmentFactor)}
          </div>
          <div style={{ fontSize: '11px', color: '#86efac', marginTop: '4px' }}>
            {profile.segmentCounts.downhill} segments
          </div>
        </div>
      </div>

      {Object.keys(profile.gradeBucketPaces).length > 0 && (
        <>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
          }}>
            Grade-Specific Paces
          </h4>
          <div style={{
            display: 'grid',
            gap: '8px',
            marginBottom: '20px',
          }}>
            {(() => {
              // Sort buckets: uphill (steepest to gentlest) → flat → downhill (gentlest to steepest)
              const sortedEntries = Object.entries(profile.gradeBucketPaces).sort(([keyA], [keyB]) => {
                const bucketA = GRADE_BUCKETS[keyA as GradeBucketKey];
                const bucketB = GRADE_BUCKETS[keyB as GradeBucketKey];
                // Sort by average grade (descending: steepest uphill first, steepest downhill last)
                const avgA = (bucketA.min + bucketA.max) / 2;
                const avgB = (bucketB.min + bucketB.max) / 2;
                return avgB - avgA;
              });

              return sortedEntries.map(([key, data]) => {
                const bucket = GRADE_BUCKETS[key as GradeBucketKey];
                if (!bucket) return null;

                // Color coding based on grade
                const avgGrade = (bucket.min + bucket.max) / 2;
                let bgColor = '#f9fafb';
                let textColor = '#1f2937';

                if (avgGrade > 10) {
                  bgColor = '#fef2f2'; // steep uphill - light red
                  textColor = '#991b1b';
                } else if (avgGrade > 4) {
                  bgColor = '#fff7ed'; // moderate uphill - light orange
                  textColor = '#c2410c';
                } else if (avgGrade < -10) {
                  bgColor = '#f0fdf4'; // steep downhill - light green
                  textColor = '#166534';
                } else if (avgGrade < -4) {
                  bgColor = '#f0fdfa'; // moderate downhill - light teal
                  textColor = '#0f766e';
                }

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: bgColor,
                      borderRadius: '6px',
                      fontSize: '14px',
                      borderLeft: `3px solid ${avgGrade > 0 ? '#ef4444' : avgGrade < 0 ? '#10b981' : '#6b7280'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 500, color: textColor }}>
                        {bucket.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>
                        {formatPace(data.paceMinKm)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        backgroundColor: '#e5e7eb',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}>
                        {data.sampleSize}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}

      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>
          Based on {profile.sampleSize} activities (last {profile.calculationPeriodDays} days)
        </span>
        <span>
          Updated {daysSinceCalculation === 0 ? 'today' : `${daysSinceCalculation}d ago`}
        </span>
      </div>
    </div>
  );
}
