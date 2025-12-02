import { FC } from 'react';

interface RouteInfo {
  id: string;
  name: string;
  distance: number;
  elevation: string;
  thumbnail?: string;
  surface?: string;
}

interface Props {
  route: RouteInfo;
  onChange?: () => void;
  matchScore?: number;
}

export const RouteSuggestionCard: FC<Props> = ({ route, onChange, matchScore }) => {
  return (
    <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark">
          Recommended Route
        </h3>
        {matchScore !== undefined && (
          <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full">
            {Math.round(matchScore * 100)}% match
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {route.thumbnail ? (
          <img
            src={route.thumbnail}
            alt={route.name}
            className="w-14 h-14 rounded-xl object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-2xl">🗺️</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-light dark:text-primary-dark truncate">
            {route.name}
          </p>
          <p className="text-xs text-muted-light dark:text-muted-dark">
            {route.distance}km • {route.elevation}
          </p>
          {route.surface && (
            <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">
              {route.surface}
            </p>
          )}
        </div>
      </div>

      {onChange && (
        <button
          onClick={onChange}
          className="text-xs text-success underline hover:text-success/80 transition-colors"
        >
          Choose different route
        </button>
      )}
    </div>
  );
};
