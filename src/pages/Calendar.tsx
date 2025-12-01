import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getEvents,
  getTravelLocations,
  deleteTravelLocation,
  deleteEvent,
  type DbEvent,
  type DbTravelLocation,
} from '@/lib/database';
import { useUserLocation, checkAndHandleLocationChange } from '@/utils/locationTracking';
import { adjustTrainingPlan, applyJetLagAdjustment } from '@/utils/planAdjustment';
import { getWeekPlan } from '@/lib/plan';
import { useSeasonPlan } from '@/hooks/useSeasonPlan';
import { MACROCYCLE_NAMES } from '@/types/seasonPlan';
import AddEventModal from '@/components/AddEventModal';
import AddTravelModal from '@/components/AddTravelModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getRunRadar, type RunCard } from '@/routes/runRadar';
import { useT } from '@/i18n';
import './Calendar.css';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const EVENT_COLORS: Record<string, { primary: string; icon: string }> = {
  street: { primary: '#B9F227', icon: '🏙️' },
  trail: { primary: '#46E7B1', icon: '⛰️' },
  other: { primary: '#7A5CFF', icon: '📅' },
};

export default function Calendar() {
  const t = useT();
  const navigate = useNavigate();
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [travelLocations, setTravelLocations] = useState<DbTravelLocation[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTravel, setShowAddTravel] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventName: string;
  }>({ isOpen: false, eventId: null, eventName: '' });
  const [runRadar, setRunRadar] = useState<RunCard[]>([]);
  const { location: userLocation } = useUserLocation();
  const { seasonPlan } = useSeasonPlan();

  useEffect(() => {
    loadData();
    loadRunRadar();
  }, []);

  async function loadRunRadar() {
    if (userLocation) {
      const routes = await getRunRadar(userLocation.lat, userLocation.lon);
      setRunRadar(routes);
    }
  }

  useEffect(() => {
    if (userLocation) {
      checkAndHandleLocationChange(userLocation).then((result) => {
        if (result.changed && result.conditions && result.stressFactor) {
          const plan = getWeekPlan();
          const adjusted = adjustTrainingPlan(
            plan,
            result.stressFactor,
            { city: userLocation.city, country: userLocation.country },
            result.conditions
          );

          if (adjusted.adjusted) {
            window.dispatchEvent(
              new CustomEvent('location:changed', {
                detail: {
                  location: userLocation,
                  conditions: result.conditions,
                  message: adjusted.message,
                },
              })
            );
          }
        }
      });
    }
  }, [userLocation]);

  async function loadData() {
    console.log('Calendar: Loading data...');
    const [eventsData, travelData] = await Promise.all([
      getEvents(),
      getTravelLocations(),
    ]);
    console.log('Calendar: Loaded events:', eventsData);
    console.log('Calendar: Loaded travel:', travelData);
    setEvents(eventsData);
    setTravelLocations(travelData);
  }

  const currentPhase = useMemo(() => {
    if (!seasonPlan?.macrocycles) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const phase = seasonPlan.macrocycles.find((m) => {
      const start = new Date(m.startDate);
      const end = new Date(m.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return today >= start && today <= end;
    });

    if (!phase) return null;

    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    const totalWeeks = phase.durationWeeks;
    const currentWeek = Math.floor((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    return {
      ...phase,
      currentWeek,
      totalWeeks,
    };
  }, [seasonPlan]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = events
      .map((event) => {
        const eventDate = new Date(event.date);
        const diffTime = eventDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...event, daysUntil: diffDays };
      })
      .filter((e) => e.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    console.log('Calendar: Upcoming events:', upcoming);
    return upcoming;
  }, [events]);

  const currentLocation = userLocation
    ? `${userLocation.city || 'Unknown'}, ${userLocation.country || 'Unknown'}`
    : 'Detecting...';

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{
      date: number;
      dateStr: string;
      isToday: boolean;
      hasEvent: boolean;
      eventColor?: string;
      isTravel: boolean;
      travelPosition?: 'single' | 'start' | 'middle' | 'end';
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        date: 0,
        dateStr: '',
        isToday: false,
        hasEvent: false,
        isTravel: false,
      });
    }

    for (let date = 1; date <= daysInMonth; date++) {
      const currentDateObj = new Date(year, month, date);
      const dateStr = currentDateObj.toISOString().slice(0, 10);
      const isToday =
        currentDateObj.getFullYear() === today.getFullYear() &&
        currentDateObj.getMonth() === today.getMonth() &&
        currentDateObj.getDate() === today.getDate();

      const event = events.find((e) => e.date === dateStr);
      const hasEvent = !!event;
      const eventColor = event ? EVENT_COLORS[event.type]?.primary : undefined;

      const travelOnDate = travelLocations.find(
        (t) => dateStr >= t.start_date && dateStr <= t.end_date
      );
      const isTravel = !!travelOnDate;

      let travelPosition: 'single' | 'start' | 'middle' | 'end' | undefined;
      if (isTravel && travelOnDate) {
        if (travelOnDate.start_date === travelOnDate.end_date) {
          travelPosition = 'single';
        } else if (dateStr === travelOnDate.start_date) {
          travelPosition = 'start';
        } else if (dateStr === travelOnDate.end_date) {
          travelPosition = 'end';
        } else {
          travelPosition = 'middle';
        }
      }

      days.push({
        date,
        dateStr,
        isToday,
        hasEvent,
        eventColor,
        isTravel,
        travelPosition,
      });
    }

    return days;
  }, [currentDate, events, travelLocations]);

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  async function handleDeleteTravel(id: string) {
    if (confirm('Remove this travel location?')) {
      await deleteTravelLocation(id);
      await loadData();
    }
  }

  function handleDeleteEvent(event: DbEvent) {
    setDeleteConfirm({
      isOpen: true,
      eventId: event.id,
      eventName: event.name,
    });
  }

  async function confirmDeleteEvent() {
    if (deleteConfirm.eventId) {
      await deleteEvent(deleteConfirm.eventId);
      await loadData();
    }
    setDeleteConfirm({ isOpen: false, eventId: null, eventName: '' });
  }

  function cancelDeleteEvent() {
    setDeleteConfirm({ isOpen: false, eventId: null, eventName: '' });
  }

  function handleEditEvent(event: DbEvent) {
    setEditingEvent(event);
    setShowAddEvent(true);
  }

  function handleEventAdded() {
    setShowAddEvent(false);
    setEditingEvent(null);
    loadData();
  }

  function handleTravelAdded() {
    setShowAddTravel(false);
    loadData();
  }

  function getPhaseIcon(phase: string) {
    const icons: Record<string, string> = {
      base_building: '🩵',
      sharpening: '🔥',
      taper: '💤',
      race: '🏁',
      recovery: '🌿',
    };
    return icons[phase] || '📅';
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="calendar-container">
      <div className="calendar-bg-gradient" />

      <div className="calendar-content">
        <div className="calendar-header">
          <button className="calendar-back-btn" onClick={() => navigate('/quest')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 16L6 10L12 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {currentPhase && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              backgroundColor: currentPhase.color,
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '14px',
            }}
          >
            <div style={{ fontWeight: '600' }}>
              {getPhaseIcon(currentPhase.phase)} Current Phase: {MACROCYCLE_NAMES[currentPhase.phase]}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              Week {currentPhase.currentWeek} of {currentPhase.totalWeeks} ({formatDate(currentPhase.startDate)} → {formatDate(currentPhase.endDate)})
            </div>
          </div>
        )}

        <div className="calendar-month-section">
          <h2 className="calendar-section-title calendar-month-title">Calendar</h2>

          <div className="calendar-card">
            <div className="calendar-card-inner">
              <div className="calendar-month-header">
                <button className="calendar-nav-btn" onClick={handlePrevMonth}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="calendar-month-display">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                <button className="calendar-nav-btn" onClick={handleNextMonth}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 12L10 8L6 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="calendar-weekdays">
                {DAYS_SHORT.map((day, i) => (
                  <div key={i} className="calendar-weekday">
                    {day}
                  </div>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarDays.map((day, i) => {
                  if (day.date === 0) {
                    return <div key={`empty-${i}`} className="calendar-day calendar-day-empty" />;
                  }

                  const dayClasses = [
                    'calendar-day',
                    day.isToday && 'calendar-day-today',
                    day.hasEvent && 'calendar-day-event',
                    day.isTravel && `calendar-day-travel calendar-day-travel-${day.travelPosition}`,
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div key={day.dateStr} className={dayClasses}>
                      {day.hasEvent && (
                        <div
                          className="calendar-day-event-circle"
                          style={{
                            borderColor: day.eventColor,
                            boxShadow: `0 0 12px ${day.eventColor}80, inset 0 0 8px ${day.eventColor}30`,
                          }}
                        />
                      )}
                      <span
                        className="calendar-day-number"
                        style={day.hasEvent ? { color: day.eventColor } : undefined}
                      >
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="calendar-legend">
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot" style={{ background: '#B9F227' }} />
                  <span>Street</span>
                </div>
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot" style={{ background: '#46E7B1' }} />
                  <span>Trail</span>
                </div>
                <div className="calendar-legend-item">
                  <div className="calendar-legend-dot" style={{ background: '#7A5CFF' }} />
                  <span>Other</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="calendar-upcoming-section">
          <div className="calendar-section-header">
            <div>
              <h2 className="calendar-section-title">Upcoming Events</h2>
              <p className="calendar-section-subtitle">
                {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>
            <button className="calendar-add-btn" onClick={() => setShowAddEvent(true)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add Event
            </button>
          </div>

          <div className="calendar-events-list">
            {upcomingEvents.map((event) => {
              const color = EVENT_COLORS[event.type] || EVENT_COLORS.other;
              const isRace = event.type === 'street' || event.type === 'trail';
              return (
                <div key={event.id} className="calendar-event-card">
                  <div className="calendar-event-left">
                    <div
                      className="calendar-event-icon"
                      style={{
                        borderColor: color.primary,
                        background: `${color.primary}20`,
                      }}
                    >
                      {color.icon}
                    </div>
                    <div className="calendar-event-info">
                      <div className="calendar-event-title-row">
                        <span className="calendar-event-title" style={{ color: color.primary }}>
                          {event.name}
                        </span>
                        {isRace && event.priority && (
                          <span className="calendar-gpx-badge" style={{
                            background: event.priority === 'A' ? 'var(--brand)' : event.priority === 'B' ? '#46E7B1' : '#7A5CFF',
                            marginLeft: '6px'
                          }}>
                            {event.priority}
                          </span>
                        )}
                        {event.gpx_file_url && <span className="calendar-gpx-badge">GPX</span>}
                      </div>
                      <div className="calendar-event-details">
                        {event.distance_km && `${event.distance_km}K`}
                        {event.distance_km && event.location && ' • '}
                        {event.location}
                      </div>
                    </div>
                  </div>
                  <div className="calendar-event-right">
                    <div className="calendar-event-days" style={{ color: color.primary }}>
                      {event.daysUntil}
                    </div>
                    <div className="calendar-event-days-label">days</div>
                    <div className="calendar-event-actions">
                      <button
                        className="calendar-event-action-btn"
                        onClick={() => handleEditEvent(event)}
                        title="Edit event"
                      >
                        ✏️
                      </button>
                      <button
                        className="calendar-event-action-btn"
                        onClick={() => handleDeleteEvent(event)}
                        title="Delete event"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {upcomingEvents.length === 0 && (
              <div className="calendar-empty-state">
                <p>No upcoming events</p>
                <button className="calendar-add-btn-secondary" onClick={() => setShowAddEvent(true)}>
                  Add your first event
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="calendar-location-section">
          <div className="calendar-location-header">
            <div className="calendar-location-left">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="calendar-location-icon"
              >
                <path
                  d="M8 8C8.82843 8 9.5 7.32843 9.5 6.5C9.5 5.67157 8.82843 5 8 5C7.17157 5 6.5 5.67157 6.5 6.5C6.5 7.32843 7.17157 8 8 8Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 14C10 12 13 9.5 13 6.5C13 3.73858 10.7614 1.5 8 1.5C5.23858 1.5 3 3.73858 3 6.5C3 9.5 6 12 8 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="calendar-location-text">
                <div className="calendar-location-label">Current Location</div>
                <div className="calendar-location-name">{currentLocation}</div>
              </div>
            </div>
            <button className="calendar-add-travel-btn" onClick={() => setShowAddTravel(true)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add Travel
            </button>
          </div>

          {travelLocations.length > 0 && (
            <div className="calendar-travel-list">
              <div className="calendar-travel-list-label">Upcoming Travel</div>
              {travelLocations.map((travel) => (
                <div key={travel.id} className="calendar-travel-item">
                  <div className="calendar-travel-info">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 6C6.55228 6 7 5.55228 7 5C7 4.44772 6.55228 4 6 4C5.44772 4 5 4.44772 5 5C5 5.55228 5.44772 6 6 6Z"
                        stroke="currentColor"
                      />
                      <path
                        d="M6 10C7.5 8.5 9.5 6.75 9.5 5C9.5 3.067 7.933 1.5 6 1.5C4.067 1.5 2.5 3.067 2.5 5C2.5 6.75 4.5 8.5 6 10Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <div className="calendar-travel-location">{travel.location}</div>
                      <div className="calendar-travel-dates">
                        {new Date(travel.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(travel.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    className="calendar-travel-remove-btn"
                    onClick={() => handleDeleteTravel(travel.id!)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddEvent && (
        <AddEventModal
          onClose={() => {
            setShowAddEvent(false);
            setEditingEvent(null);
          }}
          onEventAdded={handleEventAdded}
          editEvent={editingEvent}
        />
      )}

      {showAddTravel && (
        <AddTravelModal onClose={() => setShowAddTravel(false)} onTravelAdded={handleTravelAdded} />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Event?"
        message={`Are you sure you want to delete "${deleteConfirm.eventName}"? This action cannot be undone.`}
        confirmText="Delete Event"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteEvent}
        onCancel={cancelDeleteEvent}
      />

      {/* Run Radar */}
      {runRadar.length > 0 && (
        <div style={{
          padding: '20px',
          background: 'rgba(17, 17, 24, 0.8)',
          borderRadius: '16px',
          marginTop: '24px',
        }}>
          <h2 className="h2" style={{ marginBottom: 16 }}>{t("home.run_radar", "Run Radar Near You")}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {runRadar.map((r) => (
              <div key={r.id} style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div className="h2" style={{ fontSize: 16, marginBottom: 4 }}>{r.title}</div>
                <div className="small" style={{ color: 'var(--muted)', marginBottom: 8 }}>{r.region}</div>
                <div className="small" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {r.km} km • {r.surface} • {t("home.scenic", "Scenic")} {r.scenicScore}/10
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
