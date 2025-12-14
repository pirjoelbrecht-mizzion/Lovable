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
      <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400 bg-[#050a14]/90 p-12 backdrop-blur-md shadow-[0_0_40px_rgba(34,211,238,0.4)]">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-wider">
            RACE PROJECTION
          </h2>
          <p className="text-lg text-cyan-400 mb-4">No race data available</p>
          <p className="text-sm text-slate-300">Complete a race or long run (10km+) to see projections</p>
        </div>
      </div>
    );
  }

  const minTime = Math.min(...projectionData.map(d => d.timeMinutes));
  const maxTime = Math.max(...projectionData.map(d => d.timeMinutes));
  const padding = (maxTime - minTime) * 0.2;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-400 bg-[#050a14]/90 p-8 backdrop-blur-md shadow-[0_0_40px_rgba(34,211,238,0.4)] text-white">
      {/* Starfield background effect */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20% 30%, white, transparent),
            radial-gradient(1px 1px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(1px 1px at 90% 60%, white, transparent),
            radial-gradient(1px 1px at 10% 90%, white, transparent),
            radial-gradient(1px 1px at 70% 20%, white, transparent)
          `,
          backgroundSize: '200px 200px, 200px 200px, 300px 300px, 250px 250px, 280px 280px, 220px 220px, 260px 260px',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-wider mb-2">
              RACE PROJECTION
            </h2>
            <p className="text-sm text-slate-300">
              Time projections • 75% confidence
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg border border-white/20 bg-white/5">
            <span className="text-white font-bold">Confidence: 75%</span>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: '400px', marginBottom: '32px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 60, right: 40, left: 40, bottom: 40 }}
            >
              <defs>
                <filter id="neonGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Background zones */}
              <ReferenceArea
                y1={minTime - padding}
                y2={maxTime + padding}
                fill="rgba(6, 182, 212, 0.05)"
                fillOpacity={1}
              />

              <XAxis
                dataKey="distance"
                stroke="transparent"
                tick={{ fill: '#ffffff', fontSize: 14, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                hide
                domain={[minTime - padding, maxTime + padding]}
              />

              {/* Main line - Thick Neon Orange */}
              <Line
                type="monotone"
                dataKey="timeMinutes"
                stroke="#F97316"
                strokeWidth={4}
                filter="url(#neonGlow)"
                dot={(props) => {
                  const { cx, cy } = props;
                  return (
                    <g>
                      {/* Outer glow */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        fill="rgba(249, 115, 22, 0.3)"
                        filter="url(#neonGlow)"
                      />
                      {/* Main dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#F97316"
                        stroke="white"
                        strokeWidth={2}
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
                      {/* Time value */}
                      <text
                        x={x}
                        y={y - 30}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize={20}
                        fontWeight="bold"
                      >
                        {dataPoint.time}
                      </text>
                      {/* Confidence label */}
                      <text
                        x={x}
                        y={y - 12}
                        fill="#22d3ee"
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="600"
                      >
                        {dataPoint.confidence}% confidence
                      </text>
                    </g>
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distance cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {projectionData.map((race, idx) => (
            <div
              key={race.distance}
              className="relative rounded-xl border-2 border-cyan-400/60 bg-[#0a1628]/80 p-4 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              <div className="text-center">
                <div className="text-xs font-bold text-white mb-3 tracking-wider opacity-80">
                  {race.distance}
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {race.time}
                </div>
              </div>

              {/* Highlight baseline race */}
              {Math.abs(race.km - baseline.distanceKm) < 0.5 && (
                <div className="absolute top-1 right-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Feedback section */}
        <div className="border border-white/20 rounded-xl p-6 bg-white/5 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-400/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold mb-2">AI Coach Insight: Projection Analysis</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Based on your recent {baseline.name} performance, these projections represent realistic target times
                across different race distances. Your current fitness level shows strong potential for {' '}
                {projectionData[2]?.distance || 'marathon'} distance events.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
              <p className="text-xs text-cyan-400 font-semibold">
                Based on: <span className="text-white font-bold">{baseline.name}</span>
              </p>
            </div>
            <div className="text-sm text-slate-400">
              {baseline.distanceKm.toFixed(1)}km • {formatTime(baseline.timeMin)}
            </div>
          </div>
          <button className="text-white font-bold text-sm hover:text-cyan-400 transition-colors underline">
            What is Race Projection?
          </button>
        </div>
      </div>
    </div>
  );
}
