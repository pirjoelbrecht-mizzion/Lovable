/**
 * Weekly Distance & Vertical Gain Chart
 *
 * Combined chart for trail runners showing:
 * - Distance (km) as bars
 * - Vertical gain (m) as line
 * - Combined load as area
 * - 10% progression thresholds
 * - Safety warnings for excessive increases
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import {
  calculateWeeklyLoads,
  getLoadConfig,
  getSafetyColor,
  getSafetyWarning,
  formatLoadSummary,
  type WeeklyLoad,
} from '@/utils/trailLoad';
import type { UserProfile } from '@/types/onboarding';

interface Props {
  data: Array<{ week: string; distance: number; vertical: number }>;
  profile: Partial<UserProfile> | null;
  showCombinedLoad?: boolean;
  showWarnings?: boolean;
}

export default function WeeklyDistanceVertChart({
  data,
  profile,
  showCombinedLoad = true,
  showWarnings = true,
}: Props) {
  const config = useMemo(() => getLoadConfig(profile), [profile]);

  const loads = useMemo(
    () => calculateWeeklyLoads(data, config),
    [data, config]
  );

  const currentWeekLoad = loads[loads.length - 1];
  const warning = showWarnings && currentWeekLoad ? getSafetyWarning(currentWeekLoad) : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as WeeklyLoad;

    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, color: 'white', marginBottom: 8 }}>
          {data.week}
        </div>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>
          📏 Distance: <span style={{ color: '#60a5fa' }}>{data.distance.toFixed(1)} km</span>
        </div>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>
          🧗‍♂️ Vertical: <span style={{ color: '#f472b6' }}>{data.vertical.toFixed(0)} m</span>
        </div>
        {showCombinedLoad && (
          <div style={{ color: '#94a3b8', marginBottom: 4 }}>
            💪 Combined Load:{' '}
            <span style={{ color: '#a78bfa' }}>{data.combinedLoad.toFixed(1)} km-eq</span>
          </div>
        )}
        {data.distChangePercent !== undefined && (
          <>
            <div
              style={{
                height: 1,
                background: 'rgba(255, 255, 255, 0.1)',
                margin: '8px 0',
              }}
            />
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Week-over-week change:
            </div>
            <div style={{ fontSize: 12, color: data.overDist ? '#f87171' : '#94a3b8' }}>
              📏 {isFinite(data.distChangePercent)
                ? `${data.distChangePercent > 0 ? '+' : ''}${data.distChangePercent.toFixed(1)}%`
                : 'N/A'}
            </div>
            <div style={{ fontSize: 12, color: data.overVert ? '#f87171' : '#94a3b8' }}>
              🧗‍♂️ {isFinite(data.vertChangePercent!)
                ? `${data.vertChangePercent! > 0 ? '+' : ''}${data.vertChangePercent!.toFixed(1)}%`
                : 'N/A'}
            </div>
            {showCombinedLoad && (
              <div style={{ fontSize: 12, color: data.overCombined ? '#f87171' : '#94a3b8' }}>
                💪 {isFinite(data.combinedChangePercent!)
                  ? `${data.combinedChangePercent! > 0 ? '+' : ''}${data.combinedChangePercent!.toFixed(1)}%`
                  : 'N/A'}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 16,
        padding: 20,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 8px 0' }}>
          Weekly Distance & Vertical Gain
        </h3>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
          Combined load tracking for trail running progression
        </p>
      </div>

      {warning && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ color: '#f87171', fontSize: 14 }}>{warning}</div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={loads} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <defs>
            <linearGradient id="combinedLoadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis dataKey="week" stroke="#94a3b8" style={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            stroke="#60a5fa"
            style={{ fontSize: 12 }}
            label={{ value: 'km', angle: -90, position: 'insideLeft', fill: '#60a5fa' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#f472b6"
            style={{ fontSize: 12 }}
            label={{ value: 'vert (m)', angle: -90, position: 'insideRight', fill: '#f472b6' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: 13, color: '#94a3b8' }}
          />

          {showCombinedLoad && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="combinedLoad"
              fill="url(#combinedLoadGradient)"
              stroke="#a78bfa"
              strokeWidth={1.5}
              name="Combined Load (km-eq)"
            />
          )}

          <Bar yAxisId="left" dataKey="distance" name="Distance (km)" radius={[4, 4, 0, 0]}>
            {loads.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getSafetyColor(entry)} />
            ))}
          </Bar>

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="vertical"
            stroke="#f472b6"
            strokeWidth={2.5}
            name="Vertical Gain (m)"
            dot={{
              r: 5,
              stroke: '#f472b6',
              strokeWidth: 2,
              fill: (entry: any) => (entry.payload.overVert ? '#ef4444' : 'white'),
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
          <strong style={{ color: '#60a5fa' }}>Current Week Load:</strong>
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          {formatLoadSummary(currentWeekLoad, config)}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
        <div style={{ marginBottom: 4 }}>
          🟢 Safe progression (&lt;5%) | �� Approaching limit (5-10%) | 🔴 Over limit (&gt;10%)
        </div>
        <div>
          Note: {config.verticalToKmRatio}m of vertical gain ≈ 1km of distance for load calculation
        </div>
      </div>
    </div>
  );
}
