import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import type { TimeFrameConfig, DateRangeResult } from "@/types/timeframe";
import { calculateDateRange, persistTimeFrame, loadPersistedTimeFrame } from "@/utils/timeframe";

type TabId = "weekly" | "acwr" | "zones" | "efficiency" | "projection" | "longrun";

type TabOverrides = Partial<Record<TabId, TimeFrameConfig>>;

interface TimeFrameContextValue {
  globalTimeFrame: TimeFrameConfig;
  setGlobalTimeFrame: (config: TimeFrameConfig) => void;
  getTimeFrameForTab: (tabId: TabId) => TimeFrameConfig;
  setTabOverride: (tabId: TabId, config: TimeFrameConfig | null) => void;
  hasTabOverride: (tabId: TabId) => boolean;
  getDateRange: (tabId?: TabId) => DateRangeResult;
}

const TimeFrameContext = createContext<TimeFrameContextValue | null>(null);

export function TimeFrameProvider({ children }: { children: ReactNode }) {
  const [globalTimeFrame, setGlobalTimeFrameState] = useState<TimeFrameConfig>(() =>
    loadPersistedTimeFrame()
  );
  const [tabOverrides, setTabOverrides] = useState<TabOverrides>({});

  useEffect(() => {
    persistTimeFrame(globalTimeFrame);
  }, [globalTimeFrame]);

  const setGlobalTimeFrame = useCallback((config: TimeFrameConfig) => {
    setGlobalTimeFrameState(config);
  }, []);

  const getTimeFrameForTab = useCallback((tabId: TabId): TimeFrameConfig => {
    return tabOverrides[tabId] || globalTimeFrame;
  }, [tabOverrides, globalTimeFrame]);

  const setTabOverride = useCallback((tabId: TabId, config: TimeFrameConfig | null) => {
    setTabOverrides((prev) => {
      const updated = { ...prev };
      if (config === null) {
        delete updated[tabId];
      } else {
        updated[tabId] = config;
      }
      return updated;
    });
  }, []);

  const hasTabOverride = useCallback((tabId: TabId): boolean => {
    return tabId in tabOverrides;
  }, [tabOverrides]);

  const getDateRange = useCallback((tabId?: TabId): DateRangeResult => {
    const config = tabId ? (tabOverrides[tabId] || globalTimeFrame) : globalTimeFrame;
    return calculateDateRange(config);
  }, [globalTimeFrame, tabOverrides]);

  const value = useMemo(() => ({
    globalTimeFrame,
    setGlobalTimeFrame,
    getTimeFrameForTab,
    setTabOverride,
    hasTabOverride,
    getDateRange,
  }), [globalTimeFrame, setGlobalTimeFrame, getTimeFrameForTab, setTabOverride, hasTabOverride, getDateRange]);

  return (
    <TimeFrameContext.Provider value={value}>
      {children}
    </TimeFrameContext.Provider>
  );
}

export function useTimeFrame() {
  const context = useContext(TimeFrameContext);
  if (!context) {
    throw new Error("useTimeFrame must be used within TimeFrameProvider");
  }
  return context;
}
