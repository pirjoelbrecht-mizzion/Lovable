import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Label,
} from 'recharts';
import { TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { useACWRData, type TimeFrame } from '@/hooks/useACWRData';
import ACWRInfoModal from './ACWRInfoModal';
import { getACWRZoneStatus, generateACWRZoneFeedback } from '@/utils/acwrZones';

interface ACWRCardProps {
  defaultTimeFrame?: TimeFrame;
}

export default function ACWRCard({ defaultTimeFrame = '4w' }: ACWRCardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(defaultTimeFrame);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const {
    acwrData,
    currentACWR,
    zoneInfo,
    loading,
    error,
    isRefreshing,
    hasData,
    needsMoreData,
    totalWeeks,
    refresh,
  } = useACWRData(timeFrame);

  const timeFrames: { key: TimeFrame; label: string }[] = [
    { key: '7d', label: '7d' },
    { key: '14d', label: '14d' },
    { key: '4w', label: '4w' },
    { key: '3m', label: '3m' },
    { key: '12m', label: '12m' },
  ];

  const getRiskStatus = (acwr: number) => {
    const zone = getACWRZoneStatus(acwr, zoneInfo.personalMin, zoneInfo.personalMax);

    switch (zone) {
      case 'extreme-risk':
      case 'high-risk':
        return { label: 'High Risk', color: 'text-red-400', bg: 'rgba(255, 107, 107, 0.1)', border: 'rgba(255, 107, 107, 0.3)' };
      case 'caution':
        return { label: 'Caution', color: 'text-orange-400', bg: 'rgba(255, 209, 102, 0.1)', border: 'rgba(255, 209, 102, 0.3)' };
      case 'sweet-spot':
        return { label: 'Optimal', color: 'text-cyan-400', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)' };
      case 'underload':
        return { label: 'Low Load', color: 'text-slate-400', bg: 'rgba(148, 163, 184, 0.05)', border: 'rgba(148, 163, 184, 0.2)' };
      default:
        return { label: 'Unknown', color: 'text-slate-400', bg: 'rgba(148, 163, 184, 0.05)', border: 'rgba(148, 163, 184, 0.2)' };
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const d = payload[0].payload;

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
          Week of {d.date}
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
        {zoneInfo.hasPersonalZone && (
          <div style={{ color: 'rgb(148, 163, 184)', marginTop: 8, fontSize: 11 }}>
            Your zone: {zoneInfo.personalMin.toFixed(1)}-{zoneInfo.personalMax.toFixed(1)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="relative rounded-2xl p-6 backdrop-blur-sm flex items-center justify-center"
        style={{
          background: 'rgba(11, 18, 33, 0.8)',
          border: '1px solid #06b6d4',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)',
          minHeight: '500px',
        }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading ACWR data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="relative rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: 'rgba(11, 18, 33, 0.8)',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          boxShadow: '0 0 30px rgba(255, 107, 107, 0.15)',
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">
          ACWR (Acute:Chronic Workload Ratio)
        </h3>
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
          }}
        >
          <p className="text-red-400 text-sm mb-3">
            Failed to load ACWR data: {error.message}
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasData || needsMoreData) {
    return (
      <div
        className="relative rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: 'rgba(11, 18, 33, 0.8)',
          border: '1px solid #06b6d4',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)',
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">
          ACWR (Acute:Chronic Workload Ratio)
        </h3>
        <div
          className="p-6 rounded-lg text-center"
          style={{
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}
        >
          <TrendingUp className="w-12 h-12 text-cyan-400 mx-auto mb-4 opacity-50" />
          <p className="text-white text-sm mb-2">
            {totalWeeks === 0 ? 'No training data available' : `Need more data (${totalWeeks}/4 weeks)`}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            ACWR requires at least 4 weeks of consistent training data. Log your runs regularly to see your workload ratio and injury risk insights.
          </p>
          <button
            onClick={() => setShowInfoModal(true)}
            className="mt-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            What is ACWR? →
          </button>
        </div>
        <ACWRInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          hasPersonalZone={zoneInfo.hasPersonalZone}
          personalMin={zoneInfo.personalMin}
          personalMax={zoneInfo.personalMax}
        />
      </div>
    );
  }

  const status = currentACWR !== null ? getRiskStatus(currentACWR) : null;
  const zone = currentACWR !== null ? getACWRZoneStatus(currentACWR, zoneInfo.personalMin, zoneInfo.personalMax) : null;
  const feedback = currentACWR !== null && zone && acwrData.length > 0
    ? generateACWRZoneFeedback(currentACWR, zone, acwrData[acwrData.length - 1].acute)
    : null;

  return (
    <>
      <div
        className="relative rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: 'rgba(11, 18, 33, 0.8)',
          border: '1px solid #06b6d4',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              ACWR (Acute:Chronic Workload Ratio)
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                {timeFrames.map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => setTimeFrame(tf.key)}
                    className="px-2 py-1 text-xs font-medium rounded transition-colors"
                    style={{
                      background: timeFrame === tf.key ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                      color: timeFrame === tf.key ? '#22d3ee' : '#94a3b8',
                      border: timeFrame === tf.key ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              <button
                onClick={refresh}
                disabled={isRefreshing}
                className="p-1 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                title="Refresh metrics"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {currentACWR !== null && status && (
            <div
              className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{
                background: status.bg,
                border: `1px solid ${status.border}`,
              }}
            >
              <span className={status.color}>Current: {currentACWR.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="mt-6 mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={acwrData} margin={{ top: 20, right: 80, bottom: 10, left: 10 }}>
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

              {/* Personalized Zone */}
              {zoneInfo.hasPersonalZone && (
                <ReferenceArea
                  y1={zoneInfo.personalMin}
                  y2={zoneInfo.personalMax}
                  fill="rgba(168, 85, 247, 0.1)"
                  stroke="rgba(168, 85, 247, 0.4)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              )}

              {/* Universal Zones */}
              <ReferenceArea
                y1={zoneInfo.universalMin}
                y2={zoneInfo.universalMax}
                fill="rgba(42, 198, 113, 0.05)"
                fillOpacity={0.3}
                strokeOpacity={0}
              />

              {/* Reference Lines */}
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
                y={zoneInfo.personalMax}
                stroke={zoneInfo.hasPersonalZone ? "#a855f7" : "#fb923c"}
                strokeWidth={1}
                strokeDasharray="5 5"
              >
                <Label
                  value={zoneInfo.hasPersonalZone ? "Your Max" : "Caution"}
                  position="right"
                  fill={zoneInfo.hasPersonalZone ? "#a855f7" : "#fb923c"}
                  fontSize={12}
                  fontWeight={600}
                />
              </ReferenceLine>

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
        {feedback && status && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              border: `1px solid ${status.border}`,
              background: status.bg,
            }}
          >
            <p className="text-white text-sm leading-relaxed">
              {feedback}
            </p>
          </div>
        )}

        {/* AI Coach Insight */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-cyan-400 font-semibold text-sm mb-2">
                {zoneInfo.hasPersonalZone ? 'Personalized Workload Insights' : 'AI Coach Insight'}
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed mb-2">
                {zoneInfo.hasPersonalZone ? (
                  <>
                    Your optimal ACWR zone ({zoneInfo.personalMin.toFixed(1)}-{zoneInfo.personalMax.toFixed(1)}) has been personalized based on your training history and load patterns. This adaptation is especially important for trail and ultra runners.
                  </>
                ) : (
                  <>
                    Research shows athletes with ACWR between 0.8-1.3 have the lowest injury risk while maintaining optimal fitness gains. Load spikes above 1.5 significantly increase injury probability.
                  </>
                )}
              </p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
              >
                What is ACWR? →
              </button>
            </div>
          </div>
        </div>
      </div>

      <ACWRInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        currentACWR={currentACWR}
        personalMin={zoneInfo.personalMin}
        personalMax={zoneInfo.personalMax}
        hasPersonalZone={zoneInfo.hasPersonalZone}
      />
    </>
  );
}
