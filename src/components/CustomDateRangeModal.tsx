import { useState } from "react";
import Modal from "./Modal";
import type { CustomDateRange } from "@/types/timeframe";
import {
  calculateCustomRangeFromDays,
  getRecentCustomRanges,
  formatDateRangeLabel,
} from "@/utils/timeframe";

interface CustomDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (range: CustomDateRange) => void;
  initialRange?: { startDate: string; endDate: string };
}

export default function CustomDateRangeModal({
  isOpen,
  onClose,
  onApply,
  initialRange,
}: CustomDateRangeModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(
    initialRange?.startDate || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(initialRange?.endDate || today);
  const [quickDays, setQuickDays] = useState("");
  const [error, setError] = useState("");

  const recentRanges = getRecentCustomRanges();

  if (!isOpen) return null;

  const handleQuickDaysChange = (value: string) => {
    setQuickDays(value);
    const days = parseInt(value, 10);
    if (!isNaN(days) && days > 0 && days <= 730) {
      const { startDate: calcStart, endDate: calcEnd } = calculateCustomRangeFromDays(days);
      setStartDate(calcStart);
      setEndDate(calcEnd);
      setError("");
    }
  };

  const validateAndApply = () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      setError("Start date must be before end date");
      return;
    }

    if (endDate > today) {
      setError("End date cannot be in the future");
      return;
    }

    const daysDiff = Math.floor(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 1) {
      setError("Date range must be at least 1 day");
      return;
    }

    if (daysDiff > 730) {
      setError("Date range cannot exceed 2 years");
      return;
    }

    const range: CustomDateRange = {
      type: "custom",
      startDate,
      endDate,
      label: formatDateRangeLabel(startDate, endDate),
    };

    onApply(range);
    onClose();
  };

  const handleRecentRangeClick = (range: { startDate: string; endDate: string; label: string }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setError("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Custom Date Range">
      <div className="grid" style={{ gap: 16 }}>
        <div className="grid" style={{ gap: 12 }}>
          <div>
            <label className="small" style={{ display: "block", marginBottom: 6 }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate || today}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError("");
              }}
              className="input"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 6 }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError("");
              }}
              className="input"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <label className="small" style={{ display: "block", marginBottom: 6 }}>
            Or enter last N days
          </label>
          <input
            type="number"
            value={quickDays}
            onChange={(e) => handleQuickDaysChange(e.target.value)}
            placeholder="e.g., 45"
            min="1"
            max="730"
            className="input"
            style={{ width: "100%" }}
          />
        </div>

        {recentRanges.length > 0 && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="small" style={{ marginBottom: 8, color: "var(--muted)" }}>
              Recent custom ranges
            </div>
            <div className="grid" style={{ gap: 6 }}>
              {recentRanges.map((range, idx) => (
                <button
                  key={idx}
                  className="btn"
                  onClick={() => handleRecentRangeClick(range)}
                  style={{ justifyContent: "flex-start", textAlign: "left" }}
                >
                  <span className="small">{range.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="small"
            style={{
              color: "var(--danger, #ff6b6b)",
              padding: 8,
              background: "var(--bg-secondary)",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={validateAndApply}>
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}
