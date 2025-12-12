import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ACWRData {
  date: string;
  acwr: number;
  acute: number;
  chronic: number;
}

interface ACWRCardProps {
  data?: ACWRData[];
  currentACWR?: number;
  timeFrame?: '12m' | '12w';
  onTimeFrameChange?: (frame: '12m' | '12w') => void;
}

export default function ACWRCard({
  data,
  currentACWR = 1.30,
  timeFrame = '12w',
  onTimeFrameChange,
}: ACWRCardProps) {
  const mockData: ACWRData[] = useMemo(() => {
    if (data && data.length > 0) return data;

    const dates = [
      '09/22', '09/29', '10/06', '10/13', '10/20', '10/27',
      '11/03', '11/10', '11/17', '11/24', '12/01', '12/08'
    ];

    return dates.map((date, i) => ({
      date,
      acwr: 0.8 + Math.random() * 0.7,
      acute: 40 + Math.random() * 20,
      chronic: 45 + Math.random() * 15,
    }));
  }, [data]);

  const getRiskStatus = (acwr: number) => {
    if (acwr >= 1.5) return { label: 'High Risk', color: 'text-red-400' };
    if (acwr >= 1.3) return { label: 'Caution', color: 'text-orange-400' };
    if (acwr >= 0.8) return { label: 'Optimal', color: 'text-cyan-400' };
    return { label: 'Low Load', color: 'text-slate-400' };
  };

  const status = getRiskStatus(currentACWR);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const d = payload[0].payload as ACWRData;

    return (
      <div
        style={{
          background: '#0b1221',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>
          {d.date}
        </div>
        <div style={{ color: 'rgb(148, 163, 184)', marginBottom: 4 }}>
          ACWR: <span style={{ color: '#fb923c', fontWeight: 600 }}>{d.acwr.toFixed(2)}</span>
        </div>
        <div style={{ color: 'rgb(148, 163, 184)', marginBottom: 4 }}>
          Acute: <span style={{ color: '#22d3ee' }}>{d.acute.toFixed(1)} km</span>
        </div>
        <div style={{ color: 'rgb(148, 163, 184)' }}>
          Chronic: <span style={{ color: '#a78bfa' }}>{d.chronic.toFixed(1)} km</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative rounded-2xl p-6 backdrop-blur-sm"
      style={{
        background: 'rgba(11, 18, 33, 0.8)',
        border: '1px solid #06b6d4',
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            ACWR (Acute:Chronic Workload Ratio)
          </h3>
          <p className="text-sm text-slate-400">
            Last 12 months • Last 12 weeks
          </p>
        </div>
        <div
          className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          Current: {currentACWR.toFixed(2)}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6 mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData} margin={{ top: 20, right: 80, bottom: 10, left: 10 }}>
            <defs>
              <linearGradient id="acwrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(59, 130, 246, 0.08)"
              horizontal={true}
              vertical={false}
            />

            {/* Reference Lines for Risk Zones */}
            <ReferenceLine
              y={1.5}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5 5"
            >
              <Label
                value="High Risk"
                position="right"
                fill="#ef4444"
                fontSize={12}
                fontWeight={600}
              />
            </ReferenceLine>

            <ReferenceLine
              y={1.0}
              stroke="#fb923c"
              strokeWidth={1}
              strokeDasharray="5 5"
            >
              <Label
                value="Caution"
                position="right"
                fill="#fb923c"
                fontSize={12}
                fontWeight={600}
              />
            </ReferenceLine>

            <ReferenceLine
              y={0.5}
              stroke="#ef4444"
              strokeWidth={1}
              strokeOpacity={0.3}
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="date"
              stroke="rgb(148, 163, 184)"
              style={{ fontSize: 12 }}
              tickLine={false}
            />

            <YAxis
              stroke="rgb(148, 163, 184)"
              style={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 1.8]}
              ticks={[0, 0.5, 1.0, 1.5]}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="acwr"
              stroke="#fb923c"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: '#fb923c',
                stroke: '#0b1221',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: '#fb923c',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Feedback Box */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(6, 182, 212, 0.05)',
        }}
      >
        <p className="text-white text-sm leading-relaxed">
          Your ACWR is <span className="font-semibold text-cyan-400">{currentACWR.toFixed(2)}</span> — within the optimal zone!
          You're building fitness while managing fatigue effectively. Continue with your current training plan.
        </p>
      </div>

      {/* AI Coach Insight */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-cyan-400 font-semibold text-sm mb-2">
              AI Coach Insight: Workload Sweet Spot
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed mb-2">
              Your ACWR of {currentACWR.toFixed(2)} indicates you're in the "sweet spot" for training progression.
              Research shows athletes with ACWR between 0.8-1.3 have the lowest injury risk while maintaining
              optimal fitness gains.
            </p>
            <button className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors">
              What is ACWR? →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
