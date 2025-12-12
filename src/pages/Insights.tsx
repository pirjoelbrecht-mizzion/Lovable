// src/pages/Insights.tsx
import { useMemo, useState, useEffect } from "react";
import { useT } from "@/i18n";
import { load } from "@/utils/storage";
import type { LogEntry } from "@/types";
import { on } from "@/lib/bus";
import { LineChart, Line as RechartLine, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ReferenceArea } from "recharts";
import { useAthleteBaselines } from "@/hooks/useAthleteBaselines";
import { useWeeklyMetrics } from "@/hooks/useWeeklyMetrics";
import AIInsight from "@/components/AIInsight";
import ACWRCard from "@/components/ACWRCard";
import WeeklyDistanceVertChart from "@/components/WeeklyDistanceVertChart";
import ReadinessTrendChart from "@/components/ReadinessTrendChart";
import ReadinessInputModal from "@/components/ReadinessInputModal";
import { FeedbackInsightsCard } from "@/components/FeedbackInsightsCard";
import { predictNextValue } from "@/utils/analytics";
import {
  findBestBaselineRace,
  generateProjections,
  formatTime,
  formatPace,
  getDistanceName,
  type BaselineRace
} from "@/utils/raceProjection";
import { TimeFrameProvider, useTimeFrame } from "@/contexts/TimeFrameContext";
import TimeFrameSelector from "@/components/TimeFrameSelector";
import CustomDateRangeModal from "@/components/CustomDateRangeModal";
import type { CustomDateRange } from "@/types/timeframe";
import {
  filterEntriesByDateRange,
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  calculateACWR,
  aggregateHRZones,
  getEfficiencyData,
  getLongRunData,
} from "@/utils/dataAggregation";
import { saveRecentCustomRange, getTimeFrameWeeksCount } from "@/utils/timeframe";
import { getLogEntriesByDateRange } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { isTrailRunner } from "@/utils/trailLoad";
import type { UserProfile } from "@/types/onboarding";
import { checkTrailLoadProgression, type TrailLoadAlert } from "@/services/trailLoadAlerts";
import { reasonWeekly, DEFAULT_WEIGHTS, type Activity, type HealthState } from "@/ai/brain";
import { toneLine } from "@/ai/personality";
import { loadUserProfile } from "@/state/userData";

/** ---------- tiny SVG primitives ---------- */
function getCss(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function Bars({
  data,
  w,
  h,
  pad = 24,
  colorVar = "--primary",
  zeroLine = true,
}: {
  data: number[];
  w: number;
  h: number;
  pad?: number;
  colorVar?: string;
  zeroLine?: boolean;
}) {
  const max = Math.max(1, ...data);
  const padLeft = 50;
  const padRight = 20;
  const padTop = pad;
  const padBottom = pad;
  const availableWidth = w - padLeft - padRight;
  const gap = data.length > 15 ? 3 : 6;
  const BW = Math.max(4, Math.floor(availableWidth / Math.max(1, data.length) - gap));
  const color = getCss(colorVar, "#8ab4ff");
  const line = getCss("--line", "#26272b");
  const text = getCss("--muted", "#a4a6ad");

  return (
    <svg width={w} height={h} role="img" aria-label="Distance bars">
      {zeroLine && (
        <line x1={padLeft} y1={h - padBottom} x2={w - padRight} y2={h - padBottom} stroke={line} />
      )}
      {Array.from({ length: 3 }, (_, i) => {
        const y = padTop + (i * (h - padTop - padBottom)) / 2;
        const val = Math.round((max * (2 - i)) / 2);
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke={line} opacity={0.3} />
            <text x={padLeft - 8} y={y + 4} fontSize="10" fill={text} textAnchor="end">
              {val}
            </text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const x = padLeft + i * (BW + gap);
        const H = Math.round(((h - padTop - padBottom) * v) / max);
        const y = h - padBottom - H;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={BW}
            height={H}
            rx="3"
            fill={color}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

function Line({
  data,
  labels,
  w,
  h,
  pad = 24,
  strokeVar = "--accent",
}: {
  data: (number | null)[];
  labels?: string[];
  w: number;
  h: number;
  pad?: number;
  strokeVar?: string;
}) {
  const vals = data.filter((x): x is number => x != null);
  const max = Math.max(1, ...vals);
  const min = Math.min(...vals, 0);
  const range = Math.max(1, max - min);
  const stroke = getCss(strokeVar, "#ffb86b");
  const line = getCss("--line", "#26272b");
  const text = getCss("--muted", "#a4a6ad");

  const padBottom = labels && labels.length > 0 ? 40 : pad;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 24;

  const grid = Array.from({ length: 4 }, (_, i) => padTop + (i * (h - padTop - padBottom)) / 3);
  const step = data.length > 1 ? (w - padLeft - padRight) / (data.length - 1) : 0;
  let dAttr = "";
  const points: { x: number; y: number; v: number }[] = [];

  data.forEach((v, i) => {
    const x = padLeft + i * step;
    const y = v == null ? null : padTop + (1 - (v - min) / range) * (h - padTop - padBottom);
    if (y == null) return;
    dAttr += i === 0 || data[i - 1] == null ? `M ${x} ${y}` : ` L ${x} ${y}`;
    points.push({ x, y, v });
  });

  const yAxisValues = Array.from({ length: 4 }, (_, i) => {
    const ratio = i / 3;
    return min + (max - min) * (1 - ratio);
  });

  const showLabels = labels && labels.length > 0 && labels.length === data.length;
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg width={w} height={h} role="img" aria-label="Line">
      {grid.map((y, idx) => (
        <g key={idx}>
          <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke={line} opacity={0.3} />
          <text x={padLeft - 8} y={y + 4} fontSize="11" fill={text} textAnchor="end">
            {yAxisValues[idx].toFixed(2)}
          </text>
        </g>
      ))}
      <path d={dAttr} fill="none" stroke={stroke} strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={stroke} />
      ))}
      {showLabels && labels.map((label, i) => {
        if (i % labelStep !== 0 && i !== labels.length - 1) return null;
        const x = padLeft + i * step;
        return (
          <text
            key={i}
            x={x}
            y={h - padBottom + 20}
            fontSize="10"
            fill={text}
            textAnchor="middle"
            transform={`rotate(-45, ${x}, ${h - padBottom + 20})`}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function Donut({
  values,
  labels,
  w = 260,
  strokeW = 16,
  palette = ["--z1", "--z2", "--z3", "--z4", "--z5"],
}: {
  values: number[];
  labels: string[];
  w?: number;
  strokeW?: number;
  palette?: string[];
}) {
  const total = Math.max(1, values.reduce((a, b) => a + b, 0));
  const r = (w - strokeW) / 2;
  const cx = w / 2, cy = w / 2;
  let start = -Math.PI / 2;
  const segments = values.map((v) => {
    const ang = (v / total) * Math.PI * 2;
    const s = start;
    const e = start + ang;
    start = e;
    return { s, e, v };
  });
  const caption = getCss("--muted", "#a4a6ad");

  return (
    <svg width={w} height={w} role="img" aria-label="Zones donut">
      {segments.map((seg, i) => {
        const large = seg.e - seg.s > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(seg.s);
        const y1 = cy + r * Math.sin(seg.s);
        const x2 = cx + r * Math.cos(seg.e);
        const y2 = cy + r * Math.sin(seg.e);
        const color = getCss(palette[i] || "--primary", "#8ab4ff");
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            stroke={color}
            strokeWidth={strokeW}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fill={caption}>
        Zone Time
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill={caption}>
        {Math.round(total)} min
      </text>
    </svg>
  );
}

/** ---------- page ---------- */
type TabKey = "weekly" | "acwr" | "zones" | "efficiency" | "projection" | "longrun" | "readiness";

function InsightsContent() {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("weekly");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [allEntries, setAllEntries] = useState<LogEntry[]>(() => load<LogEntry[]>("logEntries", []));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComputingMetrics, setIsComputingMetrics] = useState(false);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const [trailLoadAlert, setTrailLoadAlert] = useState<TrailLoadAlert | null>(null);
  const { globalTimeFrame, setGlobalTimeFrame, getDateRange } = useTimeFrame();

  useEffect(() => {
    getCurrentUserProfile().then(setUserProfile);
  }, []);

  const dateRange = useMemo(() => getDateRange(), [globalTimeFrame]);

  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  const { baselines, loading: baselinesLoading, refresh: refreshBaselines } = useAthleteBaselines();
  const { metrics: weeklyMetrics, loading: metricsLoading, refresh: refreshMetrics } = useWeeklyMetrics(startDate, endDate);

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Insights] useEffect[dateRange] triggered - Fetching data for:', startDate, 'to', endDate);
      const data = await getLogEntriesByDateRange(startDate, endDate);
      console.log('[Insights] useEffect[dateRange] - Setting allEntries to', data.length, 'entries');
      setAllEntries(data);
    };
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    const checkAndComputeMetrics = async () => {
      if (!metricsLoading && !isComputingMetrics && weeklyMetrics.length === 0 && allEntries.length > 0) {
        console.log('[Insights] No weekly metrics found but have', allEntries.length, 'log entries. Computing metrics...');
        setIsComputingMetrics(true);
        try {
          await refreshMetrics();
          console.log('[Insights] Weekly metrics computed successfully');
        } catch (error) {
          console.error('[Insights] Failed to compute weekly metrics:', error);
        } finally {
          setIsComputingMetrics(false);
        }
      }
    };

    checkAndComputeMetrics();
  }, [metricsLoading, weeklyMetrics.length, allEntries.length, isComputingMetrics, refreshMetrics]);

  useEffect(() => {
    const handleImport = () => {
      console.log('[Insights] log:import-complete event received');
      const fetchData = async () => {
        console.log('[Insights] Event handler - Fetching data for:', startDate, 'to', endDate);
        const data = await getLogEntriesByDateRange(startDate, endDate);
        console.log('[Insights] Event handler - Setting allEntries to', data.length, 'entries');
        setAllEntries(data);
      };
      fetchData();
    };

    console.log('[Insights] Subscribing to log:import-complete');
    const unsubscribe = on("log:import-complete", handleImport);
    return () => {
      console.log('[Insights] Unsubscribing from log:import-complete');
      unsubscribe();
    };
  }, [startDate, endDate]);

  const entries = useMemo(
    () => {
      console.log('[Insights] Filtering entries. allEntries:', allEntries.length, 'startDate:', startDate, 'endDate:', endDate);
      const filtered = filterEntriesByDateRange(allEntries, startDate, endDate);
      console.log('[Insights] Filtered to', filtered.length, 'entries');
      return filtered;
    },
    [allEntries, startDate, endDate]
  );

  const aggregatedData = useMemo(() => {
    console.log('[Insights] Aggregating data. Resolution:', dateRange.resolution, 'entries:', entries.length);
    if (dateRange.resolution === "daily") {
      const result = aggregateByDay(entries);
      console.log('[Insights] Daily aggregation resulted in', result.length, 'days');
      return result;
    } else if (dateRange.resolution === "weekly") {
      const weeksCount = getTimeFrameWeeksCount(globalTimeFrame);
      return aggregateByWeek(entries, weeksCount);
    } else {
      return aggregateByMonth(entries);
    }
  }, [entries, dateRange.resolution, globalTimeFrame]);

  const weeks = useMemo(() => {
    if (dateRange.resolution === "daily") {
      return aggregatedData;
    } else if (dateRange.resolution === "weekly") {
      return aggregatedData;
    }
    const weeksCount = getTimeFrameWeeksCount(globalTimeFrame);
    return aggregateByWeek(entries, weeksCount);
  }, [entries, dateRange.resolution, aggregatedData, globalTimeFrame]);

  const weeklyKm = weeks.map((w) => w.value || 0);
  const acwr = useMemo(() => calculateACWR(weeks, 4), [weeks]);
  const zoneMin = useMemo(() => aggregateHRZones(entries), [entries]);

  useEffect(() => {
    const checkAlert = async () => {
      if (isTrailRunner(userProfile) && weeks.length >= 2 && dateRange.resolution === "weekly") {
        const weekData = weeks.map(w => ({
          week: w.key,
          distance: w.value || 0,
          vertical: w.vertical || 0,
        }));
        const alert = await checkTrailLoadProgression(weekData, userProfile);
        setTrailLoadAlert(alert);
      } else {
        setTrailLoadAlert(null);
      }
    };
    checkAlert();
  }, [weeks, userProfile, dateRange.resolution]);

  const handleCustomRangeApply = (range: CustomDateRange) => {
    saveRecentCustomRange({
      startDate: range.startDate,
      endDate: range.endDate,
      label: range.label || "",
    });
    setGlobalTimeFrame(range);
  };

  const handleRefreshBaselines = async () => {
    setIsRefreshing(true);
    try {
      await refreshBaselines();
      try {
        await refreshMetrics();
      } catch (metricsError) {
        console.warn('Weekly metrics refresh failed (non-critical):', metricsError);
      }
    } catch (error) {
      console.error('Error refreshing baselines:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 className="h2">{t("insights.title", "Insights")}</h2>
            {baselines && baselines.lastComputedAt ? (
              <div className="small" style={{ color: "var(--muted)", marginTop: 4 }}>
                Baselines updated {new Date(baselines.lastComputedAt).toLocaleDateString()}
                {baselines.isStale && <span style={{ color: "var(--warning)" }}> (needs refresh)</span>}
              </div>
            ) : (
              <div className="small" style={{ color: "var(--muted)", marginTop: 4 }}>
                Click "Refresh Baselines" to compute personalized insights
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn primary"
              onClick={handleRefreshBaselines}
              disabled={isRefreshing || baselinesLoading || isComputingMetrics}
              title="Recompute personalized baselines from your training history"
              style={{ whiteSpace: "nowrap" }}
            >
              {isRefreshing ? "⏳ Computing..." : "↻ Refresh Baselines"}
            </button>
            {(weeklyMetrics.length === 0 && allEntries.length > 0) && (
              <button
                className="btn"
                onClick={async () => {
                  setIsComputingMetrics(true);
                  try {
                    await refreshMetrics();
                  } catch (error) {
                    console.error('Failed to compute metrics:', error);
                  } finally {
                    setIsComputingMetrics(false);
                  }
                }}
                disabled={isComputingMetrics}
                title="Compute weekly metrics including ACWR from your training data"
                style={{ whiteSpace: "nowrap" }}
              >
                {isComputingMetrics ? "⏳ Computing..." : "📊 Compute Metrics"}
              </button>
            )}
            <TimeFrameSelector
              value={globalTimeFrame}
              onChange={setGlobalTimeFrame}
              onCustomClick={() => setShowCustomModal(true)}
            />
          </div>
        </div>

        {baselines && (
          <div style={{
            marginTop: 20,
            padding: 20,
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)",
            borderRadius: 12,
            border: "1px solid rgba(59, 130, 246, 0.1)"
          }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                Your Training Profile
              </h3>
              <div style={{
                fontSize: 12,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: baselines.dataQualityScore >= 0.8 ? "#10b981" : baselines.dataQualityScore >= 0.6 ? "#f59e0b" : "#ef4444"
                }}></div>
                {Math.round(baselines.dataQualityScore * 100)}% data quality
              </div>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16
            }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Baseline Heart Rate</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "var(--primary)" }}>
                  {Math.round(baselines.baselineHr)} <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)" }}>bpm</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Easy pace HR</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Baseline Pace</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "var(--primary)" }}>
                  {baselines.baselinePace.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)" }}>min/km</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Comfortable training pace</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Training Efficiency</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "var(--primary)" }}>
                  {baselines.baselineEfficiency.toFixed(1)}
                  {baselines.efficiencyTrendSlope !== 0 && (
                    <span style={{
                      fontSize: 14,
                      marginLeft: 6,
                      color: baselines.efficiencyTrendSlope > 0 ? "#10b981" : "#ef4444"
                    }}>
                      {baselines.efficiencyTrendSlope > 0 ? "↗" : "↘"} {Math.abs(baselines.efficiencyTrendSlope).toFixed(2)}/wk
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {baselines.efficiencyTrendSlope > 0 ? "Improving" : baselines.efficiencyTrendSlope < 0 ? "Declining" : "Stable"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>ACWR Safe Zone</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "var(--primary)" }}>
                  {baselines.acwrLowerBound.toFixed(1)} - {baselines.acwrUpperBound.toFixed(1)}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Your sweet spot</div>
              </div>
            </div>
          </div>
        )}

        {!baselines && !baselinesLoading && (
          <div style={{
            marginTop: 20,
            padding: 20,
            background: "rgba(59, 130, 246, 0.05)",
            borderRadius: 12,
            border: "1px dashed rgba(59, 130, 246, 0.2)",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
              No baselines computed yet
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Click "Refresh Baselines" to analyze your training history and get personalized insights
            </div>
          </div>
        )}
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          <button
            className={`btn ${tab === "weekly" ? "primary" : ""}`}
            onClick={() => setTab("weekly")}
          >
            {t("insights.weekly_km", "Weekly Load")}
          </button>
          <button
            className={`btn ${tab === "acwr" ? "primary" : ""}`}
            onClick={() => setTab("acwr")}
          >
            {t("insights.acwr", "ACWR")}
          </button>
          <button
            className={`btn ${tab === "zones" ? "primary" : ""}`}
            onClick={() => setTab("zones")}
          >
            {t("insights.zones", "Zones")}
          </button>
          <button
            className={`btn ${tab === "efficiency" ? "primary" : ""}`}
            onClick={() => setTab("efficiency")}
          >
            {t("insights.efficiency", "Efficiency")}
          </button>
          <button
            className={`btn ${tab === "projection" ? "primary" : ""}`}
            onClick={() => setTab("projection")}
          >
            {t("insights.projection", "Race Projection")}
          </button>
          <button
            className={`btn ${tab === "longrun" ? "primary" : ""}`}
            onClick={() => setTab("longrun")}
          >
            {t("insights.longrun", "Long Runs")}
          </button>
          <button
            className={`btn ${tab === "readiness" ? "primary" : ""}`}
            onClick={() => setTab("readiness")}
          >
            {t("insights.readiness_trend", "Readiness Trend")}
          </button>
        </div>
      </section>

      <CustomDateRangeModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onApply={handleCustomRangeApply}
        initialRange={
          globalTimeFrame.type === "custom"
            ? { startDate: globalTimeFrame.startDate, endDate: globalTimeFrame.endDate }
            : undefined
        }
      />

      {tab === "weekly" && (
        <>
          {weeklyMetrics.length === 0 && allEntries.length > 0 && !isComputingMetrics && (
            <div
              className="card"
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 24 }}>⚠️</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    Metrics Need Calculation
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>
                    You have {allEntries.length} log entries. Click to compute ACWR, efficiency & training load.
                  </p>
                </div>
                <button
                  className="btn primary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={refreshMetrics}
                  disabled={isComputingMetrics}
                >
                  🔄 Compute Metrics
                </button>
              </div>
            </div>
          )}

          {isComputingMetrics && (
            <div
              className="card"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>⚙️</div>
                <div>
                  <strong>Computing metrics...</strong>
                  <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>
                    Analyzing {allEntries.length} log entries. Please wait.
                  </p>
                </div>
              </div>
            </div>
          )}

          {trailLoadAlert && (
            <section className="card" style={{
              background: trailLoadAlert.type === 'warning'
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                : trailLoadAlert.type === 'caution'
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: trailLoadAlert.type === 'warning'
                ? '1px solid rgba(239, 68, 68, 0.2)'
                : trailLoadAlert.type === 'caution'
                ? '1px solid rgba(251, 191, 36, 0.2)'
                : '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 24 }}>
                  {trailLoadAlert.type === 'warning' ? '⚠️' : trailLoadAlert.type === 'caution' ? '⚡' : 'ℹ️'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                    {trailLoadAlert.title}
                  </h3>
                  <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
                    {trailLoadAlert.message}
                  </p>
                </div>
              </div>
            </section>
          )}
          <section className="card">
            {isTrailRunner(userProfile) && dateRange.resolution === "weekly" ? (
              <WeeklyDistanceVertChart
                data={weeks.map(w => ({
                  week: w.key,
                  distance: w.value || 0,
                  vertical: w.vertical || 0,
                }))}
                profile={userProfile}
              />
            ) : (
            <>
              <h3 className="h2">
                {dateRange.resolution === "daily"
                  ? t("insights.daily_km", "Daily Training Load")
                  : t("insights.weekly_km", "Weekly Training Load")}
              </h3>
              <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
                {weeklyKm.length} {dateRange.resolution === "daily" ? "days" : "weeks"} from {dateRange.label.toLowerCase()}
              </div>
              <Bars data={weeklyKm} w={860} h={220} />
              <p className="small" style={{ marginTop: 8, color: "var(--muted)" }}>
                {weeklyKm.length
                  ? `You've averaged ${Math.round(
                      (weeklyKm.reduce((a, b) => a + b, 0) / weeklyKm.length) * 10
                    ) / 10} km per ${dateRange.resolution === "daily" ? "day" : "week"} over ${dateRange.label.toLowerCase()}.`
                  : "No distance data yet — import or add a run to see this chart."}{" "}
                This chart shows your total distance aggregated by {dateRange.resolution === "daily" ? "day" : "week"}.
              </p>
            </>
          )}
          {baselines && weeklyMetrics.length > 0 && (
            <AIInsight metrics={weeklyMetrics} baselines={baselines} metricType="weekly_load" userProfile={userProfile} />
          )}
          </section>
        </>
      )}

{tab === "acwr" && (
  <>
    {isComputingMetrics && (
      <section className="card">
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>⏳ Computing weekly metrics...</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Analyzing your {allEntries.length} training activities to calculate ACWR and other metrics.
          </div>
        </div>
      </section>
    )}
    {!isComputingMetrics && dateRange.resolution === 'daily' && (
      <section className="card">
        <h3 className="h2">ACWR (Workload Ratio)</h3>
        <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
          ACWR requires weekly aggregated data. Switch to 4W, 3M, or 12M view to see ACWR analysis.
        </p>
      </section>
    )}
    {!isComputingMetrics && dateRange.resolution !== 'daily' && (
      <ACWRCard defaultTimeFrame={
        globalTimeFrame.type === '3m' ? '3m' :
        globalTimeFrame.type === '12m' ? '12m' :
        '4w'
      } />
    )}
    {!isComputingMetrics && baselines && weeklyMetrics.length > 0 && dateRange.resolution !== 'daily' && (
      <AIInsight metrics={weeklyMetrics} baselines={baselines} metricType="acwr" />
    )}
  </>
)}

      {tab === "zones" && (
        <section className="card">
          <h3 className="h2">{t("insights.zones", "Heart Rate Zones")}</h3>
          <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
            {dateRange.label}
          </div>
          <div className="row" style={{ gap: 20, alignItems: "center" }}>
            <Donut values={zoneMin} labels={["Z1", "Z2", "Z3", "Z4", "Z5"]} />
            <div className="grid" style={{ gap: 6 }}>
              {zoneMin.map((m, i) => (
                <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: getCss(`--z${i + 1}`, "#888"),
                      border: "1px solid var(--line)",
                    }}
                  />
                  <span className="small">
                    Z{i + 1}: <b>{m} min</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="small" style={{ marginTop: 8, color: "var(--muted)" }}>
            Estimated <em>time-in-zone</em> for {dateRange.label.toLowerCase()} (approximate from your logged runs).{" "}
            Aim for a strong base in Z1–Z2, sprinkle controlled Z3, and use Z4–Z5 sparingly.
          </p>
        </section>
      )}

      {tab === "efficiency" && <EfficiencyTab entries={entries} dateRangeLabel={dateRange.label} baselines={baselines} weeklyMetrics={weeklyMetrics} />}
      {tab === "projection" && <RaceProjectionTab />}
      {tab === "longrun" && <LongRunTab entries={entries} dateRangeLabel={dateRange.label} />}
      {tab === "readiness" && <ReadinessTab />}

      {/* Feedback Insights Card - shown on all tabs */}
      <FeedbackInsightsCard />
    </div>
  );
}

function EfficiencyTab({ entries, dateRangeLabel, baselines, weeklyMetrics }: {
  entries: LogEntry[];
  dateRangeLabel: string;
  baselines: any;
  weeklyMetrics: any[];
}) {
  const t = useT();

  const efficiencyData = useMemo(() => getEfficiencyData(entries), [entries]);

  if (efficiencyData.length === 0) {
    return (
      <section className="card">
        <h3 className="h2">{t("insights.efficiency", "Efficiency")}</h3>
        <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
          {dateRangeLabel}
        </div>
        <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
          Not enough data. Log runs with pace and heart rate to see efficiency trends.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3 className="h2">{t("insights.efficiency", "Running Efficiency")}</h3>
      <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
        {dateRangeLabel}
        {baselines && baselines.efficiencyTrendSlope !== 0 && (
          <span style={{ marginLeft: 8 }}>
            • Trend: {baselines.efficiencyTrendSlope > 0 ? '↗ Improving' : '↘ Declining'}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#26272b" />
          <XAxis
            dataKey="pace"
            label={{ value: "Pace (min/km)", position: "bottom" }}
            stroke="#a4a6ad"
            tickFormatter={(value) => value.toFixed(1)}
          />
          <YAxis
            dataKey="hr"
            label={{ value: "Heart Rate (bpm)", angle: -90, position: "left" }}
            stroke="#a4a6ad"
            tickFormatter={(value) => Math.round(value)}
          />
          <Tooltip
            contentStyle={{ background: "#1a1b1f", border: "1px solid #26272b", color: "#fff" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#7dd3fc" }}
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number, name: string) => {
              if (name === "pace") return [`${value.toFixed(1)} min/km`, "Pace"];
              if (name === "hr") return [`${Math.round(value)} bpm`, "Heart Rate"];
              return [value.toFixed(1), name];
            }}
            labelFormatter={(label) => {
              const point = efficiencyData.find(d => d.pace === label);
              return point?.fullDate ? `Date: ${point.fullDate}` : `Pace: ${label}`;
            }}
          />
          <Scatter data={efficiencyData} fill="#7dd3fc" />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="small" style={{ marginTop: 12, color: "var(--muted)" }}>
        Lower and left is more efficient (lower HR at faster pace). Track how this cluster moves over time to see aerobic improvement.
        {baselines && baselines.baselineEfficiency && (
          <span> Your baseline efficiency is {baselines.baselineEfficiency.toFixed(1)}.</span>
        )}
      </p>
      {baselines && weeklyMetrics.length > 0 && (
        <AIInsight metrics={weeklyMetrics} baselines={baselines} metricType="efficiency" />
      )}
    </section>
  );
}

function RaceProjectionTab() {
  const t = useT();
  const [baseline, setBaseline] = useState<BaselineRace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBaseline() {
      const result = await findBestBaselineRace();
      setBaseline(result);
      setLoading(false);
    }
    loadBaseline();
  }, []);

  if (loading) {
    return (
      <section className="card">
        <h3 className="h2">{t("insights.projection", "Race Projections")}</h3>
        <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
          Loading...
        </p>
      </section>
    );
  }

  if (!baseline) {
    return (
      <section className="card">
        <h3 className="h2">{t("insights.projection", "Race Projections")}</h3>
        <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
          No baseline race found. Add a race to your Races page or log a race-distance run to see predictions.
        </p>
      </section>
    );
  }

  const projections = generateProjections(baseline);
  const chartData = projections.map(p => ({
    distance: getDistanceName(p.targetDistanceKm),
    time: p.predictedTimeMin,
    formatted: formatTime(p.predictedTimeMin)
  }));

  return (
    <section className="card">
      <h3 className="h2">{t("insights.projection", "Race Time Projections")}</h3>
      <div className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
        Based on {baseline.name} ({formatTime(baseline.timeMin)}) on {baseline.dateISO}
      </div>

      <ResponsiveContainer width="100%" height={300} style={{ marginTop: 16 }}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#26272b" />
          <XAxis dataKey="distance" stroke="#a4a6ad" />
          <YAxis stroke="#a4a6ad" />
          <Tooltip
            contentStyle={{ background: "#1a1b1f", border: "1px solid #26272b" }}
            labelStyle={{ color: "#fff" }}
            formatter={(value: number) => formatTime(value)}
          />
          <Bar dataKey="time" fill="#8ab4ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid cols-3" style={{ gap: 12, marginTop: 16 }}>
        {projections.slice(0, 3).map(proj => (
          <div key={proj.id} className="card" style={{ background: "var(--bg-secondary)" }}>
            <div className="h2">{getDistanceName(proj.targetDistanceKm)}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: 6 }}>
              {formatTime(proj.predictedTimeMin)}
            </div>
            <div className="small" style={{ color: "var(--muted)", marginTop: 4 }}>
              {formatPace(proj.predictedTimeMin / proj.targetDistanceKm)}/km
            </div>
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 12, color: "var(--muted)" }}>
        Predictions use the Riegel formula (exponent 1.06). Visit the Race Goals page for detailed projections and comparisons.
      </p>
    </section>
  );
}

function LongRunTab({ entries, dateRangeLabel }: { entries: LogEntry[]; dateRangeLabel: string }) {
  const t = useT();

  const longRuns = useMemo(() => getLongRunData(entries, 12), [entries]);

  if (longRuns.length === 0) {
    return (
      <section className="card">
        <h3 className="h2">{t("insights.longrun", "Long Run Progression")}</h3>
        <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
          {dateRangeLabel}
        </div>
        <p className="small" style={{ color: "var(--muted)", marginTop: 10 }}>
          No long runs logged yet. Runs of 12km or more will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3 className="h2">{t("insights.longrun", "Long Run Progression")}</h3>
      <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
        {dateRangeLabel}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={longRuns}>
          <CartesianGrid strokeDasharray="3 3" stroke="#26272b" />
          <XAxis dataKey="date" stroke="#a4a6ad" />
          <YAxis stroke="#a4a6ad" />
          <Tooltip
            contentStyle={{ background: "#1a1b1f", border: "1px solid #26272b", color: "#fff" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#7dd3fc" }}
            formatter={(value: number) => [`${value.toFixed(1)} km`, "Distance"]}
            labelFormatter={(label) => {
              const run = longRuns.find(r => r.date === label);
              return run?.fullDate ? `Date: ${run.fullDate}` : label;
            }}
          />
          <RechartLine type="monotone" dataKey="km" stroke="#7dd3fc" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="small" style={{ marginTop: 12, color: "var(--muted)" }}>
        Track your long run distance progression over {dateRangeLabel.toLowerCase()}. Gradual increases build endurance safely.
      </p>
    </section>
  );
}

function ReadinessTab() {
  const t = useT();
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [all, setAll] = useState<LogEntry[]>(() => load<LogEntry[]>("logEntries", []));
  const [aiHistory, setAIHistory] = useState<any[]>(() => load("aiHistory", []));

  const weeklySummary = useMemo(() => {
    if (all.length === 0) return null;

    const now = new Date();
    const lastWeek = all.filter((e) => {
      const d = new Date(e.date);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });

    const activities: Activity[] = lastWeek.map((e) => ({
      date: e.date,
      distanceKm: e.distanceKm || 0,
      durationMin: e.durationMin || 0,
      elevationGain: e.elevationGain || 0,
      avgHr: e.avgHr,
      maxHr: e.maxHr,
      avgPace: e.avgPace,
      sleepHours: 7,
    }));

    const health: HealthState = { sleepHours: 7, stress: 3, soreness: 3 };

    // Calculate last 4 weeks km
    const last4Weeks = all.filter((e) => {
      const d = new Date(e.date);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 28 && diff > 7;
    });

    const last4WeeksKm = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const weekStart = 7 + (i * 7);
      const weekEnd = weekStart + 7;
      const weekKm = last4Weeks
        .filter((e) => {
          const d = new Date(e.date);
          const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= weekStart && diff < weekEnd;
        })
        .reduce((sum, e) => sum + (e.distanceKm || 0), 0);
      last4WeeksKm[3 - i] = weekKm;
    }

    const thisWeekPlannedKm = lastWeek.reduce((sum, e) => sum + (e.distanceKm || 0), 0);

    const events = load<any[]>("raceEvents", []);
    const nextRace = events
      .map((r) => ({ ...r, date: new Date(r.date) }))
      .filter((r) => r.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    const weeksTo = nextRace
      ? Math.ceil((nextRace.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7))
      : 8;

    const activeRace = nextRace ? {
      name: nextRace.name || "Race",
      priority: (nextRace.priority || "B") as "A" | "B" | "C",
      weeksTo,
    } : null;

    const analysis = reasonWeekly({
      recentActivities: activities,
      health,
      weights: DEFAULT_WEIGHTS,
      raceProximityWeeks: weeksTo,
      last4WeeksKm,
      thisWeekPlannedKm,
      activeRace,
    });

    return {
      summary: toneLine(analysis.reason),
      fatigueScore: analysis.fatigueScore,
      health: analysis.healthStatus,
      raceWeeks: analysis.weeksUntilRace,
    };
  }, [all]);

  const handleModalSave = () => {
    console.log('[ReadinessTab] Modal saved');
    setShowReadinessModal(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <section className="card" style={{ position: 'relative' }}>
        <ReadinessTrendChart key={refreshKey} />
        <button
          className="btn small primary"
          onClick={() => setShowReadinessModal(true)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontSize: 12,
            padding: '6px 12px',
            zIndex: 10
          }}
        >
          + {t("mirror.log_readiness", "Log Readiness")}
        </button>
      </section>

      {weeklySummary && (
        <section
          className="card"
          style={{ background: "var(--card)", borderLeft: "4px solid var(--brand)" }}
        >
          <h2 className="h2">{t("home.weekly_summary", "Weekly Summary")}</h2>
          <p className="small">{weeklySummary.summary}</p>
          <div className="kv">
            <span>{t("home.fatigue_score", "Fatigue score")}</span>
            <b>{weeklySummary.fatigueScore?.toFixed(2) || 'N/A'}</b>
          </div>
          <div className="kv">
            <span>{t("home.health", "Health")}</span>
            <b>{weeklySummary.health}</b>
          </div>
          <div className="kv">
            <span>{t("home.race_proximity", "Race proximity")}</span>
            <b>
              {weeklySummary.raceWeeks} {t("home.weeks", "weeks")}
            </b>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="h2">{t("home.ai_change_history", "AI Change History")}</h2>
        {aiHistory.length === 0 ? (
          <div className="small">{t("home.no_ai_changes", "No AI changes recorded yet.")}</div>
        ) : (
          <div className="grid" style={{ gap: 8 }}>
            {aiHistory
              .slice()
              .reverse()
              .map((h, i) => (
                <div
                  key={i}
                  className="small"
                  style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
                >
                  <b>{new Date(h.date).toLocaleDateString()}</b>: {h.reason} (
                  {t("home.fatigue_score", "Fatigue score")} {h.fatigueScore.toFixed(2)})
                </div>
              ))}
          </div>
        )}
      </section>

      {showReadinessModal && (
        <ReadinessInputModal
          onClose={() => setShowReadinessModal(false)}
          onSave={handleModalSave}
        />
      )}
    </>
  );
}

export default function Insights() {
  return <InsightsContent />;
}
