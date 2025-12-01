import { useState, useEffect } from 'react';
import { getUserActiveLocations, createUserLocation, deleteUserLocation } from '@/lib/community';
import { getTravelLocations, saveTravelLocation, deleteTravelLocation, getEvents } from '@/lib/database';
import { toast } from '@/components/ToastHost';
import { isAuthed } from '@/lib/supabase';
import type { ActiveLocation, CreateUserLocation } from '@/types/community';

export default function LocationManager() {
  const [locations, setLocations] = useState<ActiveLocation[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const authed = await isAuthed();
    setAuthenticated(authed);
    if (authed) {
      await loadLocations();
    } else {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      await autoSyncTravelLocations();
      const locs = await getUserActiveLocations();
      setLocations(locs);
    } finally {
      setLoading(false);
    }
  };

  const autoSyncTravelLocations = async () => {
    try {
      console.log('Starting auto-sync of travel locations and races...');

      const existingLocs = await getUserActiveLocations();
      console.log('Existing Unity locations:', existingLocs);

      const existingTravelLocs = existingLocs.filter(loc =>
        loc.location_source === 'travel_calendar' || loc.location_source === 'race_calendar'
      );
      const existingKeys = new Set(existingTravelLocs.map(loc =>
        `${loc.location_label}|${loc.start_date}|${loc.end_date}|${loc.location_source}`
      ));

      let syncedCount = 0;

      const travelPlans = await getTravelLocations();
      console.log('Travel plans from Calendar:', travelPlans);
      const upcomingTravel = travelPlans.filter(t => new Date(t.end_date) >= new Date());
      console.log('Upcoming travel:', upcomingTravel);

      for (const travel of upcomingTravel) {
        const key = `${travel.location}|${travel.start_date}|${travel.end_date}|travel_calendar`;
        console.log('Checking travel:', key, 'Exists:', existingKeys.has(key));

        if (!existingKeys.has(key)) {
          const locationData: CreateUserLocation = {
            location_label: travel.location,
            city: travel.location.split(',')[0]?.trim(),
            country: travel.location.split(',')[1]?.trim(),
            start_date: travel.start_date,
            end_date: travel.end_date,
            location_source: 'travel_calendar',
          };

          console.log('Creating new Unity location:', locationData);
          const result = await createUserLocation(locationData);
          console.log('Creation result:', result);
          if (result) syncedCount++;
        }
      }

      const allEvents = await getEvents();
      const raceEvents = allEvents.filter(e =>
        (e.type === 'street' || e.type === 'trail') &&
        e.location &&
        new Date(e.date) >= new Date()
      );
      console.log('Upcoming races:', raceEvents);

      for (const race of raceEvents) {
        const raceLabel = `🏁 ${race.name}`;
        const key = `${raceLabel}|${race.date}|${race.date}|race_calendar`;
        console.log('Checking race:', key, 'Exists:', existingKeys.has(key));

        if (!existingKeys.has(key) && race.location) {
          const locationData: CreateUserLocation = {
            location_label: raceLabel,
            city: race.location.split(',')[0]?.trim(),
            country: race.location.split(',')[1]?.trim(),
            start_date: race.date,
            end_date: race.date,
            location_source: 'race_calendar',
          };

          console.log('Creating new race Unity location:', locationData);
          const result = await createUserLocation(locationData);
          console.log('Creation result:', result);
          if (result) {
            syncedCount++;
            existingKeys.add(key);
          }
        }
      }

      if (syncedCount > 0) {
        console.log(`Auto-synced ${syncedCount} locations (travel + races)`);
        toast(`Synced ${syncedCount} location(s) from Calendar`, 'success');
      }
    } catch (error) {
      console.error('Error auto-syncing locations:', error);
    }
  };

  const handleDeleteLocation = async (location: ActiveLocation) => {
    if (!confirm('Remove this location? If synced from travel, it will be removed from Calendar too.')) return;

    if (location.location_source === 'travel_calendar') {
      const travelPlans = await getTravelLocations();
      const matchingTravel = travelPlans.find(
        t => t.location === location.location_label &&
        t.start_date === location.start_date &&
        t.end_date === location.end_date
      );
      if (matchingTravel) {
        await deleteTravelLocation(matchingTravel.id!);
      }
    }

    const success = await deleteUserLocation(location.id);
    if (success) {
      toast('Location removed', 'success');
      loadLocations();
    } else {
      toast('Failed to remove location', 'error');
    }
  };


  if (loading) {
    return (
      <div className="small" style={{ textAlign: 'center', padding: 20 }}>
        Loading locations...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div>
        <h3 className="h2" style={{ marginBottom: 12 }}>My Locations</h3>
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(251, 146, 60, 0.1))',
            borderRadius: 12,
            border: '2px solid #f59e0b',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            Authentication Required
          </div>
          <div className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
            Please sign in to manage your Unity locations and find running buddies
          </div>
          <a href="/auth" className="btn primary">
            Sign In / Sign Up
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="h2">My Locations</h3>
        <button className="btn primary small" onClick={() => setShowAddModal(true)} style={{ fontSize: 12 }}>
          + Add Location
        </button>
      </div>

      <div
        style={{
          padding: 12,
          marginBottom: 16,
          background: 'rgba(70, 231, 177, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(70, 231, 177, 0.3)',
        }}
      >
        <div className="small" style={{ color: 'var(--text)' }}>
          ✨ <b>Auto-sync:</b> Race locations and travel plans from Calendar automatically appear here. Locations with dates you add here sync to Calendar. Deleting synced locations removes them from both places.
        </div>
      </div>

      {locations.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: 'var(--card-bg)',
            borderRadius: 8,
            border: '1px dashed var(--border)',
          }}
        >
          <div className="small" style={{ color: 'var(--muted)' }}>
            No locations added yet
          </div>
          <button className="btn primary" onClick={() => setShowAddModal(true)} style={{ marginTop: 12 }}>
            Add Your First Location
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {locations.map(loc => (
            <LocationCard
              key={loc.id}
              location={loc}
              onDelete={() => handleDeleteLocation(loc)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddLocationModal
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            loadLocations();
          }}
        />
      )}
    </div>
  );
}

interface LocationCardProps {
  location: ActiveLocation;
  onDelete: () => void;
}

function LocationCard({ location, onDelete }: LocationCardProps) {
  const getStatusBadge = () => {
    if (location.is_current) {
      return <span style={{ background: 'var(--success)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>CURRENT</span>;
    }
    return <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>UPCOMING</span>;
  };

  const getSourceIcon = () => {
    switch (location.location_source) {
      case 'race_calendar': return '🏁';
      case 'travel_calendar': return '✈️';
      case 'google_calendar': return '📅';
      case 'auto_detected': return '📍';
      default: return '🏠';
    }
  };

  return (
    <div
      style={{
        padding: 16,
        background: location.is_current ? 'linear-gradient(135deg, #46E7B1 0%, #00C9A7 100%)' : 'var(--card-bg)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>{getSourceIcon()}</span>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{location.location_label || location.city}</span>
          {getStatusBadge()}
        </div>

        {location.city && location.country && (
          <div className="small" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            {location.city}, {location.country}
          </div>
        )}

        {(location.start_date || location.end_date) && (
          <div className="small" style={{ color: 'var(--muted)' }}>
            {location.start_date ? new Date(location.start_date).toLocaleDateString() : '—'} → {location.end_date ? new Date(location.end_date).toLocaleDateString() : 'Ongoing'}
          </div>
        )}

        {location.distance_from_home_km !== null && location.distance_from_home_km > 0 && (
          <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
            📏 {location.distance_from_home_km} km from home
          </div>
        )}
      </div>

      <button
        className="btn small"
        onClick={onDelete}
        style={{ fontSize: 18, padding: '4px 8px', background: 'rgba(255,255,255,0.2)' }}
      >
        🗑️
      </button>
    </div>
  );
}

interface AddLocationModalProps {
  onClose: () => void;
  onSave: () => void;
}

function AddLocationModal({ onClose, onSave }: AddLocationModalProps) {
  const [locationLabel, setLocationLabel] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!locationLabel.trim()) {
      toast('Please enter a location name', 'error');
      return;
    }

    setSaving(true);
    try {
      const locationData: CreateUserLocation = {
        location_label: locationLabel,
        city: city || undefined,
        country: country || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        location_source: 'manual',
      };

      console.log('Creating location with data:', locationData);
      const result = await createUserLocation(locationData);
      console.log('Location creation result:', result);

      if (result) {
        if (startDate && endDate) {
          console.log('Syncing to travel calendar...');
          const travelPlans = await getTravelLocations();
          const alreadyExists = travelPlans.some(
            t => t.location === locationLabel &&
            t.start_date === startDate &&
            t.end_date === endDate
          );

          if (!alreadyExists) {
            const saved = await saveTravelLocation({
              location: locationLabel,
              start_date: startDate,
              end_date: endDate,
            });
            if (saved) {
              toast('Location added to Unity and Calendar!', 'success');
            } else {
              toast('Location added to Unity (Calendar sync failed)', 'warning');
            }
          } else {
            toast('Location added to Unity!', 'success');
          }
        } else {
          toast('Location added to Unity!', 'success');
        }
        onSave();
      } else {
        toast('Failed to add location - check console for details', 'error');
      }
    } catch (error) {
      console.error('Exception in handleSave:', error);
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 500, width: '90%', margin: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="h2">Add Location</h3>
          <button className="btn small" onClick={onClose} style={{ fontSize: 18 }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 6 }}>
              Location Name *
            </label>
            <input
              type="text"
              value={locationLabel}
              onChange={e => setLocationLabel(e.target.value)}
              placeholder="e.g., London, Barcelona, Home"
              style={{ width: '100%' }}
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="small" style={{ display: 'block', marginBottom: 6 }}>
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="London"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small" style={{ display: 'block', marginBottom: 6 }}>
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="UK"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="small" style={{ display: 'block', marginBottom: 6 }}>
                Start Date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small" style={{ display: 'block', marginBottom: 6 }}>
                End Date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'rgba(70, 231, 177, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(70, 231, 177, 0.3)',
            }}
          >
            <div className="small" style={{ color: 'var(--muted)' }}>
              💡 <b>Tip:</b> Leave dates empty for permanent locations (like home). Add dates for travel locations to find buddies during your trip.
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button className="btn" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
