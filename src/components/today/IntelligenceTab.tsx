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
    <div className="p-5 space-y-4 pb-8">
      <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f9fafb' }}>
          Today's Pace Strategy
        </h3>

        <div className="mb-4">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-5xl font-bold" style={{ color: '#22c55e' }}>{paceData.targetMin}</span>
            <span className="text-2xl" style={{ color: '#9ca3af' }}>–</span>
            <span className="text-5xl font-bold" style={{ color: '#22c55e' }}>{paceData.targetMax}</span>
          </div>
          <p className="text-center text-sm" style={{ color: '#9ca3af' }}>min/km</p>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs" style={{ color: '#9ca3af' }}>Confidence</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${paceData.confidence * 100}%`, backgroundColor: '#22c55e' }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: '#22c55e' }}>
              {Math.round(paceData.confidence * 100)}%
            </span>
          </div>

          {paceData.adjustedFor.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {paceData.adjustedFor.map((factor, idx) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa' }}
                >
                  {factor}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowPaceExplanation(!showPaceExplanation)}
            className="text-xs hover:underline flex items-center gap-1"
            style={{ color: '#60a5fa' }}
          >
            <span>{showPaceExplanation ? '▼' : '▶'}</span>
            <span>Why this pace?</span>
          </button>

          {showPaceExplanation && (
            <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#1a1b1e' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>
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
        <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#f9fafb' }}>
            Heart Rate Zones
          </h3>
          <div className="space-y-2">
            <ZoneBar zone="Zone 5" range={`${hrZones.zone5.min}-${hrZones.zone5.max}`} time={hrZones.zone5.time} color="#ef4444" />
            <ZoneBar zone="Zone 4" range={`${hrZones.zone4.min}-${hrZones.zone4.max}`} time={hrZones.zone4.time} color="#fb923c" />
            <ZoneBar zone="Zone 3" range={`${hrZones.zone3.min}-${hrZones.zone3.max}`} time={hrZones.zone3.time} color="#eab308" />
            <ZoneBar zone="Zone 2" range={`${hrZones.zone2.min}-${hrZones.zone2.max}`} time={hrZones.zone2.time} color="#22c55e" />
            <ZoneBar zone="Zone 1" range={`${hrZones.zone1.min}-${hrZones.zone1.max}`} time={hrZones.zone1.time} color="#60a5fa" />
          </div>
        </div>
      )}

      {route && (
        <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
              Recommended Route
            </h3>
            <button
              onClick={onRouteSelect}
              className="text-xs hover:underline"
              style={{ color: '#22c55e' }}
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

      <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f9fafb' }}>
          Hydration & Fueling Strategy
        </h3>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#1a1b1e' }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">💧</span>
              <span className="text-xs text-muted-light dark:text-muted-dark">Total Fluids</span>
            </div>
            <span className="text-sm font-bold text-primary-light dark:text-primary-dark">
              {hydration.liters}L ({hydration.litersPerHour}L/hr)
            </span>
          </div>

          {fueling && (
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#1a1b1e' }}>
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

        <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#22c55e' }}>💧 Carry Strategy</p>
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
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: '#f9fafb' }}>
          {zone}
        </span>
        <span className="text-xs" style={{ color: '#9ca3af' }}>{range} bpm</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(time, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="text-xs font-medium min-w-[36px] text-right" style={{ color: '#f9fafb' }}>
          {time}min
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
