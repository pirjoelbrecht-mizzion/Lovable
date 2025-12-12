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
        return { label: 'High Risk', color: 'text-red-400', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.5)' };
      case 'caution':
        return { label: 'Caution', color: 'text-orange-400', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.5)' };
      case 'sweet-spot':
        return { label: 'Optimal', color: 'text-cyan-400', bg: 'rgba(34, 211, 238, 0.1)', border: 'rgba(34, 211, 238, 0.5)' };
      case 'underload':
        return { label: 'Low Load', color: 'text-slate-400', bg: 'rgba(148, 163, 184, 0.05)', border: 'rgba(148, 163, 184, 0.3)' };
      default:
        return { label: 'Unknown', color: 'text-slate-400', bg: 'rgba(148, 163, 184, 0.05)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const d = payload[0].payload;

    return (
      <div
        className="rounded-xl border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] backdrop-blur-md"
        style={{
          background: 'rgba(5, 10, 20, 0.95)',
          padding: '16px',
        }}
      >
        <div className="text-white font-bold text-base mb-3">
          Week of {d.date}
        </div>
        <div className="text-white text-sm mb-2">
          ACWR: <span className="text-orange-500 font-bold text-base">{d.acwr.toFixed(2)}</span>
        </div>
        <div className="text-white text-sm mb-2">
          Acute: <span className="text-cyan-400 font-semibold">{d.acute.toFixed(1)} km</span>
        </div>
        <div className="text-white text-sm">
          Chronic: <span className="text-orange-500 font-semibold">{d.chronic.toFixed(1)} km</span>
        </div>
        {zoneInfo.hasPersonalZone && (
          <div className="text-white text-xs mt-3 pt-2 border-t border-white/10">
            Your zone: {zoneInfo.personalMin.toFixed(1)}-{zoneInfo.personalMax.toFixed(1)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: '500' }}>Loading ACWR data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', marginBottom: '8px' }}>
          ACWR (Acute:Chronic Workload Ratio)
        </h3>
        <p style={{ fontSize: '14px', color: 'rgb(148, 163, 184)', marginBottom: '32px' }}>
          Last 12 months • Last 12 weeks
        </p>
        <div
          style={{
            padding: '32px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            background: 'rgba(239, 68, 68, 0.08)',
          }}
        >
          <p style={{ color: '#ffffff', fontSize: '16px', marginBottom: '24px', fontWeight: '500' }}>
            Failed to load ACWR data: {error.message}
          </p>
          <button
            onClick={refresh}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.5)',
              cursor: 'pointer',
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
        <div style={{ minHeight: '400px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', marginBottom: '8px' }}>
            ACWR (Acute:Chronic Workload Ratio)
          </h3>
          <p style={{ fontSize: '14px', color: 'rgb(148, 163, 184)', marginBottom: '40px' }}>
            Last 12 months • Last 12 weeks
          </p>
          <div
            style={{
              padding: '48px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              background: 'rgba(34, 211, 238, 0.05)',
            }}
          >
            <TrendingUp style={{ width: '96px', height: '96px', color: '#22d3ee', margin: '0 auto 32px', opacity: 0.7 }} />
            <p style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '20px' }}>
              No training data available
            </p>
            <p style={{ color: 'rgb(148, 163, 184)', fontSize: '16px', lineHeight: '1.65', maxWidth: '600px', margin: '0 auto 40px' }}>
              ACWR requires at least 4 weeks of consistent training data to calculate your acute vs chronic workload ratio. Log your runs regularly to see your workload trends and injury risk insights.
            </p>
            <button
              onClick={() => setShowInfoModal(true)}
              style={{
                padding: '16px 40px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                background: 'rgba(34, 211, 238, 0.1)',
                border: '1px solid rgba(34, 211, 238, 0.5)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
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
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: '1' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', marginBottom: '8px' }}>
              ACWR (Acute:Chronic Workload Ratio)
            </h3>
            <p style={{ fontSize: '14px', color: 'rgb(148, 163, 184)', marginBottom: '24px' }}>
              Last 12 months • Last 12 weeks
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {timeFrames.map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => setTimeFrame(tf.key)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      background: timeFrame === tf.key ? 'rgba(249, 115, 22, 0.2)' : 'rgba(15, 23, 42, 0.4)',
                      border: timeFrame === tf.key ? '1px solid rgb(249, 115, 22)' : '1px solid rgba(71, 85, 105, 0.3)',
                      color: timeFrame === tf.key ? '#ffffff' : 'rgb(148, 163, 184)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              <button
                onClick={refresh}
                disabled={isRefreshing}
                style={{
                  padding: '8px',
                  color: 'rgb(148, 163, 184)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  opacity: isRefreshing ? 0.5 : 1,
                }}
                title="Refresh metrics"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {currentACWR !== null && (
            <div
              style={{
                border: '1px solid rgba(34, 211, 238, 0.5)',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                background: 'rgba(34, 211, 238, 0.15)',
              }}
            >
              Current: {currentACWR.toFixed(2)}
            </div>
          )}
        </div>

        {/* Partial Data Banner */}
        {needsMoreData && (
          <div
            style={{
              marginBottom: '40px',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              background: 'rgba(249, 115, 22, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '20px' }}>
              <TrendingUp style={{ width: '28px', height: '28px', color: 'rgb(249, 115, 22)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
                  Limited Data Available ({totalWeeks} of 4 weeks needed)
                </p>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '16px', lineHeight: '1.65' }}>
                  ACWR calculations become more accurate with 4+ weeks of data. Keep logging your runs to unlock full insights and personalized workload zones.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mt-8 mb-8">
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={acwrData} margin={{ top: 30, right: 120, bottom: 30, left: 20 }}>
              <CartesianGrid
                strokeDasharray="0"
                stroke="rgba(71, 85, 105, 0.4)"
                strokeOpacity={1}
                horizontal={true}
                vertical={false}
              />

              {/* High Risk Zone (y > 1.3) - Red with proper opacity */}
              <ReferenceArea
                y1={1.3}
                y2={1.8}
                fill="rgba(239, 68, 68, 0.12)"
                fillOpacity={1}
              >
                <Label
                  value="High Risk"
                  position="insideTopRight"
                  fill="#ef4444"
                  fontSize={15}
                  fontWeight="700"
                  offset={10}
                />
              </ReferenceArea>

              {/* Caution Zone (0.8 - 1.3) - Orange */}
              <ReferenceArea
                y1={0.8}
                y2={1.3}
                fill="rgba(249, 115, 22, 0.08)"
                fillOpacity={1}
              >
                <Label
                  value="Caution"
                  position="center"
                  fill="#F97316"
                  fontSize={15}
                  fontWeight="700"
                />
              </ReferenceArea>

              {/* Optimal Zone (below 0.8) - Cyan */}
              <ReferenceArea
                y1={0}
                y2={0.8}
                fill="rgba(34, 211, 238, 0.05)"
                fillOpacity={1}
              >
                <Label
                  value="Sweet Spot"
                  position="insideBottomRight"
                  fill="#22d3ee"
                  fontSize={15}
                  fontWeight="700"
                  offset={10}
                />
              </ReferenceArea>

              {/* Reference Lines */}
              <ReferenceLine
                y={1.3}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="0"
              />

              <ReferenceLine
                y={0.8}
                stroke="#F97316"
                strokeWidth={2}
                strokeDasharray="0"
              />

              <XAxis
                dataKey="date"
                stroke="rgba(148, 163, 184, 0.6)"
                style={{ fontSize: 13, fill: '#e2e8f0', fontWeight: '500' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(71, 85, 105, 0.5)', strokeWidth: 1 }}
              />

              <YAxis
                stroke="rgba(148, 163, 184, 0.6)"
                style={{ fontSize: 13, fill: '#e2e8f0', fontWeight: '500' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 1.8]}
                ticks={[0, 0.5, 1.0, 1.5]}
              />

              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="acwr"
                stroke="#F97316"
                strokeWidth={4}
                dot={{
                  r: 6,
                  fill: '#F97316',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 8,
                  fill: '#F97316',
                  stroke: '#ffffff',
                  strokeWidth: 3,
                  filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.8))',
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback Box */}
        {feedback && (
          <div
            style={{
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              background: 'rgba(34, 211, 238, 0.05)',
            }}
          >
            <p style={{ color: 'rgb(226, 232, 240)', fontSize: '16px', lineHeight: '1.65', fontWeight: '500' }}>
              {feedback}
            </p>
          </div>
        )}

        {/* AI Coach Insight */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '20px' }}>
            <div style={{ marginTop: '4px' }}>
              <TrendingUp style={{ width: '28px', height: '28px', color: '#22d3ee' }} />
            </div>
            <div style={{ flex: '1' }}>
              <h4 style={{ color: '#22d3ee', fontWeight: '600', fontSize: '20px', marginBottom: '16px' }}>
                {zoneInfo.hasPersonalZone
                  ? 'AI Coach Insight: Personalized Workload Zone'
                  : 'AI Coach Insight: Workload Sweet Spot'}
              </h4>
              <p style={{ color: 'rgb(148, 163, 184)', fontSize: '16px', lineHeight: '1.65', marginBottom: '20px' }}>
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
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#22d3ee',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
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
