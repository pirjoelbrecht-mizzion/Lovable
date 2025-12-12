import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from 'lucide-react';
import { estimateZone, zoneBands } from '@/lib/zones';
import type { LogEntry } from '@/types';

interface MirrorZonesChartProps {
  entries: LogEntry[];
  restingHR: number;
  maxHR: number;
}

const ZONE_COLORS = {
  1: '#10b981', // Green - Easy
  2: '#06b6d4', // Cyan - Moderate
  3: '#3b82f6', // Blue - Moderate
  4: '#eab308', // Yellow - Hard
  5: '#ef4444', // Red - Very Hard
};

const ZONE_LABELS = {
  1: 'Easy',
  2: 'Moderate',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very Hard',
};

export default function MirrorZonesChart({ entries, restingHR, maxHR }: MirrorZonesChartProps) {
  const { zoneDistribution, totalTime, bands, recommendation } = useMemo(() => {
    const zones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;

    // Calculate time in each zone
    entries.forEach(entry => {
      if (entry.hrAvg && entry.durationMin) {
        const zone = estimateZone(entry.hrAvg, restingHR, maxHR);
        zones[zone] += entry.durationMin;
        total += entry.durationMin;
      }
    });

    // Convert to percentages
    const distribution = Object.entries(zones).map(([zone, minutes]) => ({
      zone: parseInt(zone),
      label: ZONE_LABELS[parseInt(zone) as keyof typeof ZONE_LABELS],
      value: total > 0 ? Math.round((minutes / total) * 100) : 0,
      minutes: minutes,
      color: ZONE_COLORS[parseInt(zone) as keyof typeof ZONE_COLORS],
    }));

    // Get zone bands for display
    const zoneBandData = zoneBands(restingHR, maxHR);

    // Generate recommendation based on distribution
    let rec = '';
    const z1Pct = distribution[0].value;
    const z2Pct = distribution[1].value;
    const z3Pct = distribution[2].value;
    const z4Pct = distribution[3].value;
    const z5Pct = distribution[4].value;

    const easyPct = z1Pct + z2Pct;
    const moderatePct = z3Pct;
    const hardPct = z4Pct + z5Pct;

    if (easyPct < 70) {
      rec = 'Consider increasing easy-paced training (Zones 1-2) to build aerobic base and improve recovery capacity.';
    } else if (hardPct < 10) {
      rec = 'Add some intensity work (Zones 4-5) to improve lactate threshold and race-specific fitness.';
    } else if (moderatePct > 25) {
      rec = 'Reduce moderate intensity (Zone 3) training. Focus on polarized approach: more easy, strategic hard sessions.';
    } else {
      rec = 'Well-balanced zone distribution. Continue with current training approach for optimal adaptation.';
    }

    return {
      zoneDistribution: distribution,
      totalTime: total,
      bands: zoneBandData,
      recommendation: rec,
    };
  }, [entries, restingHR, maxHR]);

  if (totalTime === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Activity style={{ width: '64px', height: '64px', color: 'rgb(148, 163, 184)', margin: '0 auto 24px', opacity: 0.5 }} />
        <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          No heart rate data available
        </p>
        <p style={{ color: 'rgb(148, 163, 184)', fontSize: '16px', lineHeight: '1.65' }}>
          Heart rate data is needed to calculate training zone distribution. Ensure your activities include HR data.
        </p>
      </div>
    );
  }

  const chartData = zoneDistribution.filter(z => z.value > 0);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {zoneDistribution.map((zone) => (
          <div key={zone.zone} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: zone.color,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                  {zone.value}%
                </span>
                <span style={{ color: 'rgb(148, 163, 184)', fontSize: '14px' }}>
                  Zone {zone.zone}
                </span>
              </div>
              <div style={{ color: 'rgb(148, 163, 184)', fontSize: '13px', marginTop: '2px' }}>
                {zone.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone Bands Reference */}
      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          marginBottom: '32px',
        }}
      >
        <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Your Heart Rate Zones
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
          {bands.map((band) => (
            <div key={band.z} style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgb(148, 163, 184)', fontSize: '12px', marginBottom: '4px' }}>
                Zone {band.z}
              </div>
              <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                {band.lo}-{band.hi}
              </div>
              <div style={{ color: 'rgb(148, 163, 184)', fontSize: '11px' }}>bpm</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          background: 'rgba(34, 211, 238, 0.05)',
          border: '1px solid rgba(34, 211, 238, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
          <Activity style={{ width: '24px', height: '24px', color: '#22d3ee', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ color: '#22d3ee', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              Recommendation
            </h4>
            <p style={{ color: 'rgb(226, 232, 240)', fontSize: '15px', lineHeight: '1.65' }}>
              {recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
