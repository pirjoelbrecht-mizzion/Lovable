import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { findBestBaselineRace, generateProjections, formatTime, type BaselineRace } from '@/utils/raceProjection';

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
      <div
        className="relative overflow-hidden rounded-2xl p-12"
        style={{
          background: 'radial-gradient(ellipse at top, rgb(15, 23, 42), rgb(88, 28, 135), rgb(15, 23, 42))',
        }}
      >
        <div className="text-center">
          <h2
            className="text-3xl font-extrabold text-white mb-2 tracking-wider"
            style={{
              textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)',
            }}
          >
            RACE PROJECTION
          </h2>
          <p className="text-lg text-cyan-400 mb-8">No race data available</p>
          <p className="text-sm text-slate-400">Complete a race or long run to see projections</p>
        </div>
      </div>
    );
  }

  const minTime = Math.min(...projectionData.map(d => d.timeMinutes));
  const maxTime = Math.max(...projectionData.map(d => d.timeMinutes));
  const timeRange = maxTime - minTime;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8"
      style={{
        background: 'radial-gradient(ellipse at top, rgb(15, 23, 42), rgb(88, 28, 135), rgb(15, 23, 42))',
        boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
      }}
    >
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
      }} />

      <div className="relative z-10">
        <h2
          className="text-3xl font-extrabold text-white text-center mb-2 tracking-wider"
          style={{
            textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)',
          }}
        >
          RACE PROJECTION
        </h2>
        <p className="text-lg text-cyan-400 text-center mb-8">
          Time projections with 75% confidence
        </p>

        <div style={{ height: '350px', marginBottom: '32px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 60, right: 30, left: 30, bottom: 20 }}
            >
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" />
              <XAxis
                dataKey="distance"
                stroke="rgba(34, 211, 238, 0.6)"
                tick={{ fill: '#22d3ee', fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: 'rgba(34, 211, 238, 0.3)' }}
              />
              <YAxis hide domain={[minTime - timeRange * 0.2, maxTime + timeRange * 0.2]} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  borderRadius: '8px',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Line
                type="monotone"
                dataKey="timeMinutes"
                stroke="url(#lineGradient)"
                strokeWidth={4}
                dot={{
                  r: 8,
                  fill: '#ffffff',
                  stroke: '#3b82f6',
                  strokeWidth: 3,
                  filter: 'url(#glow)',
                }}
                activeDot={{
                  r: 10,
                  fill: '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                label={({ x, y, value, index }) => {
                  const dataPoint = projectionData[index];
                  return (
                    <g>
                      <text
                        x={x}
                        y={y - 25}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize={16}
                        fontWeight="bold"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))',
                        }}
                      >
                        {dataPoint.time}
                      </text>
                      <text
                        x={x}
                        y={y - 8}
                        fill="#22d3ee"
                        textAnchor="middle"
                        fontSize={11}
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

        <div className="grid grid-cols-5 gap-4">
          {projectionData.map((race) => (
            <div
              key={race.distance}
              className="relative rounded-xl p-4 text-center"
              style={{
                background: 'transparent',
                border: '2px solid rgba(59, 130, 246, 0.5)',
                boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2)',
              }}
            >
              <div className="absolute inset-0 rounded-xl opacity-30" style={{
                background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
              }} />
              <div className="relative z-10">
                <div className="text-white font-bold text-sm mb-2 tracking-wide">
                  {race.distance}
                </div>
                <div
                  className="text-2xl text-white font-bold"
                  style={{
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {race.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 p-4 rounded-lg text-center"
          style={{
            background: 'rgba(34, 211, 238, 0.1)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
          }}
        >
          <p className="text-sm text-cyan-400">
            Based on: <span className="font-bold text-white">{baseline.name}</span>
            {' '}({baseline.distanceKm.toFixed(1)}km in {formatTime(baseline.timeMin)})
          </p>
        </div>
      </div>
    </div>
  );
}
