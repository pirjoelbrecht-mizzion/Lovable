import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { Macrocycle, SeasonPlan } from '@/types/seasonPlan';
import { getProgressInSeason } from '@/utils/seasonPlanGenerator';
import { MACROCYCLE_COLORS, MACROCYCLE_NAMES } from '@/types/seasonPlan';

interface SeasonWheelProps {
  seasonPlan: SeasonPlan;
  showTodayMarker?: boolean;
  size?: number;
}

export default function SeasonWheel({ seasonPlan, showTodayMarker = true, size = 280 }: SeasonWheelProps) {
  const chartData = seasonPlan.macrocycles.map(m => ({
    name: m.displayName,
    value: m.durationWeeks,
    color: m.color,
    phase: m.phase,
    raceId: m.raceId,
  }));

  const progress = getProgressInSeason(seasonPlan);
  const isActive = progress > 0 && progress < 100;

  const today = new Date();
  const seasonStartDate = new Date(seasonPlan.seasonStart);
  const seasonEndDate = new Date(seasonPlan.seasonEnd);

  const totalDaysRemaining = Math.max(0, Math.ceil((seasonEndDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));
  const weeksRemaining = Math.ceil(totalDaysRemaining / 7);
  const monthsRemaining = Math.ceil(totalDaysRemaining / 30);

  const useMonths = weeksRemaining > 12;
  const displayValue = useMonths ? monthsRemaining : weeksRemaining;
  const displayUnit = useMonths ? 'Months' : 'Weeks';

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const macrocycle = seasonPlan.macrocycles.find(m => m.phase === data.phase);

    if (!macrocycle) return null;

    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.name}</div>
        <div style={{ color: 'var(--muted)' }}>
          {macrocycle.durationWeeks} weeks
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
          {new Date(macrocycle.startDate).toLocaleDateString()} - {new Date(macrocycle.endDate).toLocaleDateString()}
        </div>
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
          {macrocycle.description}
        </div>
      </div>
    );
  };

  const CustomLegend = () => {
    const uniquePhases = new Set(chartData.map(d => d.phase));
    const phaseLegend = Array.from(uniquePhases).map(phase => ({
      phase,
      label: MACROCYCLE_NAMES[phase as keyof typeof MACROCYCLE_NAMES],
      color: MACROCYCLE_COLORS[phase as keyof typeof MACROCYCLE_COLORS],
    }));

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 20 }}>
        {phaseLegend.map((entry) => (
          <div key={entry.phase} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: entry.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{entry.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={size * 0.28}
              outerRadius={size * 0.42}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>
            {displayValue}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
            {displayUnit} Left
          </div>
        </div>

        {showTodayMarker && isActive && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size * 0.5,
              height: 2,
              background: 'var(--brand)',
              transformOrigin: '0% 50%',
              transform: `translate(-100%, -50%) rotate(${90 - (progress / 100) * 360}deg)`,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -6,
                top: -4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--brand)',
                border: '2px solid var(--bg)',
              }}
            />
          </div>
        )}
      </div>

      <CustomLegend />
    </div>
  );
}
