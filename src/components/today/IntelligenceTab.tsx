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
  hydration,
  fueling,
  onRouteSelect,
}) => {
  const [showPaceExplanation, setShowPaceExplanation] = useState(false);

  return (
    <div style={{
      backgroundColor: '#0f1014',
      minHeight: '100%',
      padding: '16px',
      paddingBottom: '24px'
    }}>
      {/* Pace Strategy Card */}
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        marginBottom: '16px'
      }}>
        {/* Large Pace Display */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '48px', fontWeight: 700, color: '#22c55e' }}>
            {paceData.targetMin}
          </span>
          <span style={{ fontSize: '24px', color: '#9ca3af' }}>–</span>
          <span style={{ fontSize: '48px', fontWeight: 700, color: '#22c55e' }}>
            {paceData.targetMax}
          </span>
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#9ca3af',
          marginBottom: '12px'
        }}>
          min/km
        </p>

        {/* Confidence Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Confidence</span>
          <div style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#374151',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${paceData.confidence * 100}%`,
              backgroundColor: '#22c55e',
              transition: 'width 0.3s'
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e' }}>
            {Math.round(paceData.confidence * 100)}%
          </span>
        </div>

        {/* Adjusted For Tags */}
        {paceData.adjustedFor.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px'
          }}>
            {paceData.adjustedFor.map((factor, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '10px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(96, 165, 250, 0.3)'
                }}
              >
                {factor}
              </span>
            ))}
          </div>
        )}

        {/* Why this pace? */}
        <button
          onClick={() => setShowPaceExplanation(!showPaceExplanation)}
          style={{
            fontSize: '11px',
            color: '#60a5fa',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          <span>{showPaceExplanation ? '▼' : '▶'}</span>
          <span>Why this pace?</span>
        </button>

        {showPaceExplanation && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: '#0f1014',
            border: '1px solid #2a2d3a'
          }}>
            <p style={{
              fontSize: '11px',
              lineHeight: '1.6',
              color: '#d1d5db',
              margin: 0
            }}>
              {paceData.explanation}
            </p>
          </div>
        )}

        {/* Recent Paces */}
        {paceData.recentPaces.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9ca3af',
              marginBottom: '8px'
            }}>
              Recent Fatigue
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {paceData.recentPaces.map((run, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <span style={{ color: '#9ca3af' }}>{run.date}</span>
                  <span style={{ fontWeight: 600, color: '#f9fafb' }}>{run.pace}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Heart Rate Zones */}
      {hrZones && (
        <div style={{
          padding: '16px',
          borderRadius: '16px',
          backgroundColor: '#1a1c24',
          border: '1px solid #2a2d3a',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#f9fafb',
            marginBottom: '12px'
          }}>
            Heart Rate Zones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ZoneBar zone="Zone 5" range={`${hrZones.zone5.min}-${hrZones.zone5.max}`} time={hrZones.zone5.time} color="#ef4444" />
            <ZoneBar zone="Zone 4" range={`${hrZones.zone4.min}-${hrZones.zone4.max}`} time={hrZones.zone4.time} color="#fb923c" />
            <ZoneBar zone="Zone 3" range={`${hrZones.zone3.min}-${hrZones.zone3.max}`} time={hrZones.zone3.time} color="#eab308" />
            <ZoneBar zone="Zone 2" range={`${hrZones.zone2.min}-${hrZones.zone2.max}`} time={hrZones.zone2.time} color="#22c55e" />
            <ZoneBar zone="Zone 1" range={`${hrZones.zone1.min}-${hrZones.zone1.max}`} time={hrZones.zone1.time} color="#60a5fa" />
          </div>
          <div style={{
            marginTop: '12px',
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p style={{ fontSize: '10px', color: '#22c55e', margin: 0 }}>
              ✓ Maintain 80% of time in Zone 2 for optimal recovery
            </p>
          </div>
        </div>
      )}

      {/* Recommended Route - Always show */}
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb', margin: 0 }}>
            Recommended Route
          </h3>
          <button
            onClick={onRouteSelect}
            style={{
              fontSize: '11px',
              color: '#22c55e',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Change Route
          </button>
        </div>

        {route ? (
          <>
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#f9fafb',
              marginBottom: '8px'
            }}>
              {route.name}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '11px',
              color: '#9ca3af',
              marginBottom: '12px'
            }}>
              <span>📏 {route.distance_km}km</span>
              <span>⛰️ +{route.elevation_gain_m}m</span>
              {route.surface_type && <span>🏃 {route.surface_type}</span>}
            </div>

            {route.avg_completion_time_min && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                  Your average time
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
                  {Math.floor(route.avg_completion_time_min)} min
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#0f1014',
            border: '1px solid #2a2d3a',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              No route selected. Tap "Change Route" to select one.
            </p>
          </div>
        )}
      </div>

      {/* Hydration & Fueling */}
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#f9fafb',
          marginBottom: '12px'
        }}>
          Hydration Needs
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#0f1014',
            border: '1px solid #2a2d3a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💧</span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Total Fluids</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>
              {hydration.liters}L ({hydration.litersPerHour}L/hr)
            </span>
          </div>

          {fueling && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#0f1014',
              border: '1px solid #2a2d3a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🍫</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Carbohydrates</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb' }}>
                {fueling.totalCarbs}g ({fueling.carbsPerHour}g/hr)
              </span>
            </div>
          )}
        </div>

        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          marginBottom: '12px'
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#22c55e', marginBottom: '6px' }}>
            💧 CARRY STRATEGY
          </p>
          <p style={{ fontSize: '11px', color: '#d1d5db', margin: 0 }}>
            {hydration.carryAmount}
          </p>
        </div>

        {hydration.recommendations.length > 0 && (
          <div>
            {hydration.recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#d1d5db',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  marginBottom: '6px'
                }}
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#f9fafb' }}>
          {zone}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{range} bpm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          flex: 1,
          height: '6px',
          borderRadius: '3px',
          backgroundColor: '#374151',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(time, 100)}%`,
            backgroundColor: color,
            transition: 'width 0.3s'
          }} />
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          minWidth: '36px',
          textAlign: 'right',
          color: '#f9fafb'
        }}>
          {time}min
        </span>
      </div>
    </div>
  );
};
