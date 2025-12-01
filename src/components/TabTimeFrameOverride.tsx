import { useState } from "react";
import type { TimeFrameConfig } from "@/types/timeframe";
import TimeFrameSelector from "./TimeFrameSelector";
import CustomDateRangeModal from "./CustomDateRangeModal";
import type { CustomDateRange } from "@/types/timeframe";
import { saveRecentCustomRange } from "@/utils/timeframe";

interface TabTimeFrameOverrideProps {
  hasOverride: boolean;
  currentConfig: TimeFrameConfig;
  onSetOverride: (config: TimeFrameConfig | null) => void;
  compact?: boolean;
}

export default function TabTimeFrameOverride({
  hasOverride,
  currentConfig,
  onSetOverride,
  compact = true,
}: TabTimeFrameOverrideProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isDetached, setIsDetached] = useState(hasOverride);

  const handleDetach = () => {
    setIsDetached(true);
    onSetOverride(currentConfig);
  };

  const handleAttach = () => {
    setIsDetached(false);
    onSetOverride(null);
  };

  const handleConfigChange = (config: TimeFrameConfig) => {
    setIsDetached(true);
    onSetOverride(config);
  };

  const handleCustomRangeApply = (range: CustomDateRange) => {
    saveRecentCustomRange({
      startDate: range.startDate,
      endDate: range.endDate,
      label: range.label || "",
    });
    handleConfigChange(range);
  };

  return (
    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {!isDetached ? (
        <button
          className="btn"
          onClick={handleDetach}
          title="Use custom time frame for this tab"
          style={{ fontSize: "0.875rem", padding: "4px 8px" }}
        >
          <span style={{ marginRight: 4 }}>🔗</span>
          Detach
        </button>
      ) : (
        <>
          <TimeFrameSelector
            value={currentConfig}
            onChange={handleConfigChange}
            onCustomClick={() => setShowCustomModal(true)}
            compact={compact}
          />
          <button
            className="btn"
            onClick={handleAttach}
            title="Use global time frame"
            style={{ fontSize: "0.875rem", padding: "4px 8px" }}
          >
            <span style={{ marginRight: 4 }}>🔓</span>
            Reset
          </button>
          <CustomDateRangeModal
            isOpen={showCustomModal}
            onClose={() => setShowCustomModal(false)}
            onApply={handleCustomRangeApply}
            initialRange={
              currentConfig.type === "custom"
                ? { startDate: currentConfig.startDate, endDate: currentConfig.endDate }
                : undefined
            }
          />
        </>
      )}
    </div>
  );
}
