import { useState } from 'react';
import ClimateInsightsPanel from '@/components/ClimateInsightsPanel';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ToastHost';
import { backfillLocationsFromPolyline } from '@/utils/backfillLocationsFromPolyline';

export default function EnvironmentalLearning() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const handleClearTestData = async () => {
    setClearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('Please log in', 'error');
        return;
      }

      const { error } = await supabase
        .from('climate_performance')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing climate data:', error);
        toast('Failed to clear data', 'error');
      } else {
        toast('Climate data cleared', 'success');
        setShowClearConfirm(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
      toast('Failed to clear data', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleBackfillStrava = async () => {
    setBackfilling(true);
    try {
      toast('Extracting locations from GPS data...', 'info');
      const result = await backfillLocationsFromPolyline();
      toast(`Updated ${result.updated} activities with locations (${result.climateUpdated} climate records, ${result.skipped} skipped)`, 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Error backfilling:', error);
      toast(error.message || 'Failed to backfill data', 'error');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: 'white', fontWeight: 700 }}>
              Climate Performance Insights
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Understand how temperature, humidity, and location impact your training performance
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Data
          </button>
        </div>
        <button
          onClick={handleBackfillStrava}
          disabled={backfilling}
          style={{
            padding: '10px 16px',
            background: backfilling ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: backfilling ? 'not-allowed' : 'pointer',
            opacity: backfilling ? 0.6 : 1,
            width: '100%',
          }}
        >
          {backfilling ? 'Extracting locations from GPS data...' : 'Extract Locations from GPS Data'}
        </button>
      </div>

      <ClimateInsightsPanel />

      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: '#1a1d24',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: 'white' }}>
              Clear Climate Data?
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
              This will delete all climate performance data. You can regenerate test data or wait for real data to accumulate from your activities.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearTestData}
                disabled={clearing}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  opacity: clearing ? 0.6 : 1,
                }}
              >
                {clearing ? 'Clearing...' : 'Clear Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
