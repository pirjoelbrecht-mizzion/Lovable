import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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
      <div
        className="relative overflow-hidden rounded-2xl p-12"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
  const padding = (maxTime - minTime) * 0.3;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(180deg, #0a0e27 0%, #1a1042 50%, #0a0e27 100%)',
        padding: '48px 32px',
        boxShadow: '0 0 60px rgba(139, 92, 246, 0.4), inset 0 0 80px rgba(139, 92, 246, 0.1)',
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(1px 1px at 20% 40%, white, transparent),
            radial-gradient(1px 1px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(1px 1px at 90% 60%, white, transparent)
          `,
          backgroundSize: '100% 100%, 100% 100%, 200px 200px, 200px 200px, 300px 300px, 250px 250px, 280px 280px',
        }}
      />

      <div className="relative z-10">
        <h2
          className="text-4xl font-extrabold text-white text-center mb-3 tracking-[0.3em]"
          style={{
            textShadow: '0 0 30px rgba(59, 130, 246, 1), 0 0 60px rgba(59, 130, 246, 0.6), 0 0 90px rgba(139, 92, 246, 0.4)',
            letterSpacing: '0.3em',
            fontWeight: 900,
          }}
        >
          RACE PROJECTION
        </h2>
        <p
          className="text-lg text-center mb-12"
          style={{
            color: '#22d3ee',
            textShadow: '0 0 10px rgba(34, 211, 238, 0.6)',
          }}
        >
          Time projections with 75% confidence
        </p>

        <div style={{ height: '380px', marginBottom: '48px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 80, right: 40, left: 40, bottom: 40 }}
            >
              <defs>
                <linearGradient id="projectionLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                  <stop offset="25%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="75%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                </linearGradient>
                <filter id="projectionGlow">
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
                tick={{ fill: '#22d3ee', fontSize: 13, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis hide domain={[minTime - padding, maxTime + padding]} />

              <Line
                type="monotone"
                dataKey="timeMinutes"
                stroke="url(#projectionLineGradient)"
                strokeWidth={5}
                dot={(props) => {
                  const { cx, cy } = props;
                  return (
                    <g>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={12}
                        fill="rgba(139, 92, 246, 0.4)"
                        filter="url(#projectionGlow)"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill="#ffffff"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        filter="url(#projectionGlow)"
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
                      <text
                        x={x}
                        y={y - 35}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize={18}
                        fontWeight="bold"
                        style={{
                          filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 1))',
                        }}
                      >
                        {dataPoint.time}
                      </text>
                      <text
                        x={x}
                        y={y - 16}
                        fill="#22d3ee"
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="500"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.8))',
                        }}
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

        <div className="grid grid-cols-5 gap-4 mb-8">
          {projectionData.map((race) => (
            <div
              key={race.distance}
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '2px solid rgba(59, 130, 246, 0.6)',
                boxShadow: `
                  inset 0 0 30px rgba(59, 130, 246, 0.4),
                  0 0 30px rgba(59, 130, 246, 0.3),
                  0 0 60px rgba(139, 92, 246, 0.2)
                `,
                padding: '20px 16px',
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
                }}
              />

              <div className="relative z-10 text-center">
                <div
                  className="text-sm font-bold mb-3 tracking-wider"
                  style={{
                    color: '#ffffff',
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
                  }}
                >
                  {race.distance}
                </div>
                <div
                  className="text-3xl font-extrabold"
                  style={{
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  {race.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div
            className="inline-block px-6 py-3 rounded-lg"
            style={{
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.4)',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
            }}
          >
            <p className="text-sm" style={{ color: '#22d3ee' }}>
              Based on: <span className="font-bold text-white">{baseline.name}</span>
              {' '}({baseline.distanceKm.toFixed(1)}km in {formatTime(baseline.timeMin)})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
