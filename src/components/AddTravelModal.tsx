import { useState } from 'react';
import { saveTravelLocation } from '@/lib/database';
import './AddTravelModal.css';

interface AddTravelModalProps {
  onClose: () => void;
  onTravelAdded: () => void;
}

export default function AddTravelModal({ onClose, onTravelAdded }: AddTravelModalProps) {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const travel = {
      location,
      start_date: startDate,
      end_date: endDate,
    };

    const success = await saveTravelLocation(travel);

    if (success) {
      window.dispatchEvent(
        new CustomEvent('travel:added', {
          detail: { location, startDate, endDate },
        })
      );
      onTravelAdded();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="travel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="travel-modal-header">
          <div>
            <h2 className="travel-modal-title">Add Travel Location</h2>
            <p className="travel-modal-subtitle">Training context updates automatically</p>
          </div>
          <button className="travel-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="travel-modal-form">
          <div className="travel-form-field">
            <label className="travel-form-label">Location *</label>
            <input
              type="text"
              className={`travel-form-input ${errors.location ? 'travel-form-input-error' : ''}`}
              placeholder="Barcelona, Spain"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            {errors.location && <div className="travel-form-error">{errors.location}</div>}
          </div>

          <div className="travel-form-field">
            <label className="travel-form-label">Travel Dates *</label>
            <div className="travel-date-grid">
              <div>
                <label className="travel-date-label">Start Date</label>
                <input
                  type="date"
                  className={`travel-form-input travel-date-input ${errors.startDate ? 'travel-form-input-error' : ''}`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="travel-date-label">End Date</label>
                <input
                  type="date"
                  className={`travel-form-input travel-date-input ${errors.endDate ? 'travel-form-input-error' : ''}`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().slice(0, 10)}
                  disabled={!startDate}
                />
              </div>
            </div>
            {errors.startDate && <div className="travel-form-error">{errors.startDate}</div>}
            {errors.endDate && <div className="travel-form-error">{errors.endDate}</div>}
          </div>

          <div className="travel-info-box">
            <span className="travel-info-icon">📍</span>
            <p className="travel-info-text">
              Your training plan adapts to altitude, climate, and terrain when you travel
            </p>
          </div>

          <div className="travel-modal-actions">
            <button type="button" className="travel-modal-btn travel-modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="travel-modal-btn travel-modal-btn-submit">
              Add Travel Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
