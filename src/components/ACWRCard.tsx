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
          background: 'rgba(11, 18, 33, 0.95)',
          border: '2px solid rgba(34, 211, 238, 0.5)',
          borderRadius: 10,
          padding: 14,
          fontSize: 14,
          boxShadow: '0 4px 25px rgba(34, 211, 238, 0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 10, fontSize: 15 }}>
          Week of {d.date}
        </div>
        <div style={{ color: '#e2e8f0', marginBottom: 6 }}>
          ACWR: <span style={{ color: '#FF9F43', fontWeight: 700, fontSize: 15 }}>{d.acwr.toFixed(2)}</span>
        </div>
        <div style={{ color: '#e2e8f0', marginBottom: 6 }}>
          Acute: <span style={{ color: '#22d3ee', fontWeight: 600 }}>{d.acute.toFixed(1)} km</span>
        </div>
        <div style={{ color: '#e2e8f0' }}>
          Chronic: <span style={{ color: '#a78bfa', fontWeight: 600 }}>{d.chronic.toFixed(1)} km</span>
        </div>
        {zoneInfo.hasPersonalZone && (
          <div style={{ color: '#cbd5e1', marginTop: 10, fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
            Your zone: {zoneInfo.personalMin.toFixed(1)}-{zoneInfo.personalMax.toFixed(1)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="relative rounded-2xl p-8 backdrop-blur-md flex items-center justify-center"
        style={{
          background: 'rgba(11, 18, 33, 0.9)',
          border: '2px solid rgb(34, 211, 238)',
          boxShadow: '0 0 25px rgba(34, 211, 238, 0.4)',
          minHeight: '500px',
        }}
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-200 text-base">Loading ACWR data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="relative rounded-2xl p-8 backdrop-blur-md"
        style={{
          background: 'rgba(11, 18, 33, 0.9)',
          border: '2px solid rgba(255, 107, 107, 0.5)',
          boxShadow: '0 0 25px rgba(255, 107, 107, 0.3)',
        }}
      >
        <h3 className="text-2xl font-bold text-white mb-2">
          ACWR
        </h3>
        <p className="text-lg text-slate-300 font-normal mb-6">
          (Acute:Chronic Workload Ratio)
        </p>
        <div
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.4)',
          }}
        >
          <p className="text-red-300 text-base mb-4">
            Failed to load ACWR data: {error.message}
          </p>
          <button
            onClick={refresh}
            className="px-6 py-2.5 rounded-lg text-base font-semibold text-white transition-all hover:bg-cyan-400/30"
            style={{
              background: 'rgba(34, 211, 238, 0.2)',
              border: '1px solid rgba(34, 211, 238, 0.5)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasData || totalWeeks === 0) {
    return (
      <>
        <div
          className="relative rounded-2xl p-8 backdrop-blur-md"
          style={{
            background: 'rgba(11, 18, 33, 0.9)',
            border: '2px solid rgb(34, 211, 238)',
            boxShadow: '0 0 25px rgba(34, 211, 238, 0.4)',
            minHeight: '400px',
          }}
        >
          <h3 className="text-2xl font-bold text-white mb-2">
            ACWR
          </h3>
          <p className="text-lg text-slate-300 font-normal mb-8">
            (Acute:Chronic Workload Ratio)
          </p>
          <div
            className="p-10 rounded-xl text-center"
            style={{
              background: 'rgba(34, 211, 238, 0.08)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
            }}
          >
            <TrendingUp className="w-20 h-20 text-cyan-400 mx-auto mb-8 opacity-70" />
            <p className="text-white text-xl font-semibold mb-4">
              No training data available
            </p>
            <p className="text-slate-200 text-base leading-relaxed max-w-lg mx-auto mb-8">
              ACWR requires at least 4 weeks of consistent training data to calculate your acute vs chronic workload ratio. Log your runs regularly to see your workload trends and injury risk insights.
            </p>
            <button
              onClick={() => setShowInfoModal(true)}
              className="px-8 py-3 rounded-lg text-base font-bold text-white hover:text-cyan-300 transition-all inline-flex items-center gap-2"
              style={{
                background: 'rgba(34, 211, 238, 0.2)',
                border: '1px solid rgba(34, 211, 238, 0.5)',
              }}
            >
              What is ACWR? →
            </button>
          </div>
        </div>
        <ACWRInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          hasPersonalZone={zoneInfo.hasPersonalZone}
          personalMin={zoneInfo.personalMin}
          personalMax={zoneInfo.personalMax}
        />
      </>
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
        className="relative rounded-2xl p-8 backdrop-blur-md"
        style={{
          background: 'rgba(11, 18, 33, 0.9)',
          border: '2px solid rgb(34, 211, 238)',
          boxShadow: '0 0 25px rgba(34, 211, 238, 0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">
              ACWR
            </h3>
            <p className="text-lg text-slate-300 font-normal mb-4">
              (Acute:Chronic Workload Ratio)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                {timeFrames.map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => setTimeFrame(tf.key)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                    style={{
                      background: timeFrame === tf.key ? 'rgba(34, 211, 238, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: timeFrame === tf.key ? '#22d3ee' : '#94a3b8',
                      border: timeFrame === tf.key ? '1px solid rgba(34, 211, 238, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              <button
                onClick={refresh}
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                title="Refresh metrics"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {currentACWR !== null && (
            <div
              className="border border-slate-600 rounded-full px-4 py-2 text-sm text-white"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              Current: {currentACWR.toFixed(2)}
            </div>
          )}
        </div>

        {/* Partial Data Banner */}
        {needsMoreData && (
          <div
            className="mb-8 p-5 rounded-xl"
            style={{
              background: 'rgba(255, 159, 67, 0.1)',
              border: '1px solid rgba(255, 159, 67, 0.4)',
            }}
          >
            <div className="flex items-start gap-4">
              <TrendingUp className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-base mb-2">
                  Limited Data Available ({totalWeeks} of 4 weeks needed)
                </p>
                <p className="text-slate-200 text-sm leading-relaxed">
                  ACWR calculations become more accurate with 4+ weeks of data. Keep logging your runs to unlock full insights and personalized workload zones.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mt-6 mb-8">
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={acwrData} margin={{ top: 20, right: 110, bottom: 20, left: 10 }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                horizontal={true}
                vertical={false}
              />

              {/* Personalized Zone */}
              {zoneInfo.hasPersonalZone && (
                <ReferenceArea
                  y1={zoneInfo.personalMin}
                  y2={zoneInfo.personalMax}
                  fill="rgba(168, 85, 247, 0.12)"
                  stroke="rgba(168, 85, 247, 0.5)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              )}

              {/* Universal Zones */}
              <ReferenceArea
                y1={zoneInfo.universalMin}
                y2={zoneInfo.universalMax}
                fill="rgba(42, 198, 113, 0.08)"
                fillOpacity={0.4}
                strokeOpacity={0}
              />

              {/* Reference Lines */}
              <ReferenceLine
                y={1.5}
                stroke="#ff6b6b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
              >
                <Label
                  value="High Risk"
                  position="right"
                  fill="#ff6b6b"
                  fontSize={14}
                  fontWeight="bold"
                  offset={15}
                />
              </ReferenceLine>

              <ReferenceLine
                y={zoneInfo.personalMax}
                stroke={zoneInfo.hasPersonalZone ? "#a855f7" : "#FF9F43"}
                strokeWidth={2}
                strokeDasharray="5 5"
              >
                <Label
                  value={zoneInfo.hasPersonalZone ? "Your Max" : "Caution"}
                  position="right"
                  fill={zoneInfo.hasPersonalZone ? "#a855f7" : "#FF9F43"}
                  fontSize={14}
                  fontWeight="bold"
                  offset={15}
                />
              </ReferenceLine>

              <ReferenceLine
                y={0.5}
                stroke="#ff6b6b"
                strokeWidth={1.5}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="date"
                stroke="rgb(148, 163, 184)"
                style={{ fontSize: 13 }}
                tickLine={false}
              />

              <YAxis
                stroke="rgb(148, 163, 184)"
                style={{ fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 1.8]}
                ticks={[0, 0.5, 1.0, 1.5]}
              />

              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="acwr"
                stroke="#FF9F43"
                strokeWidth={4}
                dot={{
                  r: 5,
                  fill: '#FF9F43',
                  stroke: '#0b1221',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 8,
                  fill: '#ffffff',
                  stroke: '#FF9F43',
                  strokeWidth: 3,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback Box */}
        {feedback && (
          <div
            className="rounded-xl p-5 mb-6"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <p className="text-white text-base leading-relaxed">
              {feedback}
            </p>
          </div>
        )}

        {/* AI Coach Insight */}
        <div className="mt-6">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-cyan-400 font-semibold text-lg mb-3">
                {zoneInfo.hasPersonalZone
                  ? 'AI Coach Insight: Personalized Workload Zone'
                  : 'AI Coach Insight: Workload Sweet Spot'}
              </h4>
              <p className="text-slate-200 text-base leading-relaxed mb-4">
                {zoneInfo.hasPersonalZone ? (
                  <>
                    Your ACWR is {currentACWR?.toFixed(2)} — within your personalized optimal zone ({zoneInfo.personalMin.toFixed(1)}-{zoneInfo.personalMax.toFixed(1)}). This zone has been adapted based on your training history and load patterns, especially important for trail and ultra runners.
                  </>
                ) : (
                  <>
                    Your ACWR is {currentACWR?.toFixed(2)} — {status?.label === 'Optimal' ? 'within the optimal zone!' : status?.label === 'Caution' ? 'in the caution zone.' : 'outside the optimal zone.'} Research shows athletes with ACWR between 0.8-1.3 have the lowest injury risk while maintaining optimal fitness gains.
                  </>
                )}
              </p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="text-base font-bold text-white hover:text-cyan-400 transition-colors inline-flex items-center gap-2 underline decoration-white/30 hover:decoration-cyan-400"
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
