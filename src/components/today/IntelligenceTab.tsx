import { FC, useState } from 'react';
import type { DbSavedRoute } from '@/lib/database';
import type { HydrationNeeds, FuelingNeeds } from '@/lib/environmental-learning/hydration';

interface PaceData {
  targetMin: string;
  targetMax: string;
  explanation: string;
  confidence: number;
  adjustedFor: string[];
  recentPaces: Array<{ date: string; pace: string }>;
}

interface HeartRateZones {
  zone1: { min: number; max: number; time: number };
  zone2: { min: number; max: number; time: number };
  zone3: { min: number; max: number; time: number };
  zone4: { min: number; max: number; time: number };
  zone5: { min: number; max: number; time: number };
}

interface Props {
  paceData: PaceData;
  hrZones: HeartRateZones | null;
  route: DbSavedRoute | null;
  alternativeRoutes: DbSavedRoute[];
  hydration: HydrationNeeds;
  fueling: FuelingNeeds | null;
  onRouteSelect: () => void;
}

export const IntelligenceTab: FC<Props> = ({
  paceData,
  hrZones,
  route,
  alternativeRoutes,
  hydration,
  fueling,
  onRouteSelect,
}) => {
  const [showPaceExplanation, setShowPaceExplanation] = useState(false);

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
        <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark mb-3">
          Today's Pace Strategy
        </h3>

        <div className="mb-4">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-4xl font-bold text-success">{paceData.targetMin}</span>
            <span className="text-xl text-muted-light dark:text-muted-dark">-</span>
            <span className="text-4xl font-bold text-success">{paceData.targetMax}</span>
            <span className="text-sm text-muted-light dark:text-muted-dark">min/km</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex-1 h-2 bg-gray-700 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${paceData.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-light dark:text-muted-dark whitespace-nowrap">
              {Math.round(paceData.confidence * 100)}% confidence
            </span>
          </div>

          {paceData.adjustedFor.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {paceData.adjustedFor.map((factor, idx) => (
                <span
                  key={idx}
                  className="text-[10px] bg-primary-light/20 text-primary-light dark:bg-primary-dark/20 dark:text-primary-dark px-2 py-1 rounded-full"
                >
                  {factor}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowPaceExplanation(!showPaceExplanation)}
            className="text-xs text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1"
          >
            <span>{showPaceExplanation ? '▼' : '▶'}</span>
            <span>Why this pace?</span>
          </button>

          {showPaceExplanation && (
            <div className="mt-2 p-3 rounded-xl bg-surface2-light/50 dark:bg-surface2-dark/50">
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                {paceData.explanation}
              </p>
            </div>
          )}
        </div>

        {paceData.recentPaces.length > 0 && (
          <div>
            <p className="text-xs font-medium text-primary-light dark:text-primary-dark mb-2">
              Recent Similar Runs
            </p>
            <div className="space-y-1">
              {paceData.recentPaces.map((run, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs p-2 rounded bg-surface2-light/30 dark:bg-surface2-dark/30"
                >
                  <span className="text-muted-light dark:text-muted-dark">{run.date}</span>
                  <span className="font-medium text-primary-light dark:text-primary-dark">
                    {run.pace}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hrZones && (
        <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
          <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark mb-3">
            Heart Rate Zones
          </h3>
          <div className="space-y-2">
            <ZoneBar zone="Zone 5" range={`${hrZones.zone5.min}-${hrZones.zone5.max}`} time={hrZones.zone5.time} color="#ff5d5d" />
            <ZoneBar zone="Zone 4" range={`${hrZones.zone4.min}-${hrZones.zone4.max}`} time={hrZones.zone4.time} color="#ff8a5b" />
            <ZoneBar zone="Zone 3" range={`${hrZones.zone3.min}-${hrZones.zone3.max}`} time={hrZones.zone3.time} color="#ffd166" />
            <ZoneBar zone="Zone 2" range={`${hrZones.zone2.min}-${hrZones.zone2.max}`} time={hrZones.zone2.time} color="#4bd2b2" />
            <ZoneBar zone="Zone 1" range={`${hrZones.zone1.min}-${hrZones.zone1.max}`} time={hrZones.zone1.time} color="#6aa7ff" />
          </div>
        </div>
      )}

      {route && (
        <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark">
              Recommended Route
            </h3>
            <button
              onClick={onRouteSelect}
              className="text-xs text-success hover:underline"
            >
              Change Route
            </button>
          </div>

          <div className="mb-3">
            <p className="text-base font-medium text-primary-light dark:text-primary-dark mb-1">
              {route.name}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-light dark:text-muted-dark">
              <span>📏 {route.distance_km}km</span>
              <span>📈 +{route.elevation_gain_m}m</span>
              {route.surface_type && <span>🏃 {route.surface_type}</span>}
            </div>
          </div>

          {route.elevation_profile && (
            <div className="mb-3 p-3 rounded-xl bg-surface2-light/50 dark:bg-surface2-dark/50">
              <p className="text-xs font-medium text-primary-light dark:text-primary-dark mb-2">
                Elevation Profile
              </p>
              <ElevationProfile data={route.elevation_profile as number[]} />
            </div>
          )}

          {route.avg_completion_time_min && (
            <div className="flex justify-between items-center p-3 rounded-xl bg-success/10">
              <span className="text-xs text-muted-light dark:text-muted-dark">
                Your average time
              </span>
              <span className="text-sm font-bold text-success">
                {Math.floor(route.avg_completion_time_min)} min
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
        <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark mb-3">
          Hydration & Fueling Strategy
        </h3>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface2-light/50 dark:bg-surface2-dark/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">💧</span>
              <span className="text-xs text-muted-light dark:text-muted-dark">Total Fluids</span>
            </div>
            <span className="text-sm font-bold text-primary-light dark:text-primary-dark">
              {hydration.liters}L ({hydration.litersPerHour}L/hr)
            </span>
          </div>

          {fueling && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface2-light/50 dark:bg-surface2-dark/50">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍫</span>
                <span className="text-xs text-muted-light dark:text-muted-dark">Carbohydrates</span>
              </div>
              <span className="text-sm font-bold text-primary-light dark:text-primary-dark">
                {fueling.totalCarbs}g ({fueling.carbsPerHour}g/hr)
              </span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-success/10 border border-success/20 mb-3">
          <p className="text-xs font-semibold text-success mb-2">💧 Carry Strategy</p>
          <p className="text-xs text-muted-light dark:text-muted-dark">
            {hydration.carryAmount}
          </p>
        </div>

        {hydration.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-primary-light dark:text-primary-dark">
              Timing Guide
            </p>
            {hydration.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-muted-light dark:text-muted-dark p-2 rounded bg-surface2-light/30 dark:bg-surface2-dark/30"
              >
                <span>•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ZoneBar: FC<{ zone: string; range: string; time: number; color: string }> = ({
  zone,
  range,
  time,
  color,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-primary-light dark:text-primary-dark">
          {zone}
        </span>
        <span className="text-xs text-muted-light dark:text-muted-dark">{range} bpm</span>
      </div>
      <div className="h-6 rounded-lg overflow-hidden bg-surface2-light/50 dark:bg-surface2-dark/50 flex items-center px-2">
        <div
          className="h-4 rounded transition-all"
          style={{
            width: `${Math.min(time, 100)}%`,
            backgroundColor: color,
          }}
        />
        <span className="ml-2 text-xs font-medium text-primary-light dark:text-primary-dark">
          {time}%
        </span>
      </div>
    </div>
  );
};

const ElevationProfile: FC<{ data: number[] }> = ({ data }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  return (
    <svg width="100%" height="60" className="overflow-visible">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-success"
        points={data
          .map((point, idx) => {
            const x = (idx / (data.length - 1)) * 100;
            const y = 60 - ((point - min) / range) * 50;
            return `${x},${y}`;
          })
          .join(' ')}
      />
    </svg>
  );
};
