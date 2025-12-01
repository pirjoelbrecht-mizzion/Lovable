import { useState, useEffect } from 'react';
import { getCurrentUserCommunityProfile, createOrUpdateCommunityProfile } from '@/lib/community';
import { getSavedLocation, detectLocation, saveLocation } from '@/utils/location';
import { toast } from '@/components/ToastHost';
import { TERRAIN_OPTIONS, DAY_OPTIONS, RUN_TIME_OPTIONS, MATCH_PREFERENCE_OPTIONS, type CreateProfileData } from '@/types/community';
import LocationManager from '@/components/LocationManager';

interface MyProfileProps {
  onProfileUpdated?: () => void;
}

export default function MyProfile({ onProfileUpdated }: MyProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState('');
  const [terrain, setTerrain] = useState<string>('road');
  const [paceMin, setPaceMin] = useState<number>(7);
  const [paceMax, setPaceMax] = useState<number>(9);
  const [availability, setAvailability] = useState<string[]>([]);
  const [runTimes, setRunTimes] = useState<string[]>(['morning']);
  const [matchPreference, setMatchPreference] = useState<string>('both');
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [lookingForPartner, setLookingForPartner] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await getCurrentUserCommunityProfile();
      if (profile) {
        setBio(profile.bio || '');
        setTerrain(profile.preferred_terrain);
        setPaceMin(profile.pace_min || 7);
        setPaceMax(profile.pace_max || 9);
        setAvailability(profile.availability_days);
        setRunTimes(profile.preferred_run_time);
        setMatchPreference(profile.match_preference);
        setMaxDistance(profile.max_distance_km);
        setLookingForPartner(profile.looking_for_partner);
        setVisible(profile.visible);
        setShareLocation(profile.share_location);
        setHasLocation(!!profile.location);
      }
      const savedLoc = getSavedLocation();
      if (savedLoc) setHasLocation(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (visible && !bio.trim()) {
      toast('Please add a bio before making your profile visible', 'error');
      return;
    }

    if (visible && shareLocation && !hasLocation) {
      toast('Please enable location first to share it with matches', 'error');
      return;
    }

    setSaving(true);
    try {
      const location = shareLocation ? getSavedLocation() : null;

      const profileData: CreateProfileData = {
        bio: bio.trim() || null,
        preferred_terrain: terrain as any,
        pace_min: paceMin,
        pace_max: paceMax,
        availability_days: availability,
        preferred_run_time: runTimes as any,
        match_preference: matchPreference as any,
        max_distance_km: maxDistance,
        looking_for_partner: lookingForPartner,
        visible,
        share_location: shareLocation,
        location: location ? { lat: location.lat, lon: location.lon } : undefined,
      };

      const result = await createOrUpdateCommunityProfile(profileData);
      if (result) {
        toast('Community profile saved!', 'success');
        if (onProfileUpdated) {
          onProfileUpdated();
        }
      } else {
        toast('Failed to save profile', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEnableLocation = async () => {
    try {
      const loc = await detectLocation();
      saveLocation(loc);
      setHasLocation(true);
      toast('Location enabled for proximity matching', 'success');
    } catch {
      toast('Could not access location', 'error');
    }
  };

  const toggleDay = (day: string) => {
    setAvailability(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleRunTime = (time: string) => {
    setRunTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  if (loading) {
    return (
      <section className="card">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="h2">Loading profile...</div>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto' }}>
      <section className="card">
        <h2 className="h2">My Unity Profile</h2>
        <p className="small" style={{ marginTop: 6, color: 'var(--muted)' }}>
          Customize your profile to find the perfect running companions
        </p>
      </section>

      <section className="card">
        <h3 className="h2" style={{ marginBottom: 12 }}>Visibility & Status</h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={visible}
            onChange={e => setVisible(e.target.checked)}
          />
          <span className="small">
            <b>Make my profile visible</b> - Others can see and connect with me
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={lookingForPartner}
            onChange={e => setLookingForPartner(e.target.checked)}
          />
          <span className="small">
            <b>Looking for running partners</b> - Show in active search results
          </span>
        </label>
      </section>

      <section className="card">
        <h3 className="h2" style={{ marginBottom: 12 }}>About Me</h3>
        <label className="small">Bio (200 characters max)</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, 200))}
          placeholder="Tell others about your running vibe... e.g., 'Marathon training with a love for trail adventures'"
          rows={3}
          style={{ marginTop: 6 }}
        />
        <div className="small" style={{ textAlign: 'right', color: 'var(--muted)', marginTop: 4 }}>
          {bio.length}/200
        </div>
      </section>

      <section className="card">
        <h3 className="h2" style={{ marginBottom: 12 }}>Running Preferences</h3>

        <div style={{ marginBottom: 16 }}>
          <label className="small" style={{ marginBottom: 6, display: 'block' }}>Pace Range (min/km)</label>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="range"
                min="4"
                max="12"
                step="0.1"
                value={paceMin}
                onChange={e => setPaceMin(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div className="small" style={{ textAlign: 'center', marginTop: 4 }}>
                Min: {paceMin.toFixed(1)}
              </div>
            </div>
            <span>—</span>
            <div style={{ flex: 1 }}>
              <input
                type="range"
                min="4"
                max="12"
                step="0.1"
                value={paceMax}
                onChange={e => setPaceMax(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div className="small" style={{ textAlign: 'center', marginTop: 4 }}>
                Max: {paceMax.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="small" style={{ marginBottom: 6, display: 'block' }}>Preferred Terrain</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {TERRAIN_OPTIONS.map(option => (
              <button
                key={option.key}
                className={terrain === option.key ? 'btn primary' : 'btn'}
                onClick={() => setTerrain(option.key)}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="small" style={{ marginBottom: 6, display: 'block' }}>Running Days</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {DAY_OPTIONS.map(day => (
              <button
                key={day.key}
                className={availability.includes(day.key) ? 'btn primary' : 'btn'}
                onClick={() => toggleDay(day.key)}
                style={{ minWidth: 70 }}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="small" style={{ marginBottom: 6, display: 'block' }}>Preferred Run Times</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {RUN_TIME_OPTIONS.map(time => (
              <button
                key={time.key}
                className={runTimes.includes(time.key) ? 'btn primary' : 'btn'}
                onClick={() => toggleRunTime(time.key)}
                style={{ fontSize: 12 }}
              >
                {time.emoji} {time.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <LocationManager />
      </section>

      <section className="card">
        <h3 className="h2" style={{ marginBottom: 12 }}>Matching Preferences</h3>

        <div style={{ marginBottom: 16 }}>
          <label className="small" style={{ marginBottom: 6, display: 'block' }}>I want to find:</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {MATCH_PREFERENCE_OPTIONS.map(option => (
              <button
                key={option.key}
                className={matchPreference === option.key ? 'btn primary' : 'btn'}
                onClick={() => setMatchPreference(option.key)}
                style={{ flex: 1, minWidth: 150 }}
              >
                <div>{option.emoji} {option.label}</div>
                <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {matchPreference !== 'virtual' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label className="small" style={{ marginBottom: 6, display: 'block' }}>
                Maximum Distance for Local Matches: {maxDistance} km
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxDistance}
                onChange={e => setMaxDistance(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={shareLocation}
                onChange={e => setShareLocation(e.target.checked)}
              />
              <span className="small">
                <b>Share my approximate location</b> - Show distance to matches
              </span>
            </label>

            {!hasLocation && (
              <button className="btn" onClick={handleEnableLocation} style={{ marginTop: 8 }}>
                📍 Enable Location
              </button>
            )}

            {hasLocation && (
              <div className="small" style={{ color: 'var(--success)', marginTop: 8 }}>
                ✅ Location enabled • Privacy: only distance shown, never exact address
              </div>
            )}
          </>
        )}
      </section>

      <section className="card">
        <button
          className="btn primary"
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: 16, fontSize: 16 }}
        >
          {saving ? 'Saving...' : '💾 Save Profile'}
        </button>

        {visible && (
          <div className="small" style={{ marginTop: 12, textAlign: 'center', color: 'var(--success)' }}>
            ✨ Your profile is live! Others can now find and connect with you.
          </div>
        )}
      </section>
    </div>
  );
}
