import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceArea } from 'recharts';
import { formatTime, type BaselineRace } from '@/utils/raceProjection';

interface RaceProjectionCardProps {
  baseline: BaselineRace | null;
}

const RACE_DISTANCES = [
  { km: 10, label: '10K' },
  { km: 21.0975, label: 'HALF' },
  { km: 42.195, label: 'MARATHON' },
  { km: 50, label: '50K' },
  { km: 100, label: '100K' },
];

function calculateProjectedTime(baseDistanceKm: number, baseTimeMin: number, targetDistanceKm: number): number {
  return baseTimeMin * Math.pow(targetDistanceKm / baseDistanceKm, 1.06);
}

export default function RaceProjectionCard({ baseline }: RaceProjectionCardProps) {
  const projectionData = useMemo(() => {
    if (!baseline) return [];

    return RACE_DISTANCES.map((race, idx) => {
      const predictedTimeMin = calculateProjectedTime(
        baseline.distanceKm,
        baseline.timeMin,
        race.km
      );

      return {
        distance: race.label,
        km: race.km,
        time: formatTime(predictedTimeMin),
        timeMinutes: predictedTimeMin,
        confidence: 75,
        index: idx,
      };
    });
  }, [baseline]);

  if (!baseline) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] to-[#050a14] p-12 text-center" style={{ border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <h2
          className="text-3xl font-bold mb-4"
          style={{
            color: '#ffffff',
            letterSpacing: '0.2em',
            textShadow: '0 2px 10px rgba(255, 255, 255, 0.3)'
          }}
        >
          RACE PROJECTION
        </h2>
        <p
          className="text-lg mb-3 font-semibold"
          style={{
            color: '#22d3ee',
            textShadow: '0 1px 4px rgba(34, 211, 238, 0.5)'
          }}
        >
          No race data available
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Complete a race or long run (10km+) to see projections
        </p>
      </div>
    );
  }

  const minTime = Math.min(...projectionData.map(d => d.timeMinutes));
  const maxTime = Math.max(...projectionData.map(d => d.timeMinutes));
  const padding = (maxTime - minTime) * 0.2;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] to-[#050a14] p-8 text-white" style={{ border: '1px solid rgba(59, 130, 246, 0.3)' }}>
      {/* Clean subtle starfield */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 60% 70%, white, transparent)`,
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className="text-3xl font-bold mb-2"
            style={{
              color: '#ffffff',
              letterSpacing: '0.2em',
              textShadow: '0 2px 10px rgba(255, 255, 255, 0.3)'
            }}
          >
            RACE PROJECTION
          </h2>
          <p
            className="text-sm font-medium"
            style={{
              color: '#22d3ee',
              textShadow: '0 1px 4px rgba(34, 211, 238, 0.5)'
            }}
          >
            Time projections with 75% confidence
          </p>
        </div>

        {/* Chart */}
        <div style={{ height: '400px', marginBottom: '32px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 60, right: 40, left: 40, bottom: 40 }}
            >
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <filter id="neonGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <XAxis
                dataKey="distance"
                stroke="transparent"
                tick={{
                  fill: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  style: { textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)' }
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                hide
                domain={[minTime - padding, maxTime + padding]}
              />

              {/* Main line - Beautiful Gradient */}
              <Line
                type="monotone"
                dataKey="timeMinutes"
                stroke="url(#lineGradient)"
                strokeWidth={5}
                filter="url(#neonGlow)"
                dot={(props) => {
                  const { cx, cy, key, index } = props;
                  const colors = ['#a855f7', '#8b5cf6', '#3b82f6', '#06b6d4', '#22d3ee'];
                  const dotColor = colors[index] || '#3b82f6';
                  return (
                    <g key={key}>
                      {/* Outer glow */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={12}
                        fill={`${dotColor}40`}
                        filter="url(#neonGlow)"
                      />
                      {/* Main dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill={dotColor}
                        stroke="white"
                        strokeWidth={3}
                      />
                    </g>
                  );
                }}
                label={(props) => {
                  const { x, y, index } = props;
                  const dataPoint = projectionData[index];
                  if (!dataPoint) return null;

                  return (
                    <g>
                      {/* Time value - Bright white */}
                      <text
                        x={x}
                        y={y - 32}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize={22}
                        fontWeight="700"
                        style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}
                      >
                        {dataPoint.time}
                      </text>
                      {/* Confidence label - Cyan */}
                      <text
                        x={x}
                        y={y - 12}
                        fill="#22d3ee"
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="500"
                      >
                        Confidence {dataPoint.confidence}%
                      </text>
                    </g>
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distance cards - Clean design */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {projectionData.map((race, idx) => {
            const colors = ['#a855f7', '#8b5cf6', '#3b82f6', '#06b6d4', '#22d3ee'];
            const cardColor = colors[idx] || '#3b82f6';
            const isBaseline = Math.abs(race.km - baseline.distanceKm) < 0.5;

            return (
              <div
                key={race.distance}
                className="relative rounded-xl p-4 text-center"
                style={{
                  background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}05)`,
                  border: `2px solid ${cardColor}60`,
                  boxShadow: `0 0 20px ${cardColor}20`
                }}
              >
                <div
                  className="text-xs font-bold mb-2 tracking-widest"
                  style={{
                    color: '#ffffff',
                    opacity: 0.9,
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {race.distance}
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: '#ffffff',
                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {race.time}
                </div>

                {/* Highlight baseline race */}
                {isBaseline && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: '0 0 8px #22d3ee' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="text-center pt-4 border-t border-white/10">
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Based on <span className="font-semibold" style={{ color: '#22d3ee' }}>{baseline.name}</span> • {baseline.distanceKm.toFixed(1)}km in {formatTime(baseline.timeMin)}
          </p>
        </div>
      </div>
    </div>
  );
}
