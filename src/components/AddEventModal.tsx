import { useState, useEffect } from 'react';
import { saveEvent, updateEvent, type DbEvent } from '@/lib/database';
import { SEED_RACES } from '@/data/races';
import { toast } from '@/components/ToastHost';
import { parseGPXFile, formatTime, type GPXRouteAnalysis } from '@/utils/gpxParser';
import { analyzeGPXRoutePersonalized } from '@/utils/personalizedGPXAnalysis';
import { uploadGPXFile, saveGPXAnalysisToEvent, saveRouteSegments } from '@/lib/gpxStorage';
import RouteComparisonModal from './RouteComparisonModal';
import './AddEventModal.css';

interface AddEventModalProps {
  onClose: () => void;
  onEventAdded: () => void;
  editEvent?: DbEvent | null;
}

const DISTANCE_OPTIONS = ['5K', '10K', '21K', '42K', '50K', '100K', 'Ultra', 'Custom'];

export default function AddEventModal({ onClose, onEventAdded, editEvent }: AddEventModalProps) {
  const [eventType, setEventType] = useState<'street' | 'trail' | 'other'>('street');
  const [eventName, setEventName] = useState('');
  const [distance, setDistance] = useState('');
  const [customDistance, setCustomDistance] = useState('');
  const [date, setDate] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<'A' | 'B' | 'C'>('B');
  const [goal, setGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxAnalysis, setGpxAnalysis] = useState<GPXRouteAnalysis | null>(null);
  const [isAnalyzingGpx, setIsAnalyzingGpx] = useState(false);
  const [showRouteComparison, setShowRouteComparison] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (editEvent) {
      setEventType(editEvent.type as 'street' | 'trail' | 'other');
      setEventName(editEvent.name);
      setDate(editEvent.date);
      setLocation(editEvent.location || '');
      setExpectedTime(editEvent.expected_time || '');
      setElevationGain(editEvent.elevation_gain?.toString() || '');
      setPriority((editEvent.priority as 'A' | 'B' | 'C') || 'B');
      setGoal(editEvent.goal || '');
      setNotes(editEvent.notes || '');

      if (editEvent.distance_km) {
        const distanceStr = editEvent.distance_km.toString();
        const standardDistances = ['5', '10', '21', '42', '50', '100'];
        const matchedDistance = standardDistances.find(d => distanceStr === d);
        if (matchedDistance) {
          setDistance(`${matchedDistance}K`);
        } else {
          setDistance('Custom');
          setCustomDistance(distanceStr);
        }
      }
    }
  }, [editEvent]);

  const filteredRaces = eventName
    ? SEED_RACES.filter((race) =>
        race.name.toLowerCase().includes(eventName.toLowerCase())
      ).slice(0, 5)
    : [];

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!eventName.trim()) {
      newErrors.eventName = 'Event name is required';
    }

    if (!distance) {
      newErrors.distance = 'Distance is required';
    }

    if (distance === 'Custom' && !customDistance) {
      newErrors.customDistance = 'Custom distance is required';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const distanceKm =
        distance === 'Custom'
          ? parseFloat(customDistance)
          : parseFloat(distance.replace('K', ''));

      const isRaceEvent = eventType === 'street' || eventType === 'trail';

      const eventData = {
        name: eventName,
        type: eventType,
        date,
        distance_km: distanceKm || undefined,
        expected_time: expectedTime || undefined,
        elevation_gain: elevationGain ? parseInt(elevationGain) : undefined,
        location: location || undefined,
        priority: isRaceEvent ? priority : undefined,
        goal: goal.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      let success = false;
      let createdEventId: string | null = null;

      if (editEvent) {
        console.log('Updating event:', editEvent.id, eventData);
        success = await updateEvent(editEvent.id, eventData);
        if (success) {
          toast('Event updated successfully!', 'success');
          onEventAdded();
        } else {
          console.error('updateEvent returned false');
          toast('Failed to update event. Check console for details.', 'error');
        }
      } else {
        console.log('Creating new event:', eventData);
        const result = await saveEvent(eventData);
        success = !!result;
        if (success && typeof result === 'string') {
          createdEventId = result;
          toast('Event added successfully!', 'success');
        } else {
          console.error('saveEvent returned false');
          toast('Failed to save event. Check console for details.', 'error');
        }
      }

      if (success && gpxFile && gpxAnalysis && (createdEventId || editEvent?.id)) {
        const eventId = editEvent?.id || createdEventId!;
        try {
          toast('Uploading GPX file...', 'info');
          const gpxUrl = await uploadGPXFile(gpxFile, eventId);

          await saveGPXAnalysisToEvent(
            eventId,
            { points: gpxAnalysis.elevationProfile },
            gpxAnalysis
          );

          await saveRouteSegments(eventId, gpxAnalysis.segments.map((seg, idx) => ({
            ...seg,
            estimatedTime: seg.type === 'uphill' ? gpxAnalysis.uphillTimeEstimate / gpxAnalysis.segments.filter(s => s.type === 'uphill').length :
                          seg.type === 'downhill' ? gpxAnalysis.downhillTimeEstimate / gpxAnalysis.segments.filter(s => s.type === 'downhill').length :
                          gpxAnalysis.flatTimeEstimate / gpxAnalysis.segments.filter(s => s.type === 'flat').length,
            estimatedPace: 0,
          })));

          const { updateEvent: updateEventFn } = await import('@/lib/database');
          await updateEventFn(eventId, { gpx_file_url: gpxUrl });

          toast('GPX analysis saved!', 'success');
          setSavedEventId(eventId);
        } catch (err) {
          console.error('Error uploading GPX:', err);
          toast('Event saved but GPX upload failed', 'warning');
        }
      }

      if (success) {
        onEventAdded();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRaceSelect(raceName: string, raceLocation?: string, raceDistance?: number) {
    setEventName(raceName);
    setShowAutocomplete(false);
    if (raceLocation) setLocation(raceLocation);
    if (raceDistance) {
      const distanceStr = raceDistance === 5 ? '5K' :
        raceDistance === 10 ? '10K' :
        raceDistance === 21.097 ? '21K' :
        raceDistance === 42.195 ? '42K' :
        raceDistance === 50 ? '50K' :
        raceDistance === 100 ? '100K' : 'Custom';
      setDistance(distanceStr);
      if (distanceStr === 'Custom') {
        setCustomDistance(raceDistance.toString());
      }
    }
  }

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.gpx')) {
      toast('Please upload a GPX file', 'error');
      return;
    }

    setGpxFile(file);
    setIsAnalyzingGpx(true);

    try {
      const points = await parseGPXFile(file);
      const result = await analyzeGPXRoutePersonalized(points);
      setGpxAnalysis(result.analysis);

      setDistance('Custom');
      setCustomDistance(result.analysis.totalDistanceKm.toString());

      // Only auto-fill elevation if GPX has elevation data
      if (result.analysis.totalElevationGainM > 0) {
        setElevationGain(result.analysis.totalElevationGainM.toString());
      } else {
        // Clear elevation field so user can manually enter it
        setElevationGain('');
        toast('GPX file has no elevation data. Please enter it manually.', 'warning');
      }

      setExpectedTime(formatTime(result.analysis.totalTimeEstimate));

      const message = result.hasPersonalizedPace
        ? `GPX analyzed with your personalized pace (${result.analysis.paceConfidence} confidence)!`
        : 'GPX analyzed successfully!';

      // Only show success toast if elevation data exists
      if (result.analysis.totalElevationGainM > 0) {
        toast(message, 'success');
      }
    } catch (err) {
      console.error('Error analyzing GPX:', err);
      toast('Failed to analyze GPX file', 'error');
      setGpxFile(null);
    } finally {
      setIsAnalyzingGpx(false);
    }
  }

  function handleRemoveGpx() {
    setGpxFile(null);
    setGpxAnalysis(null);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <div>
            <h2 className="event-modal-title">{editEvent ? 'Edit Event' : 'Add Event'}</h2>
            <p className="event-modal-subtitle">Plan your upcoming races and events</p>
          </div>
          <button className="event-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-modal-form">
          <div className="event-form-field">
            <label className="event-form-label">Event Type</label>
            <div className="event-type-group">
              <label className="event-type-option">
                <input
                  type="radio"
                  name="eventType"
                  value="street"
                  checked={eventType === 'street'}
                  onChange={(e) => setEventType(e.target.value as 'street')}
                />
                <span className="event-type-radio" data-color="#4A90E2" />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="event-type-icon">
                  <path d="M8 3L10 7H13L9.5 10L11 14L8 11.5L5 14L6.5 10L3 7H6L8 3Z" stroke="#4A90E2" fill="none" strokeWidth="1.5" />
                </svg>
                <span>Street Race</span>
              </label>
              <label className="event-type-option">
                <input
                  type="radio"
                  name="eventType"
                  value="trail"
                  checked={eventType === 'trail'}
                  onChange={(e) => setEventType(e.target.value as 'trail')}
                />
                <span className="event-type-radio" data-color="#00CED1" />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="event-type-icon">
                  <path d="M3 10L6 7L9 10L13 6" stroke="#00CED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Trail Race</span>
              </label>
              <label className="event-type-option">
                <input
                  type="radio"
                  name="eventType"
                  value="other"
                  checked={eventType === 'other'}
                  onChange={(e) => setEventType(e.target.value as 'other')}
                />
                <span className="event-type-radio" data-color="#6B46C1" />
                <span>Other</span>
              </label>
            </div>
          </div>

          <div className="event-form-field">
            <div className="event-form-label-row">
              <label className="event-form-label">Event Name *</label>
              <button
                type="button"
                className="event-suggestions-btn"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                💡 Suggestions
              </button>
            </div>
            <div className="event-autocomplete-wrapper">
              <input
                type="text"
                className={`event-form-input ${errors.eventName ? 'event-form-input-error' : ''}`}
                placeholder="e.g., Valencia Marathon"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  setShowAutocomplete(e.target.value.length > 0);
                }}
                onFocus={() => setShowAutocomplete(eventName.length > 0)}
              />
              {showAutocomplete && filteredRaces.length > 0 && (
                <div className="event-autocomplete-dropdown">
                  {filteredRaces.map((race) => (
                    <button
                      key={race.id}
                      type="button"
                      className="event-autocomplete-item"
                      onClick={() => handleRaceSelect(race.name, race.location, race.distanceKm)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2L8 5H11L8.5 7.5L9.5 11L7 9L4.5 11L5.5 7.5L3 5H6L7 2Z" stroke="#4A90E2" fill="none" strokeWidth="1.2" />
                      </svg>
                      {race.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.eventName && <div className="event-form-error">{errors.eventName}</div>}
          </div>

          <div className="event-form-field">
            <label className="event-form-label">Distance *</label>
            <div className="event-distance-grid">
              {DISTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`event-distance-btn ${distance === opt ? 'event-distance-btn-active' : ''}`}
                  onClick={() => setDistance(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {distance === 'Custom' && (
              <div className="event-custom-distance">
                <input
                  type="number"
                  className={`event-form-input ${errors.customDistance ? 'event-form-input-error' : ''}`}
                  placeholder="Distance"
                  value={customDistance}
                  onChange={(e) => setCustomDistance(e.target.value)}
                  step="0.01"
                  min="0"
                />
                <span className="event-custom-distance-unit">km</span>
              </div>
            )}
            {errors.distance && <div className="event-form-error">{errors.distance}</div>}
            {errors.customDistance && <div className="event-form-error">{errors.customDistance}</div>}
          </div>

          <div className="event-form-field">
            <label className="event-form-label">Race Date *</label>
            <input
              type="date"
              className={`event-form-input event-date-input ${errors.date ? 'event-form-input-error' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
            {errors.date && <div className="event-form-error">{errors.date}</div>}
          </div>

          <div className="event-form-field">
            <label className="event-form-label">
              Expected Finish Time <span className="event-optional-badge">optional</span>
            </label>
            <input
              type="text"
              className="event-form-input"
              placeholder="HH:MM:SS"
              value={expectedTime}
              onChange={(e) => setExpectedTime(e.target.value)}
            />
          </div>

          {eventType === 'trail' && (
            <div className="event-form-field">
              <label className="event-form-label">
                Total Elevation Gain <span className="event-optional-badge">optional</span>
              </label>
              <input
                type="number"
                className="event-form-input event-elevation-input"
                placeholder="e.g., 2500"
                value={elevationGain}
                onChange={(e) => setElevationGain(e.target.value)}
                min="0"
                disabled={isAnalyzingGpx}
              />
              <p className="event-form-helper">
                {gpxAnalysis
                  ? `Auto-filled from GPX (${gpxAnalysis.totalElevationGainM.toFixed(0)}m). You can edit if needed.`
                  : 'Total climbing in meters. Will be auto-filled if you upload a GPX file with elevation data.'}
              </p>
            </div>
          )}

          <div className="event-form-field">
            <label className="event-form-label">
              Location <span className="event-optional-badge">optional</span>
            </label>
            <input
              type="text"
              className="event-form-input"
              placeholder="City, Country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {(eventType === 'street' || eventType === 'trail') && (
            <>
              <div className="event-form-field">
                <label className="event-form-label">
                  Upload GPX Route <span className="event-optional-badge">optional</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="file"
                    accept=".gpx"
                    onChange={handleGpxUpload}
                    disabled={isAnalyzingGpx}
                    style={{ display: 'none' }}
                    id="gpx-upload"
                  />
                  <label
                    htmlFor="gpx-upload"
                    style={{
                      padding: '0.75rem',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '6px',
                      textAlign: 'center',
                      cursor: isAnalyzingGpx ? 'not-allowed' : 'pointer',
                      backgroundColor: 'var(--card-bg)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isAnalyzingGpx ? (
                      <span>Analyzing GPX...</span>
                    ) : gpxFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <span>✅ {gpxFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveGpx();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--error-color)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span>📁 Click to upload GPX file</span>
                    )}
                  </label>
                  {gpxAnalysis && (
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--success-bg)',
                        border: '1px solid var(--success-color)',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--success-color)' }}>
                        Route Analysis Complete
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Ascent</div>
                          <div style={{ fontWeight: 600, color: 'rgb(239, 68, 68)' }}>+{gpxAnalysis.totalElevationGainM}m</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Descent</div>
                          <div style={{ fontWeight: 600, color: 'rgb(34, 197, 94)' }}>-{gpxAnalysis.totalElevationLossM}m</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Max Altitude</div>
                          <div style={{ fontWeight: 600 }}>{gpxAnalysis.maxElevationM}m</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Uphill</div>
                          <div style={{ fontWeight: 600 }}>{gpxAnalysis.uphillDistanceKm.toFixed(1)}km ({formatTime(gpxAnalysis.uphillTimeEstimate)})</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Downhill</div>
                          <div style={{ fontWeight: 600 }}>{gpxAnalysis.downhillDistanceKm.toFixed(1)}km ({formatTime(gpxAnalysis.downhillTimeEstimate)})</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Flat</div>
                          <div style={{ fontWeight: 600 }}>{gpxAnalysis.flatDistanceKm.toFixed(1)}km ({formatTime(gpxAnalysis.flatTimeEstimate)})</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Estimated Time</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success-color)' }}>
                          {formatTime(gpxAnalysis.totalTimeEstimate)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="event-form-field">
                <label className="event-form-label">Race Priority</label>
                <select
                  className="event-form-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'A' | 'B' | 'C')}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="A">A — Goal Race (full taper)</option>
                  <option value="B">B — Secondary/Tune-up (partial taper)</option>
                  <option value="C">C — Training Race (no taper)</option>
                </select>
                <p className="event-form-helper">
                  <b>A</b> = Your main target race • <b>B</b> = Rehearsal or tune-up • <b>C</b> = Training or social race
                </p>
              </div>

              <div className="event-form-field">
                <label className="event-form-label">
                  Race Goal <span className="event-optional-badge">optional</span>
                </label>
                <input
                  type="text"
                  className="event-form-input"
                  placeholder='e.g., "Finish under 4h" or "PB 3:15"'
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              <div className="event-form-field">
                <label className="event-form-label">
                  Notes <span className="event-optional-badge">optional</span>
                </label>
                <textarea
                  className="event-form-input"
                  placeholder="Race strategy, special considerations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          )}

          <div className="event-modal-actions">
            <button
              type="button"
              className="event-modal-btn event-modal-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {gpxAnalysis && savedEventId && (
              <button
                type="button"
                className="event-modal-btn"
                onClick={() => setShowRouteComparison(true)}
                disabled={isSubmitting}
                style={{ backgroundColor: 'var(--secondary-color)' }}
              >
                View Route Matches
              </button>
            )}
            <button
              type="submit"
              className="event-modal-btn event-modal-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (editEvent ? 'Updating...' : 'Adding...') : (editEvent ? 'Update Event' : 'Add Event')}
            </button>
          </div>
        </form>
      </div>

      {showRouteComparison && gpxAnalysis && savedEventId && (
        <RouteComparisonModal
          isOpen={showRouteComparison}
          onClose={() => setShowRouteComparison(false)}
          eventId={savedEventId}
          segments={gpxAnalysis.segments}
        />
      )}
    </div>
  );
}
