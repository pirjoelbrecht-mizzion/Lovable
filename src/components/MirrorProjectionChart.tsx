import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import RaceProjectionCard from './RaceProjectionCard';
import { findBestBaselineRace, type BaselineRace } from '@/utils/raceProjection';

export default function MirrorProjectionChart() {
  const [baseline, setBaseline] = useState<BaselineRace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBaseline = async () => {
      setLoading(true);
      try {
        const result = await findBestBaselineRace();
        setBaseline(result);
      } catch (error) {
        console.error('Failed to load baseline race:', error);
        setBaseline(null);
      } finally {
        setLoading(false);
      }
    };

    loadBaseline();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Activity style={{ width: '64px', height: '64px', color: 'rgb(148, 163, 184)', margin: '0 auto 24px', opacity: 0.5 }} />
        <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Loading race projections...
        </p>
      </div>
    );
  }

  if (!baseline) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Activity style={{ width: '64px', height: '64px', color: 'rgb(148, 163, 184)', margin: '0 auto 24px', opacity: 0.5 }} />
        <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          No race data available
        </p>
        <p style={{ color: 'rgb(148, 163, 184)', fontSize: '16px', lineHeight: '1.65' }}>
          Complete a race or significant run (10km+) to see personalized race time projections based on your fitness level.
        </p>
      </div>
    );
  }

  return <RaceProjectionCard baseline={baseline} />;
}
