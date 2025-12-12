import { useMemo, useState, useEffect } from "react";
import { useT } from "@/i18n";
import { load } from "@/utils/storage";
import type { LogEntry } from "@/types";
import { on } from "@/lib/bus";
import { useTimeFrame } from "@/contexts/TimeFrameContext";
import CustomDateRangeModal from "@/components/CustomDateRangeModal";
import type { CustomDateRange, TimeFramePreset } from "@/types/timeframe";
import { saveRecentCustomRange, getTimeFrameWeeksCount } from "@/utils/timeframe";
import { getLogEntriesByDateRange } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { isTrailRunner, calculateWeeklyLoads, getLoadConfig, getSafetyWarning, formatLoadSummary } from "@/utils/trailLoad";
import type { UserProfile } from "@/types/onboarding";
import { filterEntriesByDateRange, aggregateByWeek } from "@/utils/dataAggregation";
import { AlertTriangle, Zap } from "lucide-react";
import MirrorWeeklyChart from "./MirrorWeeklyChart";
import ACWRCard from "./ACWRCard";

type TabKey = "weekly" | "acwr" | "zones" | "efficiency" | "projection" | "longrun";

const TIME_PRESETS: { key: TimeFramePreset; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "4w", label: "4w" },
  { key: "3m", label: "3m" },
  { key: "12m", label: "12m" },
];

export default function MirrorInsights() {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("weekly");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [allEntries, setAllEntries] = useState<LogEntry[]>(() => load<LogEntry[]>("logEntries", []));
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const { globalTimeFrame, setGlobalTimeFrame, getDateRange } = useTimeFrame();

  useEffect(() => {
    getCurrentUserProfile().then(setUserProfile);
  }, []);

  const dateRange = useMemo(() => getDateRange(), [globalTimeFrame]);
  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  useEffect(() => {
    const fetchData = async () => {
      const data = await getLogEntriesByDateRange(startDate, endDate);
      setAllEntries(data);
    };
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    const handleImport = () => {
      const fetchData = async () => {
        const data = await getLogEntriesByDateRange(startDate, endDate);
        setAllEntries(data);
      };
      fetchData();
    };

    const unsubscribe = on("log:import-complete", handleImport);
    return () => unsubscribe();
  }, [startDate, endDate]);

  const entries = useMemo(
    () => filterEntriesByDateRange(allEntries, startDate, endDate),
    [allEntries, startDate, endDate]
  );

  const weeks = useMemo(() => {
    const weeksCount = getTimeFrameWeeksCount(globalTimeFrame);
    return aggregateByWeek(entries, weeksCount);
  }, [entries, globalTimeFrame]);

  const config = useMemo(() => getLoadConfig(userProfile), [userProfile]);

  const weekData = useMemo(() => {
    return weeks.map(w => ({
      week: w.key,
      distance: w.value || 0,
      vertical: w.vertical || 0,
    }));
  }, [weeks]);

  const loads = useMemo(() => calculateWeeklyLoads(weekData, config), [weekData, config]);
  const currentWeekLoad = loads[loads.length - 1];
  const warning = currentWeekLoad ? getSafetyWarning(currentWeekLoad) : null;

  const handleCustomRangeApply = (range: CustomDateRange) => {
    saveRecentCustomRange({
      startDate: range.startDate,
      endDate: range.endDate,
      label: range.label || "",
    });
    setGlobalTimeFrame(range);
  };

  const tabs = [
    { key: "weekly" as TabKey, label: t("insights.weekly_distance", "Weekly distance") },
    { key: "acwr" as TabKey, label: t("insights.acwr", "ACWR") },
    { key: "zones" as TabKey, label: t("insights.zones", "Zones") },
    { key: "efficiency" as TabKey, label: t("insights.efficiency", "Efficiency") },
    { key: "projection" as TabKey, label: t("insights.projection", "Projection") },
    { key: "longrun" as TabKey, label: t("insights.longrun", "Long Run") },
  ];

  return (
    <>
      <section className="mirror-card">
        <div className="mirror-insights-header">
          <h2 className="mirror-insights-title">{t("insights.dashboard", "Insights Dashboard")}</h2>
          <div className="mirror-timeframe-pills">
            {TIME_PRESETS.map(({ key, label }) => (
              <button
                key={key}
                className={`mirror-pill ${globalTimeFrame.type === "preset" && globalTimeFrame.preset === key ? "active" : ""}`}
                onClick={() => setGlobalTimeFrame({ type: "preset", preset: key })}
              >
                {label}
              </button>
            ))}
            <button
              className={`mirror-pill ${globalTimeFrame.type === "custom" ? "active" : ""}`}
              onClick={() => setShowCustomModal(true)}
            >
              Custom
            </button>
          </div>
        </div>

        {warning && (
          <div className="mirror-warning-banner">
            <AlertTriangle className="mirror-warning-icon" size={18} />
            <p className="mirror-warning-text">{warning}</p>
          </div>
        )}

        <div className="mirror-tab-buttons">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`mirror-tab-btn ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "weekly" && (
        <div className="mirror-chart-section">
          <div className="mirror-chart-card">
            <div className="mirror-chart-header">
              <h3 className="mirror-chart-title">Weekly Distance & Vertical Gain</h3>
              <p className="mirror-chart-subtitle">Combined load tracking for trail running progression</p>
            </div>

            {warning && (
              <div className="mirror-warning-banner">
                <AlertTriangle className="mirror-warning-icon" size={18} />
                <p className="mirror-warning-text">{warning}</p>
              </div>
            )}

            <MirrorWeeklyChart data={loads} />

            <div className="mirror-load-box">
              <p className="mirror-load-title">Current Week Load:</p>
              <p className="mirror-load-value">
                {formatLoadSummary(currentWeekLoad, config)}
              </p>
            </div>

            <div className="mirror-balance-note">
              <Zap className="mirror-balance-icon" size={16} />
              <p className="mirror-balance-text">
                Training load well-balanced. {currentWeekLoad ? `${currentWeekLoad.combinedLoad.toFixed(1)} km-eq (${currentWeekLoad.distance.toFixed(1)} km + ${currentWeekLoad.vertical.toFixed(0)} m)` : ""}<br />
                Your feedback helps your AI coach learn and adapt.
              </p>
            </div>
          </div>

          <MirrorFeedbackPanel />
        </div>
      )}

      {tab === "acwr" && (
        <div className="mirror-chart-section">
          <ACWRCard />
        </div>
      )}

      {tab === "zones" && (
        <div className="mirror-chart-section">
          <div className="mirror-chart-card">
            <div className="mirror-chart-header">
              <h3 className="mirror-chart-title">Training Zones</h3>
              <p className="mirror-chart-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
      )}

      {tab === "efficiency" && (
        <div className="mirror-chart-section">
          <div className="mirror-chart-card">
            <div className="mirror-chart-header">
              <h3 className="mirror-chart-title">Efficiency (Pace vs HR)</h3>
              <p className="mirror-chart-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
      )}

      {tab === "projection" && (
        <div className="mirror-chart-section">
          <div className="mirror-chart-card">
            <div className="mirror-chart-header">
              <h3 className="mirror-chart-title">Projection</h3>
              <p className="mirror-chart-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
      )}

      {tab === "longrun" && (
        <div className="mirror-chart-section">
          <div className="mirror-chart-card">
            <div className="mirror-chart-header">
              <h3 className="mirror-chart-title">Long Run</h3>
              <p className="mirror-chart-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

function MirrorFeedbackPanel() {
  const [completionRate] = useState<number>(0);

  return (
    <div className="mirror-feedback-card">
      <h3 className="mirror-feedback-title">Feedback Insights</h3>

      <div className="mirror-feedback-rate">
        <p className="mirror-feedback-label">Feedback Completion Rate it as to days:</p>
        <span className="mirror-feedback-value">{completionRate}%</span>
      </div>

      <div className="mirror-feedback-empty">
        <p className="mirror-feedback-empty-title">No race or DNF feedback yet:</p>
        <p className="mirror-feedback-empty-text">
          Complete a race or simulation to see insights here.
        </p>
      </div>
    </div>
  );
}
