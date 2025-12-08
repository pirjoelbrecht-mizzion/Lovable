/**
 * Activity Gear Component
 * Displays gear used for the activity (shoes, bike, etc.)
 */

import type { AthleteGear } from '@/types';

interface ActivityGearProps {
  gear: AthleteGear | null;
}

export function ActivityGear({ gear }: ActivityGearProps) {
  if (!gear) return null;

  const isHighMileage = gear.distanceKm > 500;
  const warningThreshold = 800;
  const isWarning = gear.distanceKm > warningThreshold;

  return (
    <div className="activity-gear" style={{ marginBottom: '24px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--bolt-text)'
        }}
      >
        Gear
      </h3>

      <div
        className="gear-card"
        style={{
          background: 'var(--bolt-surface)',
          borderRadius: '12px',
          padding: '20px',
          border: isWarning ? '2px solid var(--bolt-orange)' : '1px solid var(--bolt-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div
          style={{
            fontSize: '48px',
            opacity: 0.8
          }}
        >
          {gear.gearType === 'shoes' ? '👟' : '🚴'}
        </div>

        <div style={{ flex: 1 }}>
          <h4
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '4px',
              color: 'var(--bolt-text)'
            }}
          >
            {gear.name}
          </h4>

          {(gear.brand || gear.model) && (
            <div
              style={{
                fontSize: '14px',
                color: 'var(--bolt-text-muted)',
                marginBottom: '8px'
              }}
            >
              {[gear.brand, gear.model].filter(Boolean).join(' ')}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <span style={{ color: 'var(--bolt-text)' }}>
              <strong>{gear.distanceKm.toFixed(0)} km</strong>
            </span>
            <span style={{ color: 'var(--bolt-text-muted)' }}>
              logged
            </span>

            {isHighMileage && (
              <span
                style={{
                  background: isWarning
                    ? 'rgba(var(--bolt-orange-rgb), 0.15)'
                    : 'rgba(var(--bolt-text-muted-rgb), 0.15)',
                  color: isWarning ? 'var(--bolt-orange)' : 'var(--bolt-text-muted)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginLeft: '8px'
                }}
              >
                {isWarning ? '⚠️ High Mileage' : 'Well Used'}
              </span>
            )}
          </div>

          {isWarning && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--bolt-orange)',
                fontWeight: 500
              }}
            >
              Consider replacing soon (800+ km)
            </div>
          )}
        </div>

        {gear.isPrimary && (
          <div
            style={{
              background: 'rgba(var(--bolt-teal-rgb), 0.15)',
              color: 'var(--bolt-teal)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            ⭐ Primary
          </div>
        )}
      </div>
    </div>
  );
}
