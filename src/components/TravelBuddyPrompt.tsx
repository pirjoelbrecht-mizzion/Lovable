import { useState, useEffect } from 'react';
import { getUpcomingTravelBuddies } from '@/lib/community';
import type { UpcomingTravelBuddies } from '@/types/community';
import { useNavigate } from 'react-router-dom';

export default function TravelBuddyPrompt() {
  const [travelBuddies, setTravelBuddies] = useState<UpcomingTravelBuddies[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadTravelBuddies();
    const dismissedItems = localStorage.getItem('travel_buddy_dismissed');
    if (dismissedItems) {
      setDismissed(new Set(JSON.parse(dismissedItems)));
    }
  }, []);

  const loadTravelBuddies = async () => {
    const buddies = await getUpcomingTravelBuddies(14);
    setTravelBuddies(buddies);
  };

  const handleDismiss = (travelId: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(travelId);
    setDismissed(newDismissed);
    localStorage.setItem('travel_buddy_dismissed', JSON.stringify(Array.from(newDismissed)));
  };

  const handleFindBuddies = (travelId: string) => {
    navigate('/unity/find');
    handleDismiss(travelId);
  };

  const visiblePrompts = travelBuddies.filter(
    t => !dismissed.has(t.travel_location_id) && t.potential_buddies_count > 0
  );

  if (visiblePrompts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, maxWidth: 400 }}>
      {visiblePrompts.map(travel => (
        <div
          key={travel.travel_location_id}
          className="card"
          style={{
            background: 'linear-gradient(135deg, #46E7B1 0%, #00C9A7 100%)',
            border: '2px solid #00C9A7',
            padding: 20,
            marginBottom: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                ✈️ Traveling to {travel.destination}?
              </div>
              <div className="small" style={{ opacity: 0.9 }}>
                {new Date(travel.start_date).toLocaleDateString()} - {new Date(travel.end_date).toLocaleDateString()}
              </div>
            </div>
            <button
              className="btn small"
              onClick={() => handleDismiss(travel.travel_location_id)}
              style={{
                background: 'rgba(255,255,255,0.3)',
                border: 'none',
                fontSize: 14,
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              {travel.potential_buddies_count} running {travel.potential_buddies_count === 1 ? 'buddy' : 'buddies'} found!
            </div>

            {travel.top_matches.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {travel.top_matches.slice(0, 3).map((match, idx) => (
                  <div
                    key={idx}
                    className="small"
                    style={{
                      background: 'rgba(255,255,255,0.3)',
                      padding: '4px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    {match.display_name}
                  </div>
                ))}
                {travel.top_matches.length > 3 && (
                  <div
                    className="small"
                    style={{
                      background: 'rgba(255,255,255,0.3)',
                      padding: '4px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    +{travel.top_matches.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="btn"
            onClick={() => handleFindBuddies(travel.travel_location_id)}
            style={{
              width: '100%',
              background: 'white',
              color: '#00C9A7',
              fontWeight: 700,
              border: 'none',
            }}
          >
            👥 Find Running Buddies
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
