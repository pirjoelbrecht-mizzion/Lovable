import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { EnergyDynamics } from '@/types/physiology';

type EnergyFatigueDynamicsChartProps = {
  energyDynamics: EnergyDynamics;
  distanceKm: number;
  showCompareAll?: boolean;
};

const COLORS = {
  conservative: '#22c55e',
  target: '#3b82f6',
  aggressive: '#ef4444',
};

function LegendHelp() {
  return (
    <div
      style={{
        padding: 12,
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        borderLeft: '4px solid var(--brand)',
        fontSize: '0.85rem',
        lineHeight: 1.6,
      }}
    >
      <strong>How to read:</strong>
      <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
        <li>
          <span style={{ color: COLORS.conservative, fontWeight: 600 }}>Conservative</span>: Slower
          fatigue, longer endurance
        </li>
        <li>
          <span style={{ color: COLORS.target, fontWeight: 600 }}>Target</span>: Balanced pacing
        </li>
        <li>
          <span style={{ color: COLORS.aggressive, fontWeight: 600 }}>Aggressive</span>: Faster
          fatigue, shorter endurance
        </li>
      </ul>
      <p style={{ margin: '8px 0 0 0', fontStyle: 'italic' }}>
        Solid lines = fatigue buildup (left axis); dashed lines = energy reserves (right axis).
        Red zone at 20% energy indicates bonking risk.
      </p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: '0.85rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((entry: any, index: number) => {
        const nameParts = entry.name.split(' ');
        const strategy = nameParts[0];
        const metric = nameParts[1];
        const color = entry.stroke || entry.color;

        return (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div
              style={{
                width: 12,
                height: 2,
                background: color,
                borderRadius: 2,
              }}
            />
            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
              {strategy} {metric}:
            </span>
            <span style={{ fontWeight: 600, marginLeft: 'auto' }}>
              {entry.value !== null ? `${entry.value.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function EnergyFatigueDynamicsChart({
  energyDynamics,
  distanceKm,
  showCompareAll: initialShowCompareAll = true,
}: EnergyFatigueDynamicsChartProps) {
  const [showCompareAll, setShowCompareAll] = useState(initialShowCompareAll);
  const [isMobile, setIsMobile] = useState(false);
  const [showLegendHelp, setShowLegendHelp] = useState(false);

  const selectedStrategy = energyDynamics.selectedStrategy || 'target';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const chartData = useMemo(() => {
    const maxLen = Math.max(
      energyDynamics.conservative.length,
      energyDynamics.target.length,
      energyDynamics.aggressive.length
    );

    const data = [];
    for (let i = 0; i < maxLen; i++) {
      const conservativePoint = energyDynamics.conservative[i];
      const targetPoint = energyDynamics.target[i];
      const aggressivePoint = energyDynamics.aggressive[i];

      data.push({
        distance: conservativePoint?.distanceKm || targetPoint?.distanceKm || aggressivePoint?.distanceKm || i,
        conservativeFatigue: conservativePoint?.fatiguePct || null,
        conservativeEnergy: conservativePoint?.glycogenPct || null,
        targetFatigue: targetPoint?.fatiguePct || null,
        targetEnergy: targetPoint?.glycogenPct || null,
        aggressiveFatigue: aggressivePoint?.fatiguePct || null,
        aggressiveEnergy: aggressivePoint?.glycogenPct || null,
      });
    }
    return data;
  }, [energyDynamics]);

  const getStrokeWidth = (strategy: string) => {
    return selectedStrategy === strategy ? 3 : 2;
  };

  const isVisible = (strategy: string) => {
    return showCompareAll || selectedStrategy === strategy;
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'aggressive':
        return '🔥 Aggressive';
      case 'target':
        return '⚖️ Target';
      case 'conservative':
        return '🐢 Conservative';
      default:
        return strategy;
    }
  };

  const chartHeight = isMobile ? 280 : 400;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem' }}>
          Energy & Fatigue Dynamics
          {selectedStrategy && (
            <span
              style={{
                marginLeft: 8,
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                color: 'var(--brand)',
                fontWeight: 700,
              }}
            >
              ({getStrategyLabel(selectedStrategy)})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isMobile && (
            <button
              className="btn small"
              onClick={() => setShowLegendHelp(!showLegendHelp)}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                background: 'var(--bg-secondary)',
                minWidth: 'auto',
              }}
              aria-label="Toggle legend help"
            >
              ℹ️ Legend
            </button>
          )}
          <button
            className="btn small"
            onClick={() => setShowCompareAll(!showCompareAll)}
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              background: showCompareAll ? 'var(--brand)' : 'var(--bg-secondary)',
              color: showCompareAll ? 'white' : 'inherit',
            }}
          >
            {showCompareAll ? 'Focus Selected' : 'Compare All'}
          </button>
        </div>
      </div>

      {isMobile && showLegendHelp && (
        <div style={{ marginBottom: 12 }}>
          <LegendHelp />
        </div>
      )}

      {!isMobile && (
        <div style={{ marginBottom: 12 }}>
          <LegendHelp />
        </div>
      )}

      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: isMobile ? 10 : 30,
            left: isMobile ? -10 : 0,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.3} />

          <XAxis
            dataKey="distance"
            stroke="var(--muted)"
            style={{ fontSize: isMobile ? 10 : 12 }}
            tick={{ fill: 'var(--muted)' }}
            label={{
              value: 'Distance (km)',
              position: 'insideBottom',
              offset: -5,
              fill: 'var(--muted)',
              style: { fontSize: isMobile ? 10 : 12 },
            }}
          />

          <YAxis
            yAxisId="left"
            orientation="left"
            domain={[0, 100]}
            stroke="var(--muted)"
            style={{ fontSize: isMobile ? 10 : 12 }}
            tick={{ fill: 'var(--muted)' }}
            label={{
              value: 'Fatigue (%)',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--muted)',
              style: { fontSize: isMobile ? 10 : 12 },
            }}
            tickFormatter={(value) => `${value}%`}
          />

          {!isMobile && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              stroke="var(--muted)"
              style={{ fontSize: 12 }}
              tick={{ fill: 'var(--muted)' }}
              label={{
                value: 'Energy Reserves (%)',
                angle: 90,
                position: 'insideRight',
                fill: 'var(--muted)',
                style: { fontSize: 12 },
              }}
              tickFormatter={(value) => `${value}%`}
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: isMobile ? 10 : 11 }}
            iconType="line"
          />

          {!isMobile && (
            <ReferenceLine
              yAxisId="right"
              y={20}
              stroke={COLORS.aggressive}
              strokeDasharray="3 3"
              opacity={0.5}
              label={{
                value: 'Bonking Risk',
                fill: COLORS.aggressive,
                fontSize: 10,
                position: 'right',
              }}
            />
          )}

          {isVisible('aggressive') && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="aggressiveFatigue"
              stroke={COLORS.aggressive}
              strokeWidth={getStrokeWidth('aggressive')}
              dot={selectedStrategy === 'aggressive' ? { r: 2 } : false}
              name="Aggressive Fatigue"
              connectNulls
            />
          )}

          {isVisible('target') && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="targetFatigue"
              stroke={COLORS.target}
              strokeWidth={getStrokeWidth('target')}
              dot={selectedStrategy === 'target' ? { r: 2 } : false}
              name="Target Fatigue"
              connectNulls
            />
          )}

          {isVisible('conservative') && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="conservativeFatigue"
              stroke={COLORS.conservative}
              strokeWidth={getStrokeWidth('conservative')}
              dot={selectedStrategy === 'conservative' ? { r: 2 } : false}
              name="Conservative Fatigue"
              connectNulls
            />
          )}

          {isVisible('aggressive') && (
            <Line
              yAxisId={isMobile ? 'left' : 'right'}
              type="monotone"
              dataKey="aggressiveEnergy"
              stroke={COLORS.aggressive}
              strokeWidth={getStrokeWidth('aggressive')}
              strokeDasharray="5 5"
              dot={false}
              name="Aggressive Energy"
              connectNulls
            />
          )}

          {isVisible('target') && (
            <Line
              yAxisId={isMobile ? 'left' : 'right'}
              type="monotone"
              dataKey="targetEnergy"
              stroke={COLORS.target}
              strokeWidth={getStrokeWidth('target')}
              strokeDasharray="5 5"
              dot={false}
              name="Target Energy"
              connectNulls
            />
          )}

          {isVisible('conservative') && (
            <Line
              yAxisId={isMobile ? 'left' : 'right'}
              type="monotone"
              dataKey="conservativeEnergy"
              stroke={COLORS.conservative}
              strokeWidth={getStrokeWidth('conservative')}
              strokeDasharray="5 5"
              dot={false}
              name="Conservative Energy"
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div
        style={{
          padding: 16,
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <div className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
          Time-to-Exhaustion
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 12 : 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: COLORS.aggressive,
              }}
            />
            <span className="small">
              Aggressive: <b>{energyDynamics.timeToExhaustion.aggressive} km</b>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: COLORS.target,
              }}
            />
            <span className="small">
              Target: <b>{energyDynamics.timeToExhaustion.target} km</b>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: COLORS.conservative,
              }}
            />
            <span className="small">
              Conservative: <b>{energyDynamics.timeToExhaustion.conservative} km</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
