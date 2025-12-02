import { FC, useState, useEffect } from 'react';
import { getSavedRoutes, type DbSavedRoute } from '@/lib/database';
import { toast } from '@/components/ToastHost';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (route: DbSavedRoute) => void;
  currentRoute: DbSavedRoute | null;
  targetDistance: number;
  location: { lat: number; lon: number } | null;
}

export const RouteSelectionModal: FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
  currentRoute,
  targetDistance,
  location,
}) => {
  const [routes, setRoutes] = useState<DbSavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'similar' | 'nearby'>('similar');

  useEffect(() => {
    if (isOpen) {
      loadRoutes();
    }
  }, [isOpen, filter, location]);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const locationFilter = location ? {
        lat: location.lat,
        lon: location.lon,
        radiusKm: 20,
      } : undefined;

      const allRoutes = await getSavedRoutes(20, locationFilter);

      let filtered = allRoutes;
      if (filter === 'similar') {
        filtered = allRoutes.filter(r =>
          Math.abs(r.distance_km - targetDistance) < 3
        );
      } else if (filter === 'nearby' && location) {
        filtered = allRoutes.slice(0, 10);
      }

      filtered.sort((a, b) => {
        const aDiff = Math.abs(a.distance_km - targetDistance);
        const bDiff = Math.abs(b.distance_km - targetDistance);
        return aDiff - bDiff;
      });

      setRoutes(filtered);
    } catch (error) {
      console.error('Failed to load routes:', error);
      toast('Failed to load routes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (route: DbSavedRoute) => {
    onSelect(route);
    onClose();
    toast(`Route "${route.name}" selected`, 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[85vh] bg-bg-light dark:bg-bg-dark rounded-t-3xl shadow-elevated overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-bg-light dark:bg-bg-dark border-b border-line-light dark:border-line-dark p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-primary-light dark:text-primary-dark">
              Select Route
            </h2>
            <button
              onClick={onClose}
              className="text-2xl text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2">
            <FilterButton
              active={filter === 'similar'}
              onClick={() => setFilter('similar')}
              label="Similar Distance"
            />
            <FilterButton
              active={filter === 'nearby'}
              onClick={() => setFilter('nearby')}
              label="Nearby"
            />
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="All Routes"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-light dark:text-muted-dark">
              Loading routes...
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-light dark:text-muted-dark mb-2">No routes found</p>
              <button
                className="text-sm text-primary-light dark:text-primary-dark hover:underline"
                onClick={() => {
                  window.location.href = '/route-explorer';
                }}
              >
                Explore new routes
              </button>
            </div>
          ) : (
            routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={route.id === currentRoute?.id}
                onSelect={() => handleSelect(route)}
                targetDistance={targetDistance}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const FilterButton: FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className={`
      px-3 py-1.5 rounded-full text-xs font-medium transition-colors
      ${active
        ? 'bg-primary-light dark:bg-primary-dark text-white'
        : 'bg-surface1-light dark:bg-surface1-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark'
      }
    `}
    style={{ minHeight: '32px' }}
  >
    {label}
  </button>
);

const RouteCard: FC<{
  route: DbSavedRoute;
  isSelected: boolean;
  onSelect: () => void;
  targetDistance: number;
}> = ({ route, isSelected, onSelect, targetDistance }) => {
  const distanceDiff = route.distance_km - targetDistance;
  const matchPercentage = Math.max(0, 100 - Math.abs(distanceDiff) * 10);

  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-2xl text-left transition-all
        ${isSelected
          ? 'bg-primary-light/20 dark:bg-primary-dark/20 border-2 border-primary-light dark:border-primary-dark'
          : 'bg-surface1-light dark:bg-surface1-dark hover:bg-surface2-light dark:hover:bg-surface2-dark border-2 border-transparent'
        }
      `}
      style={{ minHeight: '44px' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-base font-medium text-primary-light dark:text-primary-dark mb-1">
            {route.name}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-light dark:text-muted-dark">
            <span>📏 {route.distance_km.toFixed(1)}km</span>
            <span>📈 +{route.elevation_gain_m}m</span>
            {route.surface_type && <span>🏃 {route.surface_type}</span>}
          </div>
        </div>
        {matchPercentage >= 80 && (
          <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full font-medium">
            {Math.round(matchPercentage)}% match
          </span>
        )}
      </div>

      {route.avg_completion_time_min && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-light dark:text-muted-dark">Your avg time</span>
          <span className="font-medium text-primary-light dark:text-primary-dark">
            {Math.floor(route.avg_completion_time_min)} min
          </span>
        </div>
      )}

      {isSelected && (
        <div className="mt-2 flex items-center gap-1 text-xs text-success">
          <span>✓</span>
          <span>Selected</span>
        </div>
      )}
    </button>
  );
};
